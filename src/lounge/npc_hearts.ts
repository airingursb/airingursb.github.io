// V10.1 — NPC heart system (player ↔ NPC relationship).
//
// Why this exists: player↔player friendship lives in `lounge_friendships` on
// the server and is keyed by visitor_id pairs. NPCs are not players, so they
// can never appear in that table. Before V10.1, all `heart_npc_id`-gated
// cutscenes were dead code because they looked up an NPC id in a Map keyed
// by player visitor_ids.
//
// This module gives each player a per-NPC heart counter, stored locally
// (synced by progress_sync). Points come from:
//   - talking to the NPC: +1, daily cap 5 per NPC
//   - gifting the NPC (V10.1 wires this through applyGiftReceived for npc_*
//     targets if/when that flows through): +8
//   - completing a quest given by that NPC: +20 (wired in quest complete path)
//
// Levels are 0-10 with growing thresholds, matching the spec for V10.1
// (events at heart 4/6/8/10) and V10.3 (marriage at heart 10).

const STORAGE_KEY = 'lounge_npc_hearts_v1'
const DAILY_KEY   = 'lounge_npc_hearts_daily_v1'

/** Cumulative-points threshold for each level. Index i = threshold for lv i+1. */
const LEVEL_THRESHOLDS: number[] = [
  10,   // lv 1
  25,   // lv 2
  50,   // lv 3
  100,  // lv 4
  175,  // lv 5
  280,  // lv 6
  400,  // lv 7
  550,  // lv 8
  720,  // lv 9
  900   // lv 10
]
export const MAX_HEART_LEVEL = LEVEL_THRESHOLDS.length

const DAILY_TALK_CAP = 5

type Hearts = Record<string, number>
type DailyMap = { day: string, talk: Record<string, number> }

function todayUTC(): string { return new Date().toISOString().slice(0, 10) }

function loadHearts(): Hearts {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveHearts(h: Hearts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)) } catch {}
}
function loadDaily(): DailyMap {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null')
    if (raw && raw.day === todayUTC()) return raw as DailyMap
  } catch {}
  return { day: todayUTC(), talk: {} }
}
function saveDaily(d: DailyMap) {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(d)) } catch {}
}

export function getNpcHeartPoints(npcId: string): number {
  return loadHearts()[npcId] ?? 0
}

export function getNpcHeartLevel(npcId: string): number {
  const pts = getNpcHeartPoints(npcId)
  let lv = 0
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (pts >= LEVEL_THRESHOLDS[i]) lv = i + 1
    else break
  }
  return lv
}

/** Award heart points. Caller is responsible for any daily-cap logic except
 *  for `addNpcTalkHeart`, which enforces the talk cap internally. */
export function addNpcHeart(npcId: string, points: number) {
  if (points <= 0) return
  const h = loadHearts()
  h[npcId] = (h[npcId] ?? 0) + points
  saveHearts(h)
}

/** Award +1 for a conversation, capped at DAILY_TALK_CAP per NPC per UTC day.
 *  Returns the actual points awarded (0 if cap reached). */
export function addNpcTalkHeart(npcId: string): number {
  const d = loadDaily()
  const used = d.talk[npcId] ?? 0
  if (used >= DAILY_TALK_CAP) return 0
  d.talk[npcId] = used + 1
  saveDaily(d)
  addNpcHeart(npcId, 1)
  return 1
}

/** Returns a map of every known NPC id → level. Useful for the album / wedding-prereq panel. */
export function getAllNpcHeartLevels(): Map<string, number> {
  const h = loadHearts()
  const out = new Map<string, number>()
  for (const k of Object.keys(h)) out.set(k, getNpcHeartLevel(k))
  return out
}
