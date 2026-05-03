/**
 * Per-workout Open Graph share card (1200×630 PNG).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │ <title>                            ursb.me       │  header
 *   │ <date · location>                                │
 *   ├──────────────────────────────────────────────────┤
 *   │                                                  │
 *   │            <pace-colored route>                  │  middle
 *   │                                                  │
 *   ├──────────────────────────────────────────────────┤
 *   │  6.51 km · 2:11:50 · ↑54 m · 106 bpm · 368 kcal  │  footer
 *   └──────────────────────────────────────────────────┘
 *
 * Route is pre-rasterized from a hand-built SVG (multi-segment colored
 * lines) into a PNG and embedded as <img> inside the satori VDOM,
 * since satori's SVG support doesn't include <line>.
 *
 * Two cards per hike — zh and en — uploaded to
 *   workouts/<id>.zh.png and workouts/<id>.en.png on R2.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, '../../src/assets/fonts');

const W = 1200, H = 630;
const HEADER_H = 110;
const FOOTER_H = 100;
const ROUTE_H = H - HEADER_H - FOOTER_H;   // 420

const PACE_STOPS = ['#ff5050', '#ffd84d', '#6cf06c'];   // dark theme pace gradient

/* ── pure helpers (no shared deps with workoutColors.ts) ── */

function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, abv = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bbv = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(abv + (bbv - abv) * t);
  return '#' + ((r << 16) | (g << 8) | b2).toString(16).padStart(6, '0');
}

function paceColor(value, min, max) {
  if (max === min) return lerpColor(PACE_STOPS[0], PACE_STOPS[2], 0.5);
  // pace = sec/m, larger = slower; invert so slow→red and fast→green
  const t = 1 - clamp01((value - min) / (max - min));
  const seg = t * (PACE_STOPS.length - 1);
  const i = Math.min(Math.floor(seg), PACE_STOPS.length - 2);
  const lt = seg - i;
  return lerpColor(PACE_STOPS[i], PACE_STOPS[i + 1], lt);
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))];
}

function paceRange(route) {
  const paces = route.map(p => p.pace).filter(p => p > 0);
  if (paces.length < 2) return [0, 1];
  return [percentile(paces, 0.1), percentile(paces, 0.9)];
}

