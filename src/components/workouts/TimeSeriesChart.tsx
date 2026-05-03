// src/components/workouts/TimeSeriesChart.tsx
import * as React from 'react';
import { scaleLinear, line as d3line, area as d3area, max, min, extent } from 'd3';
import type { RoutePoint, WorkoutMetric } from './types';
import { colorFor, type ColorTheme } from './workoutColors';

interface Props {
  route: RoutePoint[];
  metric: WorkoutMetric;
  theme: ColorTheme;
  width?: number;
  height?: number;
}

export function TimeSeriesChart({ route, metric, theme, width = 760, height = 80 }: Props) {
  if (!route.length) return null;

  const [tMin, tMax] = extent(route, p => p.t) as [number, number];

  const altMin = (min(route, p => p.alt) ?? 0);
  const altMax = (max(route, p => p.alt) ?? 0);
  const altScale = scaleLinear().domain([altMin, altMax]).range([height - 2, 4]);
  const xScale   = scaleLinear().domain([tMin, tMax]).range([0, width]);

  const altArea = d3area<RoutePoint>()
    .x(p => xScale(p.t))
    .y0(height)
    .y1(p => altScale(p.alt));

  const metricKey: keyof RoutePoint =
    metric === 'pace' ? 'pace' :
    metric === 'elevation' ? 'alt' :
    metric === 'heart' ? 'hr' :
    metric === 'calories' ? 'cal' :
    metric === 'steps' ? 'step' :
    'alt';

  const yMin = (min(route, p => p[metricKey] as number) ?? 0);
  const yMax = (max(route, p => p[metricKey] as number) ?? 1);
  const yScale = scaleLinear().domain([yMin, yMax]).range([height - 4, 4]);

  return (
    <svg className="workout-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Elevation grey underlay */}
      <path d={altArea(route) ?? ''} fill="var(--w-elev-base)" />
      {/* Metric line, segmented for color */}
      {metric === 'gps' ? (
        <path
          d={d3line<RoutePoint>().x(p => xScale(p.t)).y(p => yScale(p[metricKey] as number))(route) ?? ''}
          stroke={colorFor('gps', 0, 0, 1, theme)} strokeWidth={1.5} fill="none" />
      ) : (
        route.slice(0, -1).map((p, i) => {
          const q = route[i + 1];
          const v = ((p[metricKey] as number) + (q[metricKey] as number)) / 2;
          return (
            <line
              key={i}
              x1={xScale(p.t)} y1={yScale(p[metricKey] as number)}
              x2={xScale(q.t)} y2={yScale(q[metricKey] as number)}
              stroke={colorFor(metric, v, yMin, yMax, theme)}
              strokeWidth={1.5}
            />
          );
        })
      )}
    </svg>
  );
}
