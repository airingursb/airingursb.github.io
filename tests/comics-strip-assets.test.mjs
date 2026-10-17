import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { encodeStripWebp, nextStripVersion, stripKeys } from '../comics-studio/strip-assets.mjs';

test('encodes a strip PNG as a smaller WebP with the same dimensions', async () => {
  // Ink lines and flat fills on cream paper, like a real strip.
  const strokes = Array.from({ length: 40 }, (_, i) =>
    `<path d="M${i * 8} 10 Q ${160 + i} ${100 - i} ${320 - i * 7} 190" stroke="#222" stroke-width="${1 + (i % 4)}" fill="none"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
    <rect width="320" height="200" fill="#f6efe2"/><circle cx="90" cy="90" r="50" fill="#2f5fb3"/>
    <rect x="180" y="40" width="90" height="60" fill="#f08a3c"/>${strokes}</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  const webp = await encodeStripWebp(png);
  const meta = await sharp(webp.body).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(webp.width, 320);
  assert.equal(webp.height, 200);
  assert.ok(webp.body.length < png.length);
});

test('next version follows the current strip URL', () => {
  assert.equal(nextStripVersion('https://r2.example/strip/abc/v1/strip.png'), 2);
  assert.equal(nextStripVersion('https://r2.example/strip/abc/v3/strip.webp'), 4);
  assert.equal(nextStripVersion(''), 1);
  assert.equal(nextStripVersion(undefined), 1);
});

test('keeps PNG and WebP side by side under one version folder', () => {
  assert.deepEqual(stripKeys('abc', 2), {
    png: 'strip/abc/v2/strip.png',
    webp: 'strip/abc/v2/strip.webp',
  });
});
