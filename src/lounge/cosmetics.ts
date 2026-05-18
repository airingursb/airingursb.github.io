// V18.0 — Cosmetic data model + Phaser.Graphics-based renderer registry.
//
// Cosmetics are drawn as composite Phaser GameObjects on top of the bear
// sprite. We don't bake atlases — each cosmetic owns a `draw(scene, x, y,
// facing)` function that returns a `Phaser.GameObjects.Container` of
// small Graphics shapes anchored to the bear's head/body. This avoids
// shipping more PNGs and keeps the palette consistent with the pixel art.
//
// Slots are mutually exclusive within a slot (one hat at a time) but
// stackable across slots (hat + glasses + scarf simultaneously).
//
// Persistence layout:
//   profile.equipped_cosmetics: string[]   // ids, max 1 per slot
//   profile.owned_cosmetics:    string[]   // ids the player has unlocked

import type Phaser from 'phaser'
import type { Direction } from './bear'

export type CosmeticSlot = 'hat' | 'face' | 'neck' | 'back'
export type CosmeticRarity = 'starter' | 'common' | 'rare'

export type CosmeticDef = {
  id: string
  name: string
  slot: CosmeticSlot
  rarity: CosmeticRarity
  /** Shop cost in shells. Starter cosmetics are free (cost: 0). */
  cost: number
  blurb: string
  /** Draw the cosmetic for a bear standing at (anchorX, anchorY) facing
   *  the given direction. The returned container is positioned at the
   *  anchor; the caller re-parents and re-positions per frame. */
  draw: (scene: Phaser.Scene, facing: Direction) => Phaser.GameObjects.Container
}

// ─── Drawing helpers ─────────────────────────────────────────────────
// Bear sprite is 32×48 with origin (0.5, 1) — the bear's feet are at the
// anchor. Head top is at roughly y = -38 from the anchor; head sides at
// x ± 7. Cosmetics are positioned in this local coordinate system.

function rect(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number) {
  g.fillStyle(color); g.fillRect(x, y, w, h)
}

// ─── Cosmetic implementations ────────────────────────────────────────

// Tiny pixel-style helpers — each cosmetic is built from 2×2 px blocks
// so it matches the bear's pixel scale (2px per pixel = 1 atlas pixel).
const PIX = 2

function mkHatTopHat(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Brim
  rect(g, 0x1a1a1a, -6 * PIX, -22 * PIX, 12 * PIX, 1 * PIX)
  // Crown
  rect(g, 0x1a1a1a, -4 * PIX, -27 * PIX, 8 * PIX, 5 * PIX)
  // Band
  rect(g, 0xc04848, -4 * PIX, -23 * PIX, 8 * PIX, 1 * PIX)
  c.add(g)
  return c
}

function mkHatCap(scene: Phaser.Scene, facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Crown
  rect(g, 0x3070b0, -4 * PIX, -25 * PIX, 8 * PIX, 4 * PIX)
  // Brim — points forward based on facing
  if (facing === 'right')      rect(g, 0x205088, 0, -22 * PIX, 6 * PIX, 1 * PIX)
  else if (facing === 'left')  rect(g, 0x205088, -6 * PIX, -22 * PIX, 6 * PIX, 1 * PIX)
  else if (facing === 'down')  rect(g, 0x205088, -5 * PIX, -22 * PIX, 10 * PIX, 1 * PIX)
  // facing 'up' = back of cap, no visible brim
  c.add(g)
  return c
}

function mkHatCrown(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Base band
  rect(g, 0xe8c038, -5 * PIX, -22 * PIX, 10 * PIX, 2 * PIX)
  // Jagged spikes
  rect(g, 0xe8c038, -5 * PIX, -25 * PIX, 2 * PIX, 3 * PIX)
  rect(g, 0xe8c038, -1 * PIX, -26 * PIX, 2 * PIX, 4 * PIX)
  rect(g, 0xe8c038,  3 * PIX, -25 * PIX, 2 * PIX, 3 * PIX)
  // Jewel at center
  rect(g, 0xff4060, 0, -24 * PIX, 1 * PIX, 1 * PIX)
  c.add(g)
  return c
}

function mkHatHeadband(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  rect(g, 0x4080c0, -6 * PIX, -20 * PIX, 12 * PIX, 1 * PIX)
  rect(g, 0xffffff, -2 * PIX, -20 * PIX,  4 * PIX, 1 * PIX)  // racing stripe
  c.add(g)
  return c
}

function mkHatAntennae(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Two thin antennae with bulbs
  rect(g, 0x6a4818, -4 * PIX, -26 * PIX, 1, 4 * PIX)
  rect(g, 0x6a4818,  4 * PIX, -26 * PIX, 1, 4 * PIX)
  rect(g, 0xff80c0, -5 * PIX, -28 * PIX, 2 * PIX, 2 * PIX)
  rect(g, 0xff80c0,  3 * PIX, -28 * PIX, 2 * PIX, 2 * PIX)
  c.add(g)
  return c
}

