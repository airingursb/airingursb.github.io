// src/components/workouts/WorkoutDetail.tsx
import * as React from 'react';
import type { WorkoutMetric, WorkoutRecord } from './types';
import { MetricGrid } from './MetricGrid';
import { MetricDetailRow } from './MetricDetailRow';
import { RouteMap } from './RouteMap';
import { TimeSeriesChart } from './TimeSeriesChart';
import type { ColorTheme } from './workoutColors';

interface Props {
  workout: WorkoutRecord;
}

export default function WorkoutDetail({ workout }: Props) {
  const [metric, setMetric] = React.useState<WorkoutMetric>('pace');
  const [theme, setTheme] = React.useState<ColorTheme>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      <MetricGrid stats={workout.stats} selected={metric} onSelect={setMetric} />
      <MetricDetailRow metric={metric} stats={workout.stats} />
      <RouteMap route={workout.route} bbox={workout.bbox} metric={metric} theme={theme} />
      <TimeSeriesChart route={workout.route} metric={metric} theme={theme} />
    </>
  );
}
