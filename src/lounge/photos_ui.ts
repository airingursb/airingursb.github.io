// V10.5 — Photo album panel. Grid of thumbnails; click to enlarge.

import { listPhotos, deletePhoto } from './photos'

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

function render() {
  if (!gridEl || !countEl || !emptyEl) return
  const photos = listPhotos()
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
    const del = document.createElement('button')
    del.className = 'ph-del'; del.type = 'button'; del.textContent = '✕'
    del.title = 'Delete this photo'
    del.addEventListener('click', () => {
      if (window.confirm('Delete this photo?')) { deletePhoto(p.id); render() }
    })
    card.appendChild(img); card.appendChild(meta); card.appendChild(del)
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
