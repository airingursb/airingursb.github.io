// SHU-733 Phase 11 · Quality tier detection for low-end devices.
//
// Looks at navigator hardware hints + screen + UA to decide whether to
// degrade visual quality. The scene reads `getQualityTier()` once on
// mount; subsequent reads return the cached tier.

export type QualityTier = 'high' | 'medium' | 'low'

let _cachedTier: QualityTier | null = null

export function getQualityTier(): QualityTier {
  if (_cachedTier) return _cachedTier
  if (typeof navigator === 'undefined') return 'medium'

  // deviceMemory (Chrome only): 4 / 8 / 16 GB; fallback assume mid
  const ram = (navigator as any).deviceMemory ?? 4
  const cpu = navigator.hardwareConcurrency ?? 4
  const ua = navigator.userAgent ?? ''
  const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(ua)

  // Old iOS = iPhone 6-8 / iPhone X with iOS Safari (some still around)
  const isOldIos = /iPhone (OS [4-9]_|OS 1[01234]_)/i.test(ua)

  let tier: QualityTier = 'high'
  if (isOldIos) tier = 'low'
  else if (isMobile && (ram <= 4 || cpu <= 4)) tier = 'low'
  else if (isMobile) tier = 'medium'
  else if (ram <= 4 && cpu <= 4) tier = 'medium'
  else tier = 'high'

  _cachedTier = tier
  if (typeof window !== 'undefined') {
    // Surface to overlay for debugging
    ;(window as any).__GROVE_QUALITY__ = tier
  }
  return tier
}

/** Quality knobs read by components */
export const QUALITY_SETTINGS = {
  high:   { shadowMapSize: 2048, dpr: [1, 2], bloom: true,  starCount: 1500, fog: 40 },
  medium: { shadowMapSize: 1024, dpr: [1, 1.5], bloom: true, starCount: 800,  fog: 35 },
  low:    { shadowMapSize: 512,  dpr: [1, 1],   bloom: false, starCount: 400, fog: 28 },
} as const

export function getQualitySettings() {
  return QUALITY_SETTINGS[getQualityTier()]
}
