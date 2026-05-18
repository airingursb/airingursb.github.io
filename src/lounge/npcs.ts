import type { Region, RoomId } from './config'
import type { Direction } from './bear'
import { getGameNow } from './gametime'

export type NpcState = 'idle' | 'sit' | 'dance' | 'sleep'

export type ScheduleBracket = {
  from: string   // "HH:MM"
  to: string     // "HH:MM"
  room: RoomId
  x: number
  y: number
  state: NpcState
}

// V7.0 — Dialog branches: each branch holds lines that fire only when its
// condition (season / heart / time / event) matches. Falls through to
// dialog_pool when no branch matches. Branches are tried in array order;
// the first match wins.
export type DialogCondition = {
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  heart_min?: number   // friendship level lower bound (inclusive)
  heart_max?: number   // friendship level upper bound (inclusive)
  time?: 'morning' | 'afternoon' | 'evening' | 'night'  // 6-12 / 12-17 / 17-22 / 22-6
  event?: string       // e.g. 'spring_open_house', set when festival active
  first_meeting?: boolean  // true → only on first interaction this session
  bundle?: string      // N5: gated by Community Hall bundle reward_unlock_id
}
export type DialogBranch = {
  condition?: DialogCondition
  lines: string[]
  /** V9.7-review C1 fix: secret branches only become eligible when
   *  Companionship skill >= 5 (unlocksHiddenNpcLines). */
  secret?: boolean
}

export type NpcDef = {
  id: string
  name: string
  region: Region
  facing: Direction
  schedule: ScheduleBracket[]
  dialog_pool: string[]               // fallback
  dialog_branches?: DialogBranch[]    // V7.0 — optional, takes precedence
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
export function getActiveBracket(def: NpcDef, now: Date = getGameNow()): ScheduleBracket | null {
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

// V7.0 — Dialog context derived from runtime state.
export type DialogContext = {
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  heart: number       // friendship level 0-3
  time: 'morning' | 'afternoon' | 'evening' | 'night'
  event?: string      // active festival id if any
  isFirstMeeting: boolean
}

function timeBucket(d: Date): DialogContext['time'] {
  const h = d.getHours()
  if (h >= 6 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}
function seasonOf(d: Date): DialogContext['season'] {
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

export function buildDialogContext(opts: { heart?: number; event?: string; isFirstMeeting?: boolean } = {}, now: Date = getGameNow()): DialogContext {
  return {
    season: seasonOf(now),
    time: timeBucket(now),
    heart: opts.heart ?? 0,
    event: opts.event,
    isFirstMeeting: !!opts.isFirstMeeting
  }
}

function matchesBranch(c: DialogCondition | undefined, ctx: DialogContext): boolean {
  if (!c) return true  // no condition = always match (fallback branch)
  if (c.season && c.season !== ctx.season) return false
  if (c.heart_min !== undefined && ctx.heart < c.heart_min) return false
  if (c.heart_max !== undefined && ctx.heart > c.heart_max) return false
  if (c.time && c.time !== ctx.time) return false
  if (c.event && c.event !== ctx.event) return false
  if (c.first_meeting !== undefined && c.first_meeting !== ctx.isFirstMeeting) return false
  // N5: bundle unlock gate
  if (c.bundle) {
    try {
      // Inline read to avoid a circular import (community_hall imports skills/etc).
      const raw = localStorage.getItem('lounge_bundle_unlocks_v1') || '{}'
      const unlocks = JSON.parse(raw)
      if (!unlocks[c.bundle]) return false
    } catch { return false }
  }
  return true
}

/** Pick a random dialog line. V7.0: if def has dialog_branches, walk those first
 *  and use the first matching branch's lines; else fall back to dialog_pool. */
export function pickDialog(
  def: NpcDef,
  recentMemory: Map<string, string>,
  ctx?: DialogContext
): string {
  let pool = def.dialog_pool
  if (def.dialog_branches && def.dialog_branches.length > 0 && ctx) {
    // V9.7-review C1 fix: gate secret branches behind Companionship skill 5+
    let secretsUnlocked = false
    try {
      const raw = localStorage.getItem('lounge_skills_v1')
      if (raw) {
        const skills = JSON.parse(raw)
        const xp = Number(skills.companionship ?? 0)
        const LEVEL_XP = [10, 25, 50, 90, 140, 200, 280, 380, 500, 650]
        let level = 0, acc = 0
        for (let i = 0; i < LEVEL_XP.length; i++) { acc += LEVEL_XP[i]; if (xp >= acc) level = i + 1; else break }
        secretsUnlocked = level >= 5
      }
    } catch {}
    for (const branch of def.dialog_branches) {
      if (branch.secret && !secretsUnlocked) continue
      if (matchesBranch(branch.condition, ctx) && branch.lines.length > 0) {
        pool = branch.lines
        break
      }
    }
  }
  if (!pool || pool.length === 0) return '…'
  if (pool.length === 1) return pool[0]
  const last = recentMemory.get(def.id)
  let candidates = pool.filter((line) => line !== last)
  if (candidates.length === 0) candidates = pool
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  recentMemory.set(def.id, pick)
  return pick
}
