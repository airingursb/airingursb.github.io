import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openGardenStore } from './store.mjs';
import { createGardenPreviewServer } from './server.mjs';

async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'bear-garden-http-'));
  const store = openGardenStore(join(directory, 'state.sqlite'));
  let clock = new Date('2026-09-16T04:00:00Z');
  const server = createGardenPreviewServer({ store, secret: Buffer.from('test-secret-never-used-by-preview'), now: () => clock });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/api/preview/garden`;
  t.after(async () => {
    server.close();
    server.closeAllConnections();
    await once(server, 'close');
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const headers = { Origin: 'http://localhost:4406' };
  const request = (cookie, watering = false) => fetch(`${endpoint}${watering ? '/water' : ''}`, {
    method: watering ? 'POST' : 'GET',
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
  });
  return { request, endpoint, advance: value => { clock = new Date(value); } };
}

test('Given one browser session, when eight watering requests arrive together, then exactly one succeeds as new', async t => {
  const { request } = await fixture(t);
  const visitor = await request();
  const cookie = visitor.headers.get('set-cookie').split(';')[0];
  const responses = await Promise.all(Array.from({ length: 8 }, async () => (await request(cookie, true)).json()));
  assert.equal(responses.filter(result => result.accepted).length, 1);
  assert.ok(responses.every(result => result.totalWaterings === 1));
});

test('Given two browser sessions, when one waters, then the other sees the same garden without sharing its daily allowance', async t => {
  const { request } = await fixture(t);
  const first = await request();
  const firstCookie = first.headers.get('set-cookie').split(';')[0];
  await request(firstCookie, true);
  const second = await request();
  const state = await second.json();
  assert.equal(state.totalWaterings, 1);
  assert.equal(state.wateredToday, false);
  assert.equal(state.stage, 'sprout');
});

test('Given a saved browser session, when Singapore day changes, then HTTP watering succeeds once again', async t => {
  const { request, advance } = await fixture(t);
  const visitor = await request();
  const cookie = visitor.headers.get('set-cookie').split(';')[0];
  await request(cookie, true);
  advance('2026-09-16T16:00:00Z');
  const response = await request(cookie, true);
  const state = await response.json();
  assert.equal(state.accepted, true);
  assert.equal(state.totalWaterings, 2);
});

test('Given no saved cookie, when watering is attempted, then no community action is recorded', async t => {
  const { request } = await fixture(t);
  assert.equal((await request(null, true)).status, 409);
  assert.equal((await (await request()).json()).totalWaterings, 0);
});

test('Given a foreign origin, when it requests the garden, then CORS rejects it', async t => {
  const { endpoint } = await fixture(t);
  const response = await fetch(endpoint, { headers: { Origin: 'https://foreign.example' } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('Given a tampered visitor signature, when watering is attempted, then the session is rejected', async t => {
  const { request } = await fixture(t);
  const visitor = await request();
  const cookie = visitor.headers.get('set-cookie').split(';')[0];
  const tampered = `${cookie.slice(0, -1)}${cookie.endsWith('0') ? '1' : '0'}`;
  const response = await request(tampered, true);
  assert.equal(response.status, 409);
});
