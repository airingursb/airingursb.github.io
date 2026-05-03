// src/components/workouts/WorkoutDetail.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutRecord } from './types';
import { MetricGrid } from './MetricGrid';
import { MetricDetailRow } from './MetricDetailRow';
import { RouteMap } from './RouteMap';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useColorTheme } from './workoutColors';

interface Props {
  workout: WorkoutRecord;
}

export default function WorkoutDetail({ workout }: Props) {
  const [metric, setMetric] = React.useState<WorkoutMetric>('pace');
  const theme = useColorTheme();

  return (
    <>
      <MetricGrid stats={workout.stats} selected={metric} onSelect={setMetric} />
      <MetricDetailRow metric={metric} stats={workout.stats} />
      <RouteMap route={workout.route} bbox={workout.bbox} metric={metric} theme={theme} />
      <TimeSeriesChart route={workout.route} metric={metric} theme={theme} />
    </>
  );
}
