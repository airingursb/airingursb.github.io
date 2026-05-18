// V21.0 — Random world events. Soft, personal events that surface every
// 30-90 min of play. Each event:
//   - announces via a top-right banner ("🛒 Traveling Salesman — in Lobby")
//   - has a target room and a 10-min lifetime
//   - rewards a small thing on attend (shells, pebbles, achievements)
//
// Scheduler is client-side (per-visitor random). Server-coordinated global
// events live in npc_events.ts (Friday Fireworks etc.) and don't conflict.
//
// State (localStorage):
//   { currentEventId, expiresAt, lastEventEndAt, recent: [ids], attendedIds: [ids] }
//
// The picker won't repeat any of the last 3 events, and respects a 30-min
// cooldown after the previous event ENDS (whether attended or expired).

import type { RoomId } from './config'

export type RandomEventDef = {
  id: string
  title: string
  blurb: string         // shown in the banner / event log
  emoji: string
  /** The room where the player must show up to interact. */
  room: RoomId
  /** Total lifetime once spawned. */
  duration_ms: number
  /** Shells awarded on attend (interact with the event interactable). */
  reward_shells: number
}

export const RANDOM_EVENTS: RandomEventDef[] = [
  {
    id: 'traveling_salesman',
    title: 'Traveling Salesman',
    blurb: 'A bear with an oversized backpack is hawking rare pebbles in the Lobby.',
    emoji: '🛒',
    room: 'room_lobby' as RoomId,
    duration_ms: 10 * 60_000,
    reward_shells: 8
  },
  {
    id: 'meteor_shower',
    title: 'Meteor Shower',
    blurb: 'Quick — head to the Rooftop. Streaks tonight.',
    emoji: '☄️',
    room: 'room_rooftop' as RoomId,
    duration_ms: 10 * 60_000,
    reward_shells: 6
  },
  {
    id: 'lost_pebble',
    title: 'Lost Pebble',
    blurb: 'Someone reported a glowing pebble washed up on the Beach.',
    emoji: '🪨',
    room: 'room_beach' as RoomId,
    duration_ms: 10 * 60_000,
    reward_shells: 5
  },
  {
    id: 'postcard',
    title: 'Postcard Delivery',
    blurb: 'A postcard from a former resident — check your Home.',
    emoji: '📮',
    room: 'room_home_self' as RoomId,  // resolved to the player's home at attend time
    duration_ms: 15 * 60_000,
    reward_shells: 5
  }
]

const STORAGE_KEY = 'lounge_random_events_v1'
const MIN_INTERVAL_MS = 30 * 60_000
const MAX_INTERVAL_MS = 90 * 60_000
const RECENT_HISTORY = 3

type State = {
  currentEventId: string | null
  expiresAt: number
  /** Real-time ms when the most recent event ended. 0 = never. */
  lastEventEndAt: number
  /** Next allowed spawn ms (random 30-90 min after lastEventEndAt). */
  nextEventAt: number
  /** Last 3 event ids (so we don't repeat). */
  recent: string[]
  /** Ids the player has successfully attended. */
  attendedIds: string[]
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && typeof s === 'object') {
        return {
          currentEventId: typeof s.currentEventId === 'string' ? s.currentEventId : null,
          expiresAt: typeof s.expiresAt === 'number' ? s.expiresAt : 0,
          lastEventEndAt: typeof s.lastEventEndAt === 'number' ? s.lastEventEndAt : 0,
          nextEventAt: typeof s.nextEventAt === 'number' ? s.nextEventAt : 0,
          recent: Array.isArray(s.recent) ? s.recent.slice(-RECENT_HISTORY) : [],
          attendedIds: Array.isArray(s.attendedIds) ? s.attendedIds : []
        }
      }
    }
  } catch {}
  return { currentEventId: null, expiresAt: 0, lastEventEndAt: 0, nextEventAt: 0, recent: [], attendedIds: [] }
}
function saveState(s: State) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

function scheduleNext(state: State): State {
  const delay = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)
  state.nextEventAt = Date.now() + delay
  return state
}

function pickEvent(state: State): RandomEventDef | null {
  const recent = new Set(state.recent)
  const eligible = RANDOM_EVENTS.filter(e => !recent.has(e.id))
  const pool = eligible.length > 0 ? eligible : RANDOM_EVENTS
  return pool[Math.floor(Math.random() * pool.length)]
}

export type ActiveEvent = {
  def: RandomEventDef
  expiresAt: number
}

export function getActiveEvent(): ActiveEvent | null {
  const state = loadState()
  if (!state.currentEventId) return null
  if (Date.now() >= state.expiresAt) {
    // Expired — clear lazily
    state.currentEventId = null
    state.lastEventEndAt = Date.now()
    state.recent = [...state.recent, '__expired__'].slice(-RECENT_HISTORY)
    scheduleNext(state)
    saveState(state)
    return null
  }
  const def = RANDOM_EVENTS.find(e => e.id === state.currentEventId)
  if (!def) return null
  return { def, expiresAt: state.expiresAt }
}

/** Called periodically from RoomScene. Spawns a new event if eligible. */
export function tickRandomEvents(): ActiveEvent | null {
  const active = getActiveEvent()
  if (active) return active

  const state = loadState()
  // Bootstrap nextEventAt on first-ever load
  if (state.nextEventAt === 0) scheduleNext(state)
  if (Date.now() < state.nextEventAt) {
    saveState(state)
    return null
  }
  const def = pickEvent(state)
  if (!def) return null
  state.currentEventId = def.id
  state.expiresAt = Date.now() + def.duration_ms
  state.recent = [...state.recent, def.id].slice(-RECENT_HISTORY)
  saveState(state)
  return { def, expiresAt: state.expiresAt }
}

/** Called when the player interacts with the event's interactable. Records
 *  attendance, clears the event, schedules the next, returns the def for
 *  reward dispatch by the caller. */
export function attendEvent(eventId: string): RandomEventDef | null {
  const state = loadState()
  if (state.currentEventId !== eventId) return null
  const def = RANDOM_EVENTS.find(e => e.id === eventId)
  if (!def) return null
  state.currentEventId = null
  state.lastEventEndAt = Date.now()
  if (!state.attendedIds.includes(eventId)) state.attendedIds.push(eventId)
  scheduleNext(state)
  saveState(state)
  return def
}

export function getAttendedEvents(): string[] {
  return loadState().attendedIds
}
