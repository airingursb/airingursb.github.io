// src/components/footprints/FootprintsMap.tsx
// Polished Mapbox GL JS rendition of the homepage "Footprints" card.
// Replaces the legacy Leaflet/CARTO raster map with a vector basemap
// that tracks the site's light/dark theme, localizes labels under
// the EN locale, and opens centered on the author's current city
// (falling back to the first city) so visitors land on a meaningful
// view instead of the [0,0] default that sits over the Atlantic.

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useColorTheme, type ColorTheme } from '../workouts/workoutColors';
import { COUNTRY_FLAGS, type City } from '../../data/footprints';

interface Props {
  cities: City[];
}

// Mirror RouteMap.tsx — `import.meta.env.PUBLIC_*` is substituted by Vite
// at build time only when accessed exactly like this (no wrapping).
const TOKEN: string | undefined = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const CURRENT_COLOR = '#ff6b6b';
const VISITED_LIGHT = '#2fa84f';
const VISITED_DARK  = '#4ade80';

export function FootprintsMap({ cities }: Props) {
  const theme = useColorTheme();
  const canRenderMapbox = React.useMemo(
    () => Boolean(TOKEN) && hasWebGLSupport(),
    [],
  );
  if (!cities.length) {
    return <div className="footprints-map footprints-empty">No footprints</div>;
  }
  if (!canRenderMapbox) {
    return <FootprintsSvgFallback cities={cities} theme={theme} />;
  }
  return <FootprintsMapboxMap cities={cities} theme={theme} />;
}

function hasWebGLSupport(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function FootprintsMapboxMap({ cities, theme }: { cities: City[]; theme: ColorTheme }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = React.useState(false);
  const styleUrl = theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';
  const visitedColor = theme === 'dark' ? VISITED_DARK : VISITED_LIGHT;
  const dotStroke = theme === 'dark' ? 'rgba(16,20,26,0.95)' : 'rgba(255,255,255,0.95)';

  const current = React.useMemo(() => cities.find(c => c.current), [cities]);
  const home = current ?? cities[0];
  const stats = React.useMemo(() => computeStats(cities), [cities]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = TOKEN!;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [home.lng, home.lat],
      zoom: 2.2,
      attributionControl: { compact: true },
      // Cartographic — no rotation, no 3D tilt.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-left');
    mapRef.current = map;

    map.on('load', () => {
      localizeLabels(map);
      applyAtmosphere(map, theme);
      paintLayers(map, cities, current, visitedColor, dotStroke);
      setReady(true);
    });

    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme change → swap style + repaint.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(styleUrl);
    map.once('style.load', () => {
      localizeLabels(map);
      applyAtmosphere(map, theme);
      paintLayers(map, cities, current, visitedColor, dotStroke);
    });
  }, [styleUrl]);

  return (
    <>
      <div className={`footprints-map${ready ? ' is-ready' : ''}`}>
        <div ref={containerRef} className="footprints-map-canvas" aria-label="Footprints map" />
      </div>
      <div className="footprints-summary">
        <span><strong>{stats.cities}</strong> cities</span>
        <span className="footprints-summary-sep">·</span>
        <span><strong>{stats.countries}</strong> countries</span>
        <span className="footprints-summary-sep">·</span>
        <span><strong>{stats.continents}</strong> continents</span>
      </div>
    </>
  );
}

/* ───────────────────────── framing ───────────────────────── */

interface Framed {
  bounds: mapboxgl.LngLatBoundsLike;
  padding: { top: number; right: number; bottom: number; left: number };
}

/**
 * Compute a bounding box around all cities. Used by the SVG fallback to
 * lay out dots in viewport coordinates; the Mapbox path opens centered on
 * the current city instead, so it doesn't go through here.
 */
function frameCities(cities: City[]): Framed {
  let minLng = +Infinity, maxLng = -Infinity, minLat = +Infinity, maxLat = -Infinity;
  for (const c of cities) {
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
  }
  return {
    bounds: [[minLng, minLat], [maxLng, maxLat]],
    padding: { top: 32, right: 24, bottom: 36, left: 24 },
  };
}

function computeStats(cities: City[]) {
  const countries = new Set(cities.map(c => c.country));
  const continents = new Set(cities.map(c => c.continent));
  return { cities: cities.length, countries: countries.size, continents: continents.size };
}

