// src/components/workouts/MetricGrid.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutStats } from './types';
import { formatPaceSecPerKm } from './format.mjs';

interface Props {
  stats: WorkoutStats;
  selected: WorkoutMetric;
  onSelect: (m: WorkoutMetric) => void;
}

interface Cell {
  metric: WorkoutMetric;
  label: string;
  primary: string;
  secondary: string;
}

export function MetricGrid({ stats, selected, onSelect }: Props) {
  const cells: Cell[] = [
    { metric: 'pace',      label: 'Pace',
      primary: formatPaceSecPerKm(stats.paceSecPerKm),
      secondary: `${stats.speedKmh.toFixed(1)} km/h` },
    { metric: 'elevation', label: 'Elevation',
      primary: `↑${stats.elevationUpM} m`,
      secondary: `↓${stats.elevationDownM} m` },
    { metric: 'heart',     label: 'Heart',
      primary: `${Math.round(stats.heart.avg)} avg`,
      secondary: `${Math.round(stats.heart.max)} max` },
    { metric: 'calories',  label: 'Calories',
      primary: `${Math.round(stats.calories.totalKcal)}`,
      secondary: `${Math.round(stats.calories.burnPerHr)}/hr` },
    { metric: 'steps',     label: 'Steps',
      primary: `${stats.stepCount}`,
      secondary: `${Math.round(stats.stepCadence)}/min` },
    { metric: 'gps',       label: 'GPS',
      primary: `${Math.round(stats.gps.avgAccuracyM)}m avg`,
      secondary: `${Math.round(stats.gps.minAccuracyM)}m min` },
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
