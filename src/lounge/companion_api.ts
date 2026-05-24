// V3.0-B — AI companion (觉) API client.
//
// Talks to chat.ursb.me /api/ai-companion/* endpoints. SSE streaming for
// chat replies, JSON for usage counter.

const API_BASE = 'https://chat.ursb.me'

export type CompanionUsage = {
  sent: number
  cap: number
  remaining: number
  resets_at: string
}

export type CompanionEvent =
  | { type: 'delta'; text: string; npc_id?: string }
  | { type: 'done'; usage: CompanionUsage }
  | { type: 'error'; code: string; message: string; npc_id?: string }
  // V3.0-X · E — group-chat protocol additions
  | { type: 'speaker_start'; npc_id: string; npc_name: string }
  | { type: 'speaker_end'; npc_id: string }
  | { type: 'all_done'; usage: CompanionUsage }

/** Fetch current daily usage. Returns null if not authenticated. */
export async function getUsage(): Promise<CompanionUsage | null> {
  try {
    const res = await fetch(`${API_BASE}/api/ai-companion/usage`, { credentials: 'include' })
    if (res.status === 401) return null
    if (!res.ok) return null
    return await res.json() as CompanionUsage
  } catch {
    return null
  }
}

/** Fetch guest-tier usage (no auth required). Returns sent/cap/remaining. */
export async function getGuestUsage(): Promise<CompanionUsage | null> {
  try {
    const res = await fetch(`${API_BASE}/api/ai-companion/guest-usage`, { credentials: 'include' })
    if (!res.ok) return null
    return await res.json() as CompanionUsage
  } catch {
    return null
  }
}

/** Send a guest-tier message (no auth). 5 msgs/day cap, no memory, no tools. */
export async function sendGuestMessage(
  npcId: string,
  text: string,
  hints: { time_phase?: string; weather?: string; current_room?: string; language?: string },
  onEvent: (e: CompanionEvent) => void
): Promise<void> {
  return _streamChatRequest('/api/ai-companion/guest-chat', { npc_id: npcId, message: text, ...hints }, onEvent)
}

/**
 * Send a message + stream the reply. Calls `onEvent` for each SSE chunk.
 * The promise resolves when the stream closes.
 *
 * On HTTP 429 (daily cap), an error event is yielded with the usage info
 * embedded in the message body — caller can update counter.
 */
export async function sendMessage(
  npcId: string,
  text: string,
  hints: { time_phase?: string; weather?: string; current_room?: string; language?: string },
  onEvent: (e: CompanionEvent) => void
): Promise<void> {
  return _streamChatRequest('/api/ai-companion/chat', { npc_id: npcId, message: text, ...hints }, onEvent)
}

/** V3.0-X · E — group chat: 2+ NPCs reply serially, each seeing the prior. */
export async function sendGroupMessage(
  npcIds: string[],
  text: string,
  hints: { time_phase?: string; weather?: string; current_room?: string; language?: string },
  onEvent: (e: CompanionEvent) => void
): Promise<void> {
  return _streamChatRequest('/api/ai-companion/group-chat', { npc_ids: npcIds, message: text, ...hints }, onEvent)
}

async function _streamChatRequest(
  path: string,
  body: Record<string, unknown>,
  onEvent: (e: CompanionEvent) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 429) {
    const body = await res.json().catch(() => ({})) as any
    onEvent({ type: 'error', code: 'DAILY_CAP_REACHED', message: body?.message ?? '今天聊够了' })
    if (body?.usage) onEvent({ type: 'done', usage: body.usage })
    return
  }
  if (res.status === 401) {
    onEvent({ type: 'error', code: 'NOT_AUTHENTICATED', message: '请先登录' })
    return
  }
  if (!res.ok) {
    onEvent({ type: 'error', code: 'HTTP_ERROR', message: `请求失败 (${res.status})` })
    return
  }

  // Parse SSE stream
  const reader = res.body?.getReader()
  if (!reader) {
    onEvent({ type: 'error', code: 'NO_STREAM', message: '响应流不可用' })
    return
  }
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const t = line.trim()
        if (!t || !t.startsWith('data:')) continue
        const jsonStr = t.slice(5).trim()
        if (!jsonStr) continue
        try {
          const parsed = JSON.parse(jsonStr) as CompanionEvent
          onEvent(parsed)
        } catch {
          // Skip malformed line
        }
      }
    }
  } catch (err) {
    onEvent({ type: 'error', code: 'STREAM_ERROR', message: String((err as Error)?.message ?? err) })
  }
}
