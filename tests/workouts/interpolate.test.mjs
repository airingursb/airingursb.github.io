import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpolateSeries } from '../../scripts/lib/workouts-interpolate.mjs';

const buckets = [
  { t: 0,   value: 100 },
  { t: 60,  value: 120 },
  { t: 120, value: 110 },
];

test('interpolateSeries returns first bucket value before series start', () => {
  assert.equal(interpolateSeries(buckets, -10), 100);
});

test('interpolateSeries returns last bucket value after series end', () => {
  assert.equal(interpolateSeries(buckets, 200), 110);
});

test('interpolateSeries returns exact value at bucket boundary', () => {
  assert.equal(interpolateSeries(buckets, 60), 120);
});

test('interpolateSeries linearly interpolates between buckets', () => {
  // halfway between t=0 (100) and t=60 (120) → 110
  assert.equal(interpolateSeries(buckets, 30), 110);
  // 1/4 between t=60 (120) and t=120 (110) → 117.5
  assert.equal(interpolateSeries(buckets, 75), 117.5);
});

test('interpolateSeries returns 0 for empty series', () => {
  assert.equal(interpolateSeries([], 30), 0);
});
