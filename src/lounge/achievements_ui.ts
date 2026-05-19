// V10.4 — Achievement album panel + unlock toast.
// V17.4 — Each unlocked row gets a ★/☆ pin toggle (max 3 pinned, surfaces
// on the profile card via V17.0 sync). Reads/writes go through profile.ts
// so the value also lands in localStorage + Supabase.

import { ACHIEVEMENTS, TIER_REWARD, getUnlocked, onAchievementUnlocked, type AchievementDef } from './achievements'
import { getPinnedAchievements, setPinnedAchievements } from './profile'
import { sendProfile } from './net'

const MAX_PINS = 3

let panelEl: HTMLElement | null = null
let listEl: HTMLElement | null = null
let countEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null

function ensure(): boolean {
  if (panelEl) return true
  panelEl    = document.getElementById('lounge-achievements-panel')
  listEl     = document.getElementById('lounge-achievements-list')
  countEl    = document.getElementById('lounge-achievements-count')
  closeBtnEl = document.getElementById('lounge-achievements-close')
  openBtnEl  = document.getElementById('lounge-achievements-btn')
  if (!panelEl || !listEl) return false
  closeBtnEl?.addEventListener('click', () => hidePanel())
  openBtnEl?.addEventListener('click', () => togglePanel())
  return true
}

export function togglePanel() { if (!ensure() || !panelEl) return; if (panelEl.hidden) showPanel(); else hidePanel() }
export function hidePanel() { if (!ensure() || !panelEl) return; panelEl.hidden = true }

export function showPanel() {
  if (!ensure() || !panelEl || !listEl) return
  panelEl.hidden = false
  renderAll()
}

function togglePin(achId: string) {
  const current = getPinnedAchievements()
  const idx = current.indexOf(achId)
  let next: string[]
  if (idx >= 0) {
    next = current.filter(x => x !== achId)
  } else {
    if (current.length >= MAX_PINS) {
      // Replace the oldest pin (FIFO) so the player isn't blocked from
      // pinning a new one without going back to unpin first.
      next = [...current.slice(1), achId]
    } else {
      next = [...current, achId]
    }
  }
  setPinnedAchievements(next)
  sendProfile({ pinned_achievements: next })
  renderAll()
}

function renderAll() {
  if (!listEl || !countEl) return
  listEl.innerHTML = ''
  const unlocked = getUnlocked()
  const totalUnlocked = Object.keys(unlocked).length
  const pinned = new Set(getPinnedAchievements())
  countEl.textContent = `${totalUnlocked} / ${ACHIEVEMENTS.length}` +
    (pinned.size > 0 ? ` · ⭐ ${pinned.size}/${MAX_PINS} pinned` : '')
  // Group by category
  const groups = new Map<string, AchievementDef[]>()
  for (const a of ACHIEVEMENTS) {
    if (!groups.has(a.category)) groups.set(a.category, [])
    groups.get(a.category)!.push(a)
  }
  // V22.3 — labels split into (icon, name) so we can inject pixel SVG.
  const labels: Record<string, { icon: string; name: string }> = {
    discovery:  { icon: 'cat_discovery',  name: 'Discovery' },
    social:     { icon: 'cat_social',     name: 'Social' },
    crafting:   { icon: 'cat_crafting',   name: 'Crafting' },
    skills:     { icon: 'cat_skills',     name: 'Skills' },
    economy:    { icon: 'cat_economy',    name: 'Economy' },
    activities: { icon: 'cat_activities', name: 'Activities' },
    building:   { icon: 'cat_building',   name: 'Building' }
  }
  for (const [cat, items] of groups) {
    const h = document.createElement('div')
    h.className = 'ach-section'
    const meta = labels[cat]
    if (meta) {
      h.setAttribute('data-icon', meta.icon)
      h.appendChild(document.createTextNode(meta.name))
    } else {
      h.textContent = cat
    }
    listEl.appendChild(h)
    for (const a of items) {
      const isUnlocked = !!unlocked[a.id]
      const isPinned = pinned.has(a.id)
      const row = document.createElement('div')
      row.className = 'ach-row' + (isUnlocked ? ' unlocked' : ' locked')
      const titleSpan = document.createElement('div')
      titleSpan.className = 'ach-title'
      titleSpan.textContent = (isUnlocked ? '✓ ' : '· ') + a.name
      const blurbSpan = document.createElement('div')
      blurbSpan.className = 'ach-blurb'
      blurbSpan.textContent = a.blurb
      const rewSpan = document.createElement('div')
      rewSpan.className = 'ach-reward'
      rewSpan.textContent = `🐚 ${TIER_REWARD[a.tier]}`
      row.appendChild(titleSpan); row.appendChild(blurbSpan); row.appendChild(rewSpan)
      // V17.4 — pin button (only for unlocked achievements; locked ones can't be pinned)
      if (isUnlocked) {
        const pinBtn = document.createElement('button')
        pinBtn.type = 'button'
        pinBtn.className = 'ach-pin' + (isPinned ? ' is-pinned' : '')
        pinBtn.textContent = isPinned ? '★' : '☆'
        pinBtn.title = isPinned ? 'Unpin from profile' : 'Pin to profile (max 3)'
        pinBtn.addEventListener('click', () => togglePin(a.id))
        row.appendChild(pinBtn)
      }
      listEl.appendChild(row)
    }
  }
  // V22.3 — hydrate category icons + any future tagged elements in the list
  void import('./icons').then(m => listEl && m.hydrateIcons(listEl))
}

function spawnToast(def: AchievementDef) {
  const t = document.createElement('div')
  t.className = 'ach-toast'
  t.innerHTML = `🏆 <strong>${def.name}</strong><br><small>${def.blurb} · +${TIER_REWARD[def.tier]} 🐚</small>`
  document.body.appendChild(t)
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 600) }, 4000)
}

if (typeof document !== 'undefined') {
  const init = () => {
    ensure()
    onAchievementUnlocked(def => { spawnToast(def); if (panelEl && !panelEl.hidden) renderAll() })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
