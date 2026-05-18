// V9.7 — Community Hall: collective bundles.
//
// Bundles are achievement-style group goals. Visitors collectively contribute
// items (pebbles, materials, shells, memories, friendship milestones). When a
// bundle hits 100%, a community-wide reward unlocks (new festival, new NPC
// dialog, new room slot, etc).
//
// MVP scope:
//   • Each visitor's contributions tracked LOCALLY in their progress blob.
//     A bundle is "complete" when this visitor has fulfilled all its slots.
//     V9.7.1 will move to server-side aggregation (real "collective" gating).
//   • 4 launch bundles aligned with the 4 seasons.

import { getMaterial, removeMaterial, type MaterialId } from './resources'
import { spendShells } from './shells'
import { awardXp } from './skills'

export type BundleSlot =
  | { kind: 'shells'; count: number }
  | { kind: 'material'; id: MaterialId; count: number }
  | { kind: 'memory'; count: number }    // any captured memory
  | { kind: 'friendship'; minLevel: number; minCount: number }  // # NPCs at heart >= L

export type Bundle = {
  id: string
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  name: string
  emoji: string
  blurb: string
  slots: BundleSlot[]
  /** Human-readable reward shown in UI. */
  reward: string
  /** N5: machine ID consumed by npcs.ts (dialog `bundle:`) and cutscenes.ts
   *  (trigger `bundle:`) to gate content behind bundle completion. */
  reward_unlock_id: string
}

export const BUNDLES: Bundle[] = [
  {
    id: 'bundle_spring_tea',
    season: 'spring', name: 'Spring Tea Service', emoji: '🍵',
    blurb: 'Stock the spring tea cabinet.',
    slots: [
      { kind: 'shells',   count: 30 },
      { kind: 'material', id: 'leaves', count: 8 },
      { kind: 'material', id: 'berries', count: 4 }
    ],
    reward: "Unlocks Mio's Spring Brew dialog branch",
    reward_unlock_id: 'mio_spring_brew'
  },
  {
    id: 'bundle_summer_bonfire',
    season: 'summer', name: 'Summer Bonfire Kit', emoji: '🔥',
    blurb: 'Stock kindling and stories.',
    slots: [
      { kind: 'material', id: 'driftwood', count: 12 },
      { kind: 'memory', count: 3 },
      { kind: 'friendship', minLevel: 2, minCount: 3 }
    ],
    reward: "Unlocks Sora's Sea Lore cutscene",
    reward_unlock_id: 'sora_sea_lore'
  },
  {
    id: 'bundle_autumn_harvest',
    season: 'autumn', name: 'Autumn Harvest Table', emoji: '🍂',
    blurb: 'Trade & community feast.',
    slots: [
      { kind: 'material', id: 'berries', count: 12 },
      { kind: 'material', id: 'leaves',  count: 16 },
      { kind: 'shells',   count: 60 }
    ],
    reward: "Unlocks Theo's rare-seed gift dialog",
    reward_unlock_id: 'theo_rare_seed'
  },
  {
    id: 'bundle_winter_carols',
    season: 'winter', name: 'Winter Carol Songbook', emoji: '❄️',
    blurb: 'Books, blankets, friends.',
    slots: [
      { kind: 'memory', count: 5 },
      { kind: 'friendship', minLevel: 3, minCount: 2 },
      { kind: 'shells', count: 50 }
    ],
    reward: "Unlocks Halle's Winter Reading cutscene",
    reward_unlock_id: 'halle_winter_reading'
  }
]

// N5: track which bundle rewards have been unlocked. Set when a bundle
// completes; checked by npcs/cutscenes to gate content.
const UNLOCK_KEY = 'lounge_bundle_unlocks_v1'
function loadUnlocks(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}') } catch { return {} }
}
function saveUnlocks(m: Record<string, number>) {
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(m)) } catch {}
}
/** True if the bundle unlock has been awarded. */
export function isBundleUnlocked(unlockId: string): boolean {
  return !!loadUnlocks()[unlockId]
}
function markUnlocked(unlockId: string) {
  const m = loadUnlocks(); m[unlockId] = Date.now(); saveUnlocks(m)
}

