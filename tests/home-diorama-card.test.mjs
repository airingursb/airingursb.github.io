import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

// 2026-10-26: the 日常箱庭 entry card was taken off the homepage; the collection itself stays live.
test('homepage no longer renders the 日常箱庭 (diorama) entry card', () => {
  const home = read('src/pages/index.astro');
  assert.doesNotMatch(home, /DioramaShelf|home-diorama-card/);
});

test('diorama collection and scene pages are still routed', () => {
  for (const p of ['src/pages/diorama.astro', 'src/pages/diorama/rainy-marina-bay.astro', 'src/components/diorama/DioramaShelf.astro']) {
    assert.ok(existsSync(new URL(p, root)), p);
  }
});
