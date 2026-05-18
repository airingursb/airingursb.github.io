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
  'lounge_skills_v1'
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
  // Objects: merge by key. For each key, recurse (treat values as opaque strings here).
  // For 'completedSteps' arrays inside quest state, union. For numbers, take max.
  // For timestamps, take later. For everything else, prefer local (more recent
  // writes likely happened locally).
  if (lj && rj && typeof lj === 'object' && typeof rj === 'object') {
    const merged: Record<string, unknown> = { ...rj, ...lj }
    for (const k of Object.keys(merged)) {
      const lv = (lj as any)[k], rv = (rj as any)[k]
      if (Array.isArray(lv) && Array.isArray(rv)) {
        const u = new Set<unknown>([...rv, ...lv])
        merged[k] = Array.from(u)
      } else if (typeof lv === 'number' && typeof rv === 'number') {
        merged[k] = Math.max(lv, rv)
      } else if (lv && rv && typeof lv === 'object' && typeof rv === 'object') {
        // Quest state shape: { accepted, completedSteps, completed, acceptedAt }
        merged[k] = { ...rv, ...lv }
        const lsteps = (lv as any).completedSteps, rsteps = (rv as any).completedSteps
        if (Array.isArray(lsteps) && Array.isArray(rsteps)) {
          (merged[k] as any).completedSteps = Array.from(new Set([...rsteps, ...lsteps]))
        }
        const lc = (lv as any).completed, rc = (rv as any).completed
        if (lc || rc) (merged[k] as any).completed = true
        const lat = (lv as any).completedAt, rat = (rv as any).completedAt
        if (lat || rat) (merged[k] as any).completedAt = Math.max(lat || 0, rat || 0)
      }
    }
    return JSON.stringify(merged)
  }
  return local
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
      body: JSON.stringify({ data, schema_version: 1 })
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
      const blob = new Blob([JSON.stringify({ data: snapshotLocal(), schema_version: 1, token: progressToken })], { type: 'application/json' })
      navigator.sendBeacon?.(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}&token=${encodeURIComponent(progressToken)}`, blob)
    } catch {}
  })
}
