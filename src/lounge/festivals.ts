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
