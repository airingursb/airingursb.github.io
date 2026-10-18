// src/components/workouts/MetricDetailRow.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutStats } from './types';
import { formatPaceSecPerKm } from './format.mjs';
import { DEFAULT_LABELS, type WorkoutLabels } from './labels';

interface Props {
  metric: WorkoutMetric;
  stats: WorkoutStats;
  labels?: WorkoutLabels;
}

const LABEL_KEY: Record<WorkoutMetric, string> = {
  pace: 'pace',
  elevation: 'metres',
  heart: 'bpm',
  calories: 'total',
  steps: 'cadence',
  gps: 'gps',
};

const RENDERERS: Record<WorkoutMetric, (s: WorkoutStats, d: Record<string, string>) => React.ReactNode> = {
  pace: (s, d) => (
    <>
      <Field label={d.avgPace}  value={formatPaceSecPerKm(s.paceSecPerKm)} />
      <Field label={d.maxPace}  value={formatPaceSecPerKm(s.maxSpeedKmh > 0 ? 3600 / s.maxSpeedKmh : 0)} />
      <Field label={d.vertical} value={`${s.verticalMperMin.toFixed(1)} m/min`} />
    </>
  ),
  elevation: (s, d) => (
    <>
      <Field label={d.gainLoss} value={`${s.elevationGainLossM >= 0 ? '+' : ''}${s.elevationGainLossM} m`} />
      <Field label={d.ascent}    value={`+${s.ascentM} m`} />
      <Field label={d.descent}   value={`-${s.descentM} m`} />
    </>
  ),
  heart: (s, d) => (
    <>
      <Field label={d.avgBpm} value={`${Math.round(s.heart.avg)} bpm`} />
      <Field label={d.maxBpm} value={`${Math.round(s.heart.max)} bpm`} />
    </>
  ),
  calories: (s, d) => (
    <>
      <Field label={d.total}   value={`${Math.round(s.calories.totalKcal)} kcal`} />
      <Field label={d.burnPerHr} value={`${Math.round(s.calories.burnPerHr)}`} />
      <Field label={d.resting} value={`${Math.round(s.calories.restingKcal)} kcal`} />
    </>
  ),
  steps: (s, d) => (
    <>
      <Field label={d.steps}   value={`${s.stepCount}`} />
      <Field label={d.cadence} value={`${Math.round(s.stepCadence)}/min`} />
      <Field label={d.stepLength}  value={`${s.stepLengthM.toFixed(2)} m`} />
    </>
  ),
  gps: (s, d) => (
    <>
      <Field label={d.avgAcc} value={`${Math.round(s.gps.avgAccuracyM)} m`} />
      <Field label={d.minAcc} value={`${Math.round(s.gps.minAccuracyM)} m`} />
    </>
  ),
};

export function MetricDetailRow({ metric, stats, labels = DEFAULT_LABELS }: Props) {
  const d = { ...DEFAULT_LABELS.detailLabels, ...labels.detailLabels };
  const key = LABEL_KEY[metric];
  const name = key === 'pace' ? labels.metricLabels.pace : key === 'gps' ? labels.metricLabels.gps : d[key];
  return (
    <div className="metric-detail-row">
      <span className="metric-name">{name}</span>
      {RENDERERS[metric](stats, d)}
      <span className="metric-name" style={{ marginLeft: 'auto' }}>{d.map}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 80 }}>
      <span style={{ fontSize: 12, color: 'var(--w-fg-muted)' }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}
