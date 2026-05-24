// Minimal /world/ account client — talks directly to chat.ursb.me /auth/*
// endpoints. NOT importing from src/lounge/auth.ts to keep the /world/
// and /nook/ agent boundaries clean (per onboarding-nook-agent.md).
//
// Visitor ID key (`lounge_visitor_id`) IS shared with /nook/ so the same
// person reads as the same visitor across both surfaces. Session cookies
// (sb_access_token, sb_refresh_token) are also shared — they're set by
// blog-api at chat.ursb.me and forwarded by the browser to any subdomain
// request, so logging in at /nook/ → /world/ sees you logged in too.

const API_BASE = 'https://chat.ursb.me'
const VISITOR_KEY = 'lounge_visitor_id'

export interface WorldAccount {
  id: string
  display_name: string
  email: string
  blog_subscriber_id: string | null
  created_at: string
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return `tmp_${Math.random().toString(36).slice(2, 10)}`
  }
}

/** Fetch current session if cookies are present. Returns null if logged out. */
export async function fetchCurrentAccount(): Promise<WorldAccount | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json().catch(() => ({})) as { account?: WorldAccount }
    return body.account ?? null
  } catch {
    return null
  }
}

export function startGoogleLogin(next: string = '/world/'): void {
  const params = new URLSearchParams({
    next,
    blog: '0',
    visitor_id: getOrCreateVisitorId(),
  })
  location.href = `${API_BASE}/auth/google/start?${params}`
}

export function startGithubLogin(next: string = '/world/'): void {
  const params = new URLSearchParams({
    next,
    blog: '0',
    visitor_id: getOrCreateVisitorId(),
  })
  location.href = `${API_BASE}/auth/github/start?${params}`
}

export async function requestMagicLink(email: string, next: string = '/world/'): Promise<{ sent: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/magic/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        blog_subscribe: false,
        next,
        visitor_id: getOrCreateVisitorId(),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      return { sent: false, error: body.error ?? `http_${res.status}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: String((err as Error)?.message ?? err) }
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {}
}
