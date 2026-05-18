// V10.2 — Pet panel controller. Renders adoption picker (no pet) or status
// view (has pet) into #lounge-pet-panel.

import { getPet, adoptPet, feedPet, canFeedToday, PET_SPECIES, MAX_AFFECTION, getPetSpecies, type PetSpecies } from './pets'

let panelEl: HTMLElement | null = null
let bodyEl: HTMLElement | null = null
let titleEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null

function ensure(): boolean {
  if (panelEl) return true
  panelEl   = document.getElementById('lounge-pet-panel')
  bodyEl    = document.getElementById('lounge-pet-body')
  titleEl   = document.getElementById('lounge-pet-title')
  closeBtnEl = document.getElementById('lounge-pet-close')
  openBtnEl  = document.getElementById('lounge-pet-btn')
  if (!panelEl || !bodyEl) return false
  closeBtnEl?.addEventListener('click', () => hidePetPanel())
  openBtnEl?.addEventListener('click', () => togglePetPanel())
  return true
}

// Auto-bind on import so the 🐾 top-bar button responds even before the
// player opens it for the first time. Runs once DOM is ready.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensure())
  } else {
    ensure()
  }
}

export function togglePetPanel() {
  if (!ensure()) return
  if (!panelEl) return
  if (panelEl.hidden) showPetPanel()
  else hidePetPanel()
}

export function hidePetPanel() {
  if (!ensure()) return
  if (panelEl) panelEl.hidden = true
}

export function showPetPanel() {
  if (!ensure()) return
  if (!panelEl || !bodyEl || !titleEl) return
  const pet = getPet()
  bodyEl.innerHTML = ''
  if (!pet) {
    titleEl.textContent = '🐾 Adopt a friend'
    renderAdoption(bodyEl)
  } else {
    titleEl.textContent = `🐾 ${pet.name}`
    renderStatus(bodyEl, pet)
  }
  panelEl.hidden = false
}

function renderAdoption(host: HTMLElement) {
  const intro = document.createElement('p')
  intro.className = 'pet-status'
  intro.textContent = 'Choose a companion. They will follow you everywhere.'
  host.appendChild(intro)

  const nameWrap = document.createElement('div')
  nameWrap.style.cssText = 'margin: 6px 0;'
  const nameLabel = document.createElement('div')
  nameLabel.style.cssText = 'font-size: 11px; opacity: .7; margin-bottom: 3px;'
  nameLabel.textContent = 'Name (optional)'
  const nameInput = document.createElement('input')
  nameInput.className = 'pet-input'
  nameInput.type = 'text'
  nameInput.maxLength = 16
  nameInput.placeholder = 'Pet name'
  nameWrap.appendChild(nameLabel); nameWrap.appendChild(nameInput)
  host.appendChild(nameWrap)

  for (const def of PET_SPECIES) {
    const btn = document.createElement('button')
    btn.className = 'pet-tile'
    btn.type = 'button'
    btn.innerHTML = `
      <span class="emoji">${def.emoji}</span>
      <span class="label">${def.label}</span>
      <div class="blurb">${def.blurb}</div>
      <div class="blurb" style="margin-top:4px;opacity:.6">Perk at max: ${def.perk_blurb}</div>
    `
    btn.addEventListener('click', () => {
      adoptPet(def.id as PetSpecies, nameInput.value)
      showPetPanel()  // re-render as status
      // The Phaser-side follower will instantiate on the next room boot.
      // Show a hint so the user knows.
      const hint = document.createElement('p')
      hint.className = 'pet-status'
      hint.style.color = '#4ade80'
      hint.textContent = '✓ Adopted! Walk through a door to bring them along.'
      host.prepend(hint)
    })
    host.appendChild(btn)
  }
}

function renderStatus(host: HTMLElement, pet: ReturnType<typeof getPet>) {
  if (!pet) return
  const def = getPetSpecies(pet.species)
  const head = document.createElement('div')
  head.className = 'pet-status'
  head.innerHTML = `<span style="font-size:22px">${def.emoji}</span> &nbsp;${pet.name} · ${def.label}`
  host.appendChild(head)

  const bar = document.createElement('div')
  bar.className = 'pet-bar'
  const fill = document.createElement('div')
  fill.className = 'fill'
  fill.style.width = `${(pet.affection / MAX_AFFECTION) * 100}%`
  bar.appendChild(fill)
  host.appendChild(bar)

  const aff = document.createElement('div')
  aff.className = 'pet-status'
  aff.textContent = `Affection: ${pet.affection} / ${MAX_AFFECTION}`
  host.appendChild(aff)

  const btn = document.createElement('button')
  btn.className = 'pet-feed'
  btn.type = 'button'
  if (canFeedToday()) {
    btn.textContent = '🍖 Feed today'
    btn.addEventListener('click', () => {
      const aff = feedPet()
      if (aff != null) showPetPanel()
    })
  } else {
    btn.textContent = 'Fed today ✓ — come back tomorrow'
    btn.disabled = true
  }
  host.appendChild(btn)

  if (pet.affection >= MAX_AFFECTION) {
    const perk = document.createElement('div')
    perk.className = 'pet-perk'
    perk.textContent = `✨ Perk unlocked: ${def.perk_blurb}`
    host.appendChild(perk)
  } else {
    const need = document.createElement('div')
    need.className = 'pet-perk'
    need.style.opacity = '.5'
    need.textContent = `Feed ${MAX_AFFECTION - pet.affection} more day${MAX_AFFECTION - pet.affection === 1 ? '' : 's'} to unlock: ${def.perk_blurb}`
    host.appendChild(need)
  }
}
