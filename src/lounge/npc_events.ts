// V14.4 — NPC-hosted scheduled events.
//
// Weekly schedule of NPC-hosted moments. Each event runs for 10 minutes;
// during a 5-minute pre-window we banner everyone with location + start
// time. Players in the host room during the active window auto-form an
// `npc_event` group session and watch a short cutscene; all attendees get
// a +10 shell reward (one-time per event_id).

import { sendGroupCreate, sendGroupJoin, sendGroupLeave, sendGroupList } from './net'
import { getCurrentSession, onSessionChange, type GroupSession } from './group'
import { awardShells } from './shells'

const KIND = 'npc_event'
const PRE_WINDOW_MIN = 5
const ACTIVE_WINDOW_MIN = 10

export type NpcEvent = {
  id: string
  npc_id: string
  npc_name: string
  room: string
  dayOfWeek: number    // 0=Sun, 1=Mon, ..., 6=Sat (UTC)
  hour: number          // UTC 0-23
  title: string
  blurb: string
  emoji: string
  /** A small dialog script for the cutscene (per-event). */
  lines: string[]
}

export const NPC_EVENT_SCHEDULE: NpcEvent[] = [
  {
    id: 'mox_workshop_demo',
    npc_id: 'npc_mox', npc_name: 'Mox',
    room: 'room_workshop',
    dayOfWeek: 1, hour: 20,   // Mon 20:00 UTC
    emoji: '🔧',
    title: 'Workshop Demo',
    blurb: 'Mox shows a tiny new gadget she rebuilt.',
    lines: [
      "Gather round. Today's piece is a brass cricket.",
      "I rewired the spring to chirp in C minor. Listen.",
      "Three years to find the right wire. Now it sings."
    ]
  },
  {
    id: 'iris_grove_story',
    npc_id: 'npc_iris', npc_name: 'Iris',
    room: 'room_grove',
    dayOfWeek: 3, hour: 19,   // Wed 19:00 UTC
    emoji: '🌿',
    title: 'Grove Story Time',
    blurb: 'Iris tells one short flower fable.',
    lines: [
      "Sit on the stones. This one's about the moonflower.",
      "It only blooms when someone is genuinely sad nearby.",
      "Which is to say — kindness has a smell. Plants know."
    ]
  },
  {
    id: 'halle_library_reading',
    npc_id: 'npc_halle', npc_name: 'Halle',
    room: 'room_library',
    dayOfWeek: 6, hour: 19,   // Sat 19:00 UTC
    emoji: '📖',
    title: 'Library Reading',
    blurb: 'Halle reads a half-page from her memoir.',
    lines: [
      "Page seventeen. Don't ask about the others.",
      "'The library taught me silence isn't empty. It's a held breath.'",
      "That's it. Sit a while. Don't say anything for a minute."
    ]
  }
]

export type EventStatus = {
  event: NpcEvent
  state: 'pre' | 'active' | 'past'
  startsInMin: number
  endsInMin: number
}

/** Returns the event closest to now (pre or active), else null. */
export function currentEventStatus(now: Date = new Date()): EventStatus | null {
  for (const ev of NPC_EVENT_SCHEDULE) {
    const startUtc = nextOrCurrentOccurrence(ev, now)
    const startMs = startUtc.getTime()
    const endMs = startMs + ACTIVE_WINDOW_MIN * 60_000
    const preMs = startMs - PRE_WINDOW_MIN * 60_000
    if (now.getTime() >= preMs && now.getTime() < startMs) {
      return { event: ev, state: 'pre', startsInMin: Math.ceil((startMs - now.getTime()) / 60_000), endsInMin: ACTIVE_WINDOW_MIN }
    }
    if (now.getTime() >= startMs && now.getTime() < endMs) {
      return { event: ev, state: 'active', startsInMin: 0, endsInMin: Math.ceil((endMs - now.getTime()) / 60_000) }
    }
  }
  return null
}