const STORAGE_KEY = 'lounge_bundles_v1'   // per-bundle filled slots map: { [bundleId]: { [slotIdx]: amountFilled or true } }
type FilledLog = Record<string, Record<number, number | boolean>>

function load(): FilledLog {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function save(m: FilledLog) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}

export function getFilled(bundleId: string, slotIdx: number): number {
  const v = load()[bundleId]?.[slotIdx]
  if (typeof v === 'number') return v
  if (v === true) return 1
  return 0
}

export type ContributeResult =
  | { ok: true; completedBundle: boolean }
  | { ok: false; reason: 'already_full' | 'not_enough' | 'cannot_check' }

/** Memory + friendship slots check at panel render time (not action time). */
export function checkAutoSlots(opts: { memoriesCount: number; friendshipsMaxLevels: number[] }) {
  const log = load()
  let changed = false
  for (const b of BUNDLES) {
    if (!log[b.id]) log[b.id] = {}
    b.slots.forEach((slot, i) => {
      if (slot.kind === 'memory') {
        const want = slot.count
        const has = Math.min(opts.memoriesCount, want)
        if ((log[b.id][i] as number ?? 0) !== has) { log[b.id][i] = has; changed = true }
      } else if (slot.kind === 'friendship') {
        const have = opts.friendshipsMaxLevels.filter(l => l >= slot.minLevel).length
        const has = Math.min(have, slot.minCount)
        if ((log[b.id][i] as number ?? 0) !== has) { log[b.id][i] = has; changed = true }
      }
    })
  }
  if (changed) save(log)
  // N5: backfill — for bundles already complete (whether from this code path
  // or from before reward_unlock_id existed), ensure the unlock flag is set.
  for (const b of BUNDLES) {
    if (isBundleComplete(b) && !isBundleUnlocked(b.reward_unlock_id)) {
      markUnlocked(b.reward_unlock_id)
    }
  }
}

export function tryContribute(bundleId: string, slotIdx: number): ContributeResult {
  const b = BUNDLES.find(x => x.id === bundleId)
  if (!b) return { ok: false, reason: 'cannot_check' }
  const slot = b.slots[slotIdx]
  if (!slot) return { ok: false, reason: 'cannot_check' }
  const log = load()
  if (!log[bundleId]) log[bundleId] = {}
  const filled = getFilled(bundleId, slotIdx)
  if (slot.kind === 'shells') {
    if (filled >= slot.count) return { ok: false, reason: 'already_full' }
    const need = Math.max(0, slot.count - filled)
    if (need === 0) return { ok: false, reason: 'already_full' }
    if (!spendShells(need)) return { ok: false, reason: 'not_enough' }
    log[bundleId][slotIdx] = slot.count
  } else if (slot.kind === 'material') {
    if (filled >= slot.count) return { ok: false, reason: 'already_full' }
    const need = Math.max(0, slot.count - filled)
    if (need === 0) return { ok: false, reason: 'already_full' }
    if (getMaterial(slot.id) < need) return { ok: false, reason: 'not_enough' }
    removeMaterial(slot.id, need)
    log[bundleId][slotIdx] = slot.count
  } else {
    return { ok: false, reason: 'cannot_check' }   // memory / friendship are auto-checked
  }
  save(log)
  // Check completion
  const completed = isBundleComplete(b)
  if (completed) {
    awardXp('companionship', 10)
    markUnlocked(b.reward_unlock_id)   // N5: gate content for NPCs/cutscenes
  }
  return { ok: true, completedBundle: completed }
}

export function isBundleComplete(b: Bundle): boolean {
  return b.slots.every((slot, i) => {
    const f = getFilled(b.id, i)
    if (slot.kind === 'shells')    return f >= slot.count
    if (slot.kind === 'material')  return f >= slot.count
    if (slot.kind === 'memory')    return f >= slot.count
    if (slot.kind === 'friendship') return f >= slot.minCount
    return false
  })
}
