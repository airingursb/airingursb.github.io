import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

const home = read('src/pages/index.astro');
const start = home.indexOf('id="photos-card"');
const card = home.slice(start, home.indexOf('<FootprintsCard', start));

// 2026-11-04: iOS Safari auto-linked the photo id after `$ exif` (e.g. 20260321-192281) as a phone number.
test('site head disables iOS telephone/date data detection', () => {
  for (const p of ['src/layouts/BaseLayout.astro', 'src/layouts/DioramaLayout.astro']) {
    assert.match(read(p), /<meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/, p);
  }
});

test('exif id renders as plain terminal text, and data-detector links are neutralised', () => {
  assert.match(card, /exif <span class="ph-exif-id">\{openPhoto\.slug\}<\/span>/);
  assert.match(card, /exif <span class="ph-exif-id">' \+ esc\(p\.slug\)/);
  const css = read('src/styles/global.css');
  assert.match(css, /a\[x-apple-data-detectors\]\s*\{[^}]*color: inherit !important;[^}]*text-decoration: none !important;/);
  assert.match(css, /\.ph-exif-id,[\s\S]*?text-decoration: none;/);
});

// 2026-11-04: tapping a thumbnail navigated to /photos/<slug>; it should swap the open photo in place.
test('photo thumbnails and swatches are in-card buttons, not navigation links', () => {
  assert.doesNotMatch(card, /<a[^>]*class:list=\{\['ph-(thumb|swatch)'/);
  const buttons = card.match(/<button\s+type="button"\s+class:list=\{\['ph-(thumb|swatch)'[\s\S]*?>/g) || [];
  assert.equal(buttons.length, 2);
  for (const b of buttons) {
    assert.match(b, /aria-pressed=/);
    assert.doesNotMatch(b, /href=/);
  }
  assert.match(card, /addEventListener\('click', function \(e\) \{ e\.preventDefault\(\); show\(i\); \}\)/);
  assert.match(card, /setAttribute\('aria-pressed'/);
});

test('the big photo and View all still open the photo pages', () => {
  assert.match(card, /<a class="ph-main" id="phMain" href=\{`\/photos\/\$\{openPhoto\.slug\}`\}/);
  assert.match(card, /<a class="photos-strip-more" href="\/photos"/);
});

test('switching a thumbnail repoints the big photo link and exif id to the shown photo', () => {
  const show = card.slice(card.indexOf('function show(i)'), card.indexOf('var canHover'));
  assert.match(show, /var p = photoView\[i\];/);
  assert.match(show, /main\.href = '\/photos\/' \+ p\.slug;/);
  assert.match(show, /exif <span class="ph-exif-id">' \+ esc\(p\.slug\)/);
  assert.match(show, /img\.src = p\.webp;/);
  assert.match(show, /avif\.srcset = p\.avif;/);
});
