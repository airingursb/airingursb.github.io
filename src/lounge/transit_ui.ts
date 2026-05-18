// V13.5 — Transit hub. A 🚇 button opens a panel of 6 zone shortcuts
// that scene.restart the player directly there. Cuts the multi-portal
// walks for power players.
//
// Cost: 1 energy per use (so it doesn't trivialize the world). Daily-
// reset shows the same as walking distance would have cost in energy.

import type { RoomId } from './config'

export type TransitZone = { id: RoomId; emoji: string; label: string; cost: number }

export const ZONES: TransitZone[] = [
  { id: 'room_lobby',      emoji: '🏛',  label: 'Lobby',     cost: 0 },
  { id: 'room_dj_floor',   emoji: '🎧',  label: 'DJ Floor',  cost: 1 },
  { id: 'room_library',    emoji: '📚',  label: 'Library',   cost: 1 },
  { id: 'room_kitchen',    emoji: '🍳',  label: 'Kitchen',   cost: 1 },
  { id: 'room_workshop',   emoji: '🔧',  label: 'Workshop',  cost: 1 },
  { id: 'room_beach',      emoji: '🏖️',  label: 'Beach',     cost: 2 },
  { id: 'room_grove',      emoji: '🌳',  label: 'Grove',     cost: 2 },
  { id: 'room_rooftop',    emoji: '☀️',  label: 'Rooftop',   cost: 1 },
  { id: 'room_arcade',     emoji: '🕹',  label: 'Arcade',    cost: 2 },
  { id: 'room_bath',       emoji: '♨️',  label: 'Bath',      cost: 2 },
  { id: 'room_greenhouse', emoji: '🌱',  label: 'Greenhouse', cost: 2 }
]

let panelEl: HTMLElement | null = null
let listEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let onTeleport: ((target: RoomId) => void) | null = null

function ensure(): boolean {
  if (panelEl) return true
  panelEl    = document.getElementById('lounge-transit-panel')
  listEl     = document.getElementById('lounge-transit-list')
  openBtnEl  = document.getElementById('lounge-transit-btn')
  closeBtnEl = document.getElementById('lounge-transit-close')
  if (!panelEl || !listEl) return false
  openBtnEl?.addEventListener('click', () => toggle())
  closeBtnEl?.addEventListener('click', () => hide())
  return true
}

export function setTransitOnTeleport(fn: (target: RoomId) => void) { onTeleport = fn }

export function toggle() {
  if (!ensure() || !panelEl) return
  if (panelEl.hidden) show(); else hide()
}
export function hide() { if (panelEl) panelEl.hidden = true }
export function show() {
  if (!ensure() || !panelEl || !listEl) return
  panelEl.hidden = false
  render()
}

function render() {
  if (!listEl) return
  listEl.innerHTML = ''
  for (const z of ZONES) {
    const tile = document.createElement('button')
    tile.className = 'tr-tile'; tile.type = 'button'
    tile.innerHTML = `
      <span class="tr-emoji">${z.emoji}</span>
      <span class="tr-label">${z.label}</span>
      <span class="tr-cost">${z.cost > 0 ? `−${z.cost}⚡` : 'free'}</span>
    `
    tile.addEventListener('click', () => {
      hide()
      onTeleport?.(z.id)
    })
    listEl.appendChild(tile)
  }
}

if (typeof document !== 'undefined') {
  const init = () => ensure()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
