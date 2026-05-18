// V12.1 — Community board client. Pure data layer; UI lives in board_ui.ts.
//
// Wire-up:
//   - GET on room change: list posts pinned to that room
//   - POST when user submits via the panel
//   - DELETE by author from the panel
//
// Auth: the existing HMAC progress_token flows through net.ts → here.

import { getOrCreateVisitorId } from './config'

const API_BASE = 'https://chat.ursb.me'
const ENDPOINT = '/api/lounge/board'

export type BoardCategory = 'note' | 'event' | 'question' | 'shout'

export type BoardPost = {
  id: number
  visitor_id: string
  display_name: string | null
  room: string
  category: BoardCategory
  content: string
  created_at: string
  expires_at: string
}

let progressToken: string | null = null
export function setBoardProgressToken(token: string | null) { progressToken = token }

export async function fetchBoardPosts(room: string): Promise<BoardPost[]> {
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}?room=${encodeURIComponent(room)}`, {
      headers: { 'Accept': 'application/json' }
    })
    const body = await res.json()
    return body?.ok ? (body.posts as BoardPost[]) : []
  } catch { return [] }
}

export type PostResult =
  | { ok: true; post: BoardPost }
  | { ok: false; reason: string }

export async function createBoardPost(opts: {
  room: string
  category: BoardCategory
  content: string
  display_name?: string | null
}): Promise<PostResult> {
  const vid = getOrCreateVisitorId()
  if (!progressToken) return { ok: false, reason: 'no_token' }
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}?visitor_id=${encodeURIComponent(vid)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Progress-Token': progressToken
      },
      body: JSON.stringify({
        room: opts.room,
        category: opts.category,
        content: opts.content.trim().slice(0, 200),
        display_name: opts.display_name ?? null
      })
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body?.ok) return { ok: true, post: body.post as BoardPost }
    return { ok: false, reason: body?.reason || `http_${res.status}` }
  } catch (e) { return { ok: false, reason: 'network' } }
}

export async function deleteBoardPost(id: number): Promise<boolean> {
  const vid = getOrCreateVisitorId()
  if (!progressToken) return false
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}/${id}?visitor_id=${encodeURIComponent(vid)}`, {
      method: 'DELETE',
      headers: { 'X-Progress-Token': progressToken }
    })
    const body = await res.json().catch(() => ({}))
    return res.ok && !!body?.ok
  } catch { return false }
}
