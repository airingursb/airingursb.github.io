import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorialActor } from '../src/lib/editorial-actor.ts';
import { loadEditorialAtlas, parseEditorialManifest } from '../src/lib/editorial-actor-assets.ts';
import { fixture, manifest, settle } from './fixtures/editorial-actor.mjs';

test('manifest boundary rejects invalid frame data and remote asset URLs', () => {
  assert.ok(parseEditorialManifest(manifest));
  assert.equal(parseEditorialManifest({ ...manifest, fps: 0 }), null);
  assert.equal(parseEditorialManifest({ ...manifest, version: 2 }), null);
  assert.equal(parseEditorialManifest({ ...manifest, clips: { a: { asset: 'https://remote/atlas.webp', frames: 4 } } }), null);
  assert.equal(parseEditorialManifest({ ...manifest, columns: 1.5 }), null);
  assert.equal(parseEditorialManifest({ ...manifest, poster: '../other/poster.png' }), null);
});

test('reduced motion preserves poster without fetching even after explicit play', async () => {
  const f = fixture({ reduced: true });
  const actor = createEditorialActor(f.host);
  f.intersect(true, true);
  f.intersect(true);
  assert.equal(await actor.play('arrival'), false);
  assert.equal(f.requests.length, 0);
  assert.equal(f.canvas.hidden, true);
  actor.dispose();
});

test('manifest waits until nearby; duplicate plays are ignored and completion retains the final frame', async () => {
  const f = fixture();
  const actor = createEditorialActor(f.host);
  assert.equal(createEditorialActor(f.host), actor);
  assert.equal(f.requests.length, 0);
  f.intersect(true, true);
  await settle();
  assert.equal(f.requests.length, 1);
  f.intersect(true);
  const events = [];
  f.host.addEventListener('editorial-actor-start', event => events.push(`start:${event.detail.clip}`));
  f.host.addEventListener('editorial-actor-end', event => events.push(`end:${event.detail.clip}`));
  const playing = actor.play('arrival');
  assert.equal(await actor.play('arrival'), false);
  await settle();
  f.step(0);
  assert.equal(f.host.dataset.actorFrame, '0');
  assert.equal(f.host.style.aspectRatio, '208 / 128');
  assert.deepEqual([f.canvas.width, f.canvas.height], [manifest.width, manifest.height]);
  f.step(200);
  assert.equal(f.host.dataset.actorFrame, '2');
  f.step(400);
  assert.equal(await playing, true);
  assert.equal(f.host.dataset.actorState, 'quiet');
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.poster.style.visibility, 'hidden');
  assert.equal(f.host.dataset.actorFrame, '3');
  assert.deepEqual(events, ['start:arrival', 'end:arrival']);
  actor.dispose();
});

test('hidden and offscreen time does not advance elapsed performance time', async () => {
  const f = fixture();
  const actor = createEditorialActor(f.host);
  f.intersect(true);
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  f.step(100);
  f.intersect(false);
  f.step(50000);
  assert.equal(f.host.dataset.actorState, 'paused');
  assert.equal(f.host.dataset.actorFrame, '1');
  f.intersect(true);
  f.step(50100);
  assert.equal(f.host.dataset.actorFrame, '1');
  f.document.hidden = true;
  f.document.dispatchEvent(new Event('visibilitychange'));
  f.step(100000);
  f.document.hidden = false;
  f.document.dispatchEvent(new Event('visibilitychange'));
  f.step(100100);
  assert.equal(f.host.dataset.actorFrame, '1');
  f.step(100400);
  assert.equal(await playing, true);
  actor.dispose();
});

test('missing or failed media leaves the still intact and returns false', async () => {
  for (const options of [{ manifestFails: true }, { imageFails: true }]) {
    const f = fixture(options);
    const actor = createEditorialActor(f.host);
    assert.equal(await actor.play('arrival'), false);
    assert.equal(f.host.dataset.actorState, 'unavailable');
    assert.equal(f.canvas.hidden, true);
    assert.equal(f.poster.style.visibility, '');
    actor.dispose();
  }
});

test('stop settles a running gesture, and changing reduced motion prevents later playback', async () => {
  const f = fixture();
  const actor = createEditorialActor(f.host);
  f.intersect(true);
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  actor.stop();
  assert.equal(await playing, false);
  f.motion.matches = true;
  f.motion.dispatchEvent(new Event('change'));
  assert.equal(await actor.play('arrival'), false);
  assert.equal(f.canvas.hidden, true);
  actor.dispose();
  assert.equal(await actor.play('arrival'), false);
});

test('decoded atlas cache reuses two recent resources and evicts the least recent', async () => {
  const f = fixture();
  const a = await loadEditorialAtlas('/cache/a.webp');
  await loadEditorialAtlas('/cache/b.webp');
  assert.equal(await loadEditorialAtlas('/cache/a.webp'), a);
  await loadEditorialAtlas('/cache/c.webp');
  await loadEditorialAtlas('/cache/b.webp');
  assert.deepEqual(f.decoded, ['/cache/a.webp', '/cache/b.webp', '/cache/c.webp', '/cache/b.webp']);
});
