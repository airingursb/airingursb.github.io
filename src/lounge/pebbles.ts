import type { RoomId } from './config'

export type Pebble = {
  id: string
  room: RoomId
  x: number
  y: number
  name: string
}

export type PebbleManifest = {
  schema_version: number
  pebbles: Pebble[]
}

const EMPTY: PebbleManifest = { schema_version: 1, pebbles: [] }

let cached: PebbleManifest | null = null

export async function loadPebbles(): Promise<PebbleManifest> {
  if (cached) return cached
  try {
    const res = await fetch('/lounge/data/pebbles.json', { cache: 'no-store' })
    if (!res.ok) { cached = EMPTY; return EMPTY }
    const json = await res.json()
    if (!json || !Array.isArray(json.pebbles)) { cached = EMPTY; return EMPTY }
    cached = json as PebbleManifest
    return cached
  } catch {
    cached = EMPTY
    return EMPTY
  }
}

/** All pebbles. Use cached value after first load. */
export function getAllPebbles(): Pebble[] {
  return cached?.pebbles ?? []
}

export function getPebblesInRoom(room: RoomId): Pebble[] {
  return (cached?.pebbles ?? []).filter(p => p.room === room)
}

export function findPebble(id: string): Pebble | null {
  return (cached?.pebbles ?? []).find(p => p.id === id) ?? null
}
