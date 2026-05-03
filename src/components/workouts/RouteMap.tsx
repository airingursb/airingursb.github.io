// src/components/workouts/RouteMap.tsx
import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RoutePoint, Bbox, WorkoutMetric } from './types';
import { colorFor, type ColorTheme } from './workoutColors';

interface Props {
  route: RoutePoint[];
  bbox: Bbox | null;
  metric: WorkoutMetric;
  theme: ColorTheme;
  height?: number;
}

// `import.meta.env.PUBLIC_*` is replaced at build time by Vite via plain
// string substitution. Any wrapping (cast, optional chain) defeats the
// match and leaves the literal `import.meta.env.PUBLIC_MAPBOX_TOKEN` in
// the bundle — so write the access exactly like this and only this.
const TOKEN: string | undefined = import.meta.env.PUBLIC_MAPBOX_TOKEN;

export function RouteMap({ route, bbox, metric, theme, height = 380 }: Props) {
  if (!route.length || !bbox) {
    return <div className="workout-map" style={{ height, display: 'grid', placeItems: 'center', color: 'var(--w-fg-muted)' }}>
      No GPS data
    </div>;
  }
  if (!TOKEN) return <SvgFallback route={route} bbox={bbox} metric={metric} theme={theme} height={height} />;
  return <MapboxMap route={route} bbox={bbox} metric={metric} theme={theme} height={height} />;
}

function MapboxMap({ route, bbox, metric, theme, height }: Required<Omit<Props, 'height'>> & { height: number }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const styleUrl = theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';

  // Init map once
  React.useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = TOKEN!;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      fitBoundsOptions: { padding: 24, animate: false },
      interactive: true,
    });
    mapRef.current = map;
    map.on('load', () => paintRoute(map, route, metric, theme));
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-style on theme change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(styleUrl);
    map.once('style.load', () => paintRoute(map, route, metric, theme));
  }, [styleUrl]);

  // Re-color on metric change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    paintRoute(map, route, metric, theme);
  }, [metric, theme, route]);

  return <div ref={containerRef} className="workout-map" style={{ height }} />;
}

function paintRoute(map: mapboxgl.Map, route: RoutePoint[], metric: WorkoutMetric, theme: ColorTheme) {
  // Remove old layers
  for (let i = 0; i < route.length - 1; i++) {
    const id = `seg-${i}`;
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  }
  if (metric === 'gps') {
    const id = 'route-line';
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: route.map(p => [p.lng, p.lat]) } },
    });
    map.addLayer({
      id, type: 'line', source: id,
      paint: { 'line-color': colorFor('gps', 0, 0, 1, theme), 'line-width': 4 },
    });
    return;
  }

  const key: keyof RoutePoint =
    metric === 'pace' ? 'pace' :
    metric === 'elevation' ? 'alt' :
    metric === 'heart' ? 'hr' :
    metric === 'calories' ? 'cal' :
    'step';
  const values = route.map(p => p[key] as number);
  const yMin = Math.min(...values);
  const yMax = Math.max(...values);

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const v = (((a[key] as number) + (b[key] as number)) / 2);
    const id = `seg-${i}`;
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] } },
    });
    map.addLayer({
      id, type: 'line', source: id,
      paint: { 'line-color': colorFor(metric, v, yMin, yMax, theme), 'line-width': 4 },
    });
  }
}

function SvgFallback({ route, bbox, metric, theme, height }: Required<Omit<Props, 'height'>> & { height: number }) {
  const [west, south, east, north] = bbox;
  const padX = 16, padY = 16;
  const widthPx = 720, heightPx = height;
  const innerW = widthPx - padX * 2;
  const innerH = heightPx - padY * 2;
  const dLat = Math.max(north - south, 1e-9);
  const dLng = Math.max(east - west, 1e-9);
  const scale = Math.min(innerW / dLng, innerH / dLat);
  const drawnW = dLng * scale, drawnH = dLat * scale;
  const offX = padX + (innerW - drawnW) / 2;
  const offY = padY + (innerH - drawnH) / 2;
  const project = (p: RoutePoint) => [
    offX + (p.lng - west) * scale,
    offY + (north - p.lat) * scale,
  ];

  const key: keyof RoutePoint =
    metric === 'pace' ? 'pace' :
    metric === 'elevation' ? 'alt' :
    metric === 'heart' ? 'hr' :
    metric === 'calories' ? 'cal' :
    metric === 'steps' ? 'step' : 'alt';
  const values = route.map(p => p[key] as number);
  const yMin = Math.min(...values), yMax = Math.max(...values);

  return (
    <svg className="workout-map" viewBox={`0 0 ${widthPx} ${heightPx}`} style={{ height }}>
      {route.slice(0, -1).map((p, i) => {
        const q = route[i + 1];
        const [x1, y1] = project(p);
        const [x2, y2] = project(q);
        const v = (((p[key] as number) + (q[key] as number)) / 2);
        const c = metric === 'gps'
          ? colorFor('gps', 0, 0, 1, theme)
          : colorFor(metric, v, yMin, yMax, theme);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={2.5} strokeLinecap="round" />;
      })}
    </svg>
  );
}
