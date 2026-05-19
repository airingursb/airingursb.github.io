// V14.1 — Morning Coffee ritual.
//
// 4 daily UTC windows (00-01, 06-07, 12-13, 18-19) cover different
// timezones so most players catch one a week. During an active window,
// any player who enters the Lobby looks for an existing 'morning_coffee'
// group session; joins if found, creates if not. Once a session has 2+
// members continuously for 30s, all current members earn a one-time
// daily +5 max-energy buff (key: lounge_coffee_buff_until).
//
// Visual: a small top-banner in the UI shows "☕ Morning Coffee — N here".
// The bear sprite circle around the table is V14.x polish; this module
// just handles the bookkeeping + banner.

import { getCurrentSession, getKnownSessions, onSessionChange, onListChange, type GroupSession } from './group'
import { sendGroupCreate, sendGroupJoin, sendGroupLeave, sendGroupList } from './net'

export const COFFEE_KIND = 'morning_coffee'
export const COFFEE_ROOM = 'room_lobby'
const QUORUM = 2
const QUORUM_HOLD_MS = 30_000
const BUFF_KEY = 'lounge_coffee_buff_until'
const BUFF_DAY_KEY = 'lounge_coffee_buff_day'

/** True if the current UTC hour is inside one of the four daily coffee windows. */
export function isCoffeeWindowOpen(now: Date = new Date()): boolean {
  const h = now.getUTCHours()
  return h === 0 || h === 6 || h === 12 || h === 18
}

export function isCoffeeBuffActive(): boolean {
  try { return Date.now() < Number(localStorage.getItem(BUFF_KEY) || '0') } catch { return false }
}

function awardCoffeeBuff() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem(BUFF_DAY_KEY) === today) return  // one buff per UTC day
    localStorage.setItem(BUFF_DAY_KEY, today)
    localStorage.setItem(BUFF_KEY, String(Date.now() + 86400_000))
  } catch {}
}

let _quorumSince = 0
let _bannerTimer: number | null = null
let _initialized = false
let _onBannerChange: ((text: string | null) => void) | null = null

export function setCoffeeBannerHandler(fn: (text: string | null) => void) {
  _onBannerChange = fn
}

/** Call when the player enters the Lobby (or any time). No-op if not in window. */
export function maybeJoinMorningCoffee(currentRoomId: string) {
  if (currentRoomId !== COFFEE_ROOM) { _onBannerChange?.(null); return }
  if (!isCoffeeWindowOpen()) { _onBannerChange?.(null); return }
  if (!_initialized) {
    _initialized = true
    onSessionChange(handleSessionChange)
    onListChange(handleListChange)
    // Periodic quorum check
    setInterval(() => {
      const s = getCurrentSession()
      if (!s || s.kind !== COFFEE_KIND) return
      if (s.members.length >= QUORUM) {
        if (_quorumSince === 0) _quorumSince = Date.now()
        else if (Date.now() - _quorumSince >= QUORUM_HOLD_MS) awardCoffeeBuff()
      } else { _quorumSince = 0 }
      // Refresh banner text
      _onBannerChange?.(`Morning Coffee — ${s.members.length} here${isCoffeeBuffActive() ? ' · buff earned ✓' : ''}`)
    }, 3000)
  }
  // Refresh known sessions, then either join or create
  sendGroupList({ kind: COFFEE_KIND, room: COFFEE_ROOM })
}

function handleListChange(sessions: GroupSession[]) {
  if (!isCoffeeWindowOpen()) return
  if (getCurrentSession()) return  // already in some session
  const existing = sessions.find(s => s.kind === COFFEE_KIND && s.room === COFFEE_ROOM)
  if (existing) sendGroupJoin(existing.id)
  else sendGroupCreate(COFFEE_KIND, COFFEE_ROOM as any)
}

function handleSessionChange(s: GroupSession | null) {
  if (!s || s.kind !== COFFEE_KIND) {
    _onBannerChange?.(null)
    return
  }
  _onBannerChange?.(`Morning Coffee — ${s.members.length} here${isCoffeeBuffActive() ? ' · buff earned ✓' : ''}`)
}

/** Leave the coffee circle (called when player walks out of Lobby). */
export function leaveMorningCoffeeIfNeeded(currentRoomId: string) {
  if (currentRoomId === COFFEE_ROOM) return
  const s = getCurrentSession()
  if (s && s.kind === COFFEE_KIND) sendGroupLeave(s.id)
  _onBannerChange?.(null)
}
