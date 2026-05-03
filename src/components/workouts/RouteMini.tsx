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
import { colorFor, percentileRange, useColorTheme, type ColorTheme } from './workoutColors';

const TOKEN: string | undefined = import.meta.env.PUBLIC_MAPBOX_TOKEN;

interface Props {
  route: RoutePoint[];
  bbox: Bbox | null;
  height?: number;
}

export default function RouteMini({ route, bbox, height = 90 }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const theme = useColorTheme();

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

  if (!route.length || !bbox) {
    return (
      <div
        style={{ height, width: '100%', background: 'var(--w-cell-bg, rgba(0,0,0,0.05))', borderRadius: 4 }}
        aria-label="no map"
      />
    );
  }
  if (!TOKEN) {
    // No Mapbox token (CI without secret, etc.) — render a pure-SVG
    // colored polyline so the route is still legible without a basemap.
    return <SvgRoute route={route} bbox={bbox} theme={theme} height={height} />;
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 4, overflow: 'hidden' }}
    />
  );
}

function SvgRoute({ route, bbox, theme, height }: {
  route: RoutePoint[]; bbox: Bbox; theme: ColorTheme; height: number;
}) {
  // Equirectangular projection into a 200x90-ish viewBox (we render the
  // SVG at 100% width via preserveAspectRatio, so internal viewBox just
  // needs to keep the aspect roughly close to the host container).
  const W = 200, H = 90, PAD = 4;
  const [west, south, east, north] = bbox;
  const dLat = Math.max(north - south, 1e-9);
  const dLng = Math.max(east - west, 1e-9);
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const scale = Math.min(innerW / dLng, innerH / dLat);
  const offX = PAD + (innerW - dLng * scale) / 2;
  const offY = PAD + (innerH - dLat * scale) / 2;
  const project = (p: RoutePoint) => [
    +(offX + (p.lng - west) * scale).toFixed(2),
    +(offY + (north - p.lat) * scale).toFixed(2),
  ];

  const paces = route.map(p => p.pace).filter(p => p > 0);
  const [pMin, pMax] = percentileRange(paces);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height, background: 'var(--w-cell-bg, rgba(0,0,0,0.05))', borderRadius: 4, display: 'block' }}
    >
      {route.slice(0, -1).map((p, i) => {
        const q = route[i + 1];
        const [x1, y1] = project(p);
        const [x2, y2] = project(q);
        const v = (p.pace + q.pace) / 2;
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={colorFor('pace', v, pMin, pMax, theme)}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
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