/* ───────────────────── basemap localization ──────────────────── */

function localizeLabels(map: mapboxgl.Map) {
  if (typeof document === 'undefined') return;
  if (document.documentElement.lang !== 'en') return;
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== 'symbol') continue;
    const layout = (layer as any).layout;
    if (!layout || !('text-field' in layout)) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_en'], ['get', 'name']]);
    } catch {
      // Some symbol layers reject expression text-field — silent skip is fine.
    }
  }
}

function applyAtmosphere(map: mapboxgl.Map, theme: ColorTheme) {
  try {
    map.setFog(theme === 'dark'
      ? {
          color: 'rgba(22,27,34,0.6)',
          'high-color': 'rgba(16,20,26,0.9)',
          'horizon-blend': 0.04,
          'space-color': 'rgba(8,10,14,1)',
          'star-intensity': 0.05,
        }
      : {
          color: 'rgba(246,248,250,0.7)',
          'high-color': 'rgba(220,228,236,0.9)',
          'horizon-blend': 0.02,
          'space-color': 'rgba(240,244,248,1)',
          'star-intensity': 0,
        });
  } catch {
    // Older styles may reject setFog — non-fatal.
  }
}

/* ───────────────────────── layers ─────────────────────────── */

function paintLayers(
  map: mapboxgl.Map,
  cities: City[],
  current: City | undefined,
  visitedColor: string,
  dotStroke: string,
) {
  // Defensive cleanup (style swaps already discard layers).
  for (const id of ['footprints-halo', 'footprints-dot', 'footprints-current']) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ['footprints-src', 'footprints-current-src']) {
    if (map.getSource(id)) map.removeSource(id);
  }

  const visited = cities.filter(c => !c.current);
  map.addSource('footprints-src', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: visited.map((c, i) => ({
        type: 'Feature',
        id: i,
        properties: { name: c.name, country: c.country },
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      })),
    },
  });

  // Halo — soft glow under each dot.
  map.addLayer({
    id: 'footprints-halo',
    type: 'circle',
    source: 'footprints-src',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        1, 6,
        4, 10,
        8, 16,
      ],
      'circle-color': visitedColor,
      'circle-opacity': 0.18,
      'circle-blur': 0.65,
    },
  });

  // Core dot — crisp, theme-aware stroke.
  map.addLayer({
    id: 'footprints-dot',
    type: 'circle',
    source: 'footprints-src',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        1, 3.5,
        4, 5,
        8, 6.5,
      ],
      'circle-color': visitedColor,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': dotStroke,
      'circle-opacity': 0.96,
      'circle-stroke-opacity': 0.9,
    },
  });

  // Pulsing dot for current location.
  if (current) {
    map.addSource('footprints-current-src', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { name: current.name, country: current.country },
        geometry: { type: 'Point', coordinates: [current.lng, current.lat] },
      },
    });
    if (map.hasImage('footprints-pulse')) map.removeImage('footprints-pulse');
    map.addImage('footprints-pulse', makePulsingDot(map, CURRENT_COLOR), { pixelRatio: 2 });
    map.addLayer({
      id: 'footprints-current',
      type: 'symbol',
      source: 'footprints-current-src',
      layout: {
        'icon-image': 'footprints-pulse',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });
  }

  installInteractions(map, current);
}

function installInteractions(map: mapboxgl.Map, current: City | undefined) {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: true,
    offset: 14,
    className: 'footprints-popup',
  });
  let hoverTimer: number | null = null;
  const cancelTimer = () => {
    if (hoverTimer !== null) { window.clearTimeout(hoverTimer); hoverTimer = null; }
  };

  const bind = (layerId: string, isCurrent: boolean) => {
    map.on('mousemove', layerId, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = 'pointer';
      const name = f.properties?.name as string | undefined;
      const country = f.properties?.country as City['country'] | undefined;
      if (!name) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      cancelTimer();
      hoverTimer = window.setTimeout(() => {
        popup.setLngLat(coords).setHTML(renderPopup(name, country, isCurrent)).addTo(map);
      }, 80);
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      cancelTimer();
      popup.remove();
    });
  };

  bind('footprints-dot', false);
  if (current) bind('footprints-current', true);
}

