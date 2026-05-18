// V12.1 — Community board panel.
//
// Single panel with a category dropdown + textarea + Post button at the
// top, then a scrolling list of recent posts for the current room. Author
// can delete their own. Posts auto-refresh on room change (RoomScene fires
// setBoardRoom() each scene boot).

import { fetchBoardPosts, createBoardPost, deleteBoardPost, type BoardPost, type BoardCategory } from './board'
import { getOrCreateVisitorId } from './config'

let panelEl: HTMLElement | null = null
let listEl: HTMLElement | null = null
let formCatEl: HTMLSelectElement | null = null
let formTextEl: HTMLTextAreaElement | null = null
let formSubmitEl: HTMLButtonElement | null = null
let formCountEl: HTMLElement | null = null
let roomLabelEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let badgeEl: HTMLElement | null = null

let currentRoom = ''
let currentRoomLabel = ''
let displayName: string | null = null

const CATEGORY_EMOJI: Record<BoardCategory, string> = {
  note:     '📝',
  event:    '📅',
  question: '❓',
  shout:    '📣'
}

function ensure(): boolean {
  if (panelEl) return true
  panelEl       = document.getElementById('lounge-board-panel')
  listEl        = document.getElementById('lounge-board-list')
  formCatEl     = document.getElementById('lounge-board-cat')    as HTMLSelectElement | null
  formTextEl    = document.getElementById('lounge-board-text')   as HTMLTextAreaElement | null
  formSubmitEl  = document.getElementById('lounge-board-submit') as HTMLButtonElement | null
  formCountEl   = document.getElementById('lounge-board-count')
  roomLabelEl   = document.getElementById('lounge-board-room')
  openBtnEl     = document.getElementById('lounge-board-btn')
  closeBtnEl    = document.getElementById('lounge-board-close')
  badgeEl       = document.getElementById('lounge-board-badge')
  if (!panelEl || !listEl) return false
  openBtnEl?.addEventListener('click', () => toggle())
  closeBtnEl?.addEventListener('click', () => hide())
  formTextEl?.addEventListener('input', updateCount)
  formSubmitEl?.addEventListener('click', onSubmit)
  return true
}

export function toggle() {
  if (!ensure() || !panelEl) return
  if (panelEl.hidden) show(); else hide()
}
export function hide() { if (panelEl) panelEl.hidden = true }
export function show() {
  if (!ensure() || !panelEl) return
  panelEl.hidden = false
  refresh()
}

/** Called by RoomScene each scene boot to bind the board to the current room. */
export function setBoardRoom(roomId: string, label: string) {
  if (!ensure()) return
  currentRoom = roomId
  currentRoomLabel = label
  if (roomLabelEl) roomLabelEl.textContent = label
  // Background refresh so the badge updates even without the panel open
  refresh()
}

/** Bind the player's display name so it appears as the post author. */
export function setBoardDisplayName(name: string | null) {
  displayName = name
}

function updateCount() {
  if (!formTextEl || !formCountEl) return
  const n = formTextEl.value.length
  formCountEl.textContent = `${n} / 200`
  formCountEl.style.color = n > 200 ? '#ff6080' : ''
}

async function onSubmit() {
  if (!formCatEl || !formTextEl || !formSubmitEl) return
  if (!currentRoom) return
  const content = formTextEl.value.trim()
  if (!content) return
  formSubmitEl.disabled = true
  const r = await createBoardPost({
    room: currentRoom,
    category: formCatEl.value as BoardCategory,
    content,
    display_name: displayName
  })
  formSubmitEl.disabled = false
  if (r.ok) {
    formTextEl.value = ''
    updateCount()
    refresh()
  } else {
    const msg: Record<string, string> = {
      rate_limited: 'Slow down — 3 posts/hour max.',
      bad_content: 'Content too long or empty.',
      no_token: 'Hold on — still connecting.',
      bad_room: 'No room context yet.'
    }
    alert(msg[r.reason] ?? `Post failed (${r.reason})`)
  }
}

async function refresh() {
  if (!listEl || !currentRoom) return
  const posts = await fetchBoardPosts(currentRoom)
  // Badge: count posts whose author isn't the local visitor
  const myVid = getOrCreateVisitorId()
  const othersCount = posts.filter(p => p.visitor_id !== myVid).length
  if (badgeEl) {
    if (othersCount > 0) { badgeEl.textContent = String(othersCount); badgeEl.hidden = false }
    else badgeEl.hidden = true
  }
  if (!panelEl || panelEl.hidden) return
  listEl.innerHTML = ''
  if (posts.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'bd-empty'
    empty.textContent = 'No posts pinned to this room yet. Be the first.'
    listEl.appendChild(empty)
    return
  }
  for (const p of posts) {
    listEl.appendChild(renderPost(p, myVid))
  }
}

function renderPost(p: BoardPost, myVid: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'bd-row'
  const head = document.createElement('div'); head.className = 'bd-head'
  head.innerHTML = `
    <span class="bd-emoji">${CATEGORY_EMOJI[p.category]}</span>
    <span class="bd-name">${escapeHtml(p.display_name ?? 'anonymous')}</span>
    <span class="bd-time">${shortAgo(p.created_at)}</span>
  `
  const body = document.createElement('div'); body.className = 'bd-body'
  body.textContent = p.content
  row.appendChild(head); row.appendChild(body)
  if (p.visitor_id === myVid) {
    const del = document.createElement('button')
    del.type = 'button'; del.className = 'bd-del'; del.textContent = '✕'
    del.title = 'Delete your post'
    del.addEventListener('click', async () => {
      if (!window.confirm('Delete this post?')) return
      const ok = await deleteBoardPost(p.id)
      if (ok) refresh()
    })
    row.appendChild(del)
  }
  return row
}

function shortAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000)       return 'just now'
  if (ms < 3600_000)     return `${Math.floor(ms / 60_000)}m`
  if (ms < 86400_000)    return `${Math.floor(ms / 3600_000)}h`
  return `${Math.floor(ms / 86400_000)}d`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] as string))
}

if (typeof document !== 'undefined') {
  const init = () => ensure()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
