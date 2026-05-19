// V3.0-A: Auth UI — login overlay, claim modal, gated-feature prompt.
//
// Lazy-loaded from ui.ts. All elements live in #lounge-root and use the
// wooden game styling that matches the V23.34 toolbar (parchment fill,
// dark outline, drop shadow). No new images — pure CSS + text.

import { playSfx } from './audio'
import {
  startGoogleLogin, startGithubLogin, requestMagicLink,
  readClaimResultCookie, clearClaimResultCookie, abandonAnon,
  isLoggedIn,
} from './auth'
import type { ClaimResult } from './auth'

// ── Login overlay ──────────────────────────────────────────────────────────

let loginOverlay: HTMLElement | null = null
let loginInitialized = false

function ensureLoginOverlay() {
  if (loginOverlay) return loginOverlay
  loginOverlay = document.getElementById('nook-auth-overlay')
  if (loginOverlay && !loginInitialized) {
    initLoginHandlers(loginOverlay)
    loginInitialized = true
  }
  return loginOverlay
}

function initLoginHandlers(root: HTMLElement) {
  // Close on backdrop click or close button
  root.querySelector('.auth-backdrop')?.addEventListener('click', () => hideLogin())
  root.querySelector('#nook-auth-close')?.addEventListener('click', () => hideLogin())

  // Google
  root.querySelector('#nook-auth-google')?.addEventListener('click', () => {
    const blogChk = root.querySelector<HTMLInputElement>('#nook-auth-blog')
    playSfx('click')
    startGoogleLogin({ blogSubscribe: !!blogChk?.checked })
  })

  // GitHub
  root.querySelector('#nook-auth-github')?.addEventListener('click', () => {
    const blogChk = root.querySelector<HTMLInputElement>('#nook-auth-blog')
    playSfx('click')
    startGithubLogin({ blogSubscribe: !!blogChk?.checked })
  })

  // Magic link form
  const form = root.querySelector<HTMLFormElement>('#nook-auth-magic-form')
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const emailInput = root.querySelector<HTMLInputElement>('#nook-auth-email')
    const blogChk = root.querySelector<HTMLInputElement>('#nook-auth-blog')
    const submitBtn = root.querySelector<HTMLButtonElement>('#nook-auth-magic-submit')
    const status = root.querySelector<HTMLElement>('#nook-auth-status')
    if (!emailInput || !submitBtn || !status) return

    const email = emailInput.value.trim()
    if (!email) return

    submitBtn.disabled = true
    submitBtn.textContent = 'Sending...'
    status.textContent = ''

    const result = await requestMagicLink({
      email,
      blogSubscribe: !!blogChk?.checked,
    })

    submitBtn.disabled = false
    submitBtn.textContent = 'Send me a magic link'

    if (result.sent) {
      status.textContent = `✓ If ${email} is valid, a link is on its way. Check your inbox.`
      status.style.color = '#5a7c4e'
      emailInput.value = ''
    } else {
      status.textContent = `Couldn't send — ${result.error ?? 'try again later'}`
      status.style.color = '#aa3030'
    }
  })

  // Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root && !root.hidden) hideLogin()
  })
}

export function showLogin() {
  if (isLoggedIn()) return // no-op if already logged in
  const root = ensureLoginOverlay()
  if (!root) return
  root.hidden = false
  playSfx('menu_open')
  // Focus email field
  setTimeout(() => {
    root.querySelector<HTMLInputElement>('#nook-auth-email')?.focus()
  }, 50)
}

export function hideLogin() {
  const root = ensureLoginOverlay()
  if (!root || root.hidden) return
  root.hidden = true
  playSfx('menu_close')
}

// ── Claim modal — shown once after callback if blog-api set cookie ─────────

let claimModal: HTMLElement | null = null
let claimInitialized = false

function ensureClaimModal() {
  if (claimModal) return claimModal
  claimModal = document.getElementById('nook-claim-modal')
  if (claimModal && !claimInitialized) {
    initClaimHandlers(claimModal)
    claimInitialized = true
  }
  return claimModal
}

function initClaimHandlers(root: HTMLElement) {
  root.querySelector('#nook-claim-keep')?.addEventListener('click', () => {
    // "Claim into my account" — the claim already happened server-side
    // (during the auth callback). This button just acknowledges the modal.
    clearClaimResultCookie()
    hideClaim()
    playSfx('click')
    // Force reload so the game re-fetches state under the new identity
    setTimeout(() => location.reload(), 300)
  })

  root.querySelector('#nook-claim-discard')?.addEventListener('click', async () => {
    // "Start fresh" — abandon anon, rotate visitor_id, reload
    await abandonAnon()
    clearClaimResultCookie()
    hideClaim()
    playSfx('click')
    setTimeout(() => location.reload(), 300)
  })
}

export function maybeShowClaim() {
  const result = readClaimResultCookie()
  if (!result || !result.claimed) return
  const root = ensureClaimModal()
  if (!root) return

  // Populate counts
  const c = result.counts
  const setText = (selector: string, value: string) => {
    const el = root.querySelector<HTMLElement>(selector)
    if (el) el.textContent = value
  }
  setText('#nook-claim-name',        result.display_name ?? 'visitor')
  setText('#nook-claim-inventory',   String(c?.inventory ?? 0))
  setText('#nook-claim-decorations', String(c?.decorations ?? 0))
  setText('#nook-claim-friendships', String(c?.friendships ?? 0))
  setText('#nook-claim-letters',     String(c?.letters ?? 0))
  setText('#nook-claim-dms',         String(c?.dms ?? 0))
  setText('#nook-claim-gifts',       String(c?.gifts ?? 0))

  root.hidden = false
  playSfx('menu_open')
}

export function hideClaim() {
  const root = ensureClaimModal()
  if (!root || root.hidden) return
  root.hidden = true
  playSfx('menu_close')
}

// ── Gated-feature soft prompt ──────────────────────────────────────────────

let gatedPrompt: HTMLElement | null = null
let gatedInitialized = false

function ensureGatedPrompt() {
  if (gatedPrompt) return gatedPrompt
  gatedPrompt = document.getElementById('nook-gated-prompt')
  if (gatedPrompt && !gatedInitialized) {
    gatedPrompt.querySelector('#nook-gated-signin')?.addEventListener('click', () => {
      hideGated()
      showLogin()
    })
    gatedPrompt.querySelector('#nook-gated-cancel')?.addEventListener('click', () => hideGated())
    gatedPrompt.querySelector('.auth-backdrop')?.addEventListener('click', () => hideGated())
    gatedInitialized = true
  }
  return gatedPrompt
}

/**
 * Show "sign in to use X" prompt. If user already signed in, no-op.
 * @returns true if the user is signed in (caller can proceed), false if prompted
 */
export function requireLogin(feature: string): boolean {
  if (isLoggedIn()) return true
  const root = ensureGatedPrompt()
  if (!root) return false
  const label = root.querySelector('#nook-gated-feature')
  if (label) label.textContent = feature
  root.hidden = false
  playSfx('menu_open')
  return false
}

export function hideGated() {
  const root = ensureGatedPrompt()
  if (!root || root.hidden) return
  root.hidden = true
  playSfx('menu_close')
}
