// V9.1 — Crafting. Combine items (pebbles + shells + future materials) into
// new decorations or special items. Recipes unlock at certain skill levels.
//
// Inventory cost model:
//   pebble:<id>       — specific pebble id (consume = remove from inventory.Set)
//   any_pebble:N      — any N pebbles (consume = remove first N)
//   shells:N          — N shells (consume = spendShells)
//   material:<id>     — V9.2 gathered materials (leaves, shells, driftwood…)
//
// Output: shop_<id> purchase flag (so the item flows through the existing
// shop_*-in-inventory pipeline added in P1).

import { getLevel } from './skills'
import { spendShells, getShells, decoStorageKey } from './shells'

export type Cost =
  | { kind: 'any_pebble'; count: number }
  | { kind: 'shells'; count: number }
  | { kind: 'pebble'; id: string }
  | { kind: 'material'; id: string; count: number }

export type Recipe = {
  id: string
  name: string
  emoji: string
  blurb: string
  costs: Cost[]
  output: { id: string; name: string; kind: 'decoration' | 'consumable' }
  /** Hard gate: requires this skill at least this level to even SEE the recipe. */
  unlock?: { skill: import('./skills').SkillId; level: number }
}

export const RECIPES: Recipe[] = [
  {
    id: 'friendship_charm',
    name: 'Friendship Charm', emoji: '💞',
    blurb: 'Hang it in your Home. Friends visiting earn +1 friendship per session.',
    costs: [{ kind: 'any_pebble', count: 3 }, { kind: 'shells', count: 5 }],
    output: { id: 'craft_friendship_charm', name: 'Friendship Charm', kind: 'decoration' },
    unlock: { skill: 'hospitality', level: 2 }
  },
  {
    id: 'memory_locket',
    name: 'Memory Locket', emoji: '📿',
    blurb: 'A small frame that displays one of your captured memories.',
    costs: [{ kind: 'shells', count: 8 }],
    output: { id: 'craft_memory_locket', name: 'Memory Locket', kind: 'decoration' },
    unlock: { skill: 'memory_making', level: 2 }
  },
  {
    id: 'wanderer_compass',
    name: "Wanderer's Compass", emoji: '🧭',
    blurb: 'Tiny brass compass for the wall. Marks the rooms you have visited.',
    costs: [{ kind: 'any_pebble', count: 2 }, { kind: 'shells', count: 12 }],
    output: { id: 'craft_wanderer_compass', name: "Wanderer's Compass", kind: 'decoration' },
    unlock: { skill: 'wayfaring', level: 3 }
  },
  {
    id: 'curator_lamp',
    name: "Curator's Lamp", emoji: '💡',
    blurb: 'A small lamp that picks up the brightest tones of your collection.',
    costs: [{ kind: 'any_pebble', count: 4 }, { kind: 'shells', count: 10 }],
    output: { id: 'craft_curator_lamp', name: "Curator's Lamp", kind: 'decoration' },
    unlock: { skill: 'curating', level: 3 }
  },
  {
    id: 'shared_kettle',
    name: 'Shared Kettle', emoji: '🫖',
    blurb: 'A keepsake for the kitchen. Mio acknowledges it.',
    costs: [{ kind: 'shells', count: 18 }],
    output: { id: 'craft_shared_kettle', name: 'Shared Kettle', kind: 'decoration' },
    unlock: { skill: 'companionship', level: 4 }
  }
]

export function isUnlocked(r: Recipe): boolean {
  if (!r.unlock) return true
  return getLevel(r.unlock.skill) >= r.unlock.level
}

/** Returns the error reason if cannot craft, else 'ok'. Caller passes a
 *  pebble-inventory probe and a function that mutates inventory. */
export type CraftEnv = {
  inventoryHas: (item_id: string) => boolean
  inventorySize: number
  pebbleIds: string[]               // ordered list of pebble ids the visitor owns
  removePebble: (item_id: string) => void
  hasMaterial: (id: string) => number
  removeMaterial: (id: string, n: number) => void
}

export type CraftResult =
  | { ok: true; outputId: string; outputName: string }
  | { ok: false; reason: 'locked' | 'not_enough_pebbles' | 'not_enough_shells' | 'missing_material' | 'already_owned' }

export function tryCraft(r: Recipe, env: CraftEnv): CraftResult {
  if (!isUnlocked(r)) return { ok: false, reason: 'locked' }
  // Already owned (decoration is one-shot)
  if (r.output.kind === 'decoration') {
    try {
      const raw = localStorage.getItem('lounge_purchases_v1') || '{}'
      const map = JSON.parse(raw)
      if (map[decoStorageKey(r.output.id)]) return { ok: false, reason: 'already_owned' }
    } catch {}
  }
  // V9.7-review C3 fix: real precheck for all kinds BEFORE any spend, so
  // atomicity is correct even when costs reorder.
  for (const c of r.costs) {
    if (c.kind === 'any_pebble') {
      if (env.pebbleIds.length < c.count) return { ok: false, reason: 'not_enough_pebbles' }
    } else if (c.kind === 'pebble') {
      if (!env.inventoryHas(c.id)) return { ok: false, reason: 'not_enough_pebbles' }
    } else if (c.kind === 'material') {
      if (env.hasMaterial(c.id) < c.count) return { ok: false, reason: 'missing_material' }
    } else if (c.kind === 'shells') {
      if (getShells() < c.count) return { ok: false, reason: 'not_enough_shells' }
    }
  }
  // Pay shells first (atomic in shells.ts via spendShells)
  for (const c of r.costs) {
    if (c.kind === 'shells') {
      if (!spendShells(c.count)) return { ok: false, reason: 'not_enough_shells' }
    }
  }
  // Consume pebbles + materials
  for (const c of r.costs) {
    if (c.kind === 'any_pebble') {
      for (let i = 0; i < c.count; i++) env.removePebble(env.pebbleIds[i])
    } else if (c.kind === 'pebble') {
      env.removePebble(c.id)
    } else if (c.kind === 'material') {
      env.removeMaterial(c.id, c.count)
    }
  }
  // Output: write into purchases so existing P1 pipeline surfaces it
  try {
    const raw = localStorage.getItem('lounge_purchases_v1') || '{}'
    const map = JSON.parse(raw)
    map[decoStorageKey(r.output.id)] = Date.now()
    localStorage.setItem('lounge_purchases_v1', JSON.stringify(map))
  } catch {}
  return { ok: true, outputId: r.output.id, outputName: r.output.name }
}
