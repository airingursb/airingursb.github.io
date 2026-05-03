// src/components/workouts/workoutColors.ts
// Per-metric color scales. Each metric has light + dark variants so polylines
// + chart strokes stay readable on either site theme.
//
// Domain values are workout-relative (we pass min/max in from the consumer)
// so a slow-paced hike doesn't render entirely dark-red.

import { interpolateRgb } from 'd3';
import type { WorkoutMetric } from './types';

export type ColorTheme = 'light' | 'dark';

interface Scale {
  /** Map a normalized value [0, 1] to a hex color. */
  (k: number): string;
  invert: boolean;       // true if higher values should map to "start" of stops
}

function mkScale(stops: string[], invert = false): Scale {
  const fn = ((k: number) => {
    const t = invert ? 1 - clamp01(k) : clamp01(k);
    if (stops.length === 1) return stops[0];
    const seg = t * (stops.length - 1);
    const i  = Math.min(Math.floor(seg), stops.length - 2);
    const lt = seg - i;
    return interpolateRgb(stops[i], stops[i + 1])(lt);
  }) as Scale;
  fn.invert = invert;
  return fn;
}

const SCALES: Record<ColorTheme, Record<WorkoutMetric, Scale>> = {
  dark: {
    pace:      mkScale(['#ff5050', '#ffd84d', '#6cf06c'], /* invert */ true), // slow→fast
    elevation: mkScale(['#ff8ad9', '#ffffff', '#6ad6ff']),
    heart:     mkScale(['#fde0e0', '#ff3b30']),
    calories:  mkScale(['#ffffff', '#ffae57']),
    steps:     mkScale(['#ffffff', '#ff7e2e']),
    gps:       mkScale(['#3478f6']),
  },
  light: {
    pace:      mkScale(['#d63a3a', '#d6a800', '#2fa84f'], true),
    elevation: mkScale(['#c0399b', '#555555', '#1f7faa']),
    heart:     mkScale(['#f29c95', '#c1271c']),
    calories:  mkScale(['#222222', '#c47214']),
    steps:     mkScale(['#222222', '#b94c00']),
    gps:       mkScale(['#1d5fd1']),
  },
};

export function getColorScale(metric: WorkoutMetric, theme: ColorTheme): Scale {
  return SCALES[theme][metric];
}

/** Map a metric value to a hex color, given the workout-wide [min, max] range. */
export function colorFor(
  metric: WorkoutMetric,
  value: number,
  min: number,
  max: number,
  theme: ColorTheme,
): string {
  const scale = getColorScale(metric, theme);
  if (max === min) return scale(0.5);
  const k = (value - min) / (max - min);
  return scale(k);
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