function mkFaceGlasses(scene: Phaser.Scene, facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  if (facing === 'up') return c   // glasses hidden when facing away
  // Two circles + bridge at eye height
  const eyeY = -15 * PIX
  rect(g, 0x1a1a1a, -4 * PIX, eyeY, 3 * PIX, 2 * PIX)
  rect(g, 0x1a1a1a,  1 * PIX, eyeY, 3 * PIX, 2 * PIX)
  rect(g, 0x1a1a1a, -1 * PIX, eyeY + PIX, 2 * PIX, 1)
  c.add(g)
  return c
}

function mkNeckScarf(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Wrap around the neck
  rect(g, 0xc02828, -6 * PIX, -10 * PIX, 12 * PIX, 2 * PIX)
  rect(g, 0xc02828, -7 * PIX, -8 * PIX, 4 * PIX, 5 * PIX)   // hanging tail
  rect(g, 0xa01818, -7 * PIX, -3 * PIX, 4 * PIX, 1 * PIX)   // fringe
  c.add(g)
  return c
}

function mkNeckBow(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Bow at neck — two triangles
  rect(g, 0xff6080, -4 * PIX, -11 * PIX, 3 * PIX, 3 * PIX)
  rect(g, 0xff6080,  1 * PIX, -11 * PIX, 3 * PIX, 3 * PIX)
  rect(g, 0xc04060, -1 * PIX, -10 * PIX, 2 * PIX, 1 * PIX)  // center knot
  c.add(g)
  return c
}

function mkBackCape(scene: Phaser.Scene, facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Cape draped behind — narrower in side profile, wider when back/front
  if (facing === 'left' || facing === 'right') {
    rect(g, 0x6020a0, -3 * PIX, -10 * PIX, 6 * PIX, 12 * PIX)
  } else {
    rect(g, 0x6020a0, -5 * PIX, -10 * PIX, 10 * PIX, 12 * PIX)
    rect(g, 0x4010a0, -5 * PIX,  0,         10 * PIX, 2 * PIX)  // fringe
  }
  c.add(g)
  return c
}

// V19.4 — story-quest reward cosmetics (not in shop, unlocked via stories).
function mkNeckCricketPin(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Brass cricket pin on the chest — Mox's gift.
  rect(g, 0xc89030, -2 * PIX, -8 * PIX, 4 * PIX, 3 * PIX)
  rect(g, 0xe8b048, -1 * PIX, -7 * PIX, 2 * PIX, 1 * PIX)
  rect(g, 0xc89030, -3 * PIX, -7 * PIX, 1 * PIX, 1 * PIX)   // antennae
  rect(g, 0xc89030,  2 * PIX, -7 * PIX, 1 * PIX, 1 * PIX)
  c.add(g)
  return c
}
function mkHatMoonflower(scene: Phaser.Scene, _facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Pale blue flower tucked into the hair, Iris's gift.
  rect(g, 0x88c8ff,  3 * PIX, -22 * PIX, 2 * PIX, 2 * PIX)  // petal
  rect(g, 0x88c8ff,  5 * PIX, -22 * PIX, 2 * PIX, 2 * PIX)
  rect(g, 0x88c8ff,  4 * PIX, -24 * PIX, 2 * PIX, 2 * PIX)
  rect(g, 0x88c8ff,  4 * PIX, -20 * PIX, 2 * PIX, 2 * PIX)
  rect(g, 0xffe060,  4 * PIX, -22 * PIX, 2 * PIX, 2 * PIX)  // center
  c.add(g)
  return c
}
function mkBackBookmark(scene: Phaser.Scene, facing: Direction): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  // Tasselled bookmark peeking from a back pocket, Halle's gift.
  if (facing === 'left' || facing === 'right') {
    rect(g, 0xc04040, -2 * PIX, -4 * PIX, 1, 6 * PIX)
    rect(g, 0xc04040, -2 * PIX,  2 * PIX, 2 * PIX, 1 * PIX)
  } else {
    rect(g, 0xc04040,  3 * PIX, -4 * PIX, 1 * PIX, 6 * PIX)
    rect(g, 0xffd166, 3 * PIX,  2 * PIX, 1 * PIX, 1 * PIX)   // tassel
  }
  c.add(g)
  return c
}

// ─── Registry ────────────────────────────────────────────────────────

