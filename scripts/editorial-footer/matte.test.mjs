import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { extractMatte } from './matte.mjs';

const fixture = fileURLToPath(new URL('./fixtures/reverse-paper.png', import.meta.url));

test('book paper remains opaque when the studio backdrop matches its color', async () => {
  // Given: actual H3 frame at six seconds with pale yellow background and intact paper.
  const { data, info } = await sharp(fixture).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // When: the unencoded matte is extracted.
  const { pixels } = extractMatte(data, info.width, info.height);
  // Then: both the vertical spine band and horizontal page band keep full coverage.
  for (const [x, y] of [[195, 220], [252, 246]]) {
    assert.equal(pixels[(y * info.width + x) * 4 + 3], 255, `paper at (${x},${y}) was erased`);
  }
});

test('the exterior below the cart remains transparent with interior preservation', async () => {
  // Given: the same real frame includes a cast shadow below the cart shelf.
  const { data, info } = await sharp(fixture).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // When: extracting its matte.
  const { pixels } = extractMatte(data, info.width, info.height);
  // Then: connected background and shadow do not become an opaque rectangle.
  for (const [x, y] of [[0, 0], [220, 294], [285, 310]]) assert.equal(pixels[(y * info.width + x) * 4 + 3], 0);
});

test('magenta enclosures are transparent while coral cheeks stay opaque', () => {
  // Given: opaque warm art encloses a magenta studio gap.
  const width = 48, height = 48, data = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set([255, 0, 255, 255], p * 4);
  for (let y = 10; y < 38; y++) for (let x = 10; x < 38; x++) data.set([140, 95, 50, 255], (y * width + x) * 4);
  for (let y = 18; y < 24; y++) for (let x = 18; x < 24; x++) data.set([255, 0, 255, 255], (y * width + x) * 4);
  data.set([232, 120, 103, 255], (30 * width + 30) * 4);
  // When: extracting the matte.
  const { pixels } = extractMatte(data, width, height);
  // Then: the forbidden key color clears, but the actual warm red detail survives.
  assert.equal(pixels[(20 * width + 20) * 4 + 3], 0);
  assert.equal(pixels[(30 * width + 30) * 4 + 3], 255);
});
