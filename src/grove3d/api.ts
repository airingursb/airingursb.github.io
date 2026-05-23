// SHU-733 · Bridge to existing /api/ai-companion/chat with 3D context hint.
//
// We don't reinvent the chat backend — same companion-service.js, same
// memory + facts + episodes. Just inject world_3d so Mochi knows he's
// sitting in a moonlit grove next to the user.

const API_BASE = 'https://chat.ursb.me'

export async function sendChat(message: string, opts: { world3d?: string } = {}) {
  const res = await fetch(`${API_BASE}/api/ai-companion/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      npc_id: 'npc_jue',
      message,
      world_3d: opts.world3d ?? 'mochi_grove',
    }),
  })
  if (!res.ok) throw new Error(`chat failed: ${res.status}`)
  if (!res.body) throw new Error('no body')

  // SSE-like stream. We just want full text — assemble deltas.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let assembled = ''
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      try {
        const parsed = JSON.parse(t.slice(5).trim())
        if (parsed.type === 'delta' && typeof parsed.text === 'string') {
          assembled += parsed.text
        }
      } catch {}
    }
  }
  return assembled
}

export async function acceptQuest(slug: string) {
  return fetch(`${API_BASE}/api/ai-companion/quests/${slug}/accept`, {
    method: 'POST',
    credentials: 'include',
  }).catch((err) => console.warn('acceptQuest failed:', err))
}

export async function completeQuest(slug: string) {
  return fetch(`${API_BASE}/api/ai-companion/quests/${slug}/complete`, {
    method: 'POST',
    credentials: 'include',
  }).catch((err) => console.warn('completeQuest failed:', err))
}
