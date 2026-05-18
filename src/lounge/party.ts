// V12.7 — Party room data layer.

import { getOrCreateVisitorId } from './config'

const API_BASE = 'https://chat.ursb.me'
const ENDPOINT = '/api/lounge/party'

export type PartyRoom = {
  code: string
  owner_visitor_id: string
  owner_name: string | null
  topic: string | null
  created_at: string
  expires_at: string
}

let progressToken: string | null = null
export function setPartyProgressToken(token: string | null) { progressToken = token }

export type CreateResult =
  | { ok: true; party: PartyRoom }
  | { ok: false; reason: string }

export async function createPartyRoom(opts: { topic?: string; owner_name?: string | null }): Promise<CreateResult> {
  const vid = getOrCreateVisitorId()
  if (!progressToken) return { ok: false, reason: 'no_token' }
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Progress-Token': progressToken },
      body: JSON.stringify({
        topic: (opts.topic ?? '').slice(0, 80),
        owner_name: opts.owner_name ?? null
      })
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.ok) return { ok: true, party: body.party as PartyRoom }
    return { ok: false, reason: body?.reason || `http_${res.status}` }
  } catch { return { ok: false, reason: 'network' } }
}

export type ResolveResult =
  | { ok: true; party: PartyRoom }
  | { ok: false; reason: string }

export async function resolvePartyCode(code: string): Promise<ResolveResult> {
  const upper = code.trim().toUpperCase()
  if (!/^[A-Z2-9]{6}$/.test(upper)) return { ok: false, reason: 'bad_code' }
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}/${encodeURIComponent(upper)}`, {
      headers: { 'Accept': 'application/json' }
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.ok) return { ok: true, party: body.party as PartyRoom }
    return { ok: false, reason: body?.reason || `http_${res.status}` }
  } catch { return { ok: false, reason: 'network' } }
}

export function partyRoomId(code: string): string {
  return `room_party_${code.toUpperCase()}`
}
