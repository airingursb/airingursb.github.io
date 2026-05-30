// Sticky chat continuation across magic-link auth.
//
// Problem: guest hits GUEST_CAP_REACHED soft-wall → clicks 登录 → email →
// link opens in a NEW tab → auth callback → /nook reloads with cookies set.
// Without intervention they land back on the lobby with no idea where they
// were. This module persists "I was mid-chat with Airing" across the gap.
//
// Why localStorage (not sessionStorage): magic-link email links open in a
// new tab, so per-tab session storage doesn't survive. TTL keeps stale
// snapshots from haunting unrelated visits a day later.

const KEY = 'nook:sticky-chat:v1'
const TTL_MS = 30 * 60 * 1000  // 30 min — longer than any normal email-click latency

export type StickyChatBubble = { role: 'user' | 'assistant'; text: string; speaker?: string }

export type StickyChatSnapshot = {
  npc_id: string
  npc_name: string
  npc_where?: string
  hints?: Record<string, unknown>
  bubbles: StickyChatBubble[]
  savedAt: number
}

export function saveStickyChat(snap: Omit<StickyChatSnapshot, 'savedAt'>): void {
  try {
    const payload: StickyChatSnapshot = { ...snap, savedAt: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // localStorage can throw in private mode / quota — silent fail is fine
  }
}

export function loadStickyChat(): StickyChatSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const snap = JSON.parse(raw) as StickyChatSnapshot
    if (!snap || typeof snap.savedAt !== 'number') return null
    if (Date.now() - snap.savedAt > TTL_MS) {
      localStorage.removeItem(KEY)
      return null
    }
    return snap
  } catch {
    return null
  }
}

export function clearStickyChat(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
