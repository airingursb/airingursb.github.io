import test from 'node:test';
import assert from 'node:assert/strict';
import { mountArchiveBookcart } from '../src/lib/editorial-actor-cart.ts';
import { fixture, manifest, settle } from './fixtures/editorial-actor.mjs';

const clips = Object.fromEntries(['arrival', 'retrieve-upper', 'retrieve-lower', 'return-upper', 'return-lower']
  .flatMap(name => [[name, { asset: `${name}.webp`, frames: 4, rest: `${name}-rest` }],
    [`${name}-rest`, { asset: `${name}-rest.webp`, frames: 2, loop: true }]]));

function cart(t, options = {}) {
  const f = fixture({ ...options, manifest: { ...manifest, clips } });
  const originalStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: () => 'skip', setItem() {} };
  const years = ['2026', '2025', '2020', '2016'].map((year, index) => Object.assign(new EventTarget(), {
    open: false, dataset: { cartYear: year, cartShelf: index < 2 ? 'upper' : 'lower' },
  }));
  const replay = new EventTarget();
  const marker = { hidden: true, textContent: '' };
  const host = Object.assign(new EventTarget(), {
    dataset: {}, querySelectorAll: () => years,
    querySelector: selector => ({ '[data-editorial-actor]': f.host, '[data-cart-replay]': replay,
      '[data-cart-selection]': marker })[selector] ?? null,
  });
  const starts = [];
  f.host.addEventListener('editorial-actor-start', event => starts.push(event.detail.clip));
  const dispose = mountArchiveBookcart(host);
  t.after(() => { dispose(); globalThis.sessionStorage = originalStorage; });
  return { ...f, host, marker, years, replay, starts,
    select(year) {
      years.forEach(detail => { detail.open = detail.dataset.cartYear === year; });
      years[0].dispatchEvent(new Event('toggle'));
    },
  };
}

async function finish(f, now) {
  f.step(now);
  f.step(now + 400);
  await settle();
}

test('a year discloses immediately while its retrieval waits for the current arrival', async t => {
  // Given: the cart is still arriving.
  const f = cart(t);
  f.intersect(true);
  await settle();
  // When: the reader selects an early year.
  f.select('2020');
  await settle();
  // Then: selection is immediate and the physical action follows the arrival.
  assert.equal(f.years[2].open, true);
  assert.equal(f.marker.textContent, '2020');
  assert.equal(f.marker.hidden, false);
  assert.deepEqual(f.starts, ['arrival']);
  await finish(f, 0);
  assert.equal(f.starts.at(-1), 'retrieve-lower');
  assert.equal(f.poster.style.visibility, 'hidden');
});

test('rapid year changes return the held book and retrieve only the final requested year', async t => {
  // Given: the bear holds the upper-shelf 2026 book.
  const f = cart(t);
  f.select('2026');
  f.intersect(true);
  await settle();
  await finish(f, 0);
  // When: the reader changes their mind several times during the return.
  f.select('2020');
  await settle();
  f.select('2016');
  f.select('2025');
  await finish(f, 500);
  await finish(f, 1000);
  // Then: intermediate years never get a retrieval, and the physical held state catches up.
  assert.deepEqual(f.starts.filter(name => !name.endsWith('-rest')), ['retrieve-upper', 'return-upper', 'retrieve-upper']);
  assert.equal(f.host.dataset.cartHeldYear, '2025');
  assert.equal(f.marker.textContent, '2025');
});

test('changing year mid-retrieval finishes and returns that book before taking the latest one', async t => {
  // Given: an upper-shelf retrieval is underway.
  const f = cart(t);
  f.select('2026');
  f.intersect(true);
  await settle();
  // When: the reader requests an older year before the first book arrives.
  f.select('2020');
  f.select('2016');
  await finish(f, 0);
  await finish(f, 500);
  await finish(f, 1000);
  // Then: the held prop is returned before the latest lower-shelf retrieval.
  assert.deepEqual(f.starts.filter(name => !name.endsWith('-rest')), ['retrieve-upper', 'return-upper', 'retrieve-lower']);
  assert.equal(f.host.dataset.cartHeldYear, '2016');
});

test('closing the selected year returns its book to the same shelf', async t => {
  // Given: the bear holds a lower-shelf book.
  const f = cart(t);
  f.select('2020');
  f.intersect(true);
  await settle();
  await finish(f, 0);
  // When: the selected disclosure closes.
  f.select(null);
  await settle();
  await finish(f, 500);
  // Then: the marker disappears immediately and the bear returns to an empty-handed rest.
  assert.equal(f.marker.hidden, true);
  assert.equal(f.host.dataset.cartHeldYear, undefined);
  assert.equal(f.starts.at(-1), 'return-lower-rest');
});

