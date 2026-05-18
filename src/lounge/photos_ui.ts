// V10.5 — Photo album panel. Grid of thumbnails; click to enlarge.
// V20.0 — each photo gets a 📌 pin toggle. Pinning copies the photo
// into the profile's pinned_photos array (max 3) which then surfaces
// on the profile card peers see.

import { listPhotos, deletePhoto, type Photo } from './photos'
import { getPinnedPhotos, setPinnedPhotos, type PinnedPhoto } from './profile'
import { sendProfile } from './net'

let panelEl: HTMLElement | null = null
let gridEl: HTMLElement | null = null
let countEl: HTMLElement | null = null
let emptyEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null
let lightboxEl: HTMLElement | null = null

function ensure(): boolean {
  if (panelEl) return true
  panelEl    = document.getElementById('lounge-photos-panel')
  gridEl     = document.getElementById('lounge-photos-grid')
  countEl    = document.getElementById('lounge-photos-count')
  emptyEl    = document.getElementById('lounge-photos-empty')
  closeBtnEl = document.getElementById('lounge-photos-close')
  openBtnEl  = document.getElementById('lounge-photos-btn')
  if (!panelEl || !gridEl) return false
  closeBtnEl?.addEventListener('click', () => hidePanel())
  openBtnEl?.addEventListener('click', () => togglePanel())
  return true
}

export function togglePanel() {
  if (!ensure() || !panelEl) return
  if (panelEl.hidden) showPanel(); else hidePanel()
}
export function hidePanel() {
  if (!ensure() || !panelEl) return
  panelEl.hidden = true
  if (lightboxEl) { lightboxEl.remove(); lightboxEl = null }
}

export function showPanel() {
  if (!ensure() || !panelEl || !gridEl) return
  panelEl.hidden = false
  render()
}

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// V20.0 — downscale a photo dataUrl to a small profile thumbnail. Photos
// are already 240×160; we shrink to 120×80 PNG so 3 pinned thumbnails stay
// well under the WS frame budget. Returns a promise (image load is async).
function toPinnedThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 120; c.height = 80
      const ctx = c.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('thumb load failed'))
    img.src = dataUrl
  })
}

async function togglePin(p: Photo) {
  const pinned = getPinnedPhotos()
  const idx = pinned.findIndex(x => x.id === p.id)
  let next: PinnedPhoto[]
  if (idx >= 0) {
    next = pinned.filter(x => x.id !== p.id)
  } else {
    let dataUrl: string
    try { dataUrl = await toPinnedThumbnail(p.dataUrl) }
    catch { dataUrl = p.dataUrl }   // fallback to full size if downscale fails
    const entry: PinnedPhoto = { id: p.id, dataUrl, roomLabel: p.roomLabel, takenAt: p.takenAt }
    // FIFO when already at 3 — same pattern as pinned achievements.
    if (pinned.length >= 3) next = [...pinned.slice(1), entry]
    else next = [...pinned, entry]
  }
  setPinnedPhotos(next)
  sendProfile({ pinned_photos: next })
  render()
}

function render() {
  if (!gridEl || !countEl || !emptyEl) return
  const photos = listPhotos()
  const pinnedIds = new Set(getPinnedPhotos().map(p => p.id))
  countEl.textContent = String(photos.length)
  gridEl.innerHTML = ''
  emptyEl.hidden = photos.length > 0
  for (const p of photos) {
    const card = document.createElement('div')
    card.className = 'ph-card'
    const img = document.createElement('img')
    img.className = 'ph-thumb'
    img.src = p.dataUrl
    img.alt = `${p.roomLabel} · ${fmtDate(p.takenAt)}`
    img.addEventListener('click', () => openLightbox(p.dataUrl, p.roomLabel, fmtDate(p.takenAt)))
    const meta = document.createElement('div')
    meta.className = 'ph-meta'
    // V14.6 — group photo: append member count
    const memberBadge = p.members && p.members.length > 0 ? ` · 👥 ${p.members.length}` : ''
    meta.textContent = `${p.roomLabel} · ${fmtDate(p.takenAt)}${memberBadge}`
    if (p.members && p.members.length > 0) meta.title = `with ${p.members.join(', ')}`
    // V20.0 — pin toggle
    const pin = document.createElement('button')
    pin.className = 'ph-pin' + (pinnedIds.has(p.id) ? ' is-pinned' : '')
    pin.type = 'button'
    pin.textContent = pinnedIds.has(p.id) ? '📌' : '📍'
    pin.title = pinnedIds.has(p.id) ? 'Unpin from profile' : 'Pin to profile (max 3)'
    pin.addEventListener('click', (e) => { e.stopPropagation(); void togglePin(p) })
    const del = document.createElement('button')
    del.className = 'ph-del'; del.type = 'button'; del.textContent = '✕'
    del.title = 'Delete this photo'
    del.addEventListener('click', () => {
      if (window.confirm('Delete this photo?')) {
        // V20.0 — also remove from pinned set so we don't sync a broken id
        const stillPinned = getPinnedPhotos().filter(x => x.id !== p.id)
        if (stillPinned.length !== getPinnedPhotos().length) {
          setPinnedPhotos(stillPinned)
          sendProfile({ pinned_photos: stillPinned })
        }
        deletePhoto(p.id)
        render()
      }
    })
    card.appendChild(img); card.appendChild(meta); card.appendChild(pin); card.appendChild(del)
    gridEl.appendChild(card)
  }
}

function openLightbox(dataUrl: string, roomLabel: string, dateStr: string) {
  if (lightboxEl) { lightboxEl.remove(); lightboxEl = null }
  const box = document.createElement('div')
  box.className = 'ph-lightbox'
  const img = document.createElement('img'); img.src = dataUrl
  const cap = document.createElement('div'); cap.className = 'ph-cap'
  cap.textContent = `${roomLabel} · ${dateStr}`
  box.appendChild(img); box.appendChild(cap)
  box.addEventListener('click', () => { box.remove(); lightboxEl = null })
  document.body.appendChild(box)
  lightboxEl = box
}

if (typeof document !== 'undefined') {
  const init = () => ensure()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
