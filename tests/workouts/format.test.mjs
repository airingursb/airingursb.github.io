// tests/workouts/format.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPace, formatDistance, formatDuration, formatPaceSecPerKm }
  from '../../src/components/workouts/format.mjs';

test('formatPace renders mm\'ss" from sec/km', () => {
  assert.equal(formatPace(1216), `20'16"`);   // 20:16 per km
  assert.equal(formatPace(354),  `5'54"`);
  assert.equal(formatPace(0),    `—`);
});

test('formatDistance', () => {
  assert.equal(formatDistance(6.51), '6.51 km');
  assert.equal(formatDistance(0),    '—');
});

test('formatDuration h:mm:ss', () => {
  assert.equal(formatDuration(7910), '2:11:50');
  assert.equal(formatDuration(354),  '0:05:54');
});

test('formatPaceSecPerKm rounds and renders short form', () => {
  // 3.0 km/h ≈ 1200 sec/km → 20'00"
  assert.equal(formatPaceSecPerKm(1200), `20'00"`);
});