function renderPopup(name: string, country: City['country'] | undefined, isCurrent: boolean): string {
  const safe = name.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]!));
  const flag = country ? COUNTRY_FLAGS[country] : '';
  const tag = isCurrent
    ? `<div class="footprints-popup-current">📍 Current</div>`
    : '';
  return `
    <div class="footprints-popup-inner${isCurrent ? ' is-current' : ''}">
      <div class="footprints-popup-name">${flag ? `<span class="footprints-popup-flag">${flag}</span>` : ''}<strong>${safe}</strong></div>
      ${tag}
    </div>
  `.trim();
}

/* ─────────── Pulsing dot (Mapbox StyleImageInterface) ─────────── */

function makePulsingDot(map: mapboxgl.Map, color: string): mapboxgl.StyleImageInterface {
  const size = 140;
  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const dot: mapboxgl.StyleImageInterface = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    onAdd() {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      (this as any).context = canvas.getContext('2d');
    },

    render() {
      const ctx = (this as any).context as CanvasRenderingContext2D | null;
      if (!ctx) return false;

      const duration = 1700;
      const tNow = reduced ? 0 : (performance.now() % duration) / duration;
      // Two rings, staggered by 0.5 cycle, eased.
      const t1 = tNow;
      const t2 = (tNow + 0.5) % 1;
      const ease = (k: number) => 1 - Math.pow(1 - k, 2);
      const innerR = (size / 2) * 0.16;

      ctx.clearRect(0, 0, size, size);

      const drawRing = (k: number) => {
        const e = ease(k);
        const r = innerR + (size / 2 - innerR) * e * 0.85;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(color, 0.28 * (1 - e));
        ctx.fill();
      };
      drawRing(t1);
      if (!reduced) drawRing(t2);

      // Solid core + soft inner halo.
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, innerR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(color, 0.20);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, innerR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      (this as any).data = ctx.getImageData(0, 0, size, size).data;

      if (!reduced) map.triggerRepaint();
      return true;
    },
  };

  return dot;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ───────────────────── SVG fallback (no token / no WebGL) ───────────────────── */

function FootprintsSvgFallback({ cities, theme }: { cities: City[]; theme: ColorTheme }) {
  const framed = frameCities(cities);
  const [west, south, east, north] = (() => {
    const b = framed.bounds as [[number, number], [number, number]];
    return [b[0][0], b[0][1], b[1][0], b[1][1]];
  })();
  const padX = 24, padY = 24;
  const widthPx = 1280, heightPx = 380;
  const innerW = widthPx - padX * 2;
  const innerH = heightPx - padY * 2;
  const dLat = Math.max(north - south, 1e-9);
  const dLng = Math.max(east - west, 1e-9);
  const scale = Math.min(innerW / dLng, innerH / dLat);
  const drawnW = dLng * scale, drawnH = dLat * scale;
  const offX = padX + (innerW - drawnW) / 2;
  const offY = padY + (innerH - drawnH) / 2;
  const visitedColor = theme === 'dark' ? VISITED_DARK : VISITED_LIGHT;
  const stroke = theme === 'dark' ? 'rgba(16,20,26,0.9)' : 'rgba(255,255,255,0.95)';

  const stats = computeStats(cities);

  return (
    <>
      <div className="footprints-map is-ready">
        <svg className="footprints-map-canvas" viewBox={`0 0 ${widthPx} ${heightPx}`} preserveAspectRatio="xMidYMid meet">
          {cities.map((c, i) => {
            const x = offX + (c.lng - west) * scale;
            const y = offY + (north - c.lat) * scale;
            if (c.current) {
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={11} fill={CURRENT_COLOR} opacity={0.22} />
                  <circle cx={x} cy={y} r={6} fill={CURRENT_COLOR} stroke="rgba(255,255,255,0.95)" strokeWidth={1.5} />
                </g>
              );
            }
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={7} fill={visitedColor} opacity={0.2} />
                <circle cx={x} cy={y} r={3.5} fill={visitedColor} stroke={stroke} strokeWidth={1.2} />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="footprints-summary">
        <span><strong>{stats.cities}</strong> cities</span>
        <span className="footprints-summary-sep">·</span>
        <span><strong>{stats.countries}</strong> countries</span>
        <span className="footprints-summary-sep">·</span>
        <span><strong>{stats.continents}</strong> continents</span>
      </div>
    </>
  );
}
