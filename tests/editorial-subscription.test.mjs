import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subscribeToNewspaper } from '../src/components/editorial/newspaper-subscription-service.ts';

const request = { email: 'reader@example.test', lang: 'en' };

test('newsletter sends the existing email and language payload once', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://chat.ursb.me/api/subscribe');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), request);
    assert.equal(options.headers['Content-Type'], 'application/json');
    return Response.json({ ok: true, alreadySubscribed: false });
  });
  assert.deepEqual(await subscribeToNewspaper(request, new AbortController().signal), { status: 'confirmed' });
  assert.equal(fetch.mock.callCount(), 1);
});

test('an existing subscriber does not produce a new subscription result', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true, alreadySubscribed: true }));
  assert.deepEqual(await subscribeToNewspaper(request, new AbortController().signal), { status: 'already' });
});

for (const body of [{}, { ok: false, alreadySubscribed: false }, { ok: true }, { ok: true, alreadySubscribed: 'false' }]) {
  test(`HTTP success cannot confirm malformed application response ${JSON.stringify(body)}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(body));
    assert.deepEqual(await subscribeToNewspaper(request, new AbortController().signal), { status: 'error', reason: 'unavailable' });
  });
}

for (const [status, reason] of [[400, 'invalidEmail'], [403, 'limited'], [429, 'limited'], [500, 'unavailable']]) {
  test(`HTTP ${status} cannot trigger confirmation even with success-shaped body`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true, alreadySubscribed: false }, { status }));
    assert.deepEqual(await subscribeToNewspaper(request, new AbortController().signal), { status: 'error', reason });
  });
}

test('unparseable JSON and connection failure remain retryable errors', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('temporarily unavailable'));
  assert.deepEqual(await subscribeToNewspaper(request, new AbortController().signal), { status: 'error', reason: 'unavailable' });
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  assert.deepEqual(await subscribeToNewspaper(request, new AbortController().signal), { status: 'error', reason: 'network' });
});

test('request lifetime cancellation reaches the transport', async (t) => {
  const lifetime = new AbortController();
  lifetime.abort();
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.signal.aborted, true);
    options.signal.throwIfAborted();
  });
  assert.deepEqual(await subscribeToNewspaper(request, lifetime.signal), { status: 'error', reason: 'network' });
});
