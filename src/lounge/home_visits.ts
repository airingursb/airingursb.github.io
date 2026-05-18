// V12.5 — Home visit log data layer.
//
// Uses the same HMAC token as board/progress (set via setVisitsToken from
// applyWelcome). Read-only: returns the player's own last-30-day log.

import { getOrCreateVisitorId } from './config'

const API_BASE = 'https://chat.ursb.me'
const ENDPOINT = '/api/lounge/home/visits'

export type HomeVisit = {
  id: number
  guest_visitor_id: string
  guest_name: string | null
  visited_at: string
}

let progressToken: string | null = null
export function setVisitsProgressToken(token: string | null) { progressToken = token }

export async function fetchMyHomeVisits(): Promise<HomeVisit[]> {
  const vid = getOrCreateVisitorId()
  if (!progressToken) return []
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, {
      headers: { 'X-Progress-Token': progressToken, 'Accept': 'application/json' }
    })
    const body = await res.json()
    return body?.ok ? (body.visits as HomeVisit[]) : []
  } catch { return [] }
}
