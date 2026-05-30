// Passive social-presence layer — frontend-only first cut.
//
// Records a rolling log of "I entered room X" and "I viewed exhibit Y" events
// to localStorage. Used to surface returning-pill warmth in the lobby
// ("上次去了 library · 23 分钟前") and visit counts on gallery plaques
// ("你来过 3 次") — making the world feel lived-in even when you're alone.
//
// Stays separate from gallery_progress.ts (which only tracks the boolean
// "have I ever seen this exhibit?" for the brass-check UI). visit_log is
// the count + timeline; gallery_progress is the discovery set.

const STORAGE_KEY = 'lounge:visit-log:v1'
const MAX_EVENTS = 100   // older entries get FIFO-evicted

export type VisitEvent = {
  type: 'room' | 'exhibit'
  key: string
  at: number   // ms epoch
}

let cache: VisitEvent[] | null = null

function load(): VisitEvent[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        cache = parsed.filter((e): e is VisitEvent =>
          e && typeof e === 'object'
          && (e.type === 'room' || e.type === 'exhibit')
          && typeof e.key === 'string'
          && typeof e.at === 'number'
        )
        return cache
      }
    }
  } catch { /* ignore */ }
  cache = []
  return cache
}

function save(events: VisitEvent[]): void {
  cache = events
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)) } catch { /* ignore */ }
}

function append(ev: VisitEvent): void {
  const events = load()
  events.push(ev)
  // FIFO cap — keep the most recent MAX_EVENTS entries
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
  save(events)
}

export function logRoomVisit(roomId: string): void {
  if (!roomId) return
  append({ type: 'room', key: roomId, at: Date.now() })
}

export function logExhibitVisit(slug: string): void {
  if (!slug) return
  append({ type: 'exhibit', key: slug, at: Date.now() })
}

/** Returns the timestamp of the previous visit to this room (excludes the
 *  most-recent matching event so a just-logged entry doesn't shadow the
 *  one before it). Null if no prior visit. */
export function getPreviousRoomVisit(roomId: string): number | null {
  const events = load()
  let seen = 0
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'room' && e.key === roomId) {
      seen++
      if (seen === 2) return e.at
    }
  }
  return null
}

/** The most-recent room (NOT the one you're in now) you visited, plus how
 *  long ago. Used for the lobby returning-pill. Returns null if no other
 *  room has been visited recently. */
export function getLastOtherRoomVisit(currentRoomId: string): { roomId: string; at: number } | null {
  const events = load()
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.type === 'room' && e.key !== currentRoomId) {
      return { roomId: e.key, at: e.at }
    }
  }
  return null
}

export function getRoomVisitCount(roomId: string): number {
  return load().filter((e) => e.type === 'room' && e.key === roomId).length
}

export function getExhibitVisitCount(slug: string): number {
  return load().filter((e) => e.type === 'exhibit' && e.key === slug).length
}

/** Format a ms-epoch as a coarse zh "12 分钟前" / "3 小时前" / "昨天". */
export function formatAgoZh(timestamp: number, now: number = Date.now()): string {
  const sec = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day === 1) return '昨天'
  if (day < 7) return `${day} 天前`
  return '很久以前'
}

/** Test-only — wipe state. */
export function _resetVisitLogForTest(): void {
  cache = null
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