function fmtDuration(sec) {
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDate(iso, lang) {
  const d = new Date(iso);
  if (lang === 'zh') return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

let _fonts = null;
async function getFonts() {
  if (!_fonts) {
    const [bold, regular, mono] = await Promise.all([
      fs.readFile(path.join(FONT_DIR, 'NotoSansSC-Bold.ttf')),
      fs.readFile(path.join(FONT_DIR, 'NotoSansSC-Regular.ttf')),
      fs.readFile(path.join(FONT_DIR, 'JetBrainsMono-Medium.ttf')),
    ]);
    _fonts = [
      { name: 'Noto Sans SC', data: bold,    weight: 700, style: 'normal' },
      { name: 'Noto Sans SC', data: regular, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono', data: mono,  weight: 500, style: 'normal' },
    ];
  }
  return _fonts;
}

/**
 * Inflate a workout bbox by paddingFrac (default 15%) and adjust its
 * aspect ratio to (w / h) so that when Mapbox's static-image bbox URL
 * fits the bbox into the image, no additional padding is added — and
 * we know the visible bbox EXACTLY for our overlay projection.
 *
 * The aspect calc accounts for latitude distortion: 1° of longitude is
 * shorter than 1° of latitude away from the equator, by cos(lat).
 */
function matchBboxAspect([west, south, east, north], w, h, padFrac = 0.15) {
  let dLng = (east - west) * (1 + padFrac);
  let dLat = (north - south) * (1 + padFrac);
  if (dLng <= 0) dLng = 0.001;
  if (dLat <= 0) dLat = 0.001;
  const cx = (west + east) / 2;
  const cy = (south + north) / 2;
  const cosLat = Math.max(Math.cos((cy * Math.PI) / 180), 0.01);
  const targetAspect = w / h;
  const visualAspect = (dLng * cosLat) / dLat;
  if (visualAspect > targetAspect) {
    dLat = (dLng * cosLat) / targetAspect;
  } else {
    dLng = (dLat * targetAspect) / cosLat;
  }
  return [cx - dLng / 2, cy - dLat / 2, cx + dLng / 2, cy + dLat / 2];
}

/** Project a route point into image-pixel space given an aspect-matched bbox. */
function projectFor(bbox, w, h) {
  const [west, south, east, north] = bbox;
  const dLng = east - west;
  const dLat = north - south;
  return (p) => [
    +(((p.lng - west) / dLng) * w).toFixed(2),
    +(((north - p.lat) / dLat) * h).toFixed(2),
  ];
}

/** Build a multi-segment, pace-colored route SVG positioned exactly over the basemap. */
function buildRouteOverlaySvg(route, bbox, w, h) {
  if (!route || route.length < 2 || !bbox) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  }
  const project = projectFor(bbox, w, h);
  const [pMin, pMax] = paceRange(route);
  let lines = '';
  for (let i = 0; i < route.length - 1; i++) {
    const [x1, y1] = project(route[i]);
    const [x2, y2] = project(route[i + 1]);
    const v = (route[i].pace + route[i + 1].pace) / 2;
    const c = paceColor(v, pMin, pMax);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines}</svg>`;
}

/** Fetch a Mapbox Static Images basemap PNG for the given (already aspect-matched) bbox. */
async function fetchMapboxBasemap([west, south, east, north], w, h) {
  const token = process.env.PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error('PUBLIC_MAPBOX_TOKEN missing');
  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/[${west},${south},${east},${north}]/${w}x${h}@2x?access_token=${token}&attribution=false&logo=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox static ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Compose the route image: basemap PNG (Mapbox) + colored polyline (sharp composite). */
async function buildRouteImagePng(route, bbox, w, h) {
  if (!route || route.length < 2 || !bbox) {
    // Empty route: 1x1 transparent PNG.
    return await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 11, g: 11, b: 11, alpha: 1 } },
    }).png().toBuffer();
  }
  const fittedBbox = matchBboxAspect(bbox, w, h);
  const basemap = await fetchMapboxBasemap(fittedBbox, w, h);
  const overlaySvg = buildRouteOverlaySvg(route, fittedBbox, w, h);
  return await sharp(basemap)
    .resize(w, h, { fit: 'cover' })           // collapse @2x density into logical pixels
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Render one workout OG card.
 *
 * @param {object} args
 * @param {object} args.workout - normalized WorkoutRecord
 * @param {string} args.title   - already-localized title (e.g. "麦里芝水库")
 * @param {string} [args.location] - already-localized location (optional)
 * @param {'zh'|'en'} args.lang
 * @returns {Promise<Buffer>} PNG buffer (1200×630)
 */
export async function generateWorkoutOG({ workout, title, location, lang }) {
  const routePng = await buildRouteImagePng(workout.route, workout.bbox, W, ROUTE_H);
  const routeDataUrl = `data:image/png;base64,${routePng.toString('base64')}`;

  const stats = workout.stats;
  const dateStr = fmtDate(workout.start, lang);
  const distanceLabel = `${stats.distanceKm.toFixed(2)} km`;
  const durationLabel = fmtDuration(workout.durationSec);
  const elevLabel = `↑${stats.elevationUpM} m`;
  const heartLabel = `${Math.round(stats.heart.avg)} bpm`;
  const calLabel = `${Math.round(stats.calories.totalKcal)} kcal`;

  const subLine = location ? `${dateStr} · ${location}` : dateStr;

  const fonts = await getFonts();

  const dot = (txt, color = '#666') => ({
    type: 'div', props: { style: { color }, children: txt },
  });

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: `${W}px`, height: `${H}px`,
          display: 'flex', flexDirection: 'column',
          backgroundColor: '#0b0b0b',
          color: '#f4f4f4',
          fontFamily: 'Noto Sans SC',
          position: 'relative',
        },
        children: [
          // ── Header ─────────────────────────────────────
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '24px 60px',
                height: `${HEADER_H}px`,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', gap: '8px' },
                    children: [
                      { type: 'div', props: { style: { fontSize: 38, fontWeight: 700, lineHeight: 1.1 }, children: title } },
                      { type: 'div', props: { style: { fontSize: 18, color: '#9a9a9a', fontFamily: 'JetBrains Mono', letterSpacing: '0.02em' }, children: subLine } },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 18, color: '#9a9a9a', fontFamily: 'JetBrains Mono', letterSpacing: '0.18em', alignSelf: 'flex-start', paddingTop: 12 },
                    children: 'ursb.me',
                  },
                },
              ],
            },
          },
          // ── Route ──────────────────────────────────────
          {
            type: 'div',
            props: {
              style: { display: 'flex', flex: '1 1 auto', alignItems: 'center', justifyContent: 'center' },
              children: [
                {
                  type: 'img',
                  props: { src: routeDataUrl, width: W, height: ROUTE_H, style: { width: `${W}px`, height: `${ROUTE_H}px` } },
                },
              ],
            },
          },
          // ── Footer stats ───────────────────────────────
          {
            type: 'div',
            props: {
              style: {
                display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                height: `${FOOTER_H}px`,
                padding: '0 60px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: 26, fontWeight: 500,
                fontFamily: 'JetBrains Mono',
                letterSpacing: '0.02em',
              },
              children: [
                { type: 'div', props: { children: distanceLabel } },
                dot('·'),
                { type: 'div', props: { children: durationLabel } },
                dot('·'),
                { type: 'div', props: { children: elevLabel } },
                dot('·'),
                { type: 'div', props: { children: heartLabel } },
                dot('·'),
                { type: 'div', props: { children: calLabel } },
              ],
            },
          },
        ],
      },
    },
    { width: W, height: H, fonts },
  );

  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
