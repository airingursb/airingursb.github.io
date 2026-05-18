// V19.3 — NPC stories progress panel. Shows each story with:
// - title + NPC name + blurb
// - 3 pips showing step progress (filled = revealed)
// - heart-gate hint or "complete" badge
// - cosmetic reward name on complete

import { NPC_STORIES, getStoryProgress, isStoryComplete } from './npc_stories'
import { getNpcHeartLevel } from './npc_hearts'
import { getCosmetic } from './cosmetics'

let panelEl: HTMLElement | null = null
let listEl: HTMLElement | null = null

function ensureRefs(): boolean {
  if (panelEl) return true
  panelEl = document.getElementById('lounge-stories-panel')
  listEl  = document.getElementById('lounge-stories-list')
  const closeBtn = document.getElementById('lounge-stories-close')
  if (!panelEl || !listEl) return false
  closeBtn?.addEventListener('click', () => hideStories())
  panelEl.addEventListener('click', (e) => {
    if (e.target === panelEl) hideStories()
  })
  return true
}

// Manifest is loaded async on game start; we can read npc names directly
// from the manifest if it lives on window, or fall back to the raw id.
function npcName(npc_id: string): string {
  const manifest = (window as any).__loungeNpcManifest as { npcs: { id: string; name: string }[] } | undefined
  return manifest?.npcs.find(n => n.id === npc_id)?.name ?? npc_id.replace('npc_', '')
}

function renderAll() {
  if (!listEl) return
  listEl.innerHTML = ''
  for (const story of NPC_STORIES) {
    const progress = getStoryProgress(story.id)
    const complete = isStoryComplete(story.id)
    const heart = getNpcHeartLevel(story.npc_id)
    const nextStep = !complete ? story.steps[progress] : null
    const locked = !complete && nextStep && heart < nextStep.heart_min
    const row = document.createElement('div')
    row.className = 'st-row' + (complete ? ' is-complete' : '') + (locked && progress === 0 ? ' is-locked' : '')
    const h = document.createElement('h4')
    h.textContent = (complete ? '✓ ' : '') + story.title
    const npc = document.createElement('div')
    npc.className = 'st-npc'
    npc.textContent = `with ${npcName(story.npc_id)}`
    const blurb = document.createElement('p')
    blurb.className = 'st-blurb-inner'
    blurb.textContent = story.blurb
    const pipsRow = document.createElement('div')
    pipsRow.className = 'st-progress'
    for (let i = 0; i < story.steps.length; i++) {
      const pip = document.createElement('span')
      pip.className = 'st-pip' + (i < progress ? ' is-filled' : '')
      pipsRow.appendChild(pip)
    }
    const status = document.createElement('span')
    if (complete) {
      status.textContent = 'Complete'
    } else if (locked && nextStep) {
      status.textContent = `Next: heart ${nextStep.heart_min} (you: ${heart})`
    } else if (nextStep) {
      status.textContent = `Talk to ${npcName(story.npc_id)} again`
    }
    pipsRow.appendChild(status)
    row.appendChild(h)
    row.appendChild(npc)
    row.appendChild(blurb)
    row.appendChild(pipsRow)
    if (complete || progress > 0) {
      const reward = getCosmetic(story.reward_cosmetic)
      if (reward) {
        const rwd = document.createElement('div')
        rwd.className = 'st-reward'
        rwd.textContent = complete ? `🎁 Earned: ${reward.name}` : `🎁 Reward: ${reward.name}`
        row.appendChild(rwd)
      }
    }
    listEl.appendChild(row)
  }
}

export function showStories() {
  if (!ensureRefs() || !panelEl) return
  renderAll()
  panelEl.hidden = false
}
export function hideStories() {
  if (!panelEl) return
  panelEl.hidden = true
}
