/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * - Free, no API key.
 * - Policy: max 1 request/sec, must set a unique User-Agent.
 * - Returns coarse `{ city, country, countryCode }`; coords themselves
 *   are NEVER returned to the caller — privacy by construction.
 */

const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ursb.me-photos-sync/1.0 (https://ursb.me)';
const MIN_INTERVAL_MS = 1100;

let lastCallAt = 0;
const reverseCache = new Map(); // key: "lat,lng" rounded → result | null
const cityCache = new Map();    // key: "city|country" → [lat, lng] | null

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
  if (reverseCache.has(key)) return reverseCache.get(key);

  await rateLimit();

  const url = `${REVERSE_ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`;
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

  reverseCache.set(key, result);
  return result;
}

// Forward-geocode a city name to its centroid. Returns [lat, lng] rounded
// to 4 decimals (~10m). Used for map pins — independent of the actual photo
// location, so storing it does not leak the photographer's whereabouts
// beyond city granularity.
export async function cityCoords(city, country) {
  if (!city) return null;
  const key = `${city}|${country || ''}`;
  if (cityCache.has(key)) return cityCache.get(key);

  await rateLimit();

  const tryQuery = async (params) => {
    await rateLimit();
    const res = await fetch(`${SEARCH_ENDPOINT}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]?.lat || !data[0]?.lon) return null;
    const lat = Math.round(parseFloat(data[0].lat) * 10000) / 10000;
    const lng = Math.round(parseFloat(data[0].lon) * 10000) / 10000;
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  };

  let result = null;
  try {
    // Try structured city= lookup first; fall back to free-text q= for
    // non-city names (counties, districts, regions).
    const structured = new URLSearchParams({ format: 'jsonv2', city, limit: '1', 'accept-language': 'en' });
    if (country) structured.set('country', country);
    result = await tryQuery(structured);
    if (!result) {
      const free = new URLSearchParams({
        format: 'jsonv2',
        q: country ? `${city}, ${country}` : city,
        limit: '1',
        'accept-language': 'en',
      });
      result = await tryQuery(free);
    }
  } catch (err) {
    console.warn(`  ! city geocode failed for ${key}: ${err.message}`);
  }

  cityCache.set(key, result);
  return result;
}
