// V9.3 — Home building / extensions. Each visitor can unlock up to 3 tiers
// of Home extension. Each tier expands the placeable area (visually a tinted
// overlay around the Home room boundary) + raises the home decoration cap.
//
// MVP scope: tier unlocks are flags in localStorage; the visual extension
// is rendered as an additional pastel-tinted polygon outside the canonical
// home room bounds, with extra decoration slots wired into the place flow.

import { spendShells } from './shells'
import { removeMaterial, getMaterial, type MaterialId } from './resources'

export type ExtensionTier = 'patio' | 'loft' | 'studio'

export const EXTENSION_DEFS: Array<{
  id: ExtensionTier
  name: string
  emoji: string
  blurb: string
  cost: { shells: number; materials: Partial<Record<MaterialId, number>> }
  prereq?: ExtensionTier
  /** how many extra decoration slots this tier grants */
  extraDecoCap: number
}> = [
  {
    id: 'patio', name: 'Garden Patio', emoji: '🌿',
    blurb: 'Wood-deck extension out the front. +6 decoration slots.',
    cost: { shells: 40, materials: { driftwood: 4, leaves: 6 } },
    extraDecoCap: 6
  },
  {
    id: 'loft', name: 'Loft', emoji: '🪜',
    blurb: 'Sleeping loft above. +10 decoration slots. Unlocks after Patio.',
    cost: { shells: 80, materials: { driftwood: 8, leaves: 4, berries: 2 } },
    prereq: 'patio',
    extraDecoCap: 10
  },
  {
    id: 'studio', name: 'Studio', emoji: '🎨',
    blurb: 'A creative wing. +15 slots. Unlocks after Loft.',
    cost: { shells: 160, materials: { driftwood: 12, shells: 8, berries: 4 } },
    prereq: 'loft',
    extraDecoCap: 15
  }
]

const STORAGE_KEY = 'lounge_buildings_v1'  // { tier: utcDay }

function load(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function save(m: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}
function utcDay(d = new Date()): string { return d.toISOString().slice(0, 10) }

export function hasExtension(tier: ExtensionTier): boolean {
  return !!load()[tier]
}
export function getExtensions(): ExtensionTier[] {
  return EXTENSION_DEFS.map(e => e.id).filter(hasExtension)
}

export type BuildResult =
  | { ok: true }
  | { ok: false; reason: 'already_owned' | 'missing_prereq' | 'not_enough_shells' | 'missing_material' }

export function tryBuild(tier: ExtensionTier): BuildResult {
  const def = EXTENSION_DEFS.find(e => e.id === tier)
  if (!def) return { ok: false, reason: 'already_owned' }   // unknown tier; pretend done
  if (hasExtension(tier)) return { ok: false, reason: 'already_owned' }
  if (def.prereq && !hasExtension(def.prereq)) return { ok: false, reason: 'missing_prereq' }
  // Material precheck (so we don't spend shells if materials are short)
  for (const [m, n] of Object.entries(def.cost.materials)) {
    if (getMaterial(m as MaterialId) < (n ?? 0)) return { ok: false, reason: 'missing_material' }
  }
  if (!spendShells(def.cost.shells)) return { ok: false, reason: 'not_enough_shells' }
  for (const [m, n] of Object.entries(def.cost.materials)) {
    removeMaterial(m as MaterialId, n ?? 0)
  }
  const map = load()
  map[tier] = utcDay()
  save(map)
  return { ok: true }
}

/** Total extra decoration cap from all owned extensions. */
export function extraHomeCap(): number {
  return EXTENSION_DEFS.reduce((sum, e) => sum + (hasExtension(e.id) ? e.extraDecoCap : 0), 0)
}
