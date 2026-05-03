import { simplifyRoute } from './workouts-simplify.mjs';
import { interpolateSeries } from './workouts-interpolate.mjs';

const KJ_TO_KCAL = 0.239005736;

/**
 * Convert HealthAutoExport's `"YYYY-MM-DD HH:mm:ss +HHMM"` to ISO 8601
 * `"YYYY-MM-DDTHH:mm:ss+HH:MM"` and return both ISO and Unix ms.
 */
function parseTimestamp(s) {
  // "2026-04-01 08:00:00 +0800"
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s);
  if (!m) throw new Error(`bad timestamp: ${s}`);
  const [, date, time, oh, om] = m;
  const iso = `${date}T${time}${oh}:${om}`;
  return { iso, ms: Date.parse(iso) };
}

/** Convert a series like heartRateData / stepCount / activeEnergy to {t,value} buckets. */
function toBuckets(arr, startMs, valueKey) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => ({
    t: (parseTimestamp(item.date).ms - startMs) / 1000,
    value: typeof valueKey === 'function' ? valueKey(item) : item[valueKey],
  })).sort((a, b) => a.t - b.t);
}

/** Haversine distance in metres. */
function haversine(a, b) {
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * @param {object} raw - HealthAutoExport workout entry
 * @returns {import('../../src/components/workouts/types.ts').WorkoutRecord}
 */
export function normalizeWorkout(raw) {
  const { iso: startIso, ms: startMs } = parseTimestamp(raw.start);
  const { iso: endIso }                = parseTimestamp(raw.end);
  const durationSec = Math.round(raw.duration);

  const hrBuckets   = toBuckets(raw.heartRateData, startMs, x => x.Avg);
  const stepBuckets = toBuckets(raw.stepCount,     startMs, 'qty');
  const calBuckets  = toBuckets(raw.activeEnergy,  startMs,
                                x => x.qty * KJ_TO_KCAL); // kJ → kcal

  // Build raw route with t, lat, lng, alt
  const rawRoute = (raw.route || []).map(p => ({
    t: (parseTimestamp(p.timestamp).ms - startMs) / 1000,
    lat: p.latitude,
    lng: p.longitude,
    alt: p.altitude,
    speed: p.speed,
    accuracy: p.horizontalAccuracy,
  }));

  // Simplify (skip if empty)
  const simplified = rawRoute.length >= 2
    ? simplifyRoute(rawRoute, 0.00005)
    : rawRoute;

  // Compute pace per simplified point: m/s averaged across the segment ending at this point
  const enriched = simplified.map((p, i) => {
    let pace = Infinity;
    if (i > 0) {
      const prev = simplified[i - 1];
      const dt = p.t - prev.t;
      const dm = haversine(prev, p);
      if (dm > 0 && dt > 0) pace = dt / dm;            // seconds per metre
    }
    return {
      t: round1(p.t),
      lat: round6(p.lat),
      lng: round6(p.lng),
      alt: round1(p.alt),
      pace: pace === Infinity ? 0 : round3(pace),
      hr:   round1(interpolateSeries(hrBuckets,   p.t)),
      cal:  round3(interpolateSeries(calBuckets,  p.t)),  // kcal/min
      step: round1(interpolateSeries(stepBuckets, p.t)),  // count/min
    };
  });

  // bbox
  let bbox = null;
  if (enriched.length >= 1) {
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const p of enriched) {
      if (p.lng < west)  west  = p.lng;
      if (p.lng > east)  east  = p.lng;
      if (p.lat < south) south = p.lat;
      if (p.lat > north) north = p.lat;
    }
    bbox = [round6(west), round6(south), round6(east), round6(north)];
  }

  // Stats
  const elevUp   = raw.elevationUp?.qty   ?? 0;
  const elevDown = raw.elevationDown?.qty ?? 0;
  const distKm   = raw.distance?.qty      ?? 0;
  const durationMin = durationSec / 60;
  const speedKmh = raw.speed?.qty ?? (durationMin > 0 ? distKm / (durationMin / 60) : 0);
  const paceSecPerKm = distKm > 0 ? durationSec / distKm : 0;

  const totalKcal = (raw.activeEnergyBurned?.qty ?? 0) * KJ_TO_KCAL;
  const burnPerHr = durationMin > 0 ? totalKcal / (durationMin / 60) : 0;

  const totalSteps = Math.round(raw.stepCount?.reduce?.((s, x) => s + (x.qty ?? 0), 0) ?? 0);
  const stepCadence = raw.stepCadence?.qty ?? 0;
  const stepLengthM = totalSteps > 0 ? (distKm * 1000) / totalSteps : 0;

  const stats = {
    distanceKm: round2(distKm),
    paceSecPerKm: round1(paceSecPerKm),
    speedKmh: round2(speedKmh),
    maxSpeedKmh: round2(raw.maxSpeed?.qty ?? 0),
    elevationUpM: Math.round(elevUp),
    elevationDownM: Math.round(elevDown),
    elevationGainLossM: Math.round(elevUp - elevDown),
    ascentM: Math.round(elevUp),
    descentM: Math.round(elevDown),
    verticalMperMin: durationMin > 0 ? round2((elevUp - elevDown) / durationMin) : 0,
    heart: {
      avg: round1(raw.heartRate?.avg?.qty ?? raw.avgHeartRate?.qty ?? 0),
      max: round1(raw.heartRate?.max?.qty ?? raw.maxHeartRate?.qty ?? 0),
      min: round1(raw.heartRate?.min?.qty ?? 0),
    },
    calories: {
      totalKcal: round2(totalKcal),
      burnPerHr: round2(burnPerHr),
      restingKcal: 0,                         // not available in source
    },
    stepCount: totalSteps,
    stepCadence: round1(stepCadence),
    stepLengthM: round2(stepLengthM),
    gps: {
      avgAccuracyM: round1(avg(rawRoute.map(p => p.accuracy ?? 0))),
      minAccuracyM: round1(rawRoute.length ? Math.max(...rawRoute.map(p => p.accuracy ?? 0)) : 0),
    },
  };

  return {
    id: raw.id,
    type: inferType(raw.name),
    start: startIso,
    end: endIso,
    durationSec,
    stats,
    bbox,
    route: enriched,
  };
}

function inferType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('hik'))   return 'hiking';
  if (n.includes('walk'))  return 'walking';
  if (n.includes('run'))   return 'running';
  if (n.includes('cycl') || n.includes('bike')) return 'cycling';
  return 'other';
}

function avg(xs)        { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function round1(n)      { return Math.round(n * 10) / 10; }
function round2(n)      { return Math.round(n * 100) / 100; }
function round3(n)      { return Math.round(n * 1000) / 1000; }
function round6(n)      { return Math.round(n * 1e6) / 1e6; }
