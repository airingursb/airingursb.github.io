// Era 6/7 remediation P0 + P7 review fixes — client sync layer.
//
// Mirrors localStorage to a single Supabase jsonb blob via /api/lounge/progress.
// - GET on boot (no auth): pull remote, merge into local
// - PUT on change (HMAC-token required): push local snapshot
//
// Conflict policy:
//   For JSON-shaped values (objects/arrays), parse both sides and merge by
//   id / key, preferring entries that exist on either side. For arrays of
//   ids (e.g. lounge_inv_order_v1) keep server order then append local-only.
//   For scalar strings (counts, flags), prefer the larger numeric or the
//   later UTC date string. Falls back to longer string only as last resort.
//
// Token:
//   The HMAC progress_token arrives in the WS welcome message. ws.ts forwards
//   it to setProgressToken() below. Until set, PUT is held in a pending queue.

import { getOrCreateVisitorId } from './config'

const API_BASE = 'https://chat.ursb.me'
const ENDPOINT = '/api/lounge/progress'
const PUSH_DEBOUNCE_MS = 1500

// N6: schema_version 2 = added Era 7/8 keys (skills, materials, buildings,
// coop_done, grove_flower, bundles, bundle_unlocks) + deepMergeObjects
// conflict policy. Bumped so a future server-side migration could route
// migrations cleanly. Blob shape is still backward-compatible (extra keys
// in v2 are simply absent from v1 readers).
const SCHEMA_VERSION = 2

const STORAGE_KEYS = [
  'lounge_quests_v1',
  'lounge_shells_v1',
  'lounge_shells_daily_v1',
  'lounge_purchases_v1',
  'lounge_memories_v1',
  'lounge_npc_mail_v1',
  'lounge_npc_mail_seeded_v1',
  'lounge_energy_v1',
  'lounge_energy_date_v1',
  'lounge_gametime_enabled_v1',
  'lounge_last_sleep_day_v1',
  'lounge_species_v1',
  'lounge_visitor_id_seen_once',
  'lounge_cutscenes_v1',
  'lounge_tool_v1',
  'lounge_inv_order_v1',
  'lounge_festivals_done_v1',
  'lounge_skills_v1',
  'lounge_materials_v1',
  'lounge_gather_picked_v1',
  'lounge_buildings_v1',
  'lounge_coop_done_v1',
  'lounge_grove_flower_v1',
  'lounge_bundles_v1',
  'lounge_bundle_unlocks_v1',
  'lounge_npc_hearts_v1',
  'lounge_npc_hearts_daily_v1',
  'lounge_pet_v1',
  'lounge_marriage_v1',
  'lounge_marriage_pebble_v1',
  'lounge_achievements_v1',
  'lounge_achievement_counters_v1',
  'lounge_achievement_npcs_met_v1',
  'lounge_friend_notifs_enabled_v1',
  'lounge_npc_hearts_quest_credit_v1',
  'lounge_npc_gift_daily_v1',
  'lounge_onboarding_done_v1',
  'lounge_minigame_scores_v1',
  'lounge_bath_buff_until'
] as const

type Snapshot = Record<string, string | null>

function snapshotLocal(): Snapshot {
  const snap: Snapshot = {}
  for (const k of STORAGE_KEYS) {
    try { snap[k] = localStorage.getItem(k) } catch { snap[k] = null }
  }
  return snap
}

function isJsonString(s: string): boolean {
  const t = s.trim()
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))
}

/** Merge two stored values for the same key. Both must be JSON strings or
 *  one may be null. Returns the merged JSON string. */
function mergeValue(key: string, local: string | null, remote: string | null): string | null {
  if (local == null) return remote
  if (remote == null) return local
  if (local === remote) return local
  // Try JSON parse on both. If either fails, fall back to string compare.
  let lj: any, rj: any
  try { lj = JSON.parse(local); rj = JSON.parse(remote) } catch {
    // Scalar: prefer numerically-larger if both parse as numbers (e.g. shells)
    const ln = Number(local), rn = Number(remote)
    if (Number.isFinite(ln) && Number.isFinite(rn)) return String(Math.max(ln, rn))
    // Date string YYYY-MM-DD: take the later
    if (/^\d{4}-\d{2}-\d{2}/.test(local) && /^\d{4}-\d{2}-\d{2}/.test(remote)) {
      return local > remote ? local : remote
    }
    // Last resort: longer wins (existing behavior, but only for scalars)
    return local.length >= remote.length ? local : remote
  }
  // Arrays: union, prefer remote order then append local-only ids
  if (Array.isArray(lj) && Array.isArray(rj)) {
    const seen = new Set<unknown>()
    const out: unknown[] = []
    for (const v of rj) { const k = typeof v === 'string' ? v : JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v) } }
    for (const v of lj) { const k = typeof v === 'string' ? v : JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v) } }
    return JSON.stringify(out)
  }
  // Objects: deep semantic merge.
  // V9.7-review I5 fix: recurse into nested objects (e.g. lounge_bundles_v1 is
  // { bundleId: { slotIdx: count } }). Earlier shallow merge would let the
  // shorter side wipe nested slot fills. Now: per key, choose max for numbers,
  // union for arrays, and recurse into nested objects.
  if (lj && rj && typeof lj === 'object' && typeof rj === 'object') {
    return JSON.stringify(deepMergeObjects(lj, rj))
  }
  return local
}

