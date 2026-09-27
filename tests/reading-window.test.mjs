import assert from 'node:assert/strict';
import test from 'node:test';
import { readingWindow } from '../src/lib/reading-window.ts';

const cards = Array.from({ length: 31 }, (_, index) => ({
  id: index,
  source: index % 2 ? 'X' : 'Web',
  month: index < 20 ? '2026-09' : '2026-08',
}));

test('initial reading batch exposes twelve cards while retaining the complete count', () => {
  const result = readingWindow(cards, { source: 'all', month: 'all', limit: 12 });
  assert.equal(result.total, 31);
  assert.deepEqual(result.visible.map((card) => card.id), Array.from({ length: 12 }, (_, i) => i));
});

test('filters search beyond the initially visible batch and intersect source with month', () => {
  const result = readingWindow(cards, { source: 'Web', month: '2026-08', limit: 12 });
  assert.equal(result.total, 6);
  assert.deepEqual(result.visible.map((card) => card.id), [20, 22, 24, 26, 28, 30]);
});

test('successive batches retain order through the final partial batch', () => {
  const result = readingWindow(cards, { source: 'all', month: 'all', limit: 36 });
  assert.deepEqual(result.visible, cards);
});

test('empty filter results contain no visible cards', () => {
  const result = readingWindow(cards, { source: 'GitHub', month: 'all', limit: 12 });
  assert.equal(result.total, 0);
  assert.deepEqual(result.visible, []);
});
