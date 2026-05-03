// src/components/workouts/types.ts
// Shape of normalized data emitted by scripts/sync-workouts.mjs.
// .mjs files mirror this shape via JSDoc — keep in sync.

export type WorkoutMetric = 'pace' | 'elevation' | 'heart' | 'calories' | 'steps' | 'gps';
export type WorkoutType = 'hiking' | 'walking' | 'running' | 'cycling' | 'other';

export interface RoutePoint {
  t: number;       // seconds since workout start
  lat: number;
  lng: number;
  alt: number;     // metres
  pace: number;    // seconds per metre (Infinity if not moving)
  hr: number;      // bpm (interpolated)
  cal: number;     // kcal per minute (interpolated)
  step: number;    // steps per minute (interpolated)
}

export interface WorkoutStats {
  distanceKm: number;
  paceSecPerKm: number;
  speedKmh: number;
  maxSpeedKmh: number;
  elevationUpM: number;
  elevationDownM: number;
  elevationGainLossM: number;
  ascentM: number;
  descentM: number;
  verticalMperMin: number;       // elevationGainLossM / durationMinutes
  heart: { avg: number; max: number; min: number };
  calories: { totalKcal: number; burnPerHr: number; restingKcal: number };
  stepCount: number;
  stepCadence: number;            // steps per minute
  stepLengthM: number;
  gps: { avgAccuracyM: number; minAccuracyM: number };
}

export type Bbox = [west: number, south: number, east: number, north: number];

export interface WorkoutRecord {
  id: string;
  type: WorkoutType;
  start: string;                  // ISO 8601 with offset
  end: string;
  durationSec: number;
  stats: WorkoutStats;
  bbox: Bbox | null;              // null when no GPS
  route: RoutePoint[];            // empty when no GPS
}

export interface WorkoutIndexEntry {
  id: string;
  type: WorkoutType;
  start: string;
  durationSec: number;
  stats: Pick<WorkoutStats, 'distanceKm' | 'elevationUpM'> & { heart: WorkoutStats['heart'] };
  bbox: Bbox | null;
  trackSvg: string;               // SVG path "d" for 100×60 viewBox
}

export interface WorkoutContentFrontmatter {
  title: { zh: string; en: string };
  description?: { zh: string; en: string };
  location?: { zh: string; en: string };
  cover?: string;
  draft?: boolean;
}
