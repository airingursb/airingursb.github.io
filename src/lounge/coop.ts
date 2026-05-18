// V9.4 — Co-op activities. Adds 4 patterns alongside V4.3 Jam Pads:
//   • Cooking-circle (Kitchen) — stir/chop interactions in turn
//   • Bonfire-stories (Beach) — sit around bonfire, take turns
//   • Reading-circle (Library) — silent presence + occasional read-aloud
//   • Stargazing-circle (Rooftop) — at night, find constellation cues
//
// MVP scope: client-only activity loop. Triggered by a host-room button
// (similar to festival activity). Each session: short timer, awards
// shells + a Companionship XP bonus + friendship score with co-participants
// (latter routed through the existing friendship handler if peers present).

import { awardShells } from './shells'
import { awardXp } from './skills'
import { addMaterial, type MaterialId } from './resources'

export type CoopActivity = {
  id: string
  name: string
  emoji: string
  room: string
  blurb: string
  /** seconds the activity runs */
  durationSec: number
  /** rewards on completion */
  shells: number
  companionshipXp: number
  /** optional material bonus */
  materialBonus?: { id: MaterialId; n: number }
}

export const COOP_ACTIVITIES: CoopActivity[] = [
  {
    id: 'cooking_circle', name: 'Cooking Circle', emoji: '🍲', room: 'room_kitchen',
    blurb: 'Stir, chop, plate together. Stay together for 30s.',
    durationSec: 30, shells: 8, companionshipXp: 4
  },
  {
    id: 'bonfire_stories', name: 'Bonfire Stories', emoji: '🔥', room: 'room_beach',
    blurb: 'Sit around the fire. Tell each other a story. 40s.',
    durationSec: 40, shells: 10, companionshipXp: 5,
    materialBonus: { id: 'driftwood', n: 1 }
  },
  {
    id: 'reading_circle', name: 'Reading Circle', emoji: '📚', room: 'room_library',
    blurb: 'Pull up a chair. Read in companionable silence. 60s.',
    durationSec: 60, shells: 6, companionshipXp: 3
  },
  {
    id: 'stargazing_circle', name: 'Stargazing Circle', emoji: '🌌', room: 'room_rooftop',
    blurb: 'Look up. Find a constellation together. 45s. Best after sunset.',
    durationSec: 45, shells: 12, companionshipXp: 6
  }
]

const STORAGE_KEY = 'lounge_coop_done_v1'   // { activity_id: utcDay }
type DoneLog = Record<string, string>
function load(): DoneLog {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function save(m: DoneLog) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}
function utcDay(d = new Date()): string { return d.toISOString().slice(0, 10) }

export function hasCompletedToday(activityId: string): boolean {
  return load()[activityId] === utcDay()
}
export function markDoneToday(activityId: string) {
  const m = load(); m[activityId] = utcDay(); save(m)
}

/** Apply rewards. Called after the activity timer succeeds. */
export function awardActivity(a: CoopActivity) {
  awardShells(a.shells)
  awardXp('companionship', a.companionshipXp)
  if (a.materialBonus) addMaterial(a.materialBonus.id, a.materialBonus.n)
  markDoneToday(a.id)
}

/** Find the activity native to this room, or null. */
export function activityForRoom(roomId: string): CoopActivity | null {
  return COOP_ACTIVITIES.find(a => a.room === roomId) ?? null
}
