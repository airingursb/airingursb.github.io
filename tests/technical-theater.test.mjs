import test from 'node:test';
import assert from 'node:assert/strict';
import { heap, reachableObjects, sweepObjects } from '../src/components/technical-theater/state.ts';
test('mark/sweep reclaims an unreachable cycle without touching reachable objects', () => {
  const marked = reachableObjects(heap, ['A']);
  assert.deepEqual(marked, ['A', 'B']);
  assert.deepEqual(sweepObjects(heap, marked), ['C', 'D']);
});
test('a rooted cycle terminates traversal and is retained', () => {
  const marked = reachableObjects(heap, ['A', 'C']);
  assert.deepEqual(marked, ['A', 'B', 'C', 'D']);
  assert.deepEqual(sweepObjects(heap, marked), []);
});
test('an empty root set leaves every object collectible', () => {
  assert.deepEqual(sweepObjects(heap, reachableObjects(heap, [])), ['A', 'B', 'C', 'D']);
});
