import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eveningAt, openLampStore } from './store.mjs';
const night = new Date('2026-09-23T12:00:00Z');
for (const [time, active, key, next] of [
  ['2026-09-23T09:59:59Z', false, '2026-09-23', '2026-09-23T10:00:00.000Z'],
  ['2026-09-23T10:00:00Z', true, '2026-09-23', '2026-09-23T22:00:00.000Z'],
  ['2026-09-23T16:00:00Z', true, '2026-09-23', '2026-09-23T22:00:00.000Z'],
  ['2026-09-23T22:00:00Z', false, '2026-09-24', '2026-09-24T10:00:00.000Z'],
]) test(`Singapore evening boundary at ${time}`, () => {
  // Given / When
  const result = eveningAt(new Date(time));
  // Then
  assert.deepEqual([result.active, result.night, result.nextChangeAt], [active, key, next]);
});
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'tree-lamps-test-'));
  const path = join(directory, 'state.sqlite');
  const store = openLampStore(path);
  t.after(() => { store.close(); rmSync(directory, { recursive: true }); });
  return { store, path };
}
test('same browser can only light one lamp even after midnight', t => {
  const { store } = fixture(t);
  store.state('test', 'visitor-a', night, 2);
  const result = store.state('test', 'visitor-a', new Date('2026-09-23T19:00:00Z'), 4);
  assert.deepEqual([result.lights, result.yourLamp, result.outcome], [[2], 2, 'already']);
});
test('occupied lamp does not consume the next visitor contribution', t => {
  const { store } = fixture(t);
  store.state('test', 'visitor-a', night, 2);
  const occupied = store.state('test', 'visitor-b', night, 2);
  const accepted = store.state('test', 'visitor-b', night, 3);
  assert.equal(occupied.contributed, false);
  assert.deepEqual([occupied.outcome, accepted.outcome, accepted.lights], ['occupied', 'lit', [2, 3]]);
});
test('independent database connections observe persisted shared lights', t => {
  const { store, path } = fixture(t);
  store.state('test', 'visitor-a', night, 1);
  const second = openLampStore(path);
  try { assert.deepEqual(second.state('test', 'visitor-b', night).lights, [1]); }
  finally { second.close(); }
});
test('six slots fill without overcounting', t => {
  const { store } = fixture(t);
  for (let index = 0; index < 6; index++) store.state('test', `visitor-${index}`, night, index);
  const result = store.state('test', 'visitor-seven', night, 0);
  assert.deepEqual([result.outcome, result.contributed, result.lights], ['full', false, [0, 1, 2, 3, 4, 5]]);
});
test('dawn extinguishes and rejects writes; next evening accepts the same browser', t => {
  const { store } = fixture(t);
  store.state('test', 'visitor-a', night, 2);
  const dawn = store.state('test', 'visitor-a', new Date('2026-09-23T22:00:00Z'), 3);
  const next = store.state('test', 'visitor-a', new Date('2026-09-24T10:00:00Z'), 5);
  assert.deepEqual([dawn.lights, dawn.outcome, next.lights, next.outcome], [[], 'daytime', [5], 'lit']);
});
