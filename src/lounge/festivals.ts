// V7.0 stub → V7.3 implementation.
// getActiveFestivalId returns the festival id whose date matches today, else null.

export type Festival = {
  id: string
  name: string
  emoji: string
  date: string            // "MM-DD" — fires every year on this date
  host_room: string       // room where decorations + cutscene live
  decoration: 'tea' | 'bonfire' | 'harvest' | 'gifts'
  blurb: string           // shown in the "today is …" banner
  npc_event_id?: string   // dialog branch event hint
}

export const FESTIVALS: Festival[] = [
  {
    id: 'spring_open_house', name: 'Spring Open House', emoji: '🌸',
    date: '04-01', host_room: 'room_lobby',
    decoration: 'tea',
    blurb: 'All NPCs are in the Lobby today. Tea is free.',
    npc_event_id: 'spring_open_house'
  },
  {
    id: 'summer_solstice', name: 'Summer Solstice', emoji: '🔥',
    date: '06-21', host_room: 'room_beach',
    decoration: 'bonfire',
    blurb: 'Beach bonfire tonight. Jam circle bonus is doubled.',
    npc_event_id: 'summer_solstice'
  },
  {
    id: 'autumn_harvest', name: 'Autumn Harvest', emoji: '🍂',
    date: '09-23', host_room: 'room_grove',
    decoration: 'harvest',
    blurb: 'Pebble exchange in the Grove. Bring rare ones.',
    npc_event_id: 'autumn_harvest'
  },
  {
    id: 'winter_festival', name: 'Winter Festival', emoji: '❄️',
    date: '12-21', host_room: 'room_library',
    decoration: 'gifts',
    blurb: 'Gift swap + carols in the Library.',
    npc_event_id: 'winter_festival'
  }
]

export function getActiveFestival(now: Date = new Date()): Festival | null {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const key = `${mm}-${dd}`
  return FESTIVALS.find(f => f.date === key) ?? null
}

export function getActiveFestivalId(now: Date = new Date()): string | null {
  return getActiveFestival(now)?.id ?? null
}

// P6 — Per-festival activity: a once-per-day interactive nudge that the user can
// participate in for shells + occasional item. State persisted in localStorage.
const ACT_STORAGE_KEY = 'lounge_festivals_done_v1'   // { [festival_id]: 'YYYY-MM-DD' }
type ActivityLog = Record<string, string>

function loadActLog(): ActivityLog {
  try { return JSON.parse(localStorage.getItem(ACT_STORAGE_KEY) || '{}') as ActivityLog } catch { return {} }
}
function saveActLog(m: ActivityLog) {
  try { localStorage.setItem(ACT_STORAGE_KEY, JSON.stringify(m)) } catch {}
}
function utcDay(d: Date = new Date()): string { return d.toISOString().slice(0, 10) }

/** Has the player completed today's festival activity? */
export function hasCompletedTodaysActivity(festivalId: string): boolean {
  return loadActLog()[festivalId] === utcDay()
}

/** Mark today's activity as done. */
export function markActivityDone(festivalId: string) {
  const m = loadActLog(); m[festivalId] = utcDay(); saveActLog(m)
  // V10.7-review C3 fix: emit achievement event
  try { void import('./achievements').then(a => a.recordEvent({ type: 'festival_attended' })) } catch {}
}

export type FestivalActivityResult = {
  message: string
  shellReward: number
  itemReward?: { id: string; name: string }
}

/** Roll the result of participating in today's festival activity.
 *  Idempotent through hasCompletedTodaysActivity — caller checks first. */
export function rollActivity(festivalId: string): FestivalActivityResult {
  switch (festivalId) {
    case 'spring_open_house': {
      // Raffle: 60% small prize (5 shells), 35% medium (10 shells), 5% big (20 shells + lantern)
      const r = Math.random()
      if (r < 0.6)  return { message: '🎟 You drew a tea-leaf token. Free Mio brew next visit.', shellReward: 5 }
      if (r < 0.95) return { message: '🎟 You drew a silver token! Nice afternoon.', shellReward: 10 }
      return {
        message: '🎟 GRAND PRIZE! Lantern keepsake + 20 shells.',
        shellReward: 20,
        itemReward: { id: 'shop_lantern_keepsake', name: 'Lantern Keepsake' }
      }
    }
    case 'summer_solstice':
      return { message: '🔥 Bonfire warmth +15 shells. Jam Circle bonus doubled all night.', shellReward: 15 }
    case 'autumn_harvest':
      return {
        message: '🍂 Traded 3 pebbles for a rare seed (decorative). +10 shells.',
        shellReward: 10,
        itemReward: { id: 'shop_fox_figurine', name: 'Carved Fox (Harvest gift)' }
      }
    case 'winter_festival':
      return {
        message: '🎁 You opened a wrapped print from Cole. +10 shells.',
        shellReward: 10,
        itemReward: { id: 'shop_sketch_print', name: 'Sketch Print (Winter)' }
      }
    default:
      return { message: 'Thanks for celebrating.', shellReward: 0 }
  }
}
