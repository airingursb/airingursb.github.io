import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { parseEditorialManifest } from '../src/lib/editorial-actor-assets.ts';
import { mountFooterTide } from '../src/components/footer-tide/controller.ts';
import { fixture, manifest, settle } from './fixtures/editorial-actor.mjs';

function shoreline(options = {}) {
  const f = fixture({ ...options, manifest: { ...manifest, clips: {
    wave: { asset: 'wave.webp', frames: 4, rest: 'idle' },
    listen: { asset: 'listen.webp', frames: 4, rest: 'idle' },
    idle: { asset: 'idle.webp', frames: 2, loop: true },
  } } });
  const attrs = new Map();
  const shell = Object.assign(new EventTarget(), {
    hidden: true,
    setAttribute: (name, value) => attrs.set(name, value),
    removeAttribute: name => attrs.delete(name),
  });
  const host = Object.assign(new EventTarget(), {
    dataset: {},
    querySelector: selector => selector === '[data-editorial-actor]' ? f.host
      : selector === '[data-tide-shell]' ? shell : f.poster,
  });
  const starts = [];
  f.host.addEventListener('editorial-actor-start', event => starts.push(event.detail.clip));
  return { ...f, host, shell, starts, dispose: mountFooterTide(host) };
}

test('footer dwell survives leaving, then shell action completes once before accepting another tap', async t => {
  const f = shoreline();
  t.after(f.dispose);
  f.intersect(true);
  f.step(0);
  f.step(1000);
  f.intersect(false);
  f.step(20000);
  assert.deepEqual(f.starts, []);
  f.intersect(true);
  f.step(21000);
  f.step(21800);
  await settle();
  assert.deepEqual(f.starts, ['wave']);
  assert.equal(f.shell.hidden, true);
  f.step(22000);
  f.step(22400);
  await settle();
  assert.equal(f.host.dataset.tideState, 'ready');
  assert.equal(f.shell.hidden, false);
  f.shell.dispatchEvent(new Event('click'));
  f.shell.dispatchEvent(new Event('click'));
  await settle();
  assert.equal(f.starts.filter(clip => clip === 'listen').length, 1);
  f.step(23000);
  f.step(23400);
  await settle();
  assert.equal(f.host.dataset.tideState, 'ready');
  assert.equal(f.starts.at(-1), 'idle');
  f.shell.dispatchEvent(new Event('click'));
  await settle();
  assert.equal(f.starts.filter(clip => clip === 'listen').length, 2);
});

test('reduced motion retains a shell interaction without requesting motion assets', async t => {
  const f = shoreline({ reduced: true });
  t.after(f.dispose);
  assert.equal(f.shell.hidden, false);
  f.intersect(true);
  f.shell.dispatchEvent(new Event('click'));
  await settle();
  assert.equal(f.poster.src, '/blog-delights/tide/listening.webp');
  assert.deepEqual(f.requests, []);
  assert.deepEqual(f.starts, []);
});

test('all shipped tide frames fit the shared player and retain clean transparent borders', async () => {
  const assets = new URL('../public/blog-delights/tide/', import.meta.url);
  const spec = parseEditorialManifest(JSON.parse(await readFile(new URL('manifest.json', assets), 'utf8')));
  assert.ok(spec);
  for (const clip of Object.values(spec.clips)) {
    const { data, info } = await sharp(await readFile(new URL(clip.asset, assets))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, spec.width * spec.columns);
    assert.equal(info.height, spec.height * Math.ceil(clip.frames / spec.columns));
    let clipped = 0;
    let keyPixels = 0;
    for (let frame = 0; frame < clip.frames; frame++) {
      for (let y = 0; y < spec.height; y++) for (let x = 0; x < spec.width; x++) {
        const offset = ((Math.floor(frame / spec.columns) * spec.height + y) * info.width + frame % spec.columns * spec.width + x) * 4;
        if (data[offset + 3] <= 32) continue;
        if (!x || !y || x === spec.width - 1 || y === spec.height - 1) clipped++;
        if (data[offset] > data[offset + 1] + 45 && data[offset + 2] > data[offset + 1] + 45) keyPixels++;
      }
    }
    assert.equal(clipped, 0, `${clip.asset} crops an opaque edge`);
    assert.equal(keyPixels, 0, `${clip.asset} retains magenta key spill`);
  }
});