export const COSMETICS: CosmeticDef[] = [
  { id: 'cap',       name: 'Baseball Cap', slot: 'hat',  rarity: 'starter', cost: 0,  blurb: 'Classic blue cap.',                draw: mkHatCap       },
  { id: 'scarf',     name: 'Red Scarf',    slot: 'neck', rarity: 'starter', cost: 0,  blurb: 'Warm and reliable.',               draw: mkNeckScarf    },
  { id: 'glasses',   name: 'Round Specs',  slot: 'face', rarity: 'starter', cost: 0,  blurb: 'For reading and looking thoughtful.', draw: mkFaceGlasses },
  { id: 'tophat',    name: 'Top Hat',      slot: 'hat',  rarity: 'common',  cost: 30, blurb: 'For formal lounge occasions.',     draw: mkHatTopHat    },
  { id: 'headband',  name: 'Sport Headband', slot: 'hat', rarity: 'common', cost: 25, blurb: 'Stay-in-the-zone striped band.',   draw: mkHatHeadband  },
  { id: 'bow',       name: 'Pink Bow',     slot: 'neck', rarity: 'common',  cost: 25, blurb: 'A small soft bow.',                draw: mkNeckBow      },
  { id: 'antennae',  name: 'Bug Antennae', slot: 'hat',  rarity: 'rare',    cost: 80, blurb: 'Two pink bulbs that wobble.',      draw: mkHatAntennae  },
  { id: 'crown',     name: 'Jewel Crown',  slot: 'hat',  rarity: 'rare',    cost: 120, blurb: 'For the lounge royalty.',         draw: mkHatCrown     },
  { id: 'cape',      name: 'Purple Cape',  slot: 'back', rarity: 'rare',    cost: 100, blurb: 'Drapes dramatically.',            draw: mkBackCape     },
  // V19.4 — quest rewards (cost 0 = unreachable via shop, granted by stories)
  { id: 'cricket_pin', name: 'Brass Cricket Pin', slot: 'neck', rarity: 'rare', cost: 0, blurb: "Mox's tiny rebuild — chirps in C minor.", draw: mkNeckCricketPin },
  { id: 'moonflower',  name: 'Moonflower',        slot: 'hat',  rarity: 'rare', cost: 0, blurb: "Iris's bloom — opens at sundown.",       draw: mkHatMoonflower },
  { id: 'bookmark',    name: 'Tasselled Bookmark', slot: 'back', rarity: 'rare', cost: 0, blurb: "Halle's marker — holds your place.",     draw: mkBackBookmark }
]

export function getCosmetic(id: string): CosmeticDef | null {
  return COSMETICS.find(c => c.id === id) ?? null
}

/** Returns cosmetics, in render-order (back → hat → neck → face). */
export function sortForRender(ids: string[]): CosmeticDef[] {
  const ORDER: Record<CosmeticSlot, number> = { back: 0, hat: 1, neck: 2, face: 3 }
  return ids
    .map(getCosmetic)
    .filter((c): c is CosmeticDef => c !== null)
    .sort((a, b) => ORDER[a.slot] - ORDER[b.slot])
}

// ─── State (V18.2) ────────────────────────────────────────────────────
// Equipped = max 1 per slot. Owned = unlocked set (starter cosmetics
// + anything purchased / quest-rewarded). Persisted to localStorage and
// (in V18.3) synced to Supabase via the profile message.

const EQUIPPED_KEY = 'lounge_equipped_cosmetics_v1'
const OWNED_KEY    = 'lounge_owned_cosmetics_v1'

function readArr(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(s => typeof s === 'string') : []
  } catch { return [] }
}
function writeArr(key: string, arr: string[]) {
  try { localStorage.setItem(key, JSON.stringify(arr)) } catch {}
}

const STARTER_IDS = COSMETICS.filter(c => c.rarity === 'starter').map(c => c.id)

/** Owned set — always includes the starter cosmetics. */
export function getOwnedCosmetics(): string[] {
  const stored = readArr(OWNED_KEY)
  // Union with starters so a player who clears localStorage still has freebies.
  const set = new Set([...STARTER_IDS, ...stored])
  return Array.from(set)
}
export function setOwnedCosmetics(ids: string[]) {
  writeArr(OWNED_KEY, Array.from(new Set(ids)))
}
export function addOwnedCosmetic(id: string) {
  const owned = readArr(OWNED_KEY)
  if (owned.includes(id)) return
  owned.push(id)
  writeArr(OWNED_KEY, owned)
}

/** Equipped ids (max one per slot). Order is render-order. */
export function getEquippedCosmetics(): string[] {
  return readArr(EQUIPPED_KEY)
}
export function setEquippedCosmetics(ids: string[]) {
  // Filter to owned only + enforce single-per-slot
  const owned = new Set(getOwnedCosmetics())
  const bySlot = new Map<CosmeticSlot, string>()
  for (const id of ids) {
    if (!owned.has(id)) continue
    const def = getCosmetic(id)
    if (!def) continue
    bySlot.set(def.slot, id)  // last write wins per slot
  }
  writeArr(EQUIPPED_KEY, Array.from(bySlot.values()))
}
export function equipCosmetic(id: string) {
  const def = getCosmetic(id)
  if (!def) return
  const owned = new Set(getOwnedCosmetics())
  if (!owned.has(id)) return
  const current = getEquippedCosmetics().filter(eid => {
    const d = getCosmetic(eid)
    return d ? d.slot !== def.slot : false
  })
  setEquippedCosmetics([...current, id])
}
export function unequipCosmetic(id: string) {
  setEquippedCosmetics(getEquippedCosmetics().filter(eid => eid !== id))
}
export function unequipSlot(slot: CosmeticSlot) {
  setEquippedCosmetics(getEquippedCosmetics().filter(eid => {
    const d = getCosmetic(eid)
    return d ? d.slot !== slot : true
  }))
}
