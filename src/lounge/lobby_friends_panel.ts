// Lobby-only floating panel surfacing the V4.2 player-homes feature.
// Mounted lazily on first 'lobby-friends-show' event, hidden via
// 'lobby-friends-hide'. Shows up to 3 friends + a Visit button each.
// If no friends → educational hint nudging the player to meet people.
// Visit clicks dispatch 'lobby-visit-home' which RoomScene listens for.

import { trackEvent } from './umami'

type Friend = { vid: string; name: string; level: number }

let rootEl: HTMLElement | null = null
let listEl: HTMLElement | null = null
let dismissed = false   // session-local; if user closes, don't re-show this scene

function ensure(): HTMLElement {
  if (rootEl) return rootEl
  rootEl = document.createElement('aside')
  rootEl.id = 'lobby-friends-panel'
  rootEl.className = 'lobby-friends-panel'
  rootEl.hidden = true
  rootEl.innerHTML = `
    <div class="lfp-card">
      <header class="lfp-header">
        <span class="lfp-title">🏠 Visit a friend</span>
        <button type="button" class="lfp-close" aria-label="Close">×</button>
      </header>
      <ul class="lfp-list"></ul>
    </div>
  `
  document.body.appendChild(rootEl)
  listEl = rootEl.querySelector('.lfp-list')
  rootEl.querySelector('.lfp-close')!.addEventListener('click', hide)
  return rootEl
}

function render(friends: Friend[]) {
  if (!listEl) return
  listEl.innerHTML = ''
  if (friends.length === 0) {
    const li = document.createElement('li')
    li.className = 'lfp-empty'
    li.textContent = '想串门吗？先在同一个房间和别人待一会儿就会自动加好友。'
    listEl.appendChild(li)
    return
  }
  // Cap at 3 so the panel stays small. Prefer higher friendship levels first.
  const top = [...friends].sort((a, b) => b.level - a.level).slice(0, 3)
  for (const f of top) {
    const li = document.createElement('li')
    li.className = 'lfp-item'
    const heartGlyph = '❤'.repeat(Math.max(0, Math.min(3, f.level)))
    li.innerHTML = `
      <div class="lfp-friend">
        <span class="lfp-name">${escapeHtml(f.name)}</span>
        <span class="lfp-hearts">${heartGlyph}</span>
      </div>
      <button type="button" class="lfp-visit-btn" data-vid="${escapeHtml(f.vid)}">访</button>
    `
    li.querySelector('.lfp-visit-btn')!.addEventListener('click', () => {
      trackEvent('nook-lobby-visit-home', { vid_prefix: f.vid.slice(0, 4) })
      window.dispatchEvent(new CustomEvent('lobby-visit-home', { detail: { vid: f.vid } }))
      hide()
    })
    listEl.appendChild(li)
  }
}

function show(friends: Friend[]) {
  if (dismissed) return
  const el = ensure()
  render(friends)
  el.hidden = false
  trackEvent('nook-lobby-friends-shown', { count: friends.length })
}

function hide() {
  dismissed = true
  if (rootEl) rootEl.hidden = true
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string))
}

// ── Event-based wiring so RoomScene doesn't import this module directly ──
window.addEventListener('lobby-friends-show', ((e: CustomEvent) => {
  const friends = Array.isArray(e.detail?.friends) ? e.detail.friends : []
  show(friends as Friend[])
}) as EventListener)

window.addEventListener('lobby-friends-hide', hide)

// Reset dismissed flag when player leaves lobby — so next lobby visit can
// re-show the panel if they didn't act on it last time.
window.addEventListener('lobby-friends-reset', () => { dismissed = false })
