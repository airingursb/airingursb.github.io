// src/components/workouts/WorkoutDetail.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutRecord } from './types';
import { MetricGrid } from './MetricGrid';
import { MetricDetailRow } from './MetricDetailRow';
import { RouteMap } from './RouteMap';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useColorTheme } from './workoutColors';
import type { WorkoutLabels } from './labels';

interface Props {
  workout: WorkoutRecord;
  labels?: WorkoutLabels;
}

export default function WorkoutDetail({ workout, labels }: Props) {
  const [metric, setMetric] = React.useState<WorkoutMetric>('pace');
  const theme = useColorTheme();

  return (
    <>
      <MetricGrid stats={workout.stats} selected={metric} onSelect={setMetric} labels={labels} />
      <MetricDetailRow metric={metric} stats={workout.stats} labels={labels} />
      <RouteMap route={workout.route} bbox={workout.bbox} metric={metric} theme={theme} labels={labels} />
      <TimeSeriesChart route={workout.route} metric={metric} theme={theme} />
    </>
  );
}
