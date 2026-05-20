// V3.0-A: Auth API client.
//
// Talks to chat.ursb.me /auth/* and /api/account/* endpoints. Manages
// the in-memory `currentAccount` state and notifies subscribers when it
// changes (UI re-renders, gated features unlock, etc.).
//
// Cookies (sb_access_token, sb_refresh_token) are httpOnly and managed
// entirely by blog-api — we just send credentials:include with each call.

import { getOrCreateVisitorId } from './config'

const API_BASE = 'https://chat.ursb.me'

export type Account = {
  id: string
  display_name: string
  email: string
  blog_subscriber_id: string | null
  created_at: string
}

export type ClaimResult = {
  claimed: boolean
  visitor_id?: string
  display_name?: string
  counts?: {
    inventory: number
    decorations: number
    friendships: number
    letters: number
    dms: number
    gifts: number
    has_progress: boolean
  }
  reason?: string
}

let _currentAccount: Account | null = null
let _initialized = false
const _listeners: Array<(account: Account | null) => void> = []

export function onAccountChange(fn: (account: Account | null) => void): () => void {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i >= 0) _listeners.splice(i, 1)
  }
}

function notify() {
  for (const fn of _listeners) {
    try { fn(_currentAccount) } catch {}
  }
}

export function getCurrentAccount(): Account | null {
  return _currentAccount
}

export function isLoggedIn(): boolean {
  return _currentAccount !== null
}

// ── Bootstrap — call once on lounge boot ───────────────────────────────────

export async function initAuth(): Promise<Account | null> {
  if (_initialized) return _currentAccount
  _initialized = true
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
    if (res.ok) {
      const body = await res.json() as { account: Account | null }
      _currentAccount = body.account
    }
  } catch {
    _currentAccount = null
  }
  notify()
  // V3.0-A.5 — if we're signed in but this device's visitor isn't linked to
  // the account yet, attempt a silent claim. Safe because:
  //   • visitor not in DB yet → RPC returns visitor_not_found, no-op
  //   • already linked to this account → re-claim is idempotent no-op
  //   • linked to a different account → RPC returns already_claimed,
  //     we ignore silently (DON'T show the claim modal — that's reserved
  //     for the post-callback cookie-driven flow where user explicitly
  //     just signed in)
  if (_currentAccount) {
    try {
      const vid = getOrCreateVisitorId()
      // fire-and-forget; failures don't break the boot
      void claimVisitor(vid).catch(() => null)
    } catch {}
  }
  return _currentAccount
}

// ── Login entry points ─────────────────────────────────────────────────────

/** Initiate Google OAuth — redirects browser, doesn't return. */
export function startGoogleLogin(opts: { blogSubscribe?: boolean; next?: string } = {}): void {
  const params = new URLSearchParams({
    next: opts.next ?? location.pathname,
    blog: opts.blogSubscribe ? '1' : '0',
    visitor_id: getOrCreateVisitorId(),
  })
  location.href = `${API_BASE}/auth/google/start?${params}`
}

/** Initiate GitHub OAuth — redirects browser. */
export function startGithubLogin(opts: { blogSubscribe?: boolean; next?: string } = {}): void {
  const params = new URLSearchParams({
    next: opts.next ?? location.pathname,
    blog: opts.blogSubscribe ? '1' : '0',
    visitor_id: getOrCreateVisitorId(),
  })
  location.href = `${API_BASE}/auth/github/start?${params}`
}

/** Send magic link email. Returns { sent: true } regardless of email existence. */
export async function requestMagicLink(opts: {
  email: string
  blogSubscribe?: boolean
  next?: string
}): Promise<{ sent: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/magic/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: opts.email,
        blog_subscribe: !!opts.blogSubscribe,
        next: opts.next ?? location.pathname,
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

// ── Session management ─────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // ignore — local state still cleared
  }
  _currentAccount = null
  notify()
}

// ── Claim flow (after callback returns and `nook_claim_result` cookie set) ─

/** Read the one-time claim-result cookie set by blog-api after successful claim. */
export function readClaimResultCookie(): ClaimResult | null {
  const match = document.cookie.match(/(?:^|;)\s*nook_claim_result=([^;]+)/)
  if (!match) return null
  try {
    const decoded = decodeURIComponent(match[1])
    return JSON.parse(decoded) as ClaimResult
  } catch {
    return null
  }
}

/** Clear the claim-result cookie after the user has seen the summary. */
export function clearClaimResultCookie(): void {
  document.cookie = 'nook_claim_result=; Max-Age=0; Path=/; SameSite=Lax'
}

/** Manual claim — for users who somehow got logged in without the cookie. */
export async function claimVisitor(visitorId: string): Promise<ClaimResult> {
  const res = await fetch(`${API_BASE}/api/account/claim`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitor_id: visitorId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    return { claimed: false, reason: body.error ?? `http_${res.status}` }
  }
  return await res.json() as ClaimResult
}

/** User chose "start fresh" — abandon anon visitor server-side and rotate localStorage. */
export async function abandonAnon(): Promise<void> {
  const visitorId = getOrCreateVisitorId()
  try {
    await fetch(`${API_BASE}/api/account/abandon-anon`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId }),
    })
  } catch {}
  // Rotate localStorage so future actions create a fresh visitor row tied to the account
  try {
    localStorage.setItem('lounge_visitor_id', crypto.randomUUID())
  } catch {}
}

// ── Account settings ───────────────────────────────────────────────────────

export async function updateDisplayName(displayName: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/account/name`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    return { ok: false, error: body.error }
  }
  const body = await res.json() as { display_name: string }
  if (_currentAccount) _currentAccount.display_name = body.display_name
  notify()
  return { ok: true }
}

export async function setBlogSubscription(subscribed: boolean): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/account/subscribe`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribed }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    return { ok: false, error: body.error }
  }
  return { ok: true }
}

export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/account`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    return { ok: false, error: body.error }
  }
  _currentAccount = null
  notify()
  return { ok: true }
}