test('reduced motion keeps the native selection and marker without requesting motion assets', async t => {
  // Given: the reader requests reduced motion.
  const f = cart(t, { reduced: true });
  f.intersect(true);
  // When: the reader opens a year.
  f.select('2025');
  await settle();
  // Then: the archive is usable with a complete poster and no animation network requests.
  assert.equal(f.marker.textContent, '2025');
  assert.equal(f.years[1].open, true);
  assert.equal(f.canvas.hidden, true);
  assert.deepEqual(f.requests, []);
  assert.deepEqual(f.decoded, []);
});

test('enabling reduced motion mid-retrieval clears held state and later resumes the latest selection', async t => {
  // Given: a retrieval is underway and another year is queued as the latest selection.
  const f = cart(t);
  f.select('2026');
  f.intersect(true);
  await settle();
  f.select('2020');
  // When: motion is disabled and then enabled again.
  f.motion.matches = true;
  f.motion.dispatchEvent(new Event('change'));
  await settle();
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.host.dataset.cartHeldYear, undefined);
  f.motion.matches = false;
  f.motion.dispatchEvent(new Event('change'));
  await settle();
  await finish(f, 0);
  // Then: the latest selected year is retrieved from the initial empty-handed pose.
  assert.equal(f.starts.at(-2), 'retrieve-lower');
  assert.equal(f.host.dataset.cartHeldYear, '2020');
});

test('a failed retrieval preserves the selected archive without an automatic retry loop', async t => {
  // Given: the image server cannot supply the retrieval atlas.
  const f = cart(t, { imageFails: true });
  f.intersect(true);
  await settle();
  // When: a reader requests a year.
  f.select('2026');
  await settle();
  // Then: the real year remains selected and failure does not claim a held book or spin requests.
  assert.equal(f.marker.textContent, '2026');
  assert.equal(f.years[0].open, true);
  assert.equal(f.host.dataset.cartHeldYear, undefined);
  assert.equal(f.decoded.filter(url => url.endsWith('retrieve-upper.webp')).length, 1);
});

test('a quick reduced-motion toggle cannot strand the last selected year', async t => {
  // Given: a retrieval is running.
  const f = cart(t);
  f.select('2026');
  f.intersect(true);
  await settle();
  // When: motion is disabled and re-enabled before the cancelled promise settles.
  f.motion.matches = true;
  f.motion.dispatchEvent(new Event('change'));
  f.motion.matches = false;
  f.motion.dispatchEvent(new Event('change'));
  await settle();
  await finish(f, 0);
  // Then: the selected retrieval restarts instead of leaving a permanently static poster.
  assert.equal(f.host.dataset.cartHeldYear, '2026');
  assert.equal(f.starts.filter(name => name === 'retrieve-upper').length, 2);
});

test('a hidden retrieval resumes its remaining gesture before the latest selected year', async t => {
  // Given: the upper-shelf book is being retrieved.
  const f = cart(t);
  f.select('2026');
  f.intersect(true);
  await settle();
  f.step(0);
  f.step(100);
  // When: the tab hides while another year becomes the latest request.
  f.document.hidden = true;
  f.document.dispatchEvent(new Event('visibilitychange'));
  f.select('2020');
  f.step(2000);
  assert.deepEqual(f.starts, ['retrieve-upper']);
  f.document.hidden = false;
  f.document.dispatchEvent(new Event('visibilitychange'));
  await finish(f, 3000);
  await finish(f, 3500);
  await finish(f, 4000);
  // Then: the first book is returned, with no background jump or abandoned selection.
  assert.deepEqual(f.starts.filter(name => !name.endsWith('-rest')), ['retrieve-upper', 'return-upper', 'retrieve-lower']);
  assert.equal(f.host.dataset.cartHeldYear, '2020');
});

test('rest failure releases the latest pending year without retrying the failed rest', async t => {
  // Given: the held-book rest is loading while another year is requested.
  let rejectRest;
  const rest = new Promise((resolve, reject) => { rejectRest = reject; });
  const f = cart(t, { decode: url => url.endsWith('/retrieve-upper-rest.webp') ? rest : undefined });
  f.select('2026');
  f.intersect(true);
  await settle();
  await finish(f, 0);
  f.select('2020');
  // When: that idle atlas fails.
  rejectRest(new Error('rest unavailable'));
  await settle();
  await finish(f, 500);
  await finish(f, 1000);
  // Then: the old book is returned and the new book arrives once; idle failure does not strand input.
  assert.equal(f.host.dataset.cartHeldYear, '2020');
  assert.equal(f.decoded.filter(url => url.endsWith('/retrieve-upper-rest.webp')).length, 1);
});

test('duplicate native toggle events do not accelerate a newly requested retrieval', async t => {
  // Given: native exclusive details reports both old-close and new-open for one selection.
  const f = cart(t);
  f.select('2026');
  f.intersect(true);
  // When: the second event reports the same selected year while its atlas is loading.
  f.select('2026');
  await settle();
  f.step(0);
  f.step(100);
  // Then: the new gesture stays at normal speed; only the previous gesture is accelerated.
  assert.equal(f.host.querySelector('[data-editorial-actor]').dataset.actorFrame, '1');
});
