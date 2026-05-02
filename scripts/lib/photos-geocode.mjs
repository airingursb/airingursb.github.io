/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * - Free, no API key.
 * - Policy: max 1 request/sec, must set a unique User-Agent.
 * - Returns coarse `{ city, country, countryCode }`; coords themselves
 *   are NEVER returned to the caller — privacy by construction.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'ursb.me-photos-sync/1.0 (https://ursb.me)';
const MIN_INTERVAL_MS = 1100;

let lastCallAt = 0;
const cache = new Map(); // key: "lat,lng" rounded → result | null

function roundKey(lat, lng) {
  // ~110m precision; enough to dedupe photos taken at the same spot
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function rateLimit() {
  const now = Date.now();
  const wait = lastCallAt + MIN_INTERVAL_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

function pickCity(addr) {
  return addr.city
    || addr.town
    || addr.village
    || addr.municipality
    || addr.county
    || addr.state
    || null;
}

export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const key = roundKey(lat, lng);
  if (cache.has(key)) return cache.get(key);

  await rateLimit();

  const url = `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`;
  let result = null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const addr = data.address || {};
    const city = pickCity(addr);
    const country = addr.country || null;
    if (city && country) {
      result = {
        city,
        country,
        countryCode: (addr.country_code || '').toLowerCase() || null,
      };
    }
  } catch (err) {
    console.warn(`  ! reverse geocode failed for ${key}: ${err.message}`);
  }

  cache.set(key, result);
  return result;
}
