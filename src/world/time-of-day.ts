// Unified TimeOfDay state — single source of truth for the world's
// temporal mood. Replaces ad-hoc reading of `theme` and `Date.now()`
// scattered across Sky / Atmospherics / DuskFog / SunsetBirds / etc.
//
// Three layers:
//
//   TimePhase  = 'dawn' | 'day' | 'dusk' | 'night'  ← fine-grained
//   Theme      = 'day'  | 'dusk'                    ← legacy 2-state
//   blend      = 0..1 progress within current phase ← smooth lerp
//
// Resolution order: URL `?time=` (debug) → localStorage manual → real time.
// Phase boundaries (local time):
//   dawn  05:00 – 07:30
//   day   07:30 – 17:00
//   dusk  17:00 – 19:30
//   night 19:30 – 05:00 (next day)

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night'
export type Theme = 'day' | 'dusk'   // legacy 2-state, derived

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'world-time-override'

// Phase boundaries in minutes-from-midnight
const PHASE_BOUNDS: Array<{ phase: TimePhase; start: number; end: number }> = [
  { phase: 'dawn',  start: 5 * 60,    end: 7 * 60 + 30 },
  { phase: 'day',   start: 7 * 60 + 30, end: 17 * 60 },
  { phase: 'dusk',  start: 17 * 60,   end: 19 * 60 + 30 },
  // Night wraps midnight — handled specially below
]

function phaseFromMinutes(mins: number): { phase: TimePhase; blend: number } {
  for (const b of PHASE_BOUNDS) {
    if (mins >= b.start && mins < b.end) {
      const blend = (mins - b.start) / (b.end - b.start)
      return { phase: b.phase, blend }
    }
  }
  // Night: 19:30 → 24:00 → 05:00
  const nightStart = 19 * 60 + 30
  const nightEnd = 5 * 60
  let blend: number
  if (mins >= nightStart) {
    blend = (mins - nightStart) / (24 * 60 - nightStart + nightEnd)
  } else {
    // After midnight, before 5am
    blend = (24 * 60 - nightStart + mins) / (24 * 60 - nightStart + nightEnd)
  }
  return { phase: 'night', blend }
}

function readURLOverride(): TimePhase | null {
  if (typeof window === 'undefined') return null
  try {
    const p = new URLSearchParams(window.location.search).get('time')
    if (p === 'dawn' || p === 'day' || p === 'dusk' || p === 'night') return p
  } catch {}
  return null
}

function readManualOverride(): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t === 'day' || t === 'dusk') return t
  } catch {}
  return null
}

export function setManualOverride(theme: Theme | null): void {
  if (typeof window === 'undefined') return
  try {
    if (theme === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
  // Notify subscribers via custom event
  window.dispatchEvent(new CustomEvent('world-time-changed'))
}

export function clearManualOverride(): void {
  setManualOverride(null)
}

// Theme derivation: dawn + day → day, dusk + night → dusk (legacy 2-state)
function themeFromPhase(p: TimePhase): Theme {
  return (p === 'day' || p === 'dawn') ? 'day' : 'dusk'
}

export function getCurrentState(): {
  phase: TimePhase
  blend: number
  theme: Theme
  source: 'url' | 'manual' | 'real'
} {
  // 1. URL override (debug)
  const url = readURLOverride()
  if (url) return { phase: url, blend: 0.5, theme: themeFromPhase(url), source: 'url' }
  // 2. User's manual switch (localStorage). Pin to middle of phase.
  const manual = readManualOverride()
  if (manual) {
    const phase: TimePhase = manual   // manual is already day or dusk
    return { phase, blend: 0.5, theme: manual, source: 'manual' }
  }
  // 3. Real local time
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const { phase, blend } = phaseFromMinutes(mins)
  return { phase, blend, theme: themeFromPhase(phase), source: 'real' }
}

// React hook — components subscribe to the current state. Re-evaluates
// every minute (rough granularity is fine for ambient scene) AND on
// the 'world-time-changed' event when user manually overrides.
export function useTimeOfDay(): {
  phase: TimePhase
  blend: number
  theme: Theme
  source: 'url' | 'manual' | 'real'
} {
  const [state, setState] = useState(getCurrentState)
  useEffect(() => {
    function refresh() { setState(getCurrentState()) }
    // Re-check on user override
    window.addEventListener('world-time-changed', refresh)
    // Re-check every 60s for real-time drift
    const id = window.setInterval(refresh, 60 * 1000)
    return () => {
      window.removeEventListener('world-time-changed', refresh)
      clearInterval(id)
    }
  }, [])
  return state
}
