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
