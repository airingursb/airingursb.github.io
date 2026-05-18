// V18.2 — Wardrobe panel: shows all cosmetics grouped by slot, lets the
// player equip/unequip owned items and (V18.5) buy locked ones with
// shells. Read-side: getEquippedCosmetics + getOwnedCosmetics. Write-side
// invokes onCosmeticsChanged(equipped) so RoomScene + WS sync trigger.

import { COSMETICS, type CosmeticSlot, getEquippedCosmetics, getOwnedCosmetics, equipCosmetic, unequipCosmetic } from './cosmetics'
import { getShells, spendShells } from './shells'
import { addOwnedCosmetic } from './cosmetics'
import { isLoungeConnected } from './net'

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  hat: '👒 Hat', face: '👓 Face', neck: '🎀 Neck', back: '🎒 Back'
}
const SLOT_ORDER: CosmeticSlot[] = ['hat', 'face', 'neck', 'back']

let panelEl: HTMLElement | null = null
let sectionsEl: HTMLElement | null = null
let shellsEl: HTMLElement | null = null
let onChange: ((equipped: string[]) => void) | null = null
let onBuy: ((id: string, equippedAfter: string[]) => void) | null = null

export function setOnWardrobeChange(fn: (equipped: string[]) => void) { onChange = fn }
export function setOnWardrobePurchase(fn: (id: string, equippedAfter: string[]) => void) { onBuy = fn }

function ensureRefs(): boolean {
  if (panelEl) return true
  panelEl    = document.getElementById('lounge-wardrobe-panel')
  sectionsEl = document.getElementById('lounge-wardrobe-sections')
  shellsEl   = document.getElementById('lounge-wardrobe-shells')
  const closeBtn = document.getElementById('lounge-wardrobe-close')
  if (!panelEl || !sectionsEl) return false
  closeBtn?.addEventListener('click', () => hideWardrobe())
  panelEl.addEventListener('click', (e) => {
    if (e.target === panelEl) hideWardrobe()
  })
  return true
}

function tryBuy(id: string) {
  const def = COSMETICS.find(c => c.id === id)
  if (!def) return
  const cost = def.cost
  // V19.5-review C2 — quest_only items must never be buyable, even at
  // cost 0 (spendShells(0) returns true, which previously allowed
  // free-clicking a story reward without doing the story).
  if (def.quest_only) {
    void import('./ui').then(u => u.showToast('📖 This one is earned, not bought.', 1800))
    return
  }
  // V18.6-review C3 — refuse to charge shells if the WS is down. Otherwise
  // we'd spend locally, push the new owned set to a closed socket, then
  // overwrite local with the server's old (no-purchase) state on reconnect.
  // Player would lose both shells AND the item.
  if (!isLoungeConnected()) {
    void import('./ui').then(u => u.showToast('⚠ Connection lost — try again when reconnected.', 2200))
    return
  }
  if (!spendShells(cost)) {
    // Show a toast — lazy-load to avoid circular import
    void import('./ui').then(u => u.showToast(`🐚 Not enough shells (need ${cost}).`, 1800))
    return
  }
  addOwnedCosmetic(id)
  // Auto-equip after purchase (it's the natural expectation)
  equipCosmetic(id)
  void import('./ui').then(u => u.showToast(`✨ Got ${def.name}!`, 1800))
  const equipped = getEquippedCosmetics()
  onChange?.(equipped)
  onBuy?.(id, equipped)
  renderAll()
}

function renderAll() {
  if (!sectionsEl) return
  sectionsEl.innerHTML = ''
  if (shellsEl) shellsEl.textContent = `🐚 ${getShells()}`
  const owned = new Set(getOwnedCosmetics())
  const equipped = new Set(getEquippedCosmetics())
  for (const slot of SLOT_ORDER) {
    const items = COSMETICS.filter(c => c.slot === slot)
    if (items.length === 0) continue
    const section = document.createElement('div')
    section.className = 'wr-section'
    const h = document.createElement('h4')
    h.textContent = SLOT_LABELS[slot]
    section.appendChild(h)
    const grid = document.createElement('div')
    grid.className = 'wr-grid'
    for (const item of items) {
      const isOwned = owned.has(item.id)
      const isEquipped = equipped.has(item.id)
      // V19.5-review C2 — quest_only items are hidden from the wardrobe
      // entirely until owned. Once earned, they show with a "📖 Quest"
      // meta line instead of a price.
      if (item.quest_only && !isOwned) continue
      const tile = document.createElement('button')
      tile.type = 'button'
      tile.className = 'wr-tile' + (isEquipped ? ' is-equipped' : '') + (!isOwned ? ' is-locked' : '')
      const name = document.createElement('span')
      name.className = 'wr-tile-name'
      name.textContent = (isEquipped ? '★ ' : '') + item.name
      const meta = document.createElement('span')
      meta.className = 'wr-tile-meta'
      if (isEquipped) meta.textContent = 'Equipped · click to unequip'
      else if (isOwned) meta.textContent = item.quest_only ? '📖 Quest reward · click to equip' : item.blurb
      else meta.textContent = `🔒 ${item.cost} 🐚 · click to buy`
      tile.appendChild(name); tile.appendChild(meta)
      tile.addEventListener('click', () => {
        if (!isOwned) { tryBuy(item.id); return }
        if (isEquipped) unequipCosmetic(item.id)
        else equipCosmetic(item.id)
        onChange?.(getEquippedCosmetics())
        renderAll()
      })
      grid.appendChild(tile)
    }
    section.appendChild(grid)
    sectionsEl.appendChild(section)
  }
}

export function showWardrobe() {
  if (!ensureRefs() || !panelEl) return
  renderAll()
  panelEl.hidden = false
}
export function hideWardrobe() {
  if (!panelEl) return
  panelEl.hidden = true
}