function deepMergeObjects(lj: any, rj: any): any {
  const merged: Record<string, unknown> = { ...rj }
  for (const k of Object.keys(lj)) {
    const lv = lj[k], rv = rj[k]
    if (rv === undefined) { merged[k] = lv; continue }
    if (Array.isArray(lv) && Array.isArray(rv)) {
      // Union (semantic-equal by JSON repr)
      const seen = new Set<string>()
      const out: unknown[] = []
      for (const v of rv) { const key = JSON.stringify(v); if (!seen.has(key)) { seen.add(key); out.push(v) } }
      for (const v of lv) { const key = JSON.stringify(v); if (!seen.has(key)) { seen.add(key); out.push(v) } }
      merged[k] = out
    } else if (typeof lv === 'number' && typeof rv === 'number') {
      merged[k] = Math.max(lv, rv)
    } else if (typeof lv === 'boolean' && typeof rv === 'boolean') {
      merged[k] = lv || rv
    } else if (lv && rv && typeof lv === 'object' && typeof rv === 'object') {
      // Recurse into nested objects
      const innerMerged = deepMergeObjects(lv, rv)
      // Quest-shape extras: completedAt = max, completed = OR
      if ('completedSteps' in (lv as any) || 'completedSteps' in (rv as any)) {
        const ls = (lv as any).completedSteps, rs = (rv as any).completedSteps
        if (Array.isArray(ls) && Array.isArray(rs)) {
          ;(innerMerged as any).completedSteps = Array.from(new Set([...rs, ...ls]))
        }
        if ((lv as any).completed || (rv as any).completed) (innerMerged as any).completed = true
        const lat = (lv as any).completedAt, rat = (rv as any).completedAt
        if (lat || rat) (innerMerged as any).completedAt = Math.max(lat || 0, rat || 0)
      }
      merged[k] = innerMerged
    } else {
      // Scalars (strings, etc): prefer local
      merged[k] = lv
    }
  }
  return merged
}

function applySnapshot(remote: Snapshot) {
  if (!remote || typeof remote !== 'object') return
  for (const k of STORAGE_KEYS) {
    const remoteV = remote[k]
    let localV: string | null = null
    try { localV = localStorage.getItem(k) } catch {}
    const merged = mergeValue(k, localV, remoteV)
    if (merged != null && merged !== localV) {
      try { localStorage.setItem(k, merged) } catch {}
    }
  }
}

let pushTimer: number | null = null
let pulledOnce = false
let progressToken: string | null = null
let pendingPushAfterToken = false

/** Set the HMAC token received in WS welcome. Triggers any pending push. */
export function setProgressToken(token: string | null) {
  progressToken = token
  if (pendingPushAfterToken && token) {
    pendingPushAfterToken = false
    schedulePush()
  }
}

export async function pullProgress(): Promise<void> {
  const vid = getOrCreateVisitorId()
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, {
      method: 'GET', headers: { 'Accept': 'application/json' }
    })
    if (!res.ok) return
    const body = await res.json()
    if (body?.ok && body.data) applySnapshot(body.data)
  } catch {}
  pulledOnce = true
  // After pulling, do an immediate push to merge any local-only state up
  schedulePush()
}

export function schedulePush() {
  if (pushTimer) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => { pushTimer = null; doPush() }, PUSH_DEBOUNCE_MS)
}

async function doPush() {
  if (!pulledOnce) return  // never push before we've reconciled with server
  if (!progressToken) { pendingPushAfterToken = true; return }  // wait for WS welcome
  const vid = getOrCreateVisitorId()
  const data = snapshotLocal()
  try {
    await fetch(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Progress-Token': progressToken },
      body: JSON.stringify({ data, schema_version: SCHEMA_VERSION })
    })
  } catch {}
}

let installed = false
export function installProgressSync() {
  if (installed) return
  installed = true
  const origSet = Storage.prototype.setItem
  const tracked = new Set<string>(STORAGE_KEYS)
  Storage.prototype.setItem = function (k: string, v: string) {
    origSet.call(this, k, v)
    if (tracked.has(k)) schedulePush()
  }
  // Flush on tab close — guarded by pulledOnce + token so we don't blast
  // null-filled snapshots over a populated remote during a brief load.
  window.addEventListener('pagehide', () => {
    if (!pulledOnce || !progressToken) return
    try {
      const vid = getOrCreateVisitorId()
      const blob = new Blob([JSON.stringify({ data: snapshotLocal(), schema_version: SCHEMA_VERSION, token: progressToken })], { type: 'application/json' })
      navigator.sendBeacon?.(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}&token=${encodeURIComponent(progressToken)}`, blob)
    } catch {}
  })
}
