// Seasonal / holiday layer — D.
//
// Returns the current "season tag" based on real local date, with a
// URL override (?season=lny|midautumn|winter|birthday|default) for
// debugging. Components subscribe via useSeason() and conditionally
// mount decorations (couplets, extra moon, snow, confetti).
//
// Lunar dates are APPROXIMATE — solar calendar windows that bracket
// the real lunar holidays rather than computing actual lunar calendar.
// Looser windows = the festive mood stretches a few days either way,
// which feels right (people decorate before and after the actual day).
//
// Real anchor dates (Chinese lunar → 2026 solar):
//   春节 Spring Festival 2026:   Feb 17
//   中秋 Mid-Autumn 2026:        Sept 25
//   端午 Dragon Boat 2026:       Jun 19  (not implemented yet)
//
// Birthday flag is URL-only (no hardcoded date — would feel wrong to
// guess the visitor's birthday).

import { useEffect, useState } from 'react'

export type Season = 'lny' | 'midautumn' | 'winter' | 'birthday' | 'default'

function readURLOverride(): Season | null {
  if (typeof window === 'undefined') return null
  try {
    const p = new URLSearchParams(window.location.search).get('season')
    if (p === 'lny' || p === 'midautumn' || p === 'winter' || p === 'birthday' || p === 'default') return p
  } catch {}
  return null
}

// Window around real festival date — ±N days. Generous because real-world
// festive decorations go up before and stay up after the actual day.
function isWithin(month: number, day: number, anchorMonth: number, anchorDay: number, spreadDays: number): boolean {
  const date = new Date(2000, month, day)
  const anchor = new Date(2000, anchorMonth, anchorDay)
  const diffMs = Math.abs(date.getTime() - anchor.getTime())
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  // Handle year-wrap (Dec-Jan window) by also checking the wrap
  const wrap = Math.min(diffDays, 365 - diffDays)
  return wrap <= spreadDays
}

export function getCurrentSeason(): Season {
  const url = readURLOverride()
  if (url) return url
  const now = new Date()
  const m = now.getMonth()    // 0-indexed
  const d = now.getDate()
  // 春节: Feb 17 ± 12 days (~Feb 5 to Mar 1) — generous spring-festival window
  if (isWithin(m, d, 1, 17, 12)) return 'lny'
  // 中秋: Sept 25 ± 7 days (~Sept 18 to Oct 2) — narrower (1 weekend on each side)
  if (isWithin(m, d, 8, 25, 7)) return 'midautumn'
  // 冬天: Dec 21 → Feb 14 (deep winter). Avoid overlapping with 春节.
  //  (We rely on the lny check above coming first.)
  if ((m === 11 && d >= 21) || m === 0 || (m === 1 && d <= 14)) return 'winter'
  return 'default'
}

export function useSeason(): Season {
  const [season, setSeason] = useState<Season>(getCurrentSeason)
  useEffect(() => {
    // Re-check every 5 minutes (rough granularity is fine — season won't
    // change in the middle of a session except at midnight on edge days).
    function refresh() { setSeason(getCurrentSeason()) }
    const id = window.setInterval(refresh, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])
  return season
}
