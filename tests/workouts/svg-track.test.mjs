import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTrackSvg } from '../../scripts/lib/workouts-svg-track.mjs';

test('generateTrackSvg returns empty string for empty/short routes', () => {
  assert.equal(generateTrackSvg([]), '');
  assert.equal(generateTrackSvg([{ lat: 0, lng: 0 }]), '');
});

test('generateTrackSvg fits a horizontal line to viewBox 100x60 with 4px padding', () => {
  // two points → straight horizontal at constant lat
  const d = generateTrackSvg([
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
  ]);
  // x range 4..96 (4px pad each side), y centered at 30
  assert.match(d, /^M 4(?:\.0+)? 30(?:\.0+)? L 96(?:\.0+)? 30(?:\.0+)?$/);
});

test('generateTrackSvg flips y so larger lat = higher on screen (lower y)', () => {
  const d = generateTrackSvg([
    { lat: 0, lng: 0 },
    { lat: 1, lng: 0 },
  ]);
  // x constant at 50 (midpoint of vertical line in horizontal direction)
  // first point (lat=0) → bottom, last (lat=1) → top
  const matches = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
  // matches: [x1, y1, x2, y2]
  const [x1, y1, x2, y2] = matches;
  assert.equal(x1, x2, 'vertical line same x');
  assert.ok(y1 > y2, 'first lat=0 (south) should be higher y (lower on screen)');
});
