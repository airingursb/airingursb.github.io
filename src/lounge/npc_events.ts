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

export type EventSlot = {
  dayOfWeek: number    // 0=Sun, 1=Mon, ..., 6=Sat (UTC)
  hour: number          // UTC 0-23
}

export type NpcEvent = {
  id: string
  npc_id: string
  npc_name: string
  room: string
  /** V14.8-review I4 — multiple slots per event so users across timezones
   *  can attend at least one. Reward is keyed by occurrence-date so a user
   *  attending both slots in one week double-counts (acceptable: nobody
   *  spans two continents in one week). */
  slots: EventSlot[]
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
    // Mon 20:00 UTC (= 21:00 CET / 13:00 PT) + Mon 12:00 UTC (= 20:00 CN / 13:00 CET / 04:00 PT)
    slots: [{ dayOfWeek: 1, hour: 20 }, { dayOfWeek: 1, hour: 12 }],
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
    // Wed 19:00 UTC + Wed 11:00 UTC (= 19:00 CN / 12:00 CET / 04:00 PT)
    slots: [{ dayOfWeek: 3, hour: 19 }, { dayOfWeek: 3, hour: 11 }],
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
    // Sat 19:00 UTC + Sat 12:00 UTC (= 20:00 CN / 13:00 CET / 05:00 PT)
    slots: [{ dayOfWeek: 6, hour: 19 }, { dayOfWeek: 6, hour: 12 }],
    emoji: '📖',
    title: 'Library Reading',
    blurb: 'Halle reads a half-page from her memoir.',
    lines: [
      "Page seventeen. Don't ask about the others.",
      "'The library taught me silence isn't empty. It's a held breath.'",
      "That's it. Sit a while. Don't say anything for a minute."
    ]
  },
  // V14.7 — Friday Fireworks (public, no hosting NPC). RoomScene's
  // fireworks particle handler keys on event_id === 'friday_fireworks'.
  {
    id: 'friday_fireworks',
    npc_id: '', npc_name: 'The Lounge',
    room: 'room_rooftop',
    // Fri 22:00 UTC + Fri 13:00 UTC (= 21:00 CN / 14:00 CET / 06:00 PT)
    slots: [{ dayOfWeek: 5, hour: 22 }, { dayOfWeek: 5, hour: 13 }],
    emoji: '🎆',
    title: 'Friday Fireworks',
    blurb: 'The whole lounge meets on the Rooftop.',
    lines: []
  }
]

export type EventStatus = {
  event: NpcEvent
  state: 'pre' | 'active' | 'past'
  startsInMin: number
  endsInMin: number
}

/** Returns the event closest to now (pre or active), else null.
 *  V14.8-review I4 — checks every slot per event and surfaces the nearest. */
export function currentEventStatus(now: Date = new Date()): EventStatus | null {
  for (const ev of NPC_EVENT_SCHEDULE) {
    const startUtc = nextOrCurrentOccurrence(ev, now)
    if (!startUtc) continue
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

/** Find the nearest slot occurrence for an event (could be in either
 *  direction within an ACTIVE_WINDOW; otherwise the closest upcoming). */
function nextOrCurrentOccurrence(ev: NpcEvent, now: Date): Date | null {
  let best: Date | null = null
  let bestDelta = Infinity
  for (const slot of ev.slots) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), slot.hour, 0, 0))
    const dow = d.getUTCDay()
    const diff = (slot.dayOfWeek - dow + 7) % 7
    d.setUTCDate(d.getUTCDate() + diff)
    if (d.getTime() < now.getTime() - ACTIVE_WINDOW_MIN * 60_000) {
      d.setUTCDate(d.getUTCDate() + 7)
    }
    const delta = d.getTime() - now.getTime()
    // Prefer slots currently within active window; otherwise nearest upcoming
    if (delta < bestDelta) { bestDelta = delta; best = d }
  }
  return best
}

/** V14.8-review C4 — occurrence-date key replaces the off-by-one weekKey.
 *  Each scheduled slot occurrence has a unique YYYY-MM-DD, so the per-event
 *  payout is naturally deduped without ISO-week math edge cases. */
function occurrenceKey(ev: NpcEvent, now: Date = new Date()): string | null {
  const occ = nextOrCurrentOccurrence(ev, now)
  if (!occ) return null
  return occ.toISOString().slice(0, 10)
}

const SEEN_KEY = 'lounge_npc_event_attended_v1'
function hasAttended(eventId: string, occKey: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')
    return !!map[`${eventId}|${occKey}`]
  } catch { return false }
}
function markAttended(eventId: string, occKey: string) {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')
    map[`${eventId}|${occKey}`] = Date.now()
    localStorage.setItem(SEEN_KEY, JSON.stringify(map))
  } catch {}
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
  // V22.2 — emoji prefix dropped from banner text; pixel calendar icon
  // lives in the banner DOM and reads via data-icon.
  if (status.state === 'pre') {
    _bannerHandler?.({
      text: `${status.event.npc_name}: ${status.event.title} in ${status.startsInMin} min @ ${status.event.room.replace('room_', '')}`
    })
    return
  }
  _bannerHandler?.({
    text: `${status.event.title} LIVE @ ${status.event.room.replace('room_', '')} — ${status.endsInMin} min left`,
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
  if (!eventId) return
  const ev = NPC_EVENT_SCHEDULE.find(e => e.id === eventId)
  if (!ev) return
  const key = occurrenceKey(ev)
  if (key && !_activeAttended && !hasAttended(eventId, key)) {
    _activeAttended = true
    markAttended(eventId, key)
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
