// V9.2 — Resource gathering. Outdoor rooms get a few "gather spots" that
// respawn daily. Click a sparkle → +1 of that material. Materials live in
// localStorage and are consumed by V9.1 recipes.

export type MaterialId = 'leaves' | 'shells' | 'driftwood' | 'berries'

export const MATERIALS: Record<MaterialId, { name: string; emoji: string }> = {
  leaves:    { name: 'Leaves',    emoji: '🍃' },
  shells:    { name: 'Shells',    emoji: '🐚' },
  driftwood: { name: 'Driftwood', emoji: '🪵' },
  berries:   { name: 'Berries',   emoji: '🫐' }
}

// Per-room spot manifests. (x, y) is world coords (pixels).
// Daily respawn: each visitor sees up to MAX_PER_DAY pickable spots per room.
export type Spot = { id: string; x: number; y: number; material: MaterialId }

export const ROOM_SPOTS: Record<string, Spot[]> = {
  room_grove: [
    { id: 'grv_leaves_1',    x: 96,  y: 96,  material: 'leaves' },
    { id: 'grv_leaves_2',    x: 320, y: 80,  material: 'leaves' },
    { id: 'grv_berries_1',   x: 240, y: 224, material: 'berries' },
    { id: 'grv_driftwood_1', x: 64,  y: 200, material: 'driftwood' }
  ],
  room_beach: [
    { id: 'bch_shells_1',    x: 120, y: 144, material: 'shells' },
    { id: 'bch_shells_2',    x: 340, y: 144, material: 'shells' },
    { id: 'bch_driftwood_1', x: 200, y: 192, material: 'driftwood' },
    { id: 'bch_driftwood_2', x: 420, y: 192, material: 'driftwood' }
  ],
  room_balcony: [
    { id: 'bal_leaves_1',  x: 80,  y: 100, material: 'leaves' },
    { id: 'bal_berries_1', x: 280, y: 140, material: 'berries' }
  ]
}

const STORAGE_MATS = 'lounge_materials_v1'
const STORAGE_PICKED = 'lounge_gather_picked_v1'   // { spot_id: 'YYYY-MM-DD' }

type MatBag = Partial<Record<MaterialId, number>>

function loadMats(): MatBag {
  try {
    const raw = localStorage.getItem(STORAGE_MATS)
    return raw ? JSON.parse(raw) as MatBag : {}
  } catch { return {} }
}
function saveMats(m: MatBag) {
  try { localStorage.setItem(STORAGE_MATS, JSON.stringify(m)) } catch {}
}

export function getMaterial(id: MaterialId): number { return loadMats()[id] ?? 0 }
export function getAllMaterials(): MatBag { return loadMats() }

export function addMaterial(id: MaterialId, n = 1) {
  const m = loadMats()
  m[id] = (m[id] ?? 0) + n
  saveMats(m)
  // V10.4 — every material grant counts as a gather event for achievements
  try { void import('./achievements').then(a => a.recordEvent({ type: 'gather' })) } catch {}
}
export function removeMaterial(id: MaterialId, n = 1): boolean {
  const m = loadMats()
  if ((m[id] ?? 0) < n) return false
  m[id] = (m[id] ?? 0) - n
  saveMats(m)
  return true
}

type PickedLog = Record<string, string>
function loadPicked(): PickedLog {
  try { return JSON.parse(localStorage.getItem(STORAGE_PICKED) || '{}') } catch { return {} }
}
function savePicked(p: PickedLog) {
  try { localStorage.setItem(STORAGE_PICKED, JSON.stringify(p)) } catch {}
}
function utcDay(d: Date = new Date()): string { return d.toISOString().slice(0, 10) }

/** Has this visitor already picked this spot today? */
export function isPickedToday(spotId: string): boolean {
  return loadPicked()[spotId] === utcDay()
}
export function markPicked(spotId: string) {
  const p = loadPicked()
  p[spotId] = utcDay()
  savePicked(p)
}

/** Return list of spots in room that the visitor HASN'T picked today. */
export function getActiveSpots(roomId: string): Spot[] {
  const all = ROOM_SPOTS[roomId] ?? []
  return all.filter(s => !isPickedToday(s.id))
}
