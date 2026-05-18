// V10.2 — Pet system. Pure state module; the visual follower is rendered
// by PetSprite (constructed by RoomScene per scene boot).
//
// Player adopts exactly one pet from 3 species. Each species shares the same
// underlying cat-atlas sprite (no extra art to bake) but with a unique tint
// + display emoji + perk. Feed once per UTC day; feeding awards +1 affection
// up to MAX_AFFECTION. At max affection the species' perk is unlocked.

const STORAGE_KEY = 'lounge_pet_v1'

export const MAX_AFFECTION = 10
export const FEED_AFFECTION_GAIN = 1

export type PetSpecies = 'kitten' | 'puppy' | 'bunny'
export type PetState = {
  species: PetSpecies
  name: string
  affection: number               // 0..MAX_AFFECTION
  lastFedDay: string | null       // UTC day "YYYY-MM-DD"
  adoptedAt: number               // epoch ms
}

export type PetSpeciesDef = {
  id: PetSpecies
  emoji: string
  label: string
  blurb: string
  tint: number                    // 0xRRGGBB applied to cat-atlas sprite
  /** id of the passive perk unlocked at MAX_AFFECTION. Other modules read it. */
  perk_id: 'pet_kitten_shells' | 'pet_puppy_energy' | 'pet_bunny_walk'
  perk_blurb: string
}

export const PET_SPECIES: PetSpeciesDef[] = [
  { id: 'kitten', emoji: '🐱', label: 'Kitten', tint: 0xffb066,
    blurb: 'Calm. Watches the room. Brings you small lucky things.',
    perk_id: 'pet_kitten_shells',
    perk_blurb: '+10% shells from gift-accepted rewards.' },
  { id: 'puppy',  emoji: '🐶', label: 'Puppy',  tint: 0xc89070,
    blurb: 'Energetic. Trots beside you everywhere. Hates sitting still.',
    perk_id: 'pet_puppy_energy',
    perk_blurb: '+5 max energy (recovered nightly).' },
  { id: 'bunny',  emoji: '🐰', label: 'Bunny',  tint: 0xeeeeee,
    blurb: 'Quiet. Hops occasionally. Notices things you miss.',
    perk_id: 'pet_bunny_walk',
    perk_blurb: '+5% walk speed.' }
]

function todayUTC(): string { return new Date().toISOString().slice(0, 10) }

export function getPet(): PetState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PetState
    if (!p?.species) return null
    return p
  } catch { return null }
}

export function hasPet(): boolean { return getPet() != null }

export function adoptPet(species: PetSpecies, name: string): PetState {
  const trimmed = (name || '').trim().slice(0, 16) || PET_SPECIES.find(s => s.id === species)!.label
  const pet: PetState = {
    species, name: trimmed, affection: 0, lastFedDay: null, adoptedAt: Date.now()
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pet)) } catch {}
  // V10.4 — achievement
  import('./achievements').then(m => m.recordEvent({ type: 'pet_adopted' }))
  return pet
}

/** Renames an already-adopted pet. No-op if there's no pet. */
export function renamePet(name: string) {
  const p = getPet(); if (!p) return
  p.name = (name || '').trim().slice(0, 16) || p.name
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

/** Returns true if pet can be fed today (not yet fed this UTC day). */
export function canFeedToday(): boolean {
  const p = getPet(); if (!p) return false
  return p.lastFedDay !== todayUTC()
}

/** Feeds pet. Returns the new affection level if it changed, or null if no-op. */
export function feedPet(): number | null {
  const p = getPet(); if (!p) return null
  if (!canFeedToday()) return null
  p.lastFedDay = todayUTC()
  p.affection = Math.min(MAX_AFFECTION, p.affection + FEED_AFFECTION_GAIN)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
  // V10.4 — achievement
  const newLevel = p.affection
  import('./achievements').then(m => m.recordEvent({ type: 'pet_affection', level: newLevel }))
  // V10.7-review I1 fix: bunny walk-speed perk reads happen via a cached
  // value in bear.ts; invalidate it right when affection ticks over 10 so
  // the +5% applies the same session (not after a reload).
  if (newLevel >= MAX_AFFECTION) {
    import('./bear').then(b => b.invalidateWalkSpeedCache?.())
  }
  return p.affection
}

/** Returns the perk id IFF the pet has reached MAX_AFFECTION. */
export function activePetPerk(): PetSpeciesDef['perk_id'] | null {
  const p = getPet(); if (!p) return null
  if (p.affection < MAX_AFFECTION) return null
  return PET_SPECIES.find(s => s.id === p.species)?.perk_id ?? null
}

export function getPetSpecies(id: PetSpecies): PetSpeciesDef {
  return PET_SPECIES.find(s => s.id === id) ?? PET_SPECIES[0]
}
