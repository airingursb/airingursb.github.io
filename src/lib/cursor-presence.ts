// Figma-style live cursors — shared Supabase Realtime client + identity helpers.
//
// Transport is Supabase Realtime *Broadcast* (ephemeral cursor positions) +
// *Presence* (who's online + their identity metadata). Neither touches
// Postgres, so this respects the project rule of never writing per-pageview.
//
// Identity is anonymous but distinct along three independent axes:
//   • theme color — curated 16-swatch palette, picked by id hash (every
//     swatch looks good, unlike a raw HSL wheel which yields muddy hues)
//   • animal      — a cute glyph for personality (NOT the unique key; the
//     pool is small so collisions are expected and fine)
//   • number      — the visitor's counter ordinal — THIS is the unique handle
//
// Region flag + number ("🇸🇬 #3,412") and the country code are reused from the
// existing online-presence.js (sessionStorage), so no extra heartbeat / no
// double-counting of the live "N online" tally.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  import.meta.env.PUBLIC_SUPABASE_URL || 'https://pcoyocvqfipuydhvdsle.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_jieHU6yu3dPxSww2_B_KIg_9KcWg6wl'

let _client: SupabaseClient | null = null

/** Memoized Realtime-only client (no auth session, no DB usage). */
export function getSupabase(): SupabaseClient {
  if (_client) return _client
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 25 } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

/**
 * Stable per-browser id. Reuses the online-presence client id so the cursor's
 * color/animal stay consistent with the rest of the site's identity.
 */
export function getIdentitySeed(): string {
  try {
    const existing = localStorage.getItem('online_client_id') || localStorage.getItem('cursor_visitor_id')
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem('cursor_visitor_id', id)
    return id
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

// Hand-tuned palette — vivid but harmonious, all readable under white text.
const PALETTE = [
  '#ff6b6b', '#ff8e3c', '#ffb02e', '#ffd23f', '#7bd389', '#2ec4b6',
  '#22a6f2', '#4d7cfe', '#6c5ce7', '#a55eea', '#e056fd', '#ff5fa2',
  '#fc6076', '#ff4d4d', '#00b894', '#0fb9b1',
]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function colorFor(seed: string): string {
  return PALETTE[hash(seed) % PALETTE.length]
}

/** ISO-3166 alpha-2 → regional-indicator flag emoji; 🌐 when unknown. */
export function flagEmoji(cc?: string | null): string {
  const c = String(cc || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return '🌐'
  return c.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
}

/** Visitor ordinal cached by online-presence.js / the homepage counter. */
export function readVisitorNumber(): number | null {
  try {
    const n = parseInt(sessionStorage.getItem('visitor_counted') || '', 10)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

/** Country code cached by online-presence.js after its heartbeat. */
export function readCountry(): string | null {
  try {
    return sessionStorage.getItem('vp_country') || null
  } catch {
    return null
  }
}
