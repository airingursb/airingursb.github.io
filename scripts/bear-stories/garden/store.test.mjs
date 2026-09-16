import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const implementation = new URL('./store.mjs', import.meta.url);
const storeModule = await import(implementation.href).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});

function fixture(t) {
  assert.ok(storeModule, 'Garden persistence implementation must exist');
  const directory = mkdtempSync(join(tmpdir(), 'bear-garden-test-'));
  const store = storeModule.openGardenStore(join(directory, 'garden.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { store, directory };
}

test('Given one visitor, when watering repeats on the same Singapore day, then only one action persists', t => {
  const { store } = fixture(t);
  const time = new Date('2026-09-15T18:00:00Z');
  store.water('preview', 'visitor-a', time);
  const repeated = store.water('preview', 'visitor-a', time);
  assert.equal(repeated.accepted, false);
  assert.equal(repeated.totalWaterings, 1);
  assert.equal(repeated.today, '2026-09-16');
});

test('Given distinct browser identities, when another browser reads, then it sees the same persisted garden', t => {
  const { store } = fixture(t);
  const time = new Date('2026-09-16T04:00:00Z');
  store.water('preview', 'visitor-a', time);
  const shared = store.read('preview', 'visitor-b', time);
  assert.equal(shared.totalWaterings, 1);
  assert.equal(shared.stage, 'sprout');
  assert.equal(shared.wateredToday, false);
});

test('Given yesterday’s watering, when Singapore midnight passes, then the same browser may water again', t => {
  const { store } = fixture(t);
  store.water('preview', 'visitor-a', new Date('2026-09-16T15:59:59Z'));
  const nextDay = store.water('preview', 'visitor-a', new Date('2026-09-16T16:00:00Z'));
  assert.equal(nextDay.accepted, true);
  assert.equal(nextDay.totalWaterings, 2);
});

test('Given persisted actions, when six visitors water, then the actual garden reaches bloom', t => {
  const { store } = fixture(t);
  const time = new Date('2026-09-16T04:00:00Z');
  for (let visitor = 0; visitor < 6; visitor += 1) store.water('preview', `visitor-${visitor}`, time);
  const state = store.read('preview', 'observer', time);
  assert.equal(state.stage, 'bloom');
  assert.equal(state.totalWaterings, 6);
});

test('Given a preview namespace, when the production namespace is read, then its state remains empty', t => {
  const { store } = fixture(t);
  const time = new Date('2026-09-16T04:00:00Z');
  store.water('preview', 'visitor-a', time);
  assert.equal(store.read('production', 'visitor-a', time).totalWaterings, 0);
});

test('Given a closed database, when a new process adapter opens it, then the saved garden survives', t => {
  const { store, directory } = fixture(t);
  const time = new Date('2026-09-16T04:00:00Z');
  store.water('preview', 'visitor-a', time);
  store.close();
  const second = storeModule.openGardenStore(join(directory, 'garden.sqlite'));
  assert.equal(second.read('preview', 'visitor-b', time).totalWaterings, 1);
  second.close();
});
