// Era 6/7 remediation P0 — client sync layer for consolidated progress.
//
// Mirrors all client-state localStorage modules (quests / shells / mail /
// memories / purchases / energy) to a single Supabase jsonb blob via the
// blog-api /api/lounge/progress endpoint. Pull on visit; push (debounced)
// on any change.
//
// localStorage is still the source of truth at runtime — sync just keeps it
// durable across devices / cleared cookies.

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
  'lounge_festivals_done_v1'
] as const

function snapshotLocal(): Record<string, string | null> {
  const snap: Record<string, string | null> = {}
  for (const k of STORAGE_KEYS) {
    try { snap[k] = localStorage.getItem(k) } catch { snap[k] = null }
  }
  return snap
}

function applySnapshot(remote: Record<string, string | null>) {
  if (!remote || typeof remote !== 'object') return
  for (const k of STORAGE_KEYS) {
    const v = remote[k]
    if (v == null) continue
    try {
      const existing = localStorage.getItem(k)
      if (existing === v) continue
      // Conflict policy: take the longer string (more events = more authoritative)
      // unless local is empty.
      if (existing == null || existing === '' || existing === '0') {
        localStorage.setItem(k, v)
      } else if (v.length > existing.length) {
        localStorage.setItem(k, v)
      }
    } catch {}
  }
}

let pushTimer: number | null = null
let pulledOnce = false

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
  const vid = getOrCreateVisitorId()
  const data = snapshotLocal()
  try {
    await fetch(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, schema_version: 1 })
    })
  } catch {}
}

// Patch localStorage so any write to a tracked key auto-schedules a push.
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
  // Also push on tab close
  window.addEventListener('pagehide', () => {
    // navigator.sendBeacon for best-effort flush
    try {
      const vid = getOrCreateVisitorId()
      const blob = new Blob([JSON.stringify({ data: snapshotLocal(), schema_version: 1 })], { type: 'application/json' })
      navigator.sendBeacon?.(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, blob)
    } catch {}
  })
}