function nextOrCurrentOccurrence(ev: NpcEvent, now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), ev.hour, 0, 0))
  const dow = d.getUTCDay()
  const diff = (ev.dayOfWeek - dow + 7) % 7
  d.setUTCDate(d.getUTCDate() + diff)
  // If event already passed today (same dow but hour earlier), the diff
  // would be 0 — push to next week.
  if (d.getTime() < now.getTime() - ACTIVE_WINDOW_MIN * 60_000) {
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return d
}

const SEEN_KEY = 'lounge_npc_event_attended_v1'
function hasAttended(eventId: string, weekKey: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')
    return !!map[`${eventId}|${weekKey}`]
  } catch { return false }
}
function markAttended(eventId: string, weekKey: string) {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')
    map[`${eventId}|${weekKey}`] = Date.now()
    localStorage.setItem(SEEN_KEY, JSON.stringify(map))
  } catch {}
}
function weekKey(d: Date = new Date()): string {
  // ISO week-ish: year + week-of-year
  const y = d.getUTCFullYear()
  const start = Date.UTC(y, 0, 1)
  const week = Math.floor(((d.getTime() - start) / 86400_000 + new Date(start).getUTCDay()) / 7)
  return `${y}w${week}`
}

let _bannerHandler: ((info: { text: string; cta?: string } | null) => void) | null = null
let _ctaHandler: (() => void) | null = null
let _initialized = false
let _activeAttended = false

export function setEventBannerHandler(fn: (info: { text: string; cta?: string } | null) => void, onCta?: () => void) {
  _bannerHandler = fn
  _ctaHandler = onCta ?? null
}
export function triggerEventCta() { _ctaHandler?.() }

/** Called periodically + on room change. Updates banner. */
export function tickNpcEvents(currentRoomId: string) {
  if (!_initialized) {
    _initialized = true
    onSessionChange(handleSessionChange)
    setInterval(() => tickNpcEvents(currentRoomId), 30_000)
  }
  const status = currentEventStatus()
  if (!status) { _bannerHandler?.(null); return }
  if (status.state === 'pre') {
    _bannerHandler?.({
      text: `${status.event.emoji} ${status.event.npc_name}: ${status.event.title} in ${status.startsInMin} min @ ${status.event.room.replace('room_', '')}`
    })
    return
  }
  // active
  _bannerHandler?.({
    text: `${status.event.emoji} ${status.event.title} LIVE @ ${status.event.room.replace('room_', '')} — ${status.endsInMin} min left`,
    cta: currentRoomId === status.event.room ? 'Watch' : `Go to ${status.event.room.replace('room_', '')}`
  })
  // Auto-join the event group session when in the host room
  if (currentRoomId === status.event.room && !getCurrentSession()) {
    sendGroupList({ kind: KIND, room: status.event.room })
    setTimeout(() => {
      if (getCurrentSession()) return
      const known = (window as any).__loungeTest?.getKnownGroups?.() ?? []
      const existing = known.find((s: GroupSession) =>
        s.kind === KIND && s.room === status.event.room && (s.state as any).event_id === status.event.id
      )
      if (existing) sendGroupJoin(existing.id)
      else sendGroupCreate(KIND, status.event.room as any, { event_id: status.event.id })
    }, 400)
  }
}

function handleSessionChange(s: GroupSession | null) {
  if (!s || s.kind !== KIND) { _activeAttended = false; return }
  const eventId = (s.state as any).event_id
  const wk = weekKey()
  if (eventId && !_activeAttended && !hasAttended(eventId, wk)) {
    _activeAttended = true
    markAttended(eventId, wk)
    awardShells(10)
  }
}

export function leaveNpcEventIfNeeded(currentRoomId: string) {
  const s = getCurrentSession()
  if (s && s.kind === KIND && s.room !== currentRoomId) {
    sendGroupLeave(s.id)
    _activeAttended = false
  }
}
