import type { Region, RoomId } from './config'
import type { Direction } from './bear'

export type NpcState = 'idle' | 'sit' | 'dance'

export type ScheduleBracket = {
  from: string   // "HH:MM"
  to: string     // "HH:MM"
  room: RoomId
  x: number
  y: number
  state: NpcState
}

export type NpcDef = {
  id: string
  name: string
  region: Region
  facing: Direction
  schedule: ScheduleBracket[]
  dialog_pool: string[]
}

export type NpcManifest = {
  schema_version: number
  npcs: NpcDef[]
}

const EMPTY: NpcManifest = { schema_version: 1, npcs: [] }

export async function loadNpcManifest(): Promise<NpcManifest> {
  try {
    const res = await fetch('/lounge/data/npcs.json', { cache: 'no-store' })
    if (!res.ok) return EMPTY
    const json = await res.json()
    if (!json || !Array.isArray(json.npcs)) return EMPTY
    return json as NpcManifest
  } catch {
    return EMPTY
  }
}

function parseHHMM(s: string): number {
  // Returns minutes since midnight. Returns NaN on invalid.
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s)
  if (!m) return NaN
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** Return the first matching bracket for now's minutes-of-day, or null. */
export function getActiveBracket(def: NpcDef, now: Date = new Date()): ScheduleBracket | null {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (const b of def.schedule) {
    const from = parseHHMM(b.from)
    const to = parseHHMM(b.to)
    if (Number.isNaN(from) || Number.isNaN(to)) continue
    // Half-open [from, to). If to === 23:59 (1439), treat as inclusive of 23:59.
    if (to === 1439) {
      if (minutes >= from && minutes <= to) return b
    } else {
      if (minutes >= from && minutes < to) return b
    }
  }
  return null
}

/** Pick a random dialog line, avoiding the most recently said one for this NPC. */
export function pickDialog(def: NpcDef, recentMemory: Map<string, string>): string {
  const pool = def.dialog_pool
  if (!pool || pool.length === 0) return '…'
  if (pool.length === 1) return pool[0]
  const last = recentMemory.get(def.id)
  let candidates = pool.filter((line) => line !== last)
  if (candidates.length === 0) candidates = pool
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  recentMemory.set(def.id, pick)
  return pick
}
