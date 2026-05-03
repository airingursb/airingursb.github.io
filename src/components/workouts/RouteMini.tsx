// src/components/workouts/RouteMini.tsx
//
// Tiny non-interactive Mapbox preview used by the homepage card strip and
// the list page row. One map per tile, lazy-mounted via Astro's
// client:visible. Pace gradient is rendered with a single line-gradient
// expression instead of N sources/layers (lighter than the detail page's
// per-segment approach; can be migrated there later).

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RoutePoint, Bbox } from './types';
import { colorFor, percentileRange, type ColorTheme } from './workoutColors';

const TOKEN: string | undefined = import.meta.env.PUBLIC_MAPBOX_TOKEN;

interface Props {
  route: RoutePoint[];
  bbox: Bbox | null;
  height?: number;
}

export default function RouteMini({ route, bbox, height = 90 }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = React.useState<ColorTheme>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    if (!containerRef.current || !TOKEN || !route.length || !bbox) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11',
      bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      fitBoundsOptions: { padding: 6, animate: false },
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => paint(map, route, theme));

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (!TOKEN || !route.length || !bbox) {
    // Token missing or no GPS — render a neutral placeholder so the layout
    // doesn't collapse. The homepage's previous SVG fallback could go here
    // but a flat block is simpler and still hints at "no data".
    return (
      <div
        style={{
          height,
          width: '100%',
          background: 'var(--w-cell-bg, rgba(0,0,0,0.05))',
          borderRadius: 4,
        }}
        aria-label="no map"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 4, overflow: 'hidden' }}
    />
  );
}

function paint(map: mapboxgl.Map, route: RoutePoint[], theme: ColorTheme) {
  if (map.getLayer('route')) map.removeLayer('route');
  if (map.getSource('route')) map.removeSource('route');

  const paces = route.map((p) => p.pace).filter((p) => p > 0);
  const [pMin, pMax] = percentileRange(paces);

  // Sample N stops along the line for the gradient. line-gradient
  // interpolates linearly between stops; 24 is enough for a smooth
  // gradient without exploding the expression size.
  const N = 24;
  const stops: Array<number | string> = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const idx = Math.min(route.length - 1, Math.floor(t * (route.length - 1)));
    const pace = route[idx].pace || (pMin + pMax) / 2;
    stops.push(t, colorFor('pace', pace, pMin, pMax, theme));
  }

  map.addSource('route', {
    type: 'geojson',
    lineMetrics: true,
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.map((p) => [p.lng, p.lat]),
      },
    },
  });
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    paint: {
      'line-width': 2.4,
      'line-gradient': [
        'interpolate',
        ['linear'],
        ['line-progress'],
        ...stops,
      ] as unknown as mapboxgl.ExpressionSpecification,
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  });
}
