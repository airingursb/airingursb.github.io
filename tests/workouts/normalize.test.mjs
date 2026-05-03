import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWorkout } from '../../scripts/lib/workouts-normalize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, '../fixtures/workout-mini.json');
const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).data.workouts[0];

test('normalizeWorkout preserves id and infers type', () => {
  const w = normalizeWorkout(raw);
  assert.equal(w.id, 'TEST-MINI-0001');
  assert.equal(w.type, 'hiking');
});

test('normalizeWorkout converts timestamps to ISO with offset', () => {
  const w = normalizeWorkout(raw);
  assert.equal(w.start, '2026-04-01T08:00:00+08:00');
  assert.equal(w.end,   '2026-04-01T08:04:00+08:00');
  assert.equal(w.durationSec, 240);
});

test('normalizeWorkout computes stats from raw fields', () => {
  const w = normalizeWorkout(raw);
  assert.equal(w.stats.distanceKm, 0.4);
  assert.equal(w.stats.elevationUpM, 5);
  assert.equal(w.stats.elevationDownM, 3);
  assert.equal(w.stats.elevationGainLossM, 2);
  // 168 kJ → 40.15 kcal (1 kJ = 0.239006 kcal)
  assert.ok(Math.abs(w.stats.calories.totalKcal - 40.15) < 0.05,
    `expected ~40.15 kcal, got ${w.stats.calories.totalKcal}`);
  assert.equal(w.stats.heart.avg, 110);
  assert.equal(w.stats.heart.max, 130);
});

test('normalizeWorkout produces route points with all metrics', () => {
  const w = normalizeWorkout(raw);
  assert.ok(w.route.length >= 2);
  const p = w.route[1];
  assert.ok('t' in p && 't' in p);
  assert.ok('lat' in p);
  assert.ok('lng' in p);
  assert.ok('alt' in p);
  assert.ok('pace' in p);
  assert.ok('hr' in p);
  assert.ok('cal' in p);
  assert.ok('step' in p);
  // Point at t=60 should have hr ≈ 115 (interpolated, exact at bucket)
  const at60 = w.route.find(r => r.t === 60);
  if (at60) assert.equal(at60.hr, 115);
});

test('normalizeWorkout computes bbox from route', () => {
  const w = normalizeWorkout(raw);
  assert.ok(Array.isArray(w.bbox));
  const [west, south, east, north] = w.bbox;
  assert.ok(west <= east);
  assert.ok(south <= north);
});

test('normalizeWorkout returns null bbox for indoor workout (no GPS)', () => {
  const indoor = { ...raw, route: [] };
  const w = normalizeWorkout(indoor);
  assert.equal(w.bbox, null);
  assert.equal(w.route.length, 0);
});
