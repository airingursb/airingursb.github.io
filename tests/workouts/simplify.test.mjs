import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simplifyRoute } from '../../scripts/lib/workouts-simplify.mjs';

test('simplifyRoute returns endpoints unchanged for ≤2 points', () => {
  const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
  assert.deepEqual(simplifyRoute(pts, 0.001), pts);
});

test('simplifyRoute drops collinear interior points', () => {
  const pts = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 0, lng: 2 },
    { lat: 0, lng: 3 },
  ];
  const out = simplifyRoute(pts, 0.0001);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], pts[0]);
  assert.deepEqual(out[1], pts[3]);
});

test('simplifyRoute preserves a sharp corner', () => {
  const pts = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },     // 90° corner
    { lat: 1, lng: 2 },
  ];
  const out = simplifyRoute(pts, 0.0001);
  assert.equal(out.length, 4);
});

test('simplifyRoute target ~600 points reduces a 5000-point smooth curve', () => {
  const pts = [];
  for (let i = 0; i < 5000; i++) {
    pts.push({ lat: Math.sin(i / 100) * 0.01, lng: i * 0.0001 });
  }
  const out = simplifyRoute(pts, 0.00005);
  assert.ok(out.length < 1500, `expected reduced count, got ${out.length}`);
  assert.ok(out.length > 50, `expected non-trivial count, got ${out.length}`);
});

test('simplifyRoute carries through extra fields on retained points', () => {
  const pts = [
    { lat: 0, lng: 0, alt: 10, t: 0 },
    { lat: 0, lng: 1, alt: 11, t: 60 },
    { lat: 0, lng: 2, alt: 12, t: 120 },
  ];
  const out = simplifyRoute(pts, 0.0001);
  assert.equal(out[0].alt, 10);
  assert.equal(out[out.length - 1].alt, 12);
});
