// src/components/workouts/MetricDetailRow.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutStats } from './types';
import { formatPaceSecPerKm } from './format.mjs';

interface Props {
  metric: WorkoutMetric;
  stats: WorkoutStats;
}

const LABEL: Record<WorkoutMetric, string> = {
  pace: 'Pace',
  elevation: 'Metres',
  heart: 'BPM',
  calories: 'Total',
  steps: 'Cadence',
  gps: 'GPS',
};

const RENDERERS: Record<WorkoutMetric, (s: WorkoutStats) => React.ReactNode> = {
  pace: (s) => (
    <>
      <Field label="Avg Pace"  value={formatPaceSecPerKm(s.paceSecPerKm)} />
      <Field label="Max Pace"  value={formatPaceSecPerKm(s.maxSpeedKmh > 0 ? 3600 / s.maxSpeedKmh : 0)} />
      <Field label="Vertical (↑)" value={`${s.verticalMperMin.toFixed(1)} m/min`} />
    </>
  ),
  elevation: (s) => (
    <>
      <Field label="Gain/Loss" value={`${s.elevationGainLossM >= 0 ? '+' : ''}${s.elevationGainLossM} m`} />
      <Field label="Ascent"    value={`+${s.ascentM} m`} />
      <Field label="Descent"   value={`-${s.descentM} m`} />
    </>
  ),
  heart: (s) => (
    <>
      <Field label="Avg BPM" value={`${Math.round(s.heart.avg)} bpm`} />
      <Field label="Max BPM" value={`${Math.round(s.heart.max)} bpm`} />
    </>
  ),
  calories: (s) => (
    <>
      <Field label="Total"   value={`${Math.round(s.calories.totalKcal)} kcal`} />
      <Field label="Burn/hr" value={`${Math.round(s.calories.burnPerHr)}`} />
      <Field label="Resting" value={`${Math.round(s.calories.restingKcal)} kcal`} />
    </>
  ),
  steps: (s) => (
    <>
      <Field label="Steps"   value={`${s.stepCount}`} />
      <Field label="Cadence" value={`${Math.round(s.stepCadence)}/min`} />
      <Field label="Length"  value={`${s.stepLengthM.toFixed(2)} m`} />
    </>
  ),
  gps: (s) => (
    <>
      <Field label="Avg Acc" value={`${Math.round(s.gps.avgAccuracyM)} m`} />
      <Field label="Min Acc" value={`${Math.round(s.gps.minAccuracyM)} m`} />
    </>
  ),
};

export function MetricDetailRow({ metric, stats }: Props) {
  return (
    <div className="metric-detail-row">
      <span className="metric-name">{LABEL[metric]}</span>
      {RENDERERS[metric](stats)}
      <span className="metric-name" style={{ marginLeft: 'auto' }}>Map</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 80 }}>
      <span style={{ fontSize: 11, color: 'var(--w-fg-muted)' }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}
