// V8.0 — In-game time system.
//
// Game time runs 2× wall time by default: 1 game-hour = 30 real minutes.
// Origin (game-time 06:00) is anchored to each real-world day at 00:00 UTC so
// every visitor sees the same in-game clock. Toggle "real time" mode in
// settings — when off, getGameNow() returns wall-clock time and gameTimeEnabled
// is false (used by NPC schedules, festivals, cutscenes, weather).
//
// Math:
//   real_seconds_since_midnight_utc → game_minutes_since_06:00 at 2× rate
//   game_minutes = 6*60 + (real_seconds * 2 / 60)
//   wrap mod 24h
//
// So at real 00:00 UTC, game-clock reads 06:00.
// One real hour = 2 game hours; a real day = 48 game hours = 2 game-days.

const STORAGE_KEY = 'lounge_gametime_enabled_v1'
const RATE = 2  // game-minutes per real-minute

export function isGameTimeEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === '1'
  } catch { return false }
}

export function setGameTimeEnabled(enabled: boolean) {
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0') } catch {}
  notifyChange(enabled)
}

const listeners: Array<(enabled: boolean) => void> = []
export function onGameTimeChange(fn: (enabled: boolean) => void) { listeners.push(fn) }
function notifyChange(enabled: boolean) { for (const l of listeners) l(enabled) }

/** Compute the current in-game Date. If game time is disabled, returns real Date. */
export function getGameNow(realNow: Date = new Date()): Date {
  if (!isGameTimeEnabled()) return realNow
  const midnightUtc = new Date(Date.UTC(
    realNow.getUTCFullYear(), realNow.getUTCMonth(), realNow.getUTCDate()
  ))
  const realSecsSinceUtcMidnight = (realNow.getTime() - midnightUtc.getTime()) / 1000
  // Game minutes since 06:00 (the "morning start" of every real day)
  const gameMins = 6 * 60 + (realSecsSinceUtcMidnight / 60) * RATE
  const wrapped = ((gameMins % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = Math.floor(wrapped % 60)
  // Build a synthetic local Date object with that h:m for callers that read getHours()/getMinutes()
  const synth = new Date(realNow)
  synth.setHours(h, m, Math.floor(((realSecsSinceUtcMidnight * RATE) % 60)), 0)
  return synth
}

/** Format game time as HH:MM. */
export function formatGameTime(now: Date = getGameNow()): string {
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
