// Shared constants for the lounge V2.x game client.

export const ROOM_WIDTH = 480
export const ROOM_HEIGHT = 320
export const TILE = 16

export const WS_URL = 'wss://chat.ursb.me/api/lounge/ws'

export const WALK_SPEED = 80         // px/sec
export const POS_SEND_HZ = 10
export const POS_SEND_MIN_DELTA = 0.5

export const REGIONS = ['asia', 'americas', 'europe', 'oceania', 'africa', 'unknown'] as const
export type Region = typeof REGIONS[number]

export const REGION_BY_CC: Record<string, Region> = {
  CN: 'asia', JP: 'asia', KR: 'asia', TW: 'asia', HK: 'asia', SG: 'asia', IN: 'asia',
  TH: 'asia', VN: 'asia', PH: 'asia', ID: 'asia', MY: 'asia', AE: 'asia', SA: 'asia',
  IL: 'asia', TR: 'asia', PK: 'asia', BD: 'asia',
  US: 'americas', CA: 'americas', MX: 'americas', BR: 'americas', AR: 'americas',
  CL: 'americas', CO: 'americas', PE: 'americas',
  GB: 'europe', DE: 'europe', FR: 'europe', NL: 'europe', ES: 'europe', IT: 'europe',
  SE: 'europe', NO: 'europe', FI: 'europe', DK: 'europe', PL: 'europe', CH: 'europe',
  AT: 'europe', BE: 'europe', IE: 'europe', PT: 'europe', GR: 'europe', CZ: 'europe',
  RU: 'europe', UA: 'europe',
  AU: 'oceania', NZ: 'oceania',
  ZA: 'africa', EG: 'africa', NG: 'africa', KE: 'africa', MA: 'africa'
}

export function ccToRegion(cc: string | null | undefined): Region {
  if (!cc) return 'unknown'
  return REGION_BY_CC[cc.toUpperCase()] || 'unknown'
}

/** Convert 2-letter country code → flag emoji. Returns 🌍 if unknown. */
export function ccToFlag(cc: string | null | undefined): string {
  if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return '🌍'
  const c = cc.toUpperCase()
  return String.fromCodePoint(
    0x1F1E6 + c.charCodeAt(0) - 65,
    0x1F1E6 + c.charCodeAt(1) - 65
  )
}

/** Human-readable country name from CC, fallback to "Unknown". */
export function ccToCountryName(cc: string | null | undefined): string {
  if (!cc) return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc.toUpperCase()) || cc
  } catch {
    return cc
  }
}

export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem('lounge_visitor_id')
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem('lounge_visitor_id', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

// V6.5 — Character species. V16.0 expanded the player-choosable set to
// include bunny + puppy (atlases already existed as pet sprites with
// identical frame layout, so no bake step needed).
export const SPECIES = ['bear', 'cat', 'fox', 'capybara', 'bird', 'bunny', 'puppy', 'panda', 'hamster', 'penguin', 'frog'] as const
export type Species = typeof SPECIES[number]
const SPECIES_STORAGE_KEY = 'lounge_species_v1'
export function getMySpecies(): Species {
  try {
    const v = localStorage.getItem(SPECIES_STORAGE_KEY)
    if (v && (SPECIES as readonly string[]).indexOf(v) !== -1) return v as Species
  } catch {}
  return 'bear'
}
export function setMySpecies(s: Species) {
  try { localStorage.setItem(SPECIES_STORAGE_KEY, s) } catch {}
}

export function getMyCC(): string | null {
  try {
    return sessionStorage.getItem('vp_country')
  } catch {
    return null
  }
}

// Audio / motion settings
export const AUDIO_SFX_KEYS = [
  'click', 'footstep_a', 'footstep_b',
  'wave', 'sit', 'dance', 'say',
  'menu_open', 'menu_close'
] as const
export type SfxKey = typeof AUDIO_SFX_KEYS[number]

export const AUDIO_DEFAULTS = {
  master: 0.5,
  sfx: 1.0,
  bgm: 0.7
}

export const MUTE_STORAGE_KEY = 'lounge_muted'

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Multi-room / protocol v=3 (V3.0 — adds persistence: welcome/name/name_changed/replaced)
export const PROTOCOL_VERSION = 3

export const STATIC_ROOMS = ['room_lobby', 'room_dj_floor', 'room_balcony', 'room_library', 'room_beach', 'room_grove', 'room_kitchen', 'room_workshop', 'room_rooftop', 'room_bedroom_mio', 'room_bedroom_halle', 'room_bedroom_sora', 'room_bedroom_theo', 'room_bedroom_marin', 'room_bedroom_cole', 'room_bedroom_wren', 'room_bedroom_dane', 'room_bedroom_iris', 'room_bedroom_mox', 'room_bath', 'room_arcade', 'room_greenhouse'] as const
export type StaticRoomId = typeof STATIC_ROOMS[number]
// Home rooms have dynamic ids like 'room_home_<8hex>'. Party rooms (V12.7)
// have dynamic ids like 'room_party_<6 chars from PARTY_CODE_ALPHABET>'.
export type RoomId = StaticRoomId | `room_home_${string}` | `room_party_${string}`
export const DEFAULT_ROOM: StaticRoomId = 'room_lobby'

// Back-compat for code that imports VALID_ROOMS.
export const VALID_ROOMS = STATIC_ROOMS

const HOME_ROOM_RE = /^room_home_[0-9a-f]{8}$/
const PARTY_ROOM_RE = /^room_party_[A-Z2-9]{6}$/

export function isValidRoom(s: string | null | undefined): s is RoomId {
  if (!s) return false
  if ((STATIC_ROOMS as readonly string[]).indexOf(s) !== -1) return true
  if (HOME_ROOM_RE.test(s)) return true
  if (PARTY_ROOM_RE.test(s)) return true
  return false
}

export function isHomeRoom(s: string): boolean {
  return HOME_ROOM_RE.test(s)
}

export function homeRoomFor(visitor_id: string): RoomId {
  return ('room_home_' + visitor_id.slice(0, 8)) as RoomId
}

// Volume channels (V2.4)
export const VOLUME_CHANNELS = ['master', 'sfx', 'bgm', 'ambient'] as const
export type VolumeChannel = typeof VOLUME_CHANNELS[number]
export const VOLUME_DEFAULTS: Record<VolumeChannel, number> = {
  master: 0.5,
  sfx: 1.0,
  bgm: 0.7,
  ambient: 0.7
}
export const VOLUME_STORAGE_KEY = 'lounge_volume_v1'

// V3.0 — display name validation (defense in depth; server is source of truth)
export const NAME_MAX = 16
const NAME_BLOCKLIST = ['<script', 'fuck', 'shit']
export function validateClientName(s: string): { ok: true; value: string } | { ok: false; reason: string } {
  if (typeof s !== 'string') return { ok: false, reason: 'type' }
  const v = s.normalize('NFC').trim()
  if (v.length === 0) return { ok: false, reason: 'empty' }
  if (v.length > NAME_MAX) return { ok: false, reason: 'too_long' }
  const low = v.toLowerCase()
  if (NAME_BLOCKLIST.some((w) => low.indexOf(w) !== -1)) return { ok: false, reason: 'blocked' }
  return { ok: true, value: v }
}
