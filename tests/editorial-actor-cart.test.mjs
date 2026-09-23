import test from 'node:test';
import assert from 'node:assert/strict';
import { mountArchiveBookcart } from '../src/lib/editorial-actor-cart.ts';
import { fixture, manifest, settle } from './fixtures/editorial-actor.mjs';

test('named rests accumulate cart idle time across replays while excluding asset loading', async t => {
  let resolveRest;
  const ready = new Promise(resolve => { resolveRest = resolve; });
  const f = fixture({
    manifest: { ...manifest, clips: {
      arrival: { asset: 'arrival.webp', frames: 4, rest: 'arrival-rest' },
      bookmark: { asset: 'bookmark.webp', frames: 4, rest: 'arrival-rest' },
      'arrival-rest': { asset: 'arrival-rest.webp', frames: 2, loop: true },
    } },
    decode: url => url.endsWith('/arrival-rest.webp') ? ready : undefined,
  });
  const originalRandom = Math.random;
  const originalStorage = globalThis.sessionStorage;
  const storage = new Map();
  Math.random = () => 0;
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const replay = new EventTarget();
  const host = Object.assign(new EventTarget(), {
    dataset: {},
    querySelectorAll: () => [],
    querySelector: selector => selector === '[data-editorial-actor]' ? f.host : selector === '[data-cart-replay]' ? replay : null,
  });
  const starts = [];
  f.host.addEventListener('editorial-actor-start', event => starts.push(event.detail.clip));
  const dispose = mountArchiveBookcart(host);
  t.after(() => {
    resolveRest();
    dispose();
    Math.random = originalRandom;
    globalThis.sessionStorage = originalStorage;
  });
  f.intersect(true);
  await settle();
  f.step(0);
  f.step(400);
  await settle();
  f.step(10000);
  resolveRest();
  await settle();
  f.step(15000);
  f.step(20000);
  replay.dispatchEvent(new Event('click'));
  await settle();
  f.step(21000);
  f.step(21400);
  await settle();
  f.step(22000);
  f.step(34000);
  assert.equal(starts.filter(name => name === 'bookmark').length, 1);
  f.step(35000);
  await settle();
  assert.equal(starts.filter(name => name === 'bookmark').length, 2);
  assert.equal(storage.get('editorial-bookcart-surprise-v1'), 'used');
});
