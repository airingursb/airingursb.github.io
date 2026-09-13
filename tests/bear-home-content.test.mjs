import test from 'node:test';
import assert from 'node:assert/strict';
import * as content from '../src/components/bear-study/content.ts';

const now = Date.parse('2026-09-13T12:00:00Z');
const syncedAt = '2026-09-12T12:00:00Z';
const known = { slug: 'kyoto', title: 'Kyoto', syncedAt, place: { countryCode: 'jp' } };

for (const [description, photos] of [
  ['empty collection', []],
  ['missing location', [{ slug: 'unlocated', syncedAt }]],
  ['empty country', [{ slug: 'unlocated', syncedAt, place: { countryCode: '  ' } }]],
  ['local country ignoring case', [{ slug: 'home', syncedAt, place: { countryCode: 'SG' } }]],
  ['missing date', [{ slug: 'trip', tags: ['travel'] }]],
  ['malformed date', [{ ...known, syncedAt: 'not-a-date' }]],
  ['invalid first date despite later sync', [{ ...known, firstSyncedAt: 'invalid' }]],
  ['blank slug', [{ ...known, slug: ' ' }]],
  ['parent path slug', [{ ...known, slug: '..' }]],
  ['current path slug', [{ ...known, slug: '.' }]],
  ['malformed unicode slug', [{ ...known, slug: '\uD800' }]],
]) {
  test(`no candidate is returned for ${description}`, () => {
    const result = content.latestTravelPhoto(photos, now);
    assert.equal(result, null);
  });
}

for (const travel of [{ place: { countryCode: ' JP ' } }, { tags: ['TRAVEL'] },
  { tags: ['旅行'] }, { place: { countryCode: 'sg' }, tags: ['travel'] }]) {
  test(`explicit travel evidence ${JSON.stringify(travel)} selects a photo`, () => {
    const photos = [{ slug: 'trip', syncedAt, ...travel }];
    const result = content.latestTravelPhoto(photos, now);
    assert.deepEqual(result, { href: '/photos/trip/', title: '旅行照片', publishedAt: Date.parse(syncedAt) });
  });
}

test('a future photo falls back to the latest valid earlier candidate', () => {
  const photos = [{ ...known, slug: 'future', syncedAt: '2026-09-14T00:00:00Z' }, known,
    { ...known, slug: 'older', syncedAt: '2026-09-11T00:00:00Z' }];
  const result = content.latestTravelPhoto(photos, now);
  assert.deepEqual(result, { href: '/photos/kyoto/', title: 'Kyoto', publishedAt: Date.parse(syncedAt) });
});

test('first publication time keeps reprocessed older photos behind newer publications', () => {
  const photos = [{ ...known, slug: 'reprocessed', firstSyncedAt: '2026-08-01T00:00:00Z', syncedAt: '2026-09-13T11:00:00Z' }, known];
  const result = content.latestTravelPhoto(photos, now);
  assert.equal(result?.href, '/photos/kyoto/');
});

test('the candidate retains first publication time for the separate freshness rule', () => {
  const photos = [{ ...known, firstSyncedAt: '2026-08-01T00:00:00Z' }];
  const result = content.latestTravelPhoto(photos, now);
  assert.equal(result?.publishedAt, Date.parse('2026-08-01T00:00:00Z'));
});

test('a photo published exactly now is eligible with an encoded path segment', () => {
  const photos = [{ ...known, slug: '京都 & 河', syncedAt: new Date(now).toISOString() }];
  const result = content.latestTravelPhoto(photos, now);
  assert.deepEqual(result, { href: '/photos/%E4%BA%AC%E9%83%BD%20%26%20%E6%B2%B3/', title: 'Kyoto', publishedAt: now });
});

test('the input array and photo records remain unchanged', () => {
  const photos = Object.freeze([Object.freeze(known)]);
  const result = content.latestTravelPhoto(photos, now);
  assert.equal(result?.href, '/photos/kyoto/');
});
