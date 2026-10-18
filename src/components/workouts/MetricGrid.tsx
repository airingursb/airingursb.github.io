// src/components/workouts/MetricGrid.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutStats } from './types';
import { formatPaceSecPerKm } from './format.mjs';
import { DEFAULT_LABELS, type WorkoutLabels } from './labels';

interface Props {
  stats: WorkoutStats;
  selected: WorkoutMetric;
  onSelect: (m: WorkoutMetric) => void;
  labels?: WorkoutLabels;
}

interface Cell {
  metric: WorkoutMetric;
  label: string;
  primary: string;
  secondary: string;
}

export function MetricGrid({ stats, selected, onSelect, labels = DEFAULT_LABELS }: Props) {
  const L = labels.metricLabels;
  const U = labels.units;
  const cells: Cell[] = [
    { metric: 'pace',      label: L.pace,
      primary: formatPaceSecPerKm(stats.paceSecPerKm),
      secondary: `${stats.speedKmh.toFixed(1)} km/h` },
    { metric: 'elevation', label: L.elevation,
      primary: `↑${stats.elevationUpM} m`,
      secondary: `↓${stats.elevationDownM} m` },
    { metric: 'heart',     label: L.heart,
      primary: `${Math.round(stats.heart.avg)} ${U.bpmAvg}`,
      secondary: `${Math.round(stats.heart.max)} ${U.bpmMax}` },
    { metric: 'calories',  label: L.calories,
      primary: `${Math.round(stats.calories.totalKcal)}`,
      secondary: `${Math.round(stats.calories.burnPerHr)}${U.kcalPerHr}` },
    { metric: 'steps',     label: L.steps,
      primary: `${stats.stepCount}`,
      secondary: `${Math.round(stats.stepCadence)}${U.stepsPerMin}` },
    { metric: 'gps',       label: L.gps,
      primary: `${Math.round(stats.gps.avgAccuracyM)}${U.metresAvg}`,
      secondary: `${Math.round(stats.gps.minAccuracyM)}${U.metresMin}` },
  ];

  return (
    <div className="metric-grid" role="tablist">
      {cells.map((c) => (
        <button
          key={c.metric}
          role="tab"
          aria-selected={c.metric === selected}
          className={`cell ${c.metric === selected ? 'active' : ''}`}
          onClick={() => onSelect(c.metric)}
        >
          <div className="label">{c.label}</div>
          <div className="primary">{c.primary}</div>
          <div className="secondary">{c.secondary}</div>
        </button>
      ))}
    </div>
  );
}
