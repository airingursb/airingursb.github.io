// V8.5 — Day-end + sleep flow.
// Only active when game-time is enabled (otherwise there's no day-end concept).
// Triggers once per game-day when the game clock crosses 02:00.

import { isGameTimeEnabled, getGameNow } from './gametime'
import { setEnergy, ENERGY_MAX, restoreEnergy } from './energy'
import { isHomeRoom } from './config'

const STORAGE_KEY = 'lounge_last_sleep_day_v1'   // YYYY-MM-DD UTC of last sleep prompt fired

function utcDay(d: Date = new Date()): string { return d.toISOString().slice(0, 10) }

/** Returns true if the player has not been prompted for today's sleep yet AND
 *  the game time is now within the sleep window (02:00-05:59). */
export function shouldPromptSleep(): boolean {
  if (!isGameTimeEnabled()) return false
  const now = getGameNow()
  const h = now.getHours()
  if (h < 2 || h >= 6) return false
  try {
    const last = localStorage.getItem(STORAGE_KEY)
    return last !== utcDay()
  } catch { return false }
}

export function markSleepPrompted() {
  try { localStorage.setItem(STORAGE_KEY, utcDay()) } catch {}
}

/** Result includes a description for the toast after the player wakes. */
export function performSleep(currentRoomId: string): { restored: number; venue: 'home' | 'floor' } {
  const venue = isHomeRoom(currentRoomId) ? 'home' : 'floor'
  if (venue === 'home') {
    setEnergy(ENERGY_MAX)
    return { restored: ENERGY_MAX, venue }
  }
  // Sleeping rough only restores half
  const partial = Math.floor(ENERGY_MAX / 2)
  restoreEnergy(partial)
  return { restored: partial, venue }
}
