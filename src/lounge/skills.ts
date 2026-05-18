// V9.0 — Skills + leveling. Five skill tracks, 10 levels each. XP from
// existing actions. Perks at certain levels (consumed by other systems
// like sendLetterDrop's cap, walk-speed scaling, etc).
//
// Persistence: localStorage (synced to lounge_progress via the P0 layer).
// Future V9.0.1 could move to its own table if granular events are needed.

export type SkillId =
  | 'hospitality'    // gifting + DMs + co-presence
  | 'curating'       // home decoration variety
  | 'wayfaring'      // rooms discovered + transitions
  | 'memory_making'  // camera use
  | 'companionship'  // high-level friendships across many NPCs

export const SKILLS: Array<{ id: SkillId; name: string; emoji: string; blurb: string }> = [
  { id: 'hospitality',   name: 'Hospitality',   emoji: '🤝', blurb: 'Gifts, DMs, time spent in the same room as others.' },
  { id: 'curating',      name: 'Curating',      emoji: '🪴', blurb: 'Variety in your home decorations.' },
  { id: 'wayfaring',     name: 'Wayfaring',     emoji: '🧭', blurb: 'Rooms discovered. Transitions walked.' },
  { id: 'memory_making', name: 'Memory-making', emoji: '📷', blurb: 'Camera captures saved.' },
  { id: 'companionship', name: 'Companionship', emoji: '💞', blurb: 'High-heart friendships with many NPCs.' }
]

// XP table (per level). Linear-ish curve.
// Level N requires LEVEL_XP[N-1] XP (1-indexed external, 0-indexed internal).
export const LEVEL_XP = [10, 25, 50, 90, 140, 200, 280, 380, 500, 650]
export const MAX_LEVEL = 10

const STORAGE_KEY = 'lounge_skills_v1'

type SkillState = Record<SkillId, number>   // XP per skill

function defaults(): SkillState {
  return { hospitality: 0, curating: 0, wayfaring: 0, memory_making: 0, companionship: 0 }
}

function load(): SkillState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw)
    return { ...defaults(), ...parsed }
  } catch { return defaults() }
}

function save(s: SkillState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

export function getXp(skill: SkillId): number { return load()[skill] ?? 0 }
export function getAllXp(): SkillState { return load() }

/** Returns 1..MAX_LEVEL based on xp; 1 means 0 < xp < LEVEL_XP[0]. 0 means no progress yet. */
export function getLevel(skill: SkillId, xpOverride?: number): number {
  const xp = xpOverride ?? getXp(skill)
  if (xp <= 0) return 0
  let level = 0
  let acc = 0
  for (let i = 0; i < LEVEL_XP.length; i++) {
    acc += LEVEL_XP[i]
    if (xp >= acc) level = i + 1
    else break
  }
  return level
}

/** Returns (xpIntoLevel, xpForNextLevel) — useful for UI bars. */
export function getProgress(skill: SkillId): { level: number; xpInLevel: number; xpForNext: number } {
  const xp = getXp(skill)
  let acc = 0
  for (let i = 0; i < LEVEL_XP.length; i++) {
    const need = LEVEL_XP[i]
    if (xp < acc + need) {
      return { level: i, xpInLevel: xp - acc, xpForNext: need }
    }
    acc += need
  }
  return { level: MAX_LEVEL, xpInLevel: 0, xpForNext: 0 }
}

const listeners: Array<(s: SkillId, level: number) => void> = []
export function onLevelUp(fn: (s: SkillId, level: number) => void) { listeners.push(fn) }

export function awardXp(skill: SkillId, amount: number) {
  if (amount <= 0) return
  const before = load()
  const beforeLevel = getLevel(skill, before[skill] ?? 0)
  const after = { ...before, [skill]: (before[skill] ?? 0) + amount }
  save(after)
  const afterLevel = getLevel(skill, after[skill])
  if (afterLevel > beforeLevel) {
    for (const l of listeners) l(skill, afterLevel)
  }
}

// ─── Perks: small functions read by other systems ───────────────────

/** Walk speed multiplier from Wayfaring. Level 0 → 1.0, +0.03 per level → max 1.30.
 *  V10.2: bunny pet at max affection adds +0.05. */
export function walkSpeedMultiplier(): number {
  // Local require-pattern avoided to keep skills.ts dependency-free in case it
  // imports skills (no cycle today, but defensive). Inline lookup is fine.
  let mult = 1 + getLevel('wayfaring') * 0.03
  try {
    const raw = localStorage.getItem('lounge_pet_v1')
    if (raw) {
      const p = JSON.parse(raw)
      if (p?.species === 'bunny' && p?.affection >= 10) mult += 0.05
    }
  } catch {}
  return mult
}

/** Bonus letter slots from Hospitality. Level 3 → +1, level 6 → +2, level 9 → +3. */
export function bonusLetterSlots(): number {
  const lv = getLevel('hospitality')
  if (lv >= 9) return 3
  if (lv >= 6) return 2
  if (lv >= 3) return 1
  return 0
}

/** Bonus inventory slots from Curating. Level 4 → +4, level 7 → +8. */
export function bonusInventorySlots(): number {
  const lv = getLevel('curating')
  if (lv >= 7) return 8
  if (lv >= 4) return 4
  return 0
}

/** True if NPC has revealed a hidden line — Companionship 5+. */
export function unlocksHiddenNpcLines(): boolean {
  return getLevel('companionship') >= 5
}

/** Memory cap from Memory-making. Default 36 → +12 per 3 levels. */
export function memoryCap(): number {
  const lv = getLevel('memory_making')
  return 36 + Math.floor(lv / 3) * 12
}
