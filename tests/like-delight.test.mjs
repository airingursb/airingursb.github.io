import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { heartPosition, rectangleVisible } from '../src/components/like-delight/geometry.ts';
import { extractMatte } from '../scripts/editorial-footer/matte.mjs';

const layout = await readFile(new URL('../src/layouts/PostLayout.astro', import.meta.url), 'utf8');
const handler = layout.slice(layout.indexOf("  articleLikeBtn.addEventListener('click', function() {"), layout.indexOf('  // BOTTOM COMMENTS'));

function likeFixture({ liked = false, response, reject = false } = {}) {
  const events = [];
  let click;
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const count = { textContent: liked ? '1' : '0' };
  const button = {
    addEventListener: (_, callback) => { click = callback; },
    classList: { toggle() {} },
    querySelector: () => ({ setAttribute() {} }),
    dispatchEvent: event => events.push(event.type),
  };
  vm.runInNewContext(handler, {
    articleLiked: liked, articleLikeBtn: button, articleLikeCount: count, POST_SLUG: 'fixture',
    apiPost: () => pending.then(() => { if (reject) throw new Error('offline'); return response; }),
    document: { getElementById: () => null }, CustomEvent,
    localStorage: { getItem: () => '[]', setItem() {} },
  });
  return { events, count, click: () => click(), finish: async () => { resolve(); for (let i = 0; i < 5; i++) await Promise.resolve(); } };
}

test('optimistic like waits for real acknowledgement before the panda receives it', async () => {
  const f = likeFixture({ response: { liked: true, count: 1 } });
  f.click();
  assert.equal(Number(f.count.textContent), 1);
  assert.deepEqual(f.events, []);
  await f.finish();
  assert.deepEqual(f.events, ['article:liked']);
});

test('unlike, server-declined like and failed request never celebrate', async () => {
  for (const options of [{ liked: true, response: { liked: false, count: 0 } }, { response: { liked: false, count: 0 } }, { reject: true }]) {
    const f = likeFixture(options);
    f.click();
    await f.finish();
    assert.deepEqual(f.events, []);
  }
});

test('heart path preserves both endpoints and targets only fully visible recipients', () => {
  const from = { x: 40, y: 200 }, to = { x: 400, y: 100 };
  assert.deepEqual(heartPosition(from, to, 0), from);
  assert.deepEqual(heartPosition(from, to, 1), to);
  assert.ok(heartPosition(from, to, .5).y < 150);
  assert.equal(rectangleVisible({ left: 0, right: 96, top: 750, bottom: 846, width: 96, height: 96 }, 375, 844), false);
  assert.equal(rectangleVisible({ left: 0, right: 96, top: 700, bottom: 796, width: 96, height: 96 }, 375, 844), true);
});

test('solid studio extraction retains warm dark paws instead of treating them as floor shadow', () => {
  const width = 80, height = 80, raw = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) raw.set([95, 179, 207, 255], p * 4);
  for (let y = 55; y < 76; y++) for (let x = 24; x < 57; x++) raw.set([83, 75, 72, 255], (y * width + x) * 4);
  const { pixels } = extractMatte(raw, width, height, { shadows: false });
  assert.equal(pixels[(68 * width + 40) * 4 + 3], 255);
  assert.equal(pixels[3], 0);
});
