// V10.4 — Achievement album panel + unlock toast.

import { ACHIEVEMENTS, TIER_REWARD, getUnlocked, onAchievementUnlocked, type AchievementDef } from './achievements'

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

function renderAll() {
  if (!listEl || !countEl) return
  listEl.innerHTML = ''
  const unlocked = getUnlocked()
  const totalUnlocked = Object.keys(unlocked).length
  countEl.textContent = `${totalUnlocked} / ${ACHIEVEMENTS.length}`
  // Group by category
  const groups = new Map<string, AchievementDef[]>()
  for (const a of ACHIEVEMENTS) {
    if (!groups.has(a.category)) groups.set(a.category, [])
    groups.get(a.category)!.push(a)
  }
  const labels: Record<string, string> = {
    discovery: '🗺️ Discovery', social: '🤝 Social', crafting: '🔨 Crafting',
    skills: '⚡ Skills', economy: '💰 Economy', activities: '🎉 Activities', building: '🏠 Building'
  }
  for (const [cat, items] of groups) {
    const h = document.createElement('div')
    h.className = 'ach-section'
    h.textContent = labels[cat] ?? cat
    listEl.appendChild(h)
    for (const a of items) {
      const row = document.createElement('div')
      row.className = 'ach-row' + (unlocked[a.id] ? ' unlocked' : ' locked')
      const titleSpan = document.createElement('div')
      titleSpan.className = 'ach-title'
      titleSpan.textContent = (unlocked[a.id] ? '✓ ' : '· ') + a.name
      const blurbSpan = document.createElement('div')
      blurbSpan.className = 'ach-blurb'
      blurbSpan.textContent = a.blurb
      const rewSpan = document.createElement('div')
      rewSpan.className = 'ach-reward'
      rewSpan.textContent = `🐚 ${TIER_REWARD[a.tier]}`
      row.appendChild(titleSpan); row.appendChild(blurbSpan); row.appendChild(rewSpan)
      listEl.appendChild(row)
    }
  }
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
