import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLampPreviewServer } from './server.mjs';
import { openLampStore } from './store.mjs';
const origin = 'http://localhost:4418';
async function fixture(t) {
  const store = openLampStore(':memory:');
  const server = createLampPreviewServer({ store, secret: 'only-test-secret', allowedOrigins: [origin], now: () => new Date('2026-09-23T12:00:00Z') });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); });
  const base = `http://127.0.0.1:${server.address().port}/api/preview/tree-lamps`;
  async function session() { return (await fetch(base, { headers: { origin } })).headers.get('set-cookie').split(';')[0]; }
  const light = (cookie, index, selectedOrigin = origin) => fetch(`${base}/light/${index}`, {
    method: 'POST', headers: { ...(cookie ? { cookie } : {}), ...(selectedOrigin ? { origin: selectedOrigin } : {}) },
  });
  return { base, session, light };
}
test('two visitors share true storage and simultaneous repeats are idempotent over HTTP', async t => {
  const { base, session, light } = await fixture(t);
  const a = await session(); const b = await session();
  const responses = await Promise.all(Array.from({ length: 8 }, () => light(a, 2).then(r => r.json())));
  assert.equal(responses.filter(r => r.accepted).length, 1);
  const other = await (await fetch(base, { headers: { origin, cookie: b } })).json();
  assert.deepEqual([other.lights, other.contributed], [[2], false]);
  assert.equal((await (await light(b, 3)).json()).accepted, true);
});
test('rejects invalid origins, missing sessions and out-of-range lamps', async t => {
  const { session, light } = await fixture(t); const cookie = await session();
  assert.equal((await light(cookie, 0, 'https://attacker.invalid')).status, 403);
  assert.equal((await light(cookie, 0, null)).status, 403);
  assert.equal((await light(null, 0)).status, 409);
  assert.equal((await light(`${cookie}.bad`, 0)).status, 409);
  assert.equal((await light(cookie, 6)).status, 400);
});
test('preview clock is explicit and simulation cannot save a daytime light', async t => {
  const { base, session } = await fixture(t); const cookie = await session();
  const result = await (await fetch(`${base}/light/0?scene=day`, { method: 'POST', headers: { origin, cookie } })).json();
  assert.equal(result.simulated, true); assert.equal(result.outcome, 'daytime'); assert.deepEqual(result.lights, []);
});
