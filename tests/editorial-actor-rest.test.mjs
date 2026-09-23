import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorialActor } from '../src/lib/editorial-actor.ts';
import { parseEditorialManifest } from '../src/lib/editorial-actor-assets.ts';
import { fixture, manifest, settle } from './fixtures/editorial-actor.mjs';

const rested = {
  ...manifest,
  clips: {
    arrival: { asset: 'arrival.webp', frames: 4, rest: 'arrival-rest' },
    'arrival-rest': { asset: 'arrival-rest.webp', frames: 2, loop: true },
    bookmark: { asset: 'bookmark.webp', frames: 4 },
  },
};

test('manifest keeps a per-clip rest target and rejects invalid rest types', () => {
  assert.equal(parseEditorialManifest(rested)?.clips.arrival.rest, 'arrival-rest');
  assert.equal(parseEditorialManifest({ ...manifest, clips: { arrival: { ...manifest.clips.arrival, rest: 12 } } }), null);
});

test('one-shot holds its exact final frame while named rest decodes, then loops without clearing canvas', async t => {
  let resolveRest;
  const ready = new Promise(resolve => { resolveRest = resolve; });
  const f = fixture({ manifest: rested, decode: url => url.endsWith('/arrival-rest.webp') ? ready : undefined });
  const actor = createEditorialActor(f.host);
  t.after(() => { resolveRest(); actor.dispose(); });
  const starts = [];
  f.host.addEventListener('editorial-actor-start', event => starts.push(event.detail.clip));
  f.intersect(true);
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  f.step(400);
  assert.equal(await playing, true);
  await settle();
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.poster.style.visibility, 'hidden');
  assert.equal(f.host.dataset.actorFrame, '3');
  assert.equal(f.host.dataset.actorState, 'loading');
  const resizes = f.canvasResizes;
  resolveRest();
  await settle();
  assert.equal(f.canvasResizes, resizes);
  assert.deepEqual(starts, ['arrival', 'arrival-rest']);
  f.step(500);
  f.step(1000);
  assert.equal(f.host.dataset.actorState, 'quiet');
  assert.equal(f.host.dataset.actorFrame, '1');
  assert.equal(f.draws.at(-1)[0].src.endsWith('/arrival-rest.webp'), true);
});

test('interrupting a named loop preserves its frame until the requested action can draw', async t => {
  let resolveAction;
  const ready = new Promise(resolve => { resolveAction = resolve; });
  const f = fixture({ manifest: rested, decode: url => url.endsWith('/bookmark.webp') ? ready : undefined });
  const actor = createEditorialActor(f.host);
  t.after(() => { resolveAction(); actor.dispose(); });
  f.intersect(true);
  const resting = actor.play('arrival-rest');
  await settle();
  f.step(0);
  f.step(100);
  assert.equal(f.host.dataset.actorState, 'quiet');
  const drawing = f.draws.at(-1);
  const action = actor.play('bookmark');
  assert.equal(await resting, false);
  await settle();
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.poster.style.visibility, 'hidden');
  assert.equal(f.draws.at(-1), drawing);
  assert.equal(f.host.dataset.actorState, 'loading');
  const resizes = f.canvasResizes;
  resolveAction();
  await settle();
  assert.equal(f.canvasResizes, resizes);
  f.step(200);
  assert.equal(f.draws.at(-1)[0].src.endsWith('/bookmark.webp'), true);
  actor.stop();
  assert.equal(await action, false);
  assert.equal(f.canvas.hidden, true);
});

test('rest decoding failure retains the last valid frame; reduced motion still restores poster', async t => {
  const f = fixture({ manifest: rested, decode: url => {
    if (url.endsWith('/arrival-rest.webp')) throw new Error('missing rest');
  } });
  const actor = createEditorialActor(f.host);
  t.after(() => actor.dispose());
  f.intersect(true);
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  f.step(400);
  await playing;
  await settle();
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.host.dataset.actorFrame, '3');
  assert.equal(f.host.dataset.actorState, 'unavailable');
  f.motion.matches = true;
  f.motion.dispatchEvent(new Event('change'));
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.poster.style.visibility, '');
});

test('idle remains the fallback rest and stopping during its decode prevents a late restart', async t => {
  let resolveIdle;
  const ready = new Promise(resolve => { resolveIdle = resolve; });
  const f = fixture({
    manifest: { ...manifest, clips: { ...manifest.clips, idle: { asset: 'idle.webp', frames: 2, loop: true } } },
    decode: url => url.endsWith('/idle.webp') ? ready : undefined,
  });
  const actor = createEditorialActor(f.host);
  t.after(() => { resolveIdle(); actor.dispose(); });
  f.intersect(true);
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  f.step(400);
  assert.equal(await playing, true);
  await settle();
  assert.equal(f.decoded.at(-1).endsWith('/idle.webp'), true);
  assert.equal(f.canvas.hidden, false);
  actor.stop();
  resolveIdle();
  await settle();
  f.step(500);
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.host.dataset.actorState, 'poster');
});

test('a failed rest announces its clip once while retaining the finished action', async t => {
  // Given: the requested action is available but its rest atlas fails.
  const f = fixture({ manifest: rested, decode: url => {
    if (url.endsWith('/arrival-rest.webp')) throw new Error('missing rest');
  } });
  const actor = createEditorialActor(f.host);
  t.after(() => actor.dispose());
  const failed = [];
  f.host.addEventListener('editorial-actor-unavailable', event => failed.push(event.detail.clip));
  f.intersect(true);
  // When: the one-shot completes and tries to settle.
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  f.step(400);
  await playing;
  await settle();
  // Then: consumers can continue a pending user action without losing the last valid drawing.
  assert.deepEqual(failed, ['arrival-rest']);
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.host.dataset.actorFrame, '3');
});

test('finishing sooner reaches the authored final frame without accelerating the next action', async t => {
  // Given: a one-shot is part way through its gesture.
  const f = fixture({ manifest: { ...rested, clips: { ...rested.clips, arrival: { asset: 'arrival.webp', frames: 4 } } } });
  const actor = createEditorialActor(f.host);
  t.after(() => actor.dispose());
  f.intersect(true);
  const playing = actor.play('arrival');
  await settle();
  f.step(0);
  f.step(100);
  // When: a user action requests the current gesture finish promptly.
  actor.finishSoon();
  f.step(200);
  // Then: the gesture reaches its complete last frame, and the next clip plays at normal speed.
  assert.equal(await playing, true);
  assert.equal(f.host.dataset.actorFrame, '3');
  const next = actor.play('bookmark');
  await settle();
  f.step(300);
  f.step(400);
  assert.equal(f.host.dataset.actorFrame, '1');
  actor.stop();
  await next;
});

test('a finish-soon request during idle loading cannot accelerate the idle loop', async t => {
  // Given: a named rest has not finished decoding.
  let resolveRest;
  const ready = new Promise(resolve => { resolveRest = resolve; });
  const f = fixture({ manifest: rested, decode: () => ready });
  const actor = createEditorialActor(f.host);
  t.after(() => { resolveRest(); actor.dispose(); });
  f.intersect(true);
  const resting = actor.play('arrival-rest');
  await settle();
  // When: finishing soon is requested before the runtime can identify the idle performance.
  actor.finishSoon();
  resolveRest();
  await settle();
  f.step(0);
  f.step(50);
  // Then: the rest uses its normal frame clock.
  assert.equal(f.host.dataset.actorFrame, '0');
  actor.stop();
  await resting;
});
