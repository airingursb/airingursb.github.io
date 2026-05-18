import { playSfx } from './audio'
import { prefersReducedMotion, validateClientName, type VolumeChannel, type Species } from './config'
import { getVolume, setVolume } from './volume'

export type EmoteVerb = 'wave' | 'sit' | 'dance' | 'say' | 'letter' | 'think' | 'laugh' | 'cheer' | 'point'

export type UIEvent = { type: 'verb'; verb: EmoteVerb; text?: string }

type Listener = (e: UIEvent) => void

let listeners: Listener[] = []
let menuEl: HTMLElement | null = null
let sayForm: HTMLFormElement | null = null
let sayInput: HTMLInputElement | null = null
let bubblesEl: HTMLElement | null = null
let volumeBtnEl: HTMLElement | null = null
let volumePanelEl: HTMLElement | null = null
let infoBtnEl: HTMLElement | null = null
let infoPanelEl: HTMLElement | null = null
let infoNameEl: HTMLElement | null = null
let infoRegionEl: HTMLElement | null = null
let infoIdEl: HTMLElement | null = null
let infoRenameBtn: HTMLButtonElement | null = null
let nameModalEl: HTMLElement | null = null
let nameInputEl: HTMLInputElement | null = null
let nameErrorEl: HTMLElement | null = null
let nameSkipBtn: HTMLButtonElement | null = null
let nameSaveBtn: HTMLButtonElement | null = null
let nameModalBackdrop: HTMLElement | null = null
let replacedOverlayEl: HTMLElement | null = null
let onInfoRenameRequest: (() => void) | null = null
let onInfoSpeciesToggleRequest: (() => void) | null = null
let infoSpeciesBtn: HTMLButtonElement | null = null
let onInfoOpenRequest: (() => void) | null = null
let onNameModalSubmit: ((name: string | null) => void) | null = null

const activeBubbles = new Map<string, { el: HTMLDivElement; until: number }>()

function emit(e: UIEvent) {
  for (const l of listeners) l(e)
}

export function onUIEvent(l: Listener) {
  listeners.push(l)
}

export function initUI() {
  menuEl = document.getElementById('lounge-emote-menu')
  sayForm = document.getElementById('lounge-say-form') as HTMLFormElement | null
  sayInput = document.getElementById('lounge-say-input') as HTMLInputElement | null
  bubblesEl = document.getElementById('lounge-bubbles')
  volumeBtnEl = document.getElementById('lounge-volume-btn')
  volumePanelEl = document.getElementById('lounge-volume-panel')
  infoBtnEl = document.getElementById('lounge-info-btn')
  infoPanelEl = document.getElementById('lounge-info-panel')
  infoNameEl = document.getElementById('lounge-info-name')
  infoRegionEl = document.getElementById('lounge-info-region')
  infoIdEl = document.getElementById('lounge-info-id')
  infoRenameBtn = document.getElementById('lounge-info-rename') as HTMLButtonElement | null
  infoSpeciesBtn = document.getElementById('lounge-info-species') as HTMLButtonElement | null
  // V17.0 — bio/status editor button (lazy-bound below in ensureRefs body)
  const infoProfileBtn = document.getElementById('lounge-info-profile') as HTMLButtonElement | null
  infoProfileBtn?.addEventListener('click', () => {
    hideInfoPanel()
    showProfileEditor()
  })
  // V18.2 — wardrobe button
  const infoWardrobeBtn = document.getElementById('lounge-info-wardrobe') as HTMLButtonElement | null
  infoWardrobeBtn?.addEventListener('click', () => {
    hideInfoPanel()
    void import('./wardrobe_ui').then(w => w.showWardrobe())
  })
  // V19.3 — NPC stories button
  const infoStoriesBtn = document.getElementById('lounge-info-stories') as HTMLButtonElement | null
  infoStoriesBtn?.addEventListener('click', () => {
    hideInfoPanel()
    void import('./stories_ui').then(s => s.showStories())
  })
  nameModalEl = document.getElementById('lounge-name-modal')
  nameInputEl = document.getElementById('lounge-name-input') as HTMLInputElement | null
  nameErrorEl = document.getElementById('lounge-name-error')
  nameSkipBtn = document.getElementById('lounge-name-skip') as HTMLButtonElement | null
  nameSaveBtn = document.getElementById('lounge-name-save') as HTMLButtonElement | null
  nameModalBackdrop = nameModalEl?.querySelector('.ui-name-modal-backdrop') ?? null
  replacedOverlayEl = document.getElementById('lounge-replaced-overlay')

  if (infoBtnEl) {
    infoBtnEl.addEventListener('click', (e) => {
      e.stopPropagation()
      if (infoPanelEl && infoPanelEl.hidden) {
        onInfoOpenRequest?.()
        infoPanelEl.hidden = false
        playSfx('menu_open')
      } else {
        hideInfoPanel()
      }
    })
  }
  if (infoPanelEl) infoPanelEl.addEventListener('click', (e) => e.stopPropagation())
  if (infoRenameBtn) {
    infoRenameBtn.addEventListener('click', () => {
      hideInfoPanel()
      onInfoRenameRequest?.()
    })
  }
  if (infoSpeciesBtn) {
    infoSpeciesBtn.addEventListener('click', () => {
      onInfoSpeciesToggleRequest?.()
    })
  }

  if (nameSaveBtn) {
    nameSaveBtn.addEventListener('click', () => submitNameModal())
  }
  if (nameSkipBtn) {
    nameSkipBtn.addEventListener('click', () => {
      const cb = onNameModalSubmit
      hideNameModal()
      cb?.(null)
    })
  }
  if (nameInputEl) {
    nameInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitNameModal() }
      else if (e.key === 'Escape') { e.preventDefault(); const cb = onNameModalSubmit; hideNameModal(); cb?.(null) }
    })
  }
  if (nameModalBackdrop) {
    nameModalBackdrop.addEventListener('click', () => { /* require explicit choice */ })
  }

  if (volumeBtnEl && volumePanelEl) {
    const sliders = volumePanelEl.querySelectorAll<HTMLInputElement>('input[type=range][data-channel]')
    sliders.forEach((slider) => {
      const ch = slider.getAttribute('data-channel') as VolumeChannel
      slider.value = String(Math.round(getVolume(ch) * 100))
      slider.addEventListener('input', () => {
        const v = Number(slider.value) / 100
        setVolume(ch, v)
      })
    })
    volumeBtnEl.addEventListener('click', (e) => {
      e.stopPropagation()
      if (volumePanelEl!.hidden) {
        volumePanelEl!.hidden = false
        playSfx('menu_open')
      } else {
        hideVolumePanel()
      }
    })
    volumePanelEl.addEventListener('click', (e) => e.stopPropagation())
  }

  if (menuEl) {
    menuEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-verb]')
      if (!btn) return
      const verb = btn.getAttribute('data-verb') as EmoteVerb
      hideMenu()
      if (verb === 'say') {
        showSayInput()
        return
      }
      if (verb === 'letter') {
        emit({ type: 'verb', verb })
        return
      }
      playSfx(verb as 'wave' | 'sit' | 'dance')
      emit({ type: 'verb', verb })
    })
  }

  if (sayForm) {
    sayForm.addEventListener('submit', (e) => {
      e.preventDefault()
      const text = (sayInput?.value ?? '').trim()
      hideSayInput()
      if (text.length === 0) return
      playSfx('say')
      emit({ type: 'verb', verb: 'say', text })
    })
  }
  if (sayInput) {
    sayInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        hideSayInput()
      }
    })
  }

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (volumePanelEl && !volumePanelEl.hidden) {
      if (!target.closest('#lounge-volume-panel') && !target.closest('#lounge-volume-btn')) {
        hideVolumePanel()
      }
    }
    if (infoPanelEl && !infoPanelEl.hidden) {
      if (!target.closest('#lounge-info-panel') && !target.closest('#lounge-info-btn')) {
        hideInfoPanel()
      }
    }
    if (invPanelEl && !invPanelEl.hidden) {
      if (!target.closest('#lounge-inventory-panel') && !target.closest('#lounge-inventory-btn')) {
        hideInventoryPanel()
      }
    }
    if (messagesPanelEl && !messagesPanelEl.hidden) {
      if (!target.closest('#lounge-messages-panel') && !target.closest('#lounge-messages-btn')) {
        hideMessagesPanel()
      }
    }
    if (peerMenuEl && !peerMenuEl.hidden) {
      if (!target.closest('#lounge-peer-menu') && !target.closest('canvas')) {
        hidePeerMenu()
      }
    }
    if (wishboardPanelEl && !wishboardPanelEl.hidden) {
      if (!target.closest('#lounge-wishboard-panel') && !target.closest('#lounge-wishboard-btn')) {
        hideWishboardPanel()
      }
    }
    if (!menuEl || menuEl.hidden) return
    if (target.closest('#lounge-emote-menu')) return
    if (target.closest('canvas')) return
    hideMenu()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideMenu()
      hideSayInput()
      hideVolumePanel()
      hideInfoPanel()
      hideBoothPicker()
      hideInventoryPanel()
      hideMessagesPanel()
      hideGiftModal()
      hidePeerMenu()
      hideLetterModal()
      hideLetterRead()
      hideWishboardPanel()
      hideQuestsPanel()
    }
  })
  ensureQuestsRefs()
  ensureCameraRefs()
  ensureMemoriesRefs()
  ensureShellsRefs()
  ensureSleepRefs()
  ensureMailboxRefs()
  ensureProgressRefs()
  ensureWaRefs()
  ensureSkRefs()
  ensureCfRefs()
  ensureBdRefs()
  ensureGcRefs()
  ensureBnRefs()
  initGameTimeClock()
  initEnergyBar()
}

export function showMenuAt(screenX: number, screenY: number) {
  if (!menuEl) return
  menuEl.style.left = `${screenX}px`
  menuEl.style.top = `${screenY - 30}px`
  menuEl.hidden = false
  playSfx('menu_open')
  if (!prefersReducedMotion()) {
    menuEl.classList.add('is-opening')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => menuEl?.classList.remove('is-opening'))
    )
  }
}

export function hideMenu() {
  if (!menuEl || menuEl.hidden) return
  menuEl.hidden = true
  playSfx('menu_close')
}

export function hideVolumePanel() {
  if (!volumePanelEl || volumePanelEl.hidden) return
  volumePanelEl.hidden = true
  playSfx('menu_close')
}

export function showSayInput() {
  if (!sayForm || !sayInput) return
  sayInput.value = ''
  sayForm.hidden = false
  sayInput.focus()
}

export function hideSayInput() {
  if (!sayForm || !sayInput) return
  sayForm.hidden = true
  sayInput.value = ''
}

// V15.6-review C1 — lets callers (V15.2 ambient bubble tick) check whether
// a more important bubble (player-triggered dialog or NPC notice) is on
// screen before stomping it with a low-priority ambient line.
export function hasActiveBubble(bearId: string): boolean {
  return activeBubbles.has(bearId)
}

export function showBubble(bearId: string, text: string, screenX: number, screenY: number) {
  if (!bubblesEl) return
  const existing = activeBubbles.get(bearId)
  if (existing) {
    existing.el.remove()
    activeBubbles.delete(bearId)
  }
  const div = document.createElement('div')
  div.className = 'ui-bubble'
  div.textContent = text
  div.style.left = `${screenX}px`
  div.style.top = `${screenY}px`
  bubblesEl.appendChild(div)
  const entry = { el: div, until: performance.now() + 3000 }
  activeBubbles.set(bearId, entry)
  setTimeout(() => {
    if (prefersReducedMotion()) {
      div.remove()
    } else {
      div.classList.add('is-fading')
      setTimeout(() => div.remove(), 220)
    }
    activeBubbles.delete(bearId)
  }, 3000)
}

export function updateBubblePos(bearId: string, screenX: number, screenY: number) {
  const entry = activeBubbles.get(bearId)
  if (!entry) return
  entry.el.style.left = `${screenX}px`
  entry.el.style.top = `${screenY}px`
}

let promptEl: HTMLElement | null = null
let promptVerbEl: HTMLElement | null = null

export function showInteractPrompt(verb: string) {
  if (!promptEl) {
    promptEl = document.getElementById('lounge-interact-prompt')
    promptVerbEl = document.getElementById('lounge-interact-verb')
  }
  if (!promptEl || !promptVerbEl) return
  promptVerbEl.textContent = verb
  promptEl.hidden = false
}

export function hideInteractPrompt() {
  if (!promptEl) {
    promptEl = document.getElementById('lounge-interact-prompt')
  }
  if (!promptEl) return
  promptEl.hidden = true
}

export function updateInteractPromptPos(screenX: number, screenY: number) {
  if (!promptEl) {
    promptEl = document.getElementById('lounge-interact-prompt')
  }
  if (!promptEl) return
  promptEl.style.left = `${screenX}px`
  promptEl.style.top = `${screenY}px`
}

// V3.0 — name modal, info panel, replaced overlay

function submitNameModal() {
  if (!nameInputEl || !nameSaveBtn) return
  const raw = nameInputEl.value
  const v = validateClientName(raw)
  if (!v.ok) {
    if (nameErrorEl) {
      const map: Record<string, string> = {
        empty: 'Please enter a name (or click Skip).',
        too_long: 'Name must be 16 characters or fewer.',
        blocked: 'That name is not allowed.',
        type: 'Invalid input.'
      }
      nameErrorEl.textContent = map[v.reason] ?? 'Invalid name.'
      nameErrorEl.hidden = false
    }
    nameInputEl.focus()
    return
  }
  const cb = onNameModalSubmit
  hideNameModal()
  cb?.(v.value)
}

export function showNameModal(currentName: string | null, onSubmit: (name: string | null) => void) {
  if (!nameModalEl || !nameInputEl) return
  onNameModalSubmit = onSubmit
  nameInputEl.value = currentName ?? ''
  if (nameErrorEl) { nameErrorEl.textContent = ''; nameErrorEl.hidden = true }
  nameModalEl.hidden = false
  // Defer focus until after the show-paint so input is visible/focusable
  requestAnimationFrame(() => nameInputEl?.focus())
}

export function hideNameModal() {
  if (!nameModalEl) return
  nameModalEl.hidden = true
  onNameModalSubmit = null
}

export function setInfoPanelDataProvider(
  provider: () => {
    visitorId: string; displayName: string | null; region: string;
    friends?: Array<{ display_name: string | null; score: number; level: number }>
  },
  onRename: () => void
) {
  onInfoOpenRequest = () => {
    const data = provider()
    if (infoNameEl)   infoNameEl.textContent   = data.displayName ?? '(anonymous)'
    if (infoRegionEl) infoRegionEl.textContent = data.region
    if (infoIdEl)     infoIdEl.textContent     = '…' + data.visitorId.slice(-8)
    const listEl = document.getElementById('lounge-info-friends')
    const emptyEl = document.getElementById('lounge-info-friends-empty')
    if (listEl) {
      listEl.innerHTML = ''
      const friends = data.friends ?? []
      if (friends.length === 0) {
        if (emptyEl) emptyEl.hidden = false
      } else {
        if (emptyEl) emptyEl.hidden = true
        const glyphs = ['—', '♡', '♥', '✦']
        for (const f of friends) {
          const li = document.createElement('li')
          const heart = document.createElement('span')
          heart.className = `heart-${f.level}`
          heart.textContent = glyphs[f.level] ?? '—'
          const name = document.createElement('span')
          name.className = 'name'
          name.textContent = f.display_name ?? '(anonymous)'
          const score = document.createElement('span')
          score.className = 'score'
          score.textContent = String(f.score)
          li.appendChild(heart)
          li.appendChild(name)
          li.appendChild(score)
          listEl.appendChild(li)
        }
      }
    }
  }
  onInfoRenameRequest = onRename
}

// V6.5 — set the species-toggle callback. Caller updates Bear sprite + persists pref.
export function setOnSpeciesToggle(handler: () => void) {
  onInfoSpeciesToggleRequest = handler
}
// V16.0 — Single source of truth: every player-choosable species lives here.
// Adding a new entry automatically extends the picker grid (LoungeGame.astro
// reads the same SPECIES from config.ts) and the info-panel switch cycle.
const SPECIES_CYCLE: Array<{ id: Species; emoji: string; label: string }> = [
  { id: 'bear',     emoji: '🐻', label: 'Bear' },
  { id: 'cat',      emoji: '🐱', label: 'Cat' },
  { id: 'fox',      emoji: '🦊', label: 'Fox' },
  { id: 'capybara', emoji: '🦦', label: 'Capybara' },
  { id: 'bird',     emoji: '🐦', label: 'Bird' },
  { id: 'bunny',    emoji: '🐰', label: 'Bunny' },
  { id: 'puppy',    emoji: '🐶', label: 'Puppy' },
  { id: 'panda',    emoji: '🐼', label: 'Panda' },
  { id: 'hamster',  emoji: '🐹', label: 'Hamster' },
  { id: 'penguin',  emoji: '🐧', label: 'Penguin' },
  { id: 'frog',     emoji: '🐸', label: 'Frog' }
]
export function updateSpeciesButtonLabel(currentSpecies: Species) {
  if (!infoSpeciesBtn) return
  const idx = SPECIES_CYCLE.findIndex(s => s.id === currentSpecies)
  const next = SPECIES_CYCLE[(idx + 1) % SPECIES_CYCLE.length]
  infoSpeciesBtn.dataset.species = currentSpecies
  infoSpeciesBtn.textContent = `Switch to ${next.emoji} ${next.label}`
}
export function nextSpeciesFrom(s: string): Species {
  const idx = SPECIES_CYCLE.findIndex(x => x.id === s)
  return SPECIES_CYCLE[(idx === -1 ? 0 : (idx + 1) % SPECIES_CYCLE.length)].id
}

// V9.7 — Community Hall bundles
import { BUNDLES, getFilled, checkAutoSlots, tryContribute, isBundleComplete, type BundleSlot } from './community_hall'
import { MATERIALS as MAT_META, type MaterialId } from './resources'

let bnPanelEl: HTMLElement | null = null
let bnListEl: HTMLElement | null = null
let bnCloseBtn: HTMLButtonElement | null = null
let bnOpenBtn: HTMLButtonElement | null = null
let bundleAutoProvider: (() => { memoriesCount: number; friendshipsMaxLevels: number[] }) | null = null

export function setBundleAutoProvider(p: () => { memoriesCount: number; friendshipsMaxLevels: number[] }) {
  bundleAutoProvider = p
}

function ensureBnRefs() {
  if (bnPanelEl) return
  bnPanelEl = document.getElementById('lounge-bundles-panel')
  bnListEl  = document.getElementById('lounge-bundles-list')
  bnCloseBtn = document.getElementById('lounge-bundles-close') as HTMLButtonElement | null
  bnOpenBtn  = document.getElementById('lounge-info-bundles') as HTMLButtonElement | null
  if (bnCloseBtn) bnCloseBtn.addEventListener('click', () => hideBundlesPanel())
  if (bnOpenBtn) bnOpenBtn.addEventListener('click', () => { hideInfoPanel(); showBundlesPanel() })
  if (bnPanelEl) bnPanelEl.addEventListener('click', (e) => { if (e.target === bnPanelEl) hideBundlesPanel() })
}

export function showBundlesPanel() {
  ensureBnRefs()
  if (!bnPanelEl) return
  if (bundleAutoProvider) checkAutoSlots(bundleAutoProvider())
  renderBundles()
  bnPanelEl.hidden = false
  playSfx('menu_open')
}
export function hideBundlesPanel() {
  if (!bnPanelEl) return
  bnPanelEl.hidden = true
  playSfx('menu_close')
}

function slotLabel(slot: BundleSlot): string {
  switch (slot.kind) {
    case 'shells':      return `🐚 shells`
    case 'material':    return `${MAT_META[slot.id].emoji} ${MAT_META[slot.id].name}`
    case 'memory':      return `📷 memories`
    case 'friendship':  return `💞 heart ${slot.minLevel}+`
  }
}
function slotMax(slot: BundleSlot): number {
  if (slot.kind === 'friendship') return slot.minCount
  return slot.count
}

function renderBundles() {
  if (!bnListEl) return
  bnListEl.innerHTML = ''
  for (const b of BUNDLES) {
    const li = document.createElement('li')
    const done = isBundleComplete(b)
    li.className = 'bn-item' + (done ? ' done' : '')
    const t = document.createElement('div'); t.className = 'bn-title'
    t.textContent = `${b.emoji} ${b.name}` + (done ? ' ✓' : '')
    li.appendChild(t)
    const bl = document.createElement('div'); bl.className = 'bn-blurb-inline'; bl.textContent = b.blurb
    li.appendChild(bl)
    b.slots.forEach((slot, i) => {
      const row = document.createElement('div'); row.className = 'bn-slot'
      const lbl = document.createElement('span'); lbl.className = 'bn-slot-label'; lbl.textContent = slotLabel(slot)
      const bar = document.createElement('div'); bar.className = 'bn-slot-bar'
      const fill = document.createElement('div'); fill.className = 'bn-slot-fill'
      const filled = getFilled(b.id, i)
      const max = slotMax(slot)
      const pct = Math.min(100, (filled / max) * 100)
      fill.style.width = pct + '%'
      if (filled >= max) fill.classList.add('full')
      bar.appendChild(fill)
      const cnt = document.createElement('span'); cnt.className = 'bn-slot-count'; cnt.textContent = `${Math.min(filled, max)} / ${max}`
      row.appendChild(lbl); row.appendChild(bar); row.appendChild(cnt)
      if (slot.kind === 'shells' || slot.kind === 'material') {
        const btn = document.createElement('button'); btn.type = 'button'
        btn.textContent = filled >= max ? '✓' : 'Pay'
        btn.disabled = filled >= max
        btn.addEventListener('click', () => {
          const r = tryContribute(b.id, i)
          if (r.ok) {
            if (r.completedBundle) showToast(`🏛 Bundle complete: ${b.name}! Reward: ${b.reward}`, 4500)
            else showToast('Contribution added.', 1600)
            renderBundles()
          } else {
            const msg: Record<string, string> = {
              already_full:'Slot already complete.',
              not_enough:  'Not enough to fill the rest.',
              cannot_check:'Auto-tracked — keep playing.'
            }
            showToast(msg[r.reason], 2000)
          }
        })
        row.appendChild(btn)
      }
      li.appendChild(row)
    })
    const rw = document.createElement('div'); rw.className = 'bn-reward'; rw.textContent = '🎁 ' + b.reward
    li.appendChild(rw)
    bnListEl.appendChild(li)
  }
}

// V9.5 — Care for the Grove panel
import { getFlower, tryPlant, tryWater, uprootFlower } from './grove_care'

let gcPanelEl: HTMLElement | null = null
let gcStateEl: HTMLElement | null = null
let gcControlsEl: HTMLElement | null = null
let gcCloseBtn: HTMLButtonElement | null = null
let gcOpenBtn: HTMLButtonElement | null = null

function ensureGcRefs() {
  if (gcPanelEl) return
  gcPanelEl = document.getElementById('lounge-grovecare-panel')
  gcStateEl = document.getElementById('lounge-grovecare-state')
  gcControlsEl = document.getElementById('lounge-grovecare-controls')
  gcCloseBtn = document.getElementById('lounge-grovecare-close') as HTMLButtonElement | null
  gcOpenBtn  = document.getElementById('lounge-info-grovecare') as HTMLButtonElement | null
  if (gcCloseBtn) gcCloseBtn.addEventListener('click', () => hideGroveCarePanel())
  if (gcOpenBtn) gcOpenBtn.addEventListener('click', () => { hideInfoPanel(); showGroveCarePanel() })
  if (gcPanelEl) gcPanelEl.addEventListener('click', (e) => { if (e.target === gcPanelEl) hideGroveCarePanel() })
}

export function showGroveCarePanel() {
  ensureGcRefs()
  if (!gcPanelEl) return
  renderGroveCare()
  gcPanelEl.hidden = false
  playSfx('menu_open')
}
export function hideGroveCarePanel() {
  if (!gcPanelEl) return
  gcPanelEl.hidden = true
  playSfx('menu_close')
}
function renderGroveCare() {
  if (!gcStateEl || !gcControlsEl) return
  const flower = getFlower()
  gcStateEl.innerHTML = ''
  gcControlsEl.innerHTML = ''
  if (!flower) {
    gcStateEl.textContent = 'You haven\'t planted a flower yet.'
    for (const v of ['yellow', 'pink', 'white'] as const) {
      const btn = document.createElement('button'); btn.type = 'button'
      const emoji = v === 'yellow' ? '🌼' : v === 'pink' ? '🌸' : '🤍'
      btn.textContent = `Plant ${emoji} (🐚 5)`
      btn.addEventListener('click', () => {
        const r = tryPlant(v)
        if (r.ok) { showToast(`${emoji} Planted. Water daily for 5 days to bloom.`, 3200); renderGroveCare() }
        else showToast('Not enough shells.', 2000)
      })
      gcControlsEl.appendChild(btn)
    }
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  const wateredToday = flower.wateredDays.includes(today)
  const days = flower.wateredDays.length
  const variety = flower.variety === 'yellow' ? '🌼' : flower.variety === 'pink' ? '🌸' : '🤍'
  if (flower.bloomedDay) {
    gcStateEl.innerHTML = `${variety} <strong>Bloomed!</strong> ${flower.bloomedDay}<br>Your flower contributes to the Grove atmosphere.`
    const btn = document.createElement('button'); btn.type = 'button'
    btn.textContent = 'Uproot & start again'
    btn.addEventListener('click', () => { uprootFlower(); renderGroveCare() })
    gcControlsEl.appendChild(btn)
  } else {
    gcStateEl.innerHTML = `${variety} Planted ${flower.plantedDay}<br>Watered ${days} / 5 days${wateredToday ? ' (✓ today)' : ''}`
    const btn = document.createElement('button'); btn.type = 'button'
    btn.textContent = wateredToday ? 'Watered today ✓' : 'Water (− 4 ⚡)'
    btn.disabled = wateredToday
    btn.addEventListener('click', () => {
      const r = tryWater()
      if (r.ok) {
        if (r.bloomed) showToast(`${variety} 🌟 Bloomed! Atmosphere bonus active.`, 3500)
        else showToast(`💧 +1 day (${r.daysWatered}/5)`, 2200)
        renderGroveCare()
      } else if (r.reason === 'already_watered_today') {
        showToast('Already watered today. Come back tomorrow.', 2000)
      } else if (r.reason === 'not_enough_energy') {
        showToast('Too tired to water — rest first.', 2000)
      } else {
        showToast('Cannot water right now.', 2000)
      }
    })
    gcControlsEl.appendChild(btn)
  }
}

// V9.3 — Building / Home extensions
import { EXTENSION_DEFS, hasExtension, tryBuild, extraHomeCap } from './building'
import { getMaterial, MATERIALS, type MaterialId } from './resources'

let bdPanelEl: HTMLElement | null = null
let bdListEl: HTMLElement | null = null
let bdCloseBtn: HTMLButtonElement | null = null
let bdOpenBtn: HTMLButtonElement | null = null

function ensureBdRefs() {
  if (bdPanelEl) return
  bdPanelEl = document.getElementById('lounge-build-panel')
  bdListEl  = document.getElementById('lounge-build-list')
  bdCloseBtn = document.getElementById('lounge-build-close') as HTMLButtonElement | null
  bdOpenBtn  = document.getElementById('lounge-info-build') as HTMLButtonElement | null
  if (bdCloseBtn) bdCloseBtn.addEventListener('click', () => hideBuildPanel())
  if (bdOpenBtn) bdOpenBtn.addEventListener('click', () => { hideInfoPanel(); showBuildPanel() })
  if (bdPanelEl) bdPanelEl.addEventListener('click', (e) => { if (e.target === bdPanelEl) hideBuildPanel() })
}

export function showBuildPanel() {
  ensureBdRefs()
  if (!bdPanelEl) return
  renderBuild()
  bdPanelEl.hidden = false
  playSfx('menu_open')
}
export function hideBuildPanel() {
  if (!bdPanelEl) return
  bdPanelEl.hidden = true
  playSfx('menu_close')
}
function renderBuild() {
  if (!bdListEl) return
  bdListEl.innerHTML = ''
  const shells = getShells()
  for (const e of EXTENSION_DEFS) {
    const owned = hasExtension(e.id)
    const prereqOK = !e.prereq || hasExtension(e.prereq)
    const matOk = Object.entries(e.cost.materials).every(([m, n]) => getMaterial(m as MaterialId) >= (n ?? 0))
    const canBuild = !owned && prereqOK && matOk && shells >= e.cost.shells
    const li = document.createElement('li')
    li.className = 'bd-item' + (owned ? ' owned' : '')
    const em = document.createElement('span'); em.className = 'bd-emoji'; em.textContent = e.emoji
    const name = document.createElement('div'); name.className = 'bd-name'
    const t = document.createElement('div'); t.className = 'bd-title'; t.textContent = e.name
    const b = document.createElement('div'); b.className = 'bd-blurb-inline'; b.textContent = e.blurb
    const cost = document.createElement('div'); cost.className = 'bd-cost'
    const matStr = Object.entries(e.cost.materials).map(([m, n]) => `${MATERIALS[m as MaterialId].emoji} ${n}`).join(' + ')
    cost.textContent = owned
      ? '✓ Owned'
      : `cost: 🐚 ${e.cost.shells}${matStr ? '  +  ' + matStr : ''}` + (e.prereq && !hasExtension(e.prereq) ? `  🔒 needs ${e.prereq}` : '')
    name.appendChild(t); name.appendChild(b); name.appendChild(cost)
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = owned ? 'Owned' : 'Build'
    btn.disabled = !canBuild
    btn.addEventListener('click', () => {
      const res = tryBuild(e.id)
      if (res.ok) {
        showToast(`${e.emoji} Built ${e.name} (+${e.extraDecoCap} home slots)`, 3200)
        renderBuild()
      } else {
        const reasonMsg: Record<string, string> = {
          already_owned:    'You already have this.',
          missing_prereq:   'You need the previous tier first.',
          not_enough_shells:'Not enough shells.',
          missing_material: 'Missing a material — go gather more.'
        }
        showToast(reasonMsg[res.reason] ?? 'Cannot build.', 2400)
      }
    })
    li.appendChild(em); li.appendChild(name); li.appendChild(btn)
    bdListEl.appendChild(li)
  }
}

// V9.1 — Recipe Book / Crafting
import { RECIPES, isUnlocked, tryCraft, type Recipe, type CraftEnv } from './crafting'

let cfPanelEl: HTMLElement | null = null
let cfListEl: HTMLElement | null = null
let cfShellsEl: HTMLElement | null = null
let cfEmptyEl: HTMLElement | null = null
let cfCloseBtn: HTMLButtonElement | null = null
let cfOpenBtn: HTMLButtonElement | null = null
let craftEnvProvider: (() => CraftEnv) | null = null

export function setCraftEnvProvider(p: () => CraftEnv) { craftEnvProvider = p }

function ensureCfRefs() {
  if (cfPanelEl) return
  cfPanelEl  = document.getElementById('lounge-craft-panel')
  cfListEl   = document.getElementById('lounge-craft-list')
  cfShellsEl = document.getElementById('lounge-craft-shells')
  cfEmptyEl  = document.getElementById('lounge-craft-empty')
  cfCloseBtn = document.getElementById('lounge-craft-close') as HTMLButtonElement | null
  cfOpenBtn  = document.getElementById('lounge-info-craft') as HTMLButtonElement | null
  if (cfCloseBtn) cfCloseBtn.addEventListener('click', () => hideCraftPanel())
  if (cfOpenBtn) cfOpenBtn.addEventListener('click', () => { hideInfoPanel(); showCraftPanel() })
  if (cfPanelEl) cfPanelEl.addEventListener('click', (e) => { if (e.target === cfPanelEl) hideCraftPanel() })
}

export function showCraftPanel() {
  ensureCfRefs()
  if (!cfPanelEl) return
  renderCraft()
  cfPanelEl.hidden = false
  playSfx('menu_open')
}
export function hideCraftPanel() {
  if (!cfPanelEl) return
  cfPanelEl.hidden = true
  playSfx('menu_close')
}

function describeCost(c: import('./crafting').Cost): string {
  switch (c.kind) {
    case 'any_pebble': return `${c.count} pebble${c.count > 1 ? 's' : ''}`
    case 'pebble':     return `pebble ${c.id}`
    case 'shells':     return `🐚 ${c.count}`
    case 'material':   return `${c.count}× ${c.id}`
  }
}

function renderCraft() {
  if (!cfListEl || !cfEmptyEl || !cfShellsEl) return
  const env = craftEnvProvider?.()
  cfShellsEl.textContent = String(getShells())
  cfListEl.innerHTML = ''
  let shown = 0
  for (const r of RECIPES) {
    const unlocked = isUnlocked(r)
    if (!unlocked) {
      // show as locked teaser
    }
    shown++
    const li = document.createElement('li')
    li.className = 'cf-item' + (unlocked ? '' : ' locked')
    const e = document.createElement('span'); e.className = 'cf-emoji'; e.textContent = r.emoji
    const name = document.createElement('div'); name.className = 'cf-name'
    const t = document.createElement('div'); t.className = 'cf-title'; t.textContent = r.name
    const b = document.createElement('div'); b.className = 'cf-blurb'; b.textContent = r.blurb
    const costs = document.createElement('div'); costs.className = 'cf-costs'
    if (unlocked) costs.textContent = 'cost: ' + r.costs.map(describeCost).join('  +  ')
    else costs.textContent = `🔒 requires ${r.unlock!.skill} lv ${r.unlock!.level}`
    name.appendChild(t); name.appendChild(b); name.appendChild(costs)
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = unlocked ? 'Craft' : 'Locked'
    btn.disabled = !unlocked
    btn.addEventListener('click', () => {
      if (!env) return
      const res = tryCraft(r, env)
      if (res.ok) {
        showToast(`🧪 Crafted ${res.outputName}`, 2800)
        renderCraft()
      } else {
        const reasonMsg: Record<string, string> = {
          locked: 'You haven\'t unlocked this yet.',
          not_enough_pebbles: 'Not enough pebbles.',
          not_enough_shells: 'Not enough shells.',
          missing_material: 'Missing a material.',
          already_owned: 'You already have one.'
        }
        showToast(`🧪 ${reasonMsg[res.reason] ?? 'Cannot craft.'}`, 2200)
      }
    })
    li.appendChild(e); li.appendChild(name); li.appendChild(btn)
    cfListEl.appendChild(li)
  }
  cfEmptyEl.hidden = shown > 0
}

// V9.0 — Skills panel
import { SKILLS, getProgress, MAX_LEVEL } from './skills'

let skPanelEl: HTMLElement | null = null
let skListEl: HTMLElement | null = null
let skCloseBtn: HTMLButtonElement | null = null
let skOpenBtn: HTMLButtonElement | null = null

function ensureSkRefs() {
  if (skPanelEl) return
  skPanelEl = document.getElementById('lounge-skills-panel')
  skListEl  = document.getElementById('lounge-skills-list')
  skCloseBtn = document.getElementById('lounge-skills-close') as HTMLButtonElement | null
  skOpenBtn  = document.getElementById('lounge-info-skills') as HTMLButtonElement | null
  if (skCloseBtn) skCloseBtn.addEventListener('click', () => hideSkillsPanel())
  if (skOpenBtn) skOpenBtn.addEventListener('click', () => { hideInfoPanel(); showSkillsPanel() })
  if (skPanelEl) skPanelEl.addEventListener('click', (e) => { if (e.target === skPanelEl) hideSkillsPanel() })
}

export function showSkillsPanel() {
  ensureSkRefs()
  if (!skPanelEl) return
  renderSkills()
  skPanelEl.hidden = false
  playSfx('menu_open')
}
export function hideSkillsPanel() {
  if (!skPanelEl) return
  skPanelEl.hidden = true
  playSfx('menu_close')
}
function renderSkills() {
  if (!skListEl) return
  skListEl.innerHTML = ''
  for (const meta of SKILLS) {
    const p = getProgress(meta.id)
    const li = document.createElement('li')
    li.className = 'sk-item'
    const row = document.createElement('div'); row.className = 'sk-row'
    const e = document.createElement('span'); e.className = 'sk-emoji'; e.textContent = meta.emoji
    const n = document.createElement('span'); n.className = 'sk-name'; n.textContent = meta.name
    const l = document.createElement('span'); l.className = 'sk-level'; l.textContent = `lv ${p.level}/${MAX_LEVEL}`
    row.appendChild(e); row.appendChild(n); row.appendChild(l)
    li.appendChild(row)
    if (p.xpForNext > 0) {
      const bar = document.createElement('div'); bar.className = 'sk-bar'
      const fill = document.createElement('div'); fill.className = 'sk-fill'
      fill.style.width = `${(p.xpInLevel / p.xpForNext) * 100}%`
      bar.appendChild(fill); li.appendChild(bar)
    }
    const b = document.createElement('div'); b.className = 'sk-blurb'; b.textContent = meta.blurb
    li.appendChild(b)
    skListEl.appendChild(li)
  }
}

// E5-P1a — First-visit species picker
let spPickerEl: HTMLElement | null = null
let spOnPick: ((s: Species) => void) | null = null

function ensureSpRefs() {
  if (spPickerEl) return
  spPickerEl = document.getElementById('lounge-species-picker')
  if (spPickerEl) {
    spPickerEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.sp-tile')
      if (!btn) return
      const s = btn.dataset.species as Species
      if (!s) return
      hideSpeciesPicker()
      spOnPick?.(s)
    })
  }
}
// V17.0 — Profile editor (bio + status). Lazy module-init so the panel
// only binds listeners once the DOM exists (avoids SSR-time errors).
import { getBio, getStatus, getMood, setBio, setStatus, setMood, BIO_MAX_LEN, STATUS_MAX_LEN } from './profile'
import { sendProfile } from './net'
let peEl: HTMLElement | null = null
let peBioInput: HTMLTextAreaElement | null = null
let peStatusInput: HTMLInputElement | null = null
let peBioCount: HTMLElement | null = null
let peStatusCount: HTMLElement | null = null
let peMoodGrid: HTMLElement | null = null
let peSelectedMood = ''

// V17.1 — let the caller (RoomScene) be notified when local mood changes so
// it can apply the emoji to myBear immediately (without waiting for the
// profile_changed echo from the server). Set by setOnLocalMoodChange.
let onLocalMoodChange: ((mood: string) => void) | null = null
export function setOnLocalMoodChange(fn: (mood: string) => void) { onLocalMoodChange = fn }

function ensurePeRefs() {
  if (peEl) return
  peEl = document.getElementById('lounge-profile-edit')
  peBioInput = document.getElementById('lounge-profile-bio') as HTMLTextAreaElement | null
  peStatusInput = document.getElementById('lounge-profile-status') as HTMLInputElement | null
  peBioCount = document.getElementById('lounge-profile-bio-count')
  peStatusCount = document.getElementById('lounge-profile-status-count')
  peMoodGrid = document.getElementById('lounge-profile-mood-grid')
  const saveBtn = document.getElementById('lounge-profile-save')
  const cancelBtn = document.getElementById('lounge-profile-cancel')
  if (!peEl) return
  const updateCounts = () => {
    if (peBioCount && peBioInput) peBioCount.textContent = `${peBioInput.value.length} / ${BIO_MAX_LEN}`
    if (peStatusCount && peStatusInput) peStatusCount.textContent = `${peStatusInput.value.length} / ${STATUS_MAX_LEN}`
  }
  peBioInput?.addEventListener('input', updateCounts)
  peStatusInput?.addEventListener('input', updateCounts)
  // V17.1 — mood picker: clicking a tile selects it (highlight)
  peMoodGrid?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.pe-mood')
    if (!btn) return
    peSelectedMood = btn.dataset.mood ?? ''
    peMoodGrid?.querySelectorAll('.pe-mood').forEach(b => b.classList.toggle('is-selected', b === btn))
  })
  saveBtn?.addEventListener('click', () => {
    const bio = peBioInput?.value?.trim() ?? ''
    const status = peStatusInput?.value?.trim() ?? ''
    const mood = peSelectedMood
    setBio(bio)
    setStatus(status)
    setMood(mood)
    // Server treats empty string as clear → null
    sendProfile({ bio, status, mood })
    // V17.1 — apply mood to local bear immediately (don't wait for echo)
    onLocalMoodChange?.(mood)
    hideProfileEditor()
    // V17.5-review I2 — neutral "saving" toast; the real ack/fail toast
    // comes from showProfileResultToast() once the server replies.
    showToast('✍️ Saving profile…', 1400)
  })
  cancelBtn?.addEventListener('click', () => hideProfileEditor())
  // Click outside the card dismisses
  peEl.addEventListener('click', (e) => {
    if (e.target === peEl) hideProfileEditor()
  })
}
export function showProfileEditor() {
  ensurePeRefs()
  if (!peEl) return
  // Load current values
  if (peBioInput) peBioInput.value = getBio()
  if (peStatusInput) peStatusInput.value = getStatus()
  peSelectedMood = getMood()
  if (peMoodGrid) {
    peMoodGrid.querySelectorAll<HTMLButtonElement>('.pe-mood').forEach(b => {
      b.classList.toggle('is-selected', (b.dataset.mood ?? '') === peSelectedMood)
    })
  }
  if (peBioCount && peBioInput) peBioCount.textContent = `${peBioInput.value.length} / ${BIO_MAX_LEN}`
  if (peStatusCount && peStatusInput) peStatusCount.textContent = `${peStatusInput.value.length} / ${STATUS_MAX_LEN}`
  peEl.hidden = false
  peStatusInput?.focus()
}
export function hideProfileEditor() {
  ensurePeRefs()
  if (peEl) peEl.hidden = true
}

// V17.5-review I2 — toast helper RoomScene calls when profile_ok /
// profile_failed lands. Decoupled so net.ts callbacks don't import ui.ts.
export function showProfileResultToast(ok: boolean, reason?: string) {
  if (ok) {
    showToast('✍️ Profile saved.', 1800)
  } else if (reason === 'rate_limit') {
    showToast('🐢 Saving too fast — try again in a moment.', 2400)
  } else {
    showToast(`✍️ Profile save failed: ${reason ?? 'unknown'}`, 2800)
  }
}

export function showSpeciesPicker(onPick: (s: Species) => void) {
  ensureSpRefs()
  if (!spPickerEl) return
  spOnPick = onPick
  spPickerEl.hidden = false
}
export function hideSpeciesPicker() {
  if (!spPickerEl) return
  spPickerEl.hidden = true
  spOnPick = null
}

// E5-P0b — "Who's around" panel
let waPanelEl: HTMLElement | null = null
let waListEl: HTMLElement | null = null
let waEmptyEl: HTMLElement | null = null
let waCloseBtn: HTMLButtonElement | null = null
let waOpenBtn: HTMLButtonElement | null = null

export type WhosAroundEntry = {
  name: string
  roomLabel: string
  state: 'idle' | 'sit' | 'dance' | 'sleep' | 'offline'
  nextChangeAt?: string | null  // 'HH:MM' formatted, optional
}
let waProvider: (() => WhosAroundEntry[]) | null = null
export function setWhosAroundProvider(p: () => WhosAroundEntry[]) { waProvider = p }

function ensureWaRefs() {
  if (waPanelEl) return
  waPanelEl = document.getElementById('lounge-whosaround-panel')
  waListEl  = document.getElementById('lounge-whosaround-list')
  waEmptyEl = document.getElementById('lounge-whosaround-empty')
  waCloseBtn = document.getElementById('lounge-whosaround-close') as HTMLButtonElement | null
  waOpenBtn  = document.getElementById('lounge-info-whosaround') as HTMLButtonElement | null
  if (waCloseBtn) waCloseBtn.addEventListener('click', () => hideWhosAroundPanel())
  if (waOpenBtn) waOpenBtn.addEventListener('click', () => { hideInfoPanel(); showWhosAroundPanel() })
  if (waPanelEl) waPanelEl.addEventListener('click', (e) => { if (e.target === waPanelEl) hideWhosAroundPanel() })
}
export function showWhosAroundPanel() {
  ensureWaRefs()
  if (!waPanelEl) return
  renderWa()
  waPanelEl.hidden = false
  playSfx('menu_open')
}
export function hideWhosAroundPanel() {
  if (!waPanelEl) return
  waPanelEl.hidden = true
  playSfx('menu_close')
}
function renderWa() {
  if (!waListEl || !waEmptyEl) return
  const entries = waProvider ? waProvider() : []
  waListEl.innerHTML = ''
  waEmptyEl.hidden = entries.length > 0
  const stateIcon: Record<string, string> = { idle: '🚶', sit: '🪑', dance: '💃', sleep: '💤', offline: '—' }
  for (const e of entries) {
    const li = document.createElement('li')
    li.className = 'wa-item' + (e.state === 'sleep' ? ' is-asleep' : '')
    const ico = document.createElement('span'); ico.className = 'wa-state-icon'; ico.textContent = stateIcon[e.state] ?? '·'
    const name = document.createElement('span'); name.className = 'wa-name'; name.textContent = e.name
    const where = document.createElement('span'); where.className = 'wa-where'; where.textContent = e.roomLabel
    li.appendChild(ico); li.appendChild(name); li.appendChild(where)
    if (e.nextChangeAt) {
      const n = document.createElement('span'); n.className = 'wa-next'; n.textContent = `→ ${e.nextChangeAt}`
      li.appendChild(n)
    }
    waListEl.appendChild(li)
  }
}

// V8.7 — Progress / "Your Story" panel
import { buildProgress, type ProgressMetric } from './progress'

let progressPanelEl: HTMLElement | null = null
let progressListEl: HTMLElement | null = null
let progressSummaryEl: HTMLElement | null = null
let progressCloseBtn: HTMLButtonElement | null = null
let progressOpenBtn: HTMLButtonElement | null = null
let progressDataProvider: (() => Parameters<typeof buildProgress>[0]) | null = null

export function setProgressDataProvider(p: () => Parameters<typeof buildProgress>[0]) {
  progressDataProvider = p
}

function ensureProgressRefs() {
  if (progressPanelEl) return
  progressPanelEl   = document.getElementById('lounge-progress-panel')
  progressListEl    = document.getElementById('lounge-progress-list')
  progressSummaryEl = document.getElementById('lounge-progress-summary')
  progressCloseBtn  = document.getElementById('lounge-progress-close') as HTMLButtonElement | null
  progressOpenBtn   = document.getElementById('lounge-info-progress') as HTMLButtonElement | null
  if (progressCloseBtn) progressCloseBtn.addEventListener('click', () => hideProgressPanel())
  if (progressOpenBtn) progressOpenBtn.addEventListener('click', () => { hideInfoPanel(); showProgressPanel() })
  if (progressPanelEl) progressPanelEl.addEventListener('click', (e) => {
    if (e.target === progressPanelEl) hideProgressPanel()
  })
}

export function showProgressPanel() {
  ensureProgressRefs()
  if (!progressPanelEl) return
  renderProgress()
  progressPanelEl.hidden = false
  playSfx('menu_open')
}

export function hideProgressPanel() {
  if (!progressPanelEl) return
  progressPanelEl.hidden = true
  playSfx('menu_close')
}

function renderProgress() {
  if (!progressListEl || !progressSummaryEl) return
  if (!progressDataProvider) {
    progressSummaryEl.textContent = 'Progress data is not ready yet — try again in a moment.'
    progressListEl.innerHTML = ''
    return
  }
  const { metrics, summary } = buildProgress(progressDataProvider())
  progressSummaryEl.textContent = summary
  progressListEl.innerHTML = ''
  for (const m of metrics) {
    const li = document.createElement('li')
    li.className = 'prog-item'
    const row = document.createElement('div'); row.className = 'p-row'
    const label = document.createElement('span'); label.className = 'p-label'; label.textContent = m.label
    const value = document.createElement('span'); value.className = 'p-value'; value.textContent = m.value
    row.appendChild(label); row.appendChild(value)
    li.appendChild(row)
    if (m.ratio) {
      const bar = document.createElement('div'); bar.className = 'p-bar'
      const fill = document.createElement('div'); fill.className = 'p-fill'
      const pct = m.ratio.need > 0 ? Math.min(100, (m.ratio.have / m.ratio.need) * 100) : 0
      fill.style.width = pct + '%'
      bar.appendChild(fill); li.appendChild(bar)
    }
    if (m.hint) {
      const hint = document.createElement('div'); hint.className = 'p-hint'; hint.textContent = m.hint
      li.appendChild(hint)
    }
    progressListEl.appendChild(li)
  }
}

// V8.6 — Mailbox panel + badge
import { listMail, unreadCount, markRead, deleteMail } from './mailbox'

let mailboxPanelEl: HTMLElement | null = null
let mailboxListEl: HTMLElement | null = null
let mailboxEmptyEl: HTMLElement | null = null
let mailboxCloseBtn: HTMLButtonElement | null = null
let mailboxOpenBtn: HTMLButtonElement | null = null
let mailboxBadgeEl: HTMLElement | null = null

function ensureMailboxRefs() {
  if (mailboxPanelEl) return
  mailboxPanelEl = document.getElementById('lounge-mailbox-panel')
  mailboxListEl  = document.getElementById('lounge-mailbox-list')
  mailboxEmptyEl = document.getElementById('lounge-mailbox-empty')
  mailboxCloseBtn = document.getElementById('lounge-mailbox-close') as HTMLButtonElement | null
  mailboxOpenBtn  = document.getElementById('lounge-info-mailbox') as HTMLButtonElement | null
  mailboxBadgeEl  = document.getElementById('lounge-mailbox-badge')
  if (mailboxCloseBtn) mailboxCloseBtn.addEventListener('click', () => hideMailboxPanel())
  if (mailboxOpenBtn) mailboxOpenBtn.addEventListener('click', () => { hideInfoPanel(); showMailboxPanel() })
  if (mailboxPanelEl) mailboxPanelEl.addEventListener('click', (e) => {
    if (e.target === mailboxPanelEl) hideMailboxPanel()
  })
  paintMailboxBadge()
}

export function refreshMailboxBadge() { paintMailboxBadge() }

function paintMailboxBadge() {
  ensureMailboxRefs()
  if (!mailboxBadgeEl) return
  const n = unreadCount()
  if (n > 0) {
    mailboxBadgeEl.textContent = String(n)
    mailboxBadgeEl.hidden = false
  } else {
    mailboxBadgeEl.hidden = true
  }
}

export function showMailboxPanel() {
  ensureMailboxRefs()
  if (!mailboxPanelEl) return
  renderMailbox()
  mailboxPanelEl.hidden = false
  playSfx('menu_open')
}

export function hideMailboxPanel() {
  if (!mailboxPanelEl) return
  mailboxPanelEl.hidden = true
  paintMailboxBadge()
  playSfx('menu_close')
}

function renderMailbox() {
  if (!mailboxListEl || !mailboxEmptyEl) return
  const all = listMail()
  mailboxListEl.innerHTML = ''
  mailboxEmptyEl.hidden = all.length > 0
  for (const m of all) {
    const card = document.createElement('div')
    card.className = 'mb-letter' + (m.read ? '' : ' unread')
    const from = document.createElement('div'); from.className = 'mb-from'
    from.textContent = `from ${m.from_npc_name}`
    const subj = document.createElement('div'); subj.className = 'mb-subj'; subj.textContent = m.subject
    const body = document.createElement('div'); body.className = 'mb-body'; body.textContent = m.body
    const time = document.createElement('div'); time.className = 'mb-time'
    time.textContent = new Date(m.sent_at).toLocaleString()
    const del = document.createElement('button'); del.className = 'mb-delete'; del.type = 'button'; del.textContent = '×'
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteMail(m.id); renderMailbox(); paintMailboxBadge() })
    card.appendChild(from); card.appendChild(subj); card.appendChild(body); card.appendChild(time); card.appendChild(del)
    card.addEventListener('click', () => {
      if (!m.read) { markRead(m.id); card.classList.remove('unread'); paintMailboxBadge() }
    })
    mailboxListEl.appendChild(card)
  }
}

// V8.5 — Sleep overlay
let sleepOverlayEl: HTMLElement | null = null
let sleepTitleEl: HTMLElement | null = null
let sleepBlurbEl: HTMLElement | null = null
let sleepTimeEl: HTMLElement | null = null
let sleepGoBtn: HTMLButtonElement | null = null
let sleepStayBtn: HTMLButtonElement | null = null
let onSleepChosen: ((slept: boolean) => void) | null = null

function ensureSleepRefs() {
  if (sleepOverlayEl) return
  sleepOverlayEl = document.getElementById('lounge-sleep-overlay')
  sleepTitleEl   = document.getElementById('lounge-sleep-title')
  sleepBlurbEl   = document.getElementById('lounge-sleep-blurb')
  sleepTimeEl    = document.getElementById('lounge-sleep-time')
  sleepGoBtn     = document.getElementById('lounge-sleep-go')   as HTMLButtonElement | null
  sleepStayBtn   = document.getElementById('lounge-sleep-stay') as HTMLButtonElement | null
  if (sleepGoBtn)   sleepGoBtn.addEventListener('click',   () => { const cb = onSleepChosen; hideSleepOverlay(); cb?.(true) })
  if (sleepStayBtn) sleepStayBtn.addEventListener('click', () => { const cb = onSleepChosen; hideSleepOverlay(); cb?.(false) })
}

export function showSleepOverlay(opts: { time: string; venue: 'home' | 'floor'; onChoice: (slept: boolean) => void }) {
  ensureSleepRefs()
  if (!sleepOverlayEl) return
  if (sleepTimeEl) sleepTimeEl.textContent = opts.time
  if (sleepTitleEl) sleepTitleEl.textContent = opts.venue === 'home' ? 'You are home.' : 'The day ends.'
  if (sleepBlurbEl) sleepBlurbEl.textContent = opts.venue === 'home'
    ? 'Sleep in your own bed → full restore.'
    : 'No bed here — sleeping on the floor gives half restore.'
  onSleepChosen = opts.onChoice
  sleepOverlayEl.hidden = false
  playSfx('menu_open')
}

export function hideSleepOverlay() {
  if (!sleepOverlayEl) return
  sleepOverlayEl.hidden = true
  onSleepChosen = null
  playSfx('menu_close')
}

// V8.4 + V9.6 — Shells counter + Mio's Shop (with weekly market)
import { getShells, spendShells, onShellsChange, SHOP, hasPurchased, markPurchased, getEffectivePrice, getActiveMarketEvent, decoStorageKey, type ShopItem } from './shells'

let shellsCounterEl: HTMLElement | null = null
let shellsNumEl: HTMLElement | null = null
let shopPanelEl: HTMLElement | null = null
let shopListEl: HTMLElement | null = null
let shopBalanceEl: HTMLElement | null = null
let shopCloseBtn: HTMLButtonElement | null = null
let shopOpenBtn: HTMLButtonElement | null = null

function ensureShellsRefs() {
  if (shellsCounterEl) return
  shellsCounterEl = document.getElementById('lounge-shells')
  shellsNumEl     = document.getElementById('lounge-shells-num')
  shopPanelEl     = document.getElementById('lounge-shop-panel')
  shopListEl      = document.getElementById('lounge-shop-list')
  shopBalanceEl   = document.getElementById('lounge-shop-balance')
  shopCloseBtn    = document.getElementById('lounge-shop-close') as HTMLButtonElement | null
  shopOpenBtn     = document.getElementById('lounge-info-shop') as HTMLButtonElement | null
  if (shopCloseBtn) shopCloseBtn.addEventListener('click', () => hideShopPanel())
  if (shopOpenBtn) shopOpenBtn.addEventListener('click', () => { hideInfoPanel(); showShopPanel() })
  if (shopPanelEl) shopPanelEl.addEventListener('click', (e) => {
    if (e.target === shopPanelEl) hideShopPanel()
  })
  paintShellsCounter(getShells())
  onShellsChange(paintShellsCounter)
}

function paintShellsCounter(v: number) {
  if (shellsNumEl) shellsNumEl.textContent = String(v)
}

export function showShopPanel() {
  ensureShellsRefs()
  if (!shopPanelEl) return
  renderShop()
  shopPanelEl.hidden = false
  playSfx('menu_open')
}

export function hideShopPanel() {
  if (!shopPanelEl) return
  shopPanelEl.hidden = true
  playSfx('menu_close')
}

function renderShop() {
  if (!shopListEl || !shopBalanceEl) return
  const bal = getShells()
  shopBalanceEl.textContent = String(bal)
  shopListEl.innerHTML = ''
  // V9.6 — weekly market event banner (if present and non-neutral)
  const evt = getActiveMarketEvent()
  if (evt) {
    const banner = document.createElement('div')
    banner.style.cssText = 'margin-bottom:10px;padding:8px 12px;border-radius:6px;background:rgba(180,140,255,.15);border:1px solid rgba(180,140,255,.4);color:#cfb8ff;font-size:11px;'
    banner.innerHTML = `<strong>${evt.emoji} ${evt.name}</strong> — ${evt.blurb}`
    shopListEl.appendChild(banner)
  }
  for (const item of SHOP) {
    // V10.3 — marriage_pebble is consumable; show stack count instead of "Owned".
    const isPebble = item.id === 'marriage_pebble'
    const owned = !isPebble && hasPurchased(item.id)
    // V9.6 — effective price applies market fluctuation and event multiplier
    let effective = getEffectivePrice(item)
    if (evt) effective = Math.max(1, Math.round(effective * evt.multiplier))
    const canAfford = bal >= effective
    const row = document.createElement('div')
    row.className = 'shop-item'
    const name = document.createElement('div')
    name.className = 'si-name'
    const title = document.createElement('div'); title.className = 'si-title'; title.textContent = item.name
    const blurb = document.createElement('div'); blurb.className = 'si-blurb'; blurb.textContent = item.blurb
    if (isPebble) {
      try {
        const count = Number(localStorage.getItem('lounge_marriage_pebble_v1') || '0')
        if (count > 0) {
          const own = document.createElement('div')
          own.className = 'si-blurb'; own.style.color = '#ffd166'
          own.textContent = `You have ${count} in your bag.`
          name.appendChild(title); name.appendChild(blurb); name.appendChild(own)
        } else { name.appendChild(title); name.appendChild(blurb) }
      } catch { name.appendChild(title); name.appendChild(blurb) }
    } else { name.appendChild(title); name.appendChild(blurb) }
    const cost = document.createElement('div'); cost.className = 'si-cost'
    if (effective !== item.cost) {
      cost.innerHTML = `🐚 <s style="color:#888">${item.cost}</s> ${effective}`
    } else {
      cost.textContent = `🐚 ${effective}`
    }
    const buy = document.createElement('button'); buy.type = 'button'
    buy.textContent = owned ? 'Owned' : 'Buy'
    buy.disabled = owned || !canAfford
    buy.addEventListener('click', () => buyItem(item, effective))
    row.appendChild(name); row.appendChild(cost); row.appendChild(buy)
    shopListEl.appendChild(row)
  }
}

function buyItem(item: ShopItem, effectivePrice: number) {
  // V10.3 — marriage_pebble is a consumable; don't mark hasPurchased so the
  // player can re-buy after each propose. Stack via marriage.addMarriagePebble.
  if (item.id === 'marriage_pebble') {
    if (!spendShells(effectivePrice)) return
    import('./marriage').then(m => { m.addMarriagePebble(1); renderShop() })
    import('./achievements').then(m => m.recordEvent({ type: 'shop_purchase', itemId: item.id }))
    return
  }
  if (hasPurchased(item.id)) return
  if (!spendShells(effectivePrice)) return
  markPurchased(item.id)
  // V10.4 — record shop purchase achievement. Also detect "all decor owned".
  import('./achievements').then(m => {
    const decorIds = SHOP.filter(s => s.effect === 'decoration').map(s => s.id)
    const allDecorOwned = decorIds.every(id => hasPurchased(id))
    m.recordEvent({ type: 'shop_purchase', itemId: item.id, allDecorOwned })
  })
  renderShop()
}

// V8.3 — Camera tool button + memories panel
import { getEquippedTool, setEquippedTool, listMemories, deleteMemory } from './memories'

let cameraBtn: HTMLButtonElement | null = null
let memoriesPanelEl: HTMLElement | null = null
let memoriesListEl: HTMLElement | null = null
let memoriesEmptyEl: HTMLElement | null = null
let memoriesCloseBtn: HTMLButtonElement | null = null
let memoriesOpenBtn: HTMLButtonElement | null = null

function paintCameraBtn() {
  if (!cameraBtn) return
  const equipped = getEquippedTool() === 'camera'
  cameraBtn.classList.toggle('equipped', equipped)
  cameraBtn.title = equipped
    ? 'Camera equipped — click anywhere to capture (right-click to put away)'
    : 'Equip camera (click anywhere to capture)'
}

function ensureCameraRefs() {
  if (cameraBtn) return
  cameraBtn = document.getElementById('lounge-camera-btn') as HTMLButtonElement | null
  if (cameraBtn) {
    cameraBtn.addEventListener('click', () => {
      const next = getEquippedTool() === 'camera' ? 'none' : 'camera'
      setEquippedTool(next)
      paintCameraBtn()
    })
    cameraBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      setEquippedTool('none')
      paintCameraBtn()
    })
  }
  paintCameraBtn()
}

function ensureMemoriesRefs() {
  if (memoriesPanelEl) return
  memoriesPanelEl  = document.getElementById('lounge-memories-panel')
  memoriesListEl   = document.getElementById('lounge-memories-list')
  memoriesEmptyEl  = document.getElementById('lounge-memories-empty')
  memoriesCloseBtn = document.getElementById('lounge-memories-close') as HTMLButtonElement | null
  memoriesOpenBtn  = document.getElementById('lounge-info-memories') as HTMLButtonElement | null
  if (memoriesCloseBtn) memoriesCloseBtn.addEventListener('click', () => hideMemoriesPanel())
  if (memoriesOpenBtn) memoriesOpenBtn.addEventListener('click', () => { hideInfoPanel(); showMemoriesPanel() })
  if (memoriesPanelEl) memoriesPanelEl.addEventListener('click', (e) => {
    if (e.target === memoriesPanelEl) hideMemoriesPanel()
  })
}

export function showMemoriesPanel() {
  ensureMemoriesRefs()
  if (!memoriesPanelEl) return
  renderMemories()
  memoriesPanelEl.hidden = false
  playSfx('menu_open')
}

export function hideMemoriesPanel() {
  if (!memoriesPanelEl) return
  memoriesPanelEl.hidden = true
  playSfx('menu_close')
}

function renderMemories() {
  if (!memoriesListEl || !memoriesEmptyEl) return
  const list = listMemories()
  memoriesListEl.innerHTML = ''
  memoriesEmptyEl.hidden = list.length > 0
  for (const m of list) {
    const tile = document.createElement('div')
    tile.className = 'mem-tile'
    const time = document.createElement('div')
    time.className = 'mem-time'
    time.textContent = '📷 ' + m.gameTime
    const room = document.createElement('div')
    room.className = 'mem-room'
    room.textContent = m.roomLabel
    const meta = document.createElement('div')
    meta.className = 'mem-meta'
    const parts: string[] = []
    if (m.visibleNpcs.length > 0) parts.push(`with ${m.visibleNpcs.join(', ')}`)
    if (m.visiblePeers.length > 0) parts.push(`+${m.visiblePeers.length} peer${m.visiblePeers.length > 1 ? 's' : ''}`)
    if (m.weather) parts.push(m.weather)
    meta.textContent = parts.join(' · ') || new Date(m.realTimestamp).toLocaleString()
    const del = document.createElement('button')
    del.className = 'mem-delete'
    del.type = 'button'
    del.textContent = '×'
    del.addEventListener('click', () => { deleteMemory(m.id); renderMemories() })
    tile.appendChild(time)
    tile.appendChild(room)
    tile.appendChild(meta)
    tile.appendChild(del)
    memoriesListEl.appendChild(tile)
  }
}

// V8.0 — Game time clock + toggle
import { isGameTimeEnabled, setGameTimeEnabled, formatGameTime, getGameNow } from './gametime'

let clockEl: HTMLElement | null = null
let clockTimeEl: HTMLElement | null = null
let clockModeEl: HTMLElement | null = null
let gametimeBtn: HTMLButtonElement | null = null
let clockTimer: number | null = null

function ensureClockRefs() {
  if (clockEl) return
  clockEl = document.getElementById('lounge-clock')
  clockTimeEl = document.getElementById('lounge-clock-time')
  clockModeEl = document.getElementById('lounge-clock-mode')
  gametimeBtn = document.getElementById('lounge-info-gametime') as HTMLButtonElement | null
}

function applyClockMode(enabled: boolean) {
  ensureClockRefs()
  if (clockEl) clockEl.hidden = !enabled
  if (clockModeEl) clockModeEl.textContent = enabled ? 'game' : 'real'
  if (gametimeBtn) {
    gametimeBtn.dataset.on = enabled ? '1' : '0'
    gametimeBtn.textContent = enabled ? '⏰ Game time: on' : '⏰ Game time: off'
  }
}

function tickClock() {
  ensureClockRefs()
  if (!clockEl || !clockTimeEl) return
  if (!isGameTimeEnabled()) return
  clockTimeEl.textContent = formatGameTime(getGameNow())
}

// V8.1 — Energy bar UI
import { getEnergy, onEnergyChange, ENERGY_MAX } from './energy'
let energyBarEl: HTMLElement | null = null
let energyFillEl: HTMLElement | null = null
let energyNumEl: HTMLElement | null = null

function ensureEnergyRefs() {
  if (energyBarEl) return
  energyBarEl  = document.getElementById('lounge-energy')
  energyFillEl = document.getElementById('lounge-energy-fill')
  energyNumEl  = document.getElementById('lounge-energy-num')
}
function paintEnergy(value: number) {
  ensureEnergyRefs()
  if (!energyBarEl || !energyFillEl || !energyNumEl) return
  const pct = Math.max(0, Math.min(100, (value / ENERGY_MAX) * 100))
  energyFillEl.style.width = pct + '%'
  energyNumEl.textContent = String(Math.round(value))
  energyBarEl.classList.toggle('low',  value < 30 && value >= 10)
  energyBarEl.classList.toggle('crit', value < 10)
}
export function initEnergyBar() {
  paintEnergy(getEnergy())
  onEnergyChange((v) => paintEnergy(v))
}

export function initGameTimeClock() {
  ensureClockRefs()
  applyClockMode(isGameTimeEnabled())
  if (clockTimer) clearInterval(clockTimer)
  clockTimer = window.setInterval(tickClock, 5000)
  tickClock()
  if (gametimeBtn) {
    gametimeBtn.addEventListener('click', () => {
      const next = !isGameTimeEnabled()
      setGameTimeEnabled(next)
      applyClockMode(next)
      tickClock()
    })
  }
  // V12.5 — home visit log panel (opens from info-panel button)
  const visitsBtn = document.getElementById('lounge-info-visits') as HTMLButtonElement | null
  const visitsPanel = document.getElementById('lounge-visits-panel') as HTMLElement | null
  const visitsListEl = document.getElementById('lounge-visits-list') as HTMLElement | null
  const visitsEmptyEl = document.getElementById('lounge-visits-empty') as HTMLElement | null
  const visitsCloseBtn = document.getElementById('lounge-visits-close') as HTMLButtonElement | null
  if (visitsBtn && visitsPanel && visitsListEl && visitsEmptyEl && visitsCloseBtn) {
    const shortAgo = (iso: string): string => {
      const ms = Date.now() - new Date(iso).getTime()
      if (ms < 3600_000)  return `${Math.max(1, Math.floor(ms / 60_000))}m ago`
      if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h ago`
      return `${Math.floor(ms / 86400_000)}d ago`
    }
    const render = async () => {
      const visits = await (await import('./home_visits')).fetchMyHomeVisits()
      visitsListEl.innerHTML = ''
      visitsEmptyEl.hidden = visits.length > 0
      for (const v of visits) {
        const li = document.createElement('li')
        const name = document.createElement('span'); name.className = 'vs-name'
        name.textContent = v.guest_name || 'anonymous'
        const time = document.createElement('span'); time.className = 'vs-time'; time.textContent = shortAgo(v.visited_at)
        li.appendChild(name); li.appendChild(time)
        visitsListEl.appendChild(li)
      }
    }
    visitsBtn.addEventListener('click', () => {
      hideInfoPanel()
      visitsPanel.hidden = false
      void render()
    })
    visitsCloseBtn.addEventListener('click', () => { visitsPanel.hidden = true })
  }
  // V10.6 — friend notifications toggle (lives in the same Info panel column)
  const fnBtn = document.getElementById('lounge-info-friend-notifs') as HTMLButtonElement | null
  if (fnBtn) {
    import('./mailbox').then(m => {
      const paint = (on: boolean) => {
        fnBtn.dataset.on = on ? '1' : '0'
        fnBtn.textContent = on ? '🔔 Friend notifications: on' : '🔕 Friend notifications: off'
      }
      paint(m.isFriendNotifsEnabled())
      fnBtn.addEventListener('click', () => {
        const next = !m.isFriendNotifsEnabled()
        m.setFriendNotifsEnabled(next)
        paint(next)
      })
    })
  }
}

// V7.4 — Quests panel
import { listAcceptedQuests, type QuestDef } from './quests'
let questsPanelEl: HTMLElement | null = null
let questsListEl: HTMLElement | null = null
let questsEmptyEl: HTMLElement | null = null
let questsCloseBtn: HTMLButtonElement | null = null
let questsOpenBtn: HTMLButtonElement | null = null

function ensureQuestsRefs() {
  if (questsPanelEl) return
  questsPanelEl = document.getElementById('lounge-quests-panel')
  questsListEl  = document.getElementById('lounge-quests-list')
  questsEmptyEl = document.getElementById('lounge-quests-empty')
  questsCloseBtn = document.getElementById('lounge-quests-close') as HTMLButtonElement | null
  questsOpenBtn  = document.getElementById('lounge-info-quests') as HTMLButtonElement | null
  if (questsCloseBtn) questsCloseBtn.addEventListener('click', () => hideQuestsPanel())
  if (questsOpenBtn) questsOpenBtn.addEventListener('click', () => { hideInfoPanel(); showQuestsPanel() })
  if (questsPanelEl) questsPanelEl.addEventListener('click', (e) => {
    if (e.target === questsPanelEl) hideQuestsPanel()
  })
}

export function showQuestsPanel() {
  ensureQuestsRefs()
  if (!questsPanelEl) return
  renderQuests()
  questsPanelEl.hidden = false
  playSfx('menu_open')
}

export function hideQuestsPanel() {
  if (!questsPanelEl) return
  questsPanelEl.hidden = true
  playSfx('menu_close')
}

function renderQuests() {
  if (!questsListEl || !questsEmptyEl) return
  const accepted = listAcceptedQuests()
  questsListEl.innerHTML = ''
  questsEmptyEl.hidden = accepted.length > 0
  for (const { def, state } of accepted) {
    const card = document.createElement('div')
    card.className = 'qp-quest' + (state.completed ? ' done' : '')
    const title = document.createElement('div')
    title.className = 'qp-title'
    title.textContent = def.title
    const giver = document.createElement('div')
    giver.className = 'qp-giver'
    giver.textContent = `from ${def.giver_npc.replace('npc_', '').replace(/^./, c => c.toUpperCase())}`
    const blurb = document.createElement('p')
    blurb.className = 'qp-blurb'
    blurb.textContent = def.blurb
    card.appendChild(title)
    card.appendChild(giver)
    card.appendChild(blurb)
    for (const step of def.steps) {
      const sEl = document.createElement('div')
      const done = state.completedSteps.includes(step.id)
      sEl.className = 'qp-step' + (done ? ' done' : '')
      sEl.textContent = `${done ? '✓' : '○'}  ${step.description}`
      card.appendChild(sEl)
    }
    if (state.completed) {
      const reward = document.createElement('div')
      reward.className = 'qp-reward'
      reward.textContent = '🎁 ' + def.reward
      card.appendChild(reward)
    }
    questsListEl.appendChild(card)
  }
}

export function hideInfoPanel() {
  if (!infoPanelEl || infoPanelEl.hidden) return
  infoPanelEl.hidden = true
  playSfx('menu_close')
}

export function showReplacedOverlay() {
  if (!replacedOverlayEl) return
  replacedOverlayEl.hidden = false
}

// V3.2 — Listening Booth picker + now-playing pill

let boothPickerEl: HTMLElement | null = null
let boothListEl: HTMLElement | null = null
let boothStopBtn: HTMLButtonElement | null = null
let boothCloseBtn: HTMLButtonElement | null = null
let nowPlayingEl: HTMLElement | null = null
let nowPlayingNameEl: HTMLElement | null = null

export function showBoothPicker(
  tracks: Array<{ id: string; name: string }>,
  currentId: string | null,
  onPick: (id: string) => void,
  onStop: () => void
) {
  if (!boothPickerEl) boothPickerEl = document.getElementById('lounge-booth-picker')
  if (!boothListEl) boothListEl = document.getElementById('lounge-booth-list')
  if (!boothStopBtn) boothStopBtn = document.getElementById('lounge-booth-stop') as HTMLButtonElement | null
  if (!boothCloseBtn) boothCloseBtn = document.getElementById('lounge-booth-close') as HTMLButtonElement | null
  if (!boothPickerEl || !boothListEl) return

  boothListEl.innerHTML = ''
  for (const t of tracks) {
    const li = document.createElement('li')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = t.name
    btn.setAttribute('data-track-id', t.id)
    if (t.id === currentId) btn.classList.add('is-playing')
    btn.addEventListener('click', () => onPick(t.id))
    li.appendChild(btn)
    boothListEl.appendChild(li)
  }
  if (boothStopBtn) {
    boothStopBtn.onclick = () => onStop()
  }
  if (boothCloseBtn) {
    boothCloseBtn.onclick = () => hideBoothPicker()
  }
  boothPickerEl.hidden = false
  playSfx('menu_open')
}

export function hideBoothPicker() {
  if (!boothPickerEl) boothPickerEl = document.getElementById('lounge-booth-picker')
  if (!boothPickerEl || boothPickerEl.hidden) return
  boothPickerEl.hidden = true
  playSfx('menu_close')
}

export function isBoothPickerOpen(): boolean {
  if (!boothPickerEl) boothPickerEl = document.getElementById('lounge-booth-picker')
  return !!boothPickerEl && !boothPickerEl.hidden
}

export function showNowPlaying(name: string) {
  if (!nowPlayingEl) nowPlayingEl = document.getElementById('lounge-now-playing')
  if (!nowPlayingNameEl) nowPlayingNameEl = document.getElementById('lounge-now-playing-name')
  if (!nowPlayingEl || !nowPlayingNameEl) return
  nowPlayingNameEl.textContent = name
  nowPlayingEl.hidden = false
  // Update "is-playing" highlight in picker if open
  if (boothListEl) {
    boothListEl.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-playing', b.textContent === name)
    })
  }
}

export function hideNowPlaying() {
  if (!nowPlayingEl) nowPlayingEl = document.getElementById('lounge-now-playing')
  if (!nowPlayingEl) return
  nowPlayingEl.hidden = true
  if (boothListEl) {
    boothListEl.querySelectorAll('button.is-playing').forEach((b) => b.classList.remove('is-playing'))
  }
}

// V3.3 — Inventory panel

let invBtnEl: HTMLElement | null = null
let invPanelEl: HTMLElement | null = null
let invCountEl: HTMLElement | null = null
let invTotalEl: HTMLElement | null = null
let invListEl: HTMLElement | null = null
let invGridEl: HTMLElement | null = null            // V8.2
let invTrashEl: HTMLElement | null = null           // P3
let invViewBtnGrid: HTMLButtonElement | null = null
let invViewBtnList: HTMLButtonElement | null = null
let invCurrentView: 'grid' | 'list' = 'grid'
const INVENTORY_GRID_SLOTS = 36
const INV_ORDER_KEY = 'lounge_inv_order_v1'         // P3 — drag-drop persisted order
function loadInvOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(INV_ORDER_KEY) || '[]') as string[] } catch { return [] }
}
function saveInvOrder(order: string[]) {
  try { localStorage.setItem(INV_ORDER_KEY, JSON.stringify(order)) } catch {}
}
let invDataProvider: (() => { items: Array<{ id: string; name: string; collected: boolean; giftedByName?: string | null; placedInHome?: boolean }>; total: number; collected: number; canPlace?: boolean }) | null = null
let onInventoryPlace: ((id: string, name: string) => void) | null = null

export function setInventoryDataProvider(provider: () => { items: Array<{ id: string; name: string; collected: boolean; giftedByName?: string | null; placedInHome?: boolean }>; total: number; collected: number; canPlace?: boolean; gridSlots?: number }, onPlace?: (id: string, name: string) => void) {
  if (onPlace) onInventoryPlace = onPlace
  invDataProvider = provider
  if (!invBtnEl) {
    invBtnEl = document.getElementById('lounge-inventory-btn')
    invPanelEl = document.getElementById('lounge-inventory-panel')
    invCountEl = document.getElementById('lounge-inv-count')
    invTotalEl = document.getElementById('lounge-inv-total')
    invListEl = document.getElementById('lounge-inv-list')
    invGridEl = document.getElementById('lounge-inv-grid')
    invTrashEl = document.getElementById('lounge-inv-trash')
    invViewBtnGrid = document.getElementById('lounge-inv-view-grid') as HTMLButtonElement | null
    invViewBtnList = document.getElementById('lounge-inv-view-list') as HTMLButtonElement | null
    if (invViewBtnGrid) invViewBtnGrid.addEventListener('click', () => setInventoryView('grid'))
    if (invViewBtnList) invViewBtnList.addEventListener('click', () => setInventoryView('list'))
    // P3 — trash slot accepts drops of shop_* items (deletes purchase)
    if (invTrashEl) {
      invTrashEl.addEventListener('dragover', (e) => { e.preventDefault(); invTrashEl?.classList.add('drop-target') })
      invTrashEl.addEventListener('dragleave', () => invTrashEl?.classList.remove('drop-target'))
      invTrashEl.addEventListener('drop', (e) => {
        e.preventDefault()
        invTrashEl?.classList.remove('drop-target')
        const itemId = e.dataTransfer?.getData('text/plain')
        if (!itemId) return
        if (itemId.startsWith('shop_')) {
          // P7-fix: refund 50% of original cost so trashing isn't a free re-buy.
          // Find the SHOP entry by id; if found, refund half its cost.
          try {
            const shopId = decoStorageKey(itemId)
            // SHOP catalog is in shells.ts but we already imported it for shop UI
            const item = SHOP.find(s => s.id === shopId as any)
            if (item) {
              const refund = Math.floor(item.cost / 2)
              // bump shells by refund
              const cur = Number(localStorage.getItem('lounge_shells_v1') || '0')
              localStorage.setItem('lounge_shells_v1', String(cur + refund))
            }
            const raw = localStorage.getItem('lounge_purchases_v1') || '{}'
            const m = JSON.parse(raw)
            delete m[shopId]
            localStorage.setItem('lounge_purchases_v1', JSON.stringify(m))
            renderInventory()
            // also clean up dead ids from inv_order
            const order = loadInvOrder().filter(id => id !== itemId)
            saveInvOrder(order)
            showToast(`Discarded. Half-refund issued.`, 2000)
          } catch {}
        } else {
          // Pebbles can't be trashed (server-side state)
          showToast('That can\'t be discarded.', 1800)
        }
      })
    }
    if (invBtnEl) {
      invBtnEl.addEventListener('click', (e) => {
        e.stopPropagation()
        if (invPanelEl?.hidden) { renderInventory(); invPanelEl.hidden = false; playSfx('menu_open') }
        else hideInventoryPanel()
      })
    }
    if (invPanelEl) invPanelEl.addEventListener('click', (e) => e.stopPropagation())
  }
}

function setInventoryView(view: 'grid' | 'list') {
  invCurrentView = view
  if (invGridEl) invGridEl.hidden = view !== 'grid'
  if (invListEl) invListEl.hidden = view !== 'list'
  if (invViewBtnGrid) invViewBtnGrid.classList.toggle('active', view === 'grid')
  if (invViewBtnList) invViewBtnList.classList.toggle('active', view === 'list')
  if (invDataProvider) renderInventory()
}

function renderInventoryGrid(data: ReturnType<NonNullable<typeof invDataProvider>>) {
  if (!invGridEl) return
  invGridEl.innerHTML = ''
  const collected = data.items.filter(it => it.collected)
  // P3 — apply persisted drag-drop order; new items append in collection order
  const savedOrder = loadInvOrder()
  const byId = new Map(collected.map(it => [it.id, it]))
  const ordered: typeof collected = []
  for (const id of savedOrder) { const it = byId.get(id); if (it) { ordered.push(it); byId.delete(id) } }
  for (const [, it] of byId) ordered.push(it)
  // P1 — pebble_bag_plus expands slot count from 36 → 44
  const slots = data.gridSlots ?? INVENTORY_GRID_SLOTS
  for (let i = 0; i < slots; i++) {
    const slot = document.createElement('div')
    slot.className = 'inv-slot'
    slot.dataset.slotIndex = String(i)
    const it = ordered[i]
    if (it) {
      slot.classList.add('filled')
      slot.draggable = true
      slot.dataset.itemId = it.id
      slot.title = it.giftedByName ? `${it.name}  ·  🎁 ${it.giftedByName}` : it.name
      const icon = document.createElement('span')
      icon.className = 'inv-icon'
      icon.textContent = '✦'
      slot.appendChild(icon)
      if (data.canPlace) {
        slot.addEventListener('click', () => {
          if (it.placedInHome) return
          hideInventoryPanel()
          onInventoryPlace?.(it.id, it.name)
        })
      }
      // P3 — drag handlers
      slot.addEventListener('dragstart', (e) => {
        slot.classList.add('dragging')
        e.dataTransfer?.setData('text/plain', it.id)
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
      })
      slot.addEventListener('dragend', () => slot.classList.remove('dragging'))
    }
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drop-target') })
    slot.addEventListener('dragleave', () => slot.classList.remove('drop-target'))
    slot.addEventListener('drop', (e) => {
      e.preventDefault()
      slot.classList.remove('drop-target')
      // P7-fix: reject non-text/plain drops (e.g. file drag from OS)
      const types = e.dataTransfer?.types
      if (!types || !Array.from(types).includes('text/plain')) return
      const draggedId = e.dataTransfer?.getData('text/plain')
      if (!draggedId) return
      const targetIdx = Number(slot.dataset.slotIndex || '0')
      const ids = ordered.map(o => o.id)
      const draggedIdx = ids.indexOf(draggedId)
      if (draggedIdx < 0) return
      ids.splice(draggedIdx, 1)
      ids.splice(Math.min(targetIdx, ids.length), 0, draggedId)
      saveInvOrder(ids)
      renderInventory()
    })
    invGridEl.appendChild(slot)
  }
}

function renderInventory() {
  if (!invDataProvider || !invCountEl || !invTotalEl) return
  const data = invDataProvider()
  invCountEl.textContent = String(data.collected)
  invTotalEl.textContent = String(data.total)
  if (invCurrentView === 'grid') {
    renderInventoryGrid(data)
    return
  }
  if (!invListEl) return
  invListEl.innerHTML = ''
  for (const it of data.items) {
    const li = document.createElement('li')
    li.className = it.collected ? 'is-collected' : 'is-locked'
    if (it.collected) {
      const label = it.giftedByName
        ? `${it.name} · 🎁 ${it.giftedByName}`
        : it.name
      const nameSpan = document.createElement('span')
      nameSpan.textContent = label
      nameSpan.style.flex = '1'
      li.style.display = 'flex'
      li.style.alignItems = 'center'
      li.style.gap = '6px'
      li.appendChild(nameSpan)
      if (data.canPlace) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = it.placedInHome ? '✓' : 'Place'
        btn.disabled = !!it.placedInHome
        btn.style.cssText = 'padding:2px 6px;font-size:10px;border-radius:3px;background:rgba(255,209,102,.18);color:#ffd166;border:1px solid rgba(255,209,102,.4);cursor:pointer;font-family:inherit;'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          if (it.placedInHome) return
          hideInventoryPanel()
          onInventoryPlace?.(it.id, it.name)
        })
        li.appendChild(btn)
      }
    } else {
      li.textContent = '???'
    }
    invListEl.appendChild(li)
  }
}

export function refreshInventoryPanel() {
  if (invPanelEl && !invPanelEl.hidden) renderInventory()
}

export function hideInventoryPanel() {
  if (!invPanelEl || invPanelEl.hidden) return
  invPanelEl.hidden = true
  playSfx('menu_close')
}

// V4.1 — Peer-click menu, gift modal, messages panel, toast

let peerMenuEl: HTMLElement | null = null
let giftModalEl: HTMLElement | null = null
let giftToNameEl: HTMLElement | null = null
let giftListEl: HTMLElement | null = null
let giftEmptyEl: HTMLElement | null = null
let giftCancelBtn: HTMLButtonElement | null = null
let toastEl: HTMLElement | null = null
let messagesBtnEl: HTMLElement | null = null
let messagesBadgeEl: HTMLElement | null = null
let messagesPanelEl: HTMLElement | null = null
let messagesListEl: HTMLElement | null = null
let messagesEmptyEl: HTMLElement | null = null
let threadViewEl: HTMLElement | null = null
let threadNameEl: HTMLElement | null = null
let threadMessagesEl: HTMLElement | null = null
let threadFormEl: HTMLFormElement | null = null
let threadInputEl: HTMLInputElement | null = null
let threadBackBtn: HTMLButtonElement | null = null

type PeerMenuAction = 'profile' | 'wave' | 'gift' | 'dm' | 'visit_home'   // V12.4 + V17.2
let onPeerMenuAction: ((action: PeerMenuAction) => void) | null = null

export function showPeerMenu(screenX: number, screenY: number, onAction: (action: PeerMenuAction) => void) {
  if (!peerMenuEl) peerMenuEl = document.getElementById('lounge-peer-menu')
  if (!peerMenuEl) return
  onPeerMenuAction = onAction
  peerMenuEl.style.left = `${screenX}px`
  peerMenuEl.style.top = `${screenY - 8}px`
  peerMenuEl.hidden = false
  if (!peerMenuEl.dataset.bound) {
    peerMenuEl.dataset.bound = '1'
    peerMenuEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
      if (!btn) return
      const action = btn.getAttribute('data-action') as PeerMenuAction
      hidePeerMenu()
      onPeerMenuAction?.(action)
    })
    peerMenuEl.addEventListener('click', (e) => e.stopPropagation())
  }
}

export function hidePeerMenu() {
  if (!peerMenuEl) peerMenuEl = document.getElementById('lounge-peer-menu')
  if (!peerMenuEl || peerMenuEl.hidden) return
  peerMenuEl.hidden = true
}

// V17.2 — Profile card modal. Shows bio/status/mood/pinned for a peer
// (or self) by reading from the profile cache the WS layer populates.
let pcEl: HTMLElement | null = null
let pcNameEl: HTMLElement | null = null
let pcMoodEl: HTMLElement | null = null
let pcStatusEl: HTMLElement | null = null
let pcBioEl: HTMLElement | null = null
let pcEmptyEl: HTMLElement | null = null
let pcPinnedSection: HTMLElement | null = null
let pcPinnedListEl: HTMLElement | null = null
let pcPhotosSection: HTMLElement | null = null
let pcPhotosGridEl: HTMLElement | null = null
// V20.3 — handler the scene wires to send a reaction over WS
let onPhotoReact: ((ownerVisitorId: string, photoId: string, emoji: string) => void) | null = null
export function setOnPhotoReact(fn: (ownerVisitorId: string, photoId: string, emoji: string) => void) {
  onPhotoReact = fn
}

function ensurePcRefs() {
  if (pcEl) return
  pcEl = document.getElementById('lounge-profile-card')
  pcNameEl = document.getElementById('lounge-profile-card-name')
  pcMoodEl = document.getElementById('lounge-profile-card-mood')
  pcStatusEl = document.getElementById('lounge-profile-card-status')
  pcBioEl = document.getElementById('lounge-profile-card-bio')
  pcEmptyEl = document.getElementById('lounge-profile-card-empty')
  pcPinnedSection = document.getElementById('lounge-profile-card-pinned')
  pcPinnedListEl = document.getElementById('lounge-profile-card-pinned-list')
  pcPhotosSection = document.getElementById('lounge-profile-card-photos')
  pcPhotosGridEl = document.getElementById('lounge-profile-card-photos-grid')
  const closeBtn = document.getElementById('lounge-profile-card-close')
  if (!pcEl) return
  closeBtn?.addEventListener('click', () => hideProfileCard())
  pcEl.addEventListener('click', (e) => {
    if (e.target === pcEl) hideProfileCard()
  })
}
export function showProfileCard(displayName: string, profile: {
  bio: string | null
  status: string | null
  mood: string | null
  pinned_achievements: string[]
  pinned_photos?: Array<{ id: string; dataUrl: string; roomLabel: string; takenAt: number }>
} | null, ownerVisitorId?: string | null) {
  ensurePcRefs()
  if (!pcEl) return
  if (pcNameEl) pcNameEl.textContent = displayName || 'Anonymous'
  if (pcMoodEl) pcMoodEl.textContent = profile?.mood ?? ''
  if (pcStatusEl) pcStatusEl.textContent = profile?.status ?? ''
  if (pcBioEl) pcBioEl.textContent = profile?.bio ?? ''
  const hasContent = !!(profile && (profile.bio || profile.status || profile.mood))
  if (pcEmptyEl) pcEmptyEl.hidden = hasContent
  const pinned = profile?.pinned_achievements ?? []
  if (pcPinnedSection) pcPinnedSection.hidden = pinned.length === 0
  if (pcPinnedListEl) {
    pcPinnedListEl.innerHTML = ''
    // V17.4 — resolve achievement id → human-readable name + tier reward.
    // Lazy-load so the card module doesn't pull in the whole achievements
    // registry on first paint; tiny delay between card open and pin
    // labels showing is acceptable.
    void import('./achievements').then(({ ACHIEVEMENTS, TIER_REWARD }) => {
      if (!pcPinnedListEl) return
      pcPinnedListEl.innerHTML = ''
      for (const id of pinned) {
        const def = ACHIEVEMENTS.find(a => a.id === id)
        const li = document.createElement('li')
        if (def) {
          li.innerHTML = `<strong>${def.name}</strong> <span style="opacity:.65">· 🐚 ${TIER_REWARD[def.tier]}</span>`
        } else {
          li.textContent = id   // unknown id (e.g. renamed) — show raw
        }
        pcPinnedListEl.appendChild(li)
      }
    })
  }
  // V20.2 — render pinned photos grid (up to 3). Tiles open the lightbox
  // when clicked; V20.3 reactions row sits below each tile.
  const photos = profile?.pinned_photos ?? []
  if (pcPhotosSection) pcPhotosSection.hidden = photos.length === 0
  if (pcPhotosGridEl) {
    pcPhotosGridEl.innerHTML = ''
    for (const photo of photos) {
      const wrapper = document.createElement('div')
      const tile = document.createElement('div')
      tile.className = 'pc-photo-tile'
      const img = document.createElement('img')
      img.src = photo.dataUrl
      img.alt = photo.roomLabel
      img.title = `${photo.roomLabel} · ${new Date(photo.takenAt).toLocaleString()}`
      tile.appendChild(img)
      tile.addEventListener('click', () => openProfilePhotoLightbox(photo))
      wrapper.appendChild(tile)
      // V20.3 — reactions: clickable preset emojis (+ live counts from cache)
      if (ownerVisitorId) {
        const row = document.createElement('div')
        row.className = 'pc-photo-reactions'
        const reactions = getPhotoReactionsFor(ownerVisitorId, photo.id)
        const PRESETS = ['❤️', '😂', '✨', '👏', '🌧']
        for (const emoji of PRESETS) {
          const count = reactions.get(emoji)?.count ?? 0
          if (count === 0) continue
          const chip = document.createElement('button')
          chip.type = 'button'
          chip.className = 'pc-photo-reaction' + (reactions.get(emoji)?.mine ? ' is-mine' : '')
          chip.textContent = `${emoji} ${count}`
          chip.addEventListener('click', (e) => {
            e.stopPropagation()
            onPhotoReact?.(ownerVisitorId, photo.id, emoji)
          })
          row.appendChild(chip)
        }
        const addBtn = document.createElement('button')
        addBtn.type = 'button'
        addBtn.className = 'pc-photo-react-add'
        addBtn.textContent = '+'
        addBtn.title = 'React'
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          // Tiny inline picker — let user pick from the preset row.
          const pick = window.prompt('React with an emoji (one):', '❤️')
          if (pick) onPhotoReact?.(ownerVisitorId, photo.id, Array.from(pick.trim())[0] ?? '')
        })
        row.appendChild(addBtn)
        wrapper.appendChild(row)
      }
      pcPhotosGridEl.appendChild(wrapper)
    }
  }
  pcEl.hidden = false
}

function openProfilePhotoLightbox(photo: { dataUrl: string; roomLabel: string; takenAt: number }) {
  const box = document.createElement('div')
  box.className = 'ph-lightbox'
  const img = document.createElement('img'); img.src = photo.dataUrl
  const cap = document.createElement('div'); cap.className = 'ph-cap'
  cap.textContent = `${photo.roomLabel} · ${new Date(photo.takenAt).toLocaleString()}`
  box.appendChild(img); box.appendChild(cap)
  box.addEventListener('click', () => box.remove())
  document.body.appendChild(box)
}

// V20.3 — local cache of reactions per (owner, photo). Populated by net.ts
// onPhotoReactions broadcast. Returns Map<emoji, {count, mine}>.
const photoReactionCache = new Map<string, Map<string, { count: number; mine: boolean }>>()
function reactionKey(ownerVid: string, photoId: string): string {
  return `${ownerVid}|${photoId}`
}
export function setPhotoReactions(ownerVid: string, photoId: string, perEmoji: Array<{ emoji: string; count: number; mine: boolean }>) {
  const m = new Map<string, { count: number; mine: boolean }>()
  for (const e of perEmoji) m.set(e.emoji, { count: e.count, mine: e.mine })
  photoReactionCache.set(reactionKey(ownerVid, photoId), m)
}
function getPhotoReactionsFor(ownerVid: string, photoId: string): Map<string, { count: number; mine: boolean }> {
  return photoReactionCache.get(reactionKey(ownerVid, photoId)) ?? new Map()
}

export function hideProfileCard() {
  if (!pcEl) return
  pcEl.hidden = true
}

type GiftListEntry = { item_id: string; name: string; alreadySent: boolean }
let onGiftPick: ((item_id: string) => void) | null = null

export function showGiftModal(toName: string, entries: GiftListEntry[], onPick: (item_id: string) => void) {
  if (!giftModalEl) {
    giftModalEl = document.getElementById('lounge-gift-modal')
    giftToNameEl = document.getElementById('lounge-gift-to-name')
    giftListEl = document.getElementById('lounge-gift-list')
    giftEmptyEl = document.getElementById('lounge-gift-empty')
    giftCancelBtn = document.getElementById('lounge-gift-cancel') as HTMLButtonElement | null
    if (giftCancelBtn) giftCancelBtn.addEventListener('click', () => hideGiftModal())
  }
  if (!giftModalEl || !giftToNameEl || !giftListEl || !giftEmptyEl) return
  onGiftPick = onPick
  giftToNameEl.textContent = toName
  giftListEl.innerHTML = ''
  if (entries.length === 0) {
    giftEmptyEl.hidden = false
  } else {
    giftEmptyEl.hidden = true
    for (const e of entries) {
      const li = document.createElement('li')
      if (e.alreadySent) li.className = 'is-already-sent'
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = e.alreadySent ? `${e.name} (already gifted)` : e.name
      btn.disabled = e.alreadySent
      btn.addEventListener('click', () => {
        if (e.alreadySent) return
        hideGiftModal()
        onGiftPick?.(e.item_id)
      })
      li.appendChild(btn)
      giftListEl.appendChild(li)
    }
  }
  giftModalEl.hidden = false
}

export function hideGiftModal() {
  if (!giftModalEl) giftModalEl = document.getElementById('lounge-gift-modal')
  if (!giftModalEl) return
  giftModalEl.hidden = true
  onGiftPick = null
}

let toastTimer: number | null = null
export function showToast(text: string, durationMs = 2400) {
  if (!toastEl) toastEl = document.getElementById('lounge-toast')
  if (!toastEl) return
  toastEl.textContent = text
  toastEl.classList.remove('is-fading')
  toastEl.hidden = false
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastEl?.classList.add('is-fading')
    setTimeout(() => { if (toastEl) toastEl.hidden = true }, 320)
  }, durationMs)
}

// Messages

type MessagesDataProvider = () => {
  threads: Array<{ friend_id: string; friend_name: string; unread: number; preview: string }>
  unreadTotal: number
}
type ThreadDataProvider = (friend_id: string) => Array<{ id: number; mine: boolean; text: string; sent_at: string; read: boolean }>

let messagesProvider: MessagesDataProvider | null = null
let threadProvider: ThreadDataProvider | null = null
let onRequestThread: ((friend_id: string) => void) | null = null
let onSendThreadMessage: ((friend_id: string, text: string) => void) | null = null
let currentThreadFriendId: string | null = null

export function setMessagesProvider(
  provider: MessagesDataProvider,
  threadGetter: ThreadDataProvider,
  onOpenThread: (friend_id: string) => void,
  onSend: (friend_id: string, text: string) => void
) {
  messagesProvider = provider
  threadProvider = threadGetter
  onRequestThread = onOpenThread
  onSendThreadMessage = onSend

  if (!messagesBtnEl) {
    messagesBtnEl = document.getElementById('lounge-messages-btn')
    messagesBadgeEl = document.getElementById('lounge-messages-badge')
    messagesPanelEl = document.getElementById('lounge-messages-panel')
    messagesListEl = document.getElementById('lounge-messages-list')
    messagesEmptyEl = document.getElementById('lounge-messages-empty')
    threadViewEl = document.getElementById('lounge-thread-view')
    threadNameEl = document.getElementById('lounge-thread-name')
    threadMessagesEl = document.getElementById('lounge-thread-messages')
    threadFormEl = document.getElementById('lounge-thread-form') as HTMLFormElement | null
    threadInputEl = document.getElementById('lounge-thread-input') as HTMLInputElement | null
    threadBackBtn = document.getElementById('lounge-thread-back') as HTMLButtonElement | null

    if (messagesBtnEl) {
      messagesBtnEl.addEventListener('click', (e) => {
        e.stopPropagation()
        if (messagesPanelEl?.hidden) { renderMessagesPanel(); messagesPanelEl.hidden = false; playSfx('menu_open') }
        else hideMessagesPanel()
      })
    }
    if (messagesPanelEl) messagesPanelEl.addEventListener('click', (e) => e.stopPropagation())
    if (threadBackBtn) threadBackBtn.addEventListener('click', () => closeThreadView())
    if (threadFormEl) {
      threadFormEl.addEventListener('submit', (e) => {
        e.preventDefault()
        const text = threadInputEl?.value?.trim() ?? ''
        if (!text || !currentThreadFriendId) return
        onSendThreadMessage?.(currentThreadFriendId, text)
        if (threadInputEl) threadInputEl.value = ''
      })
    }
  }
}

function renderMessagesPanel() {
  if (!messagesProvider || !messagesListEl || !messagesEmptyEl) return
  closeThreadView()
  const data = messagesProvider()
  messagesListEl.innerHTML = ''
  if (data.threads.length === 0) {
    messagesEmptyEl.hidden = false
    messagesListEl.hidden = true
  } else {
    messagesEmptyEl.hidden = true
    messagesListEl.hidden = false
    for (const t of data.threads) {
      const li = document.createElement('li')
      if (t.unread > 0) li.classList.add('has-unread')
      const name = document.createElement('span')
      name.className = 'name'
      name.textContent = t.friend_name
      const unread = document.createElement('span')
      unread.className = 'unread'
      unread.textContent = t.unread > 0 ? `${t.unread} new` : ''
      const preview = document.createElement('span')
      preview.className = 'preview'
      preview.textContent = t.preview
      li.appendChild(name)
      li.appendChild(unread)
      li.appendChild(preview)
      li.addEventListener('click', () => openThreadView(t.friend_id, t.friend_name))
      messagesListEl.appendChild(li)
    }
  }
}

function openThreadView(friend_id: string, friend_name: string) {
  if (!threadViewEl || !threadNameEl || !messagesListEl || !messagesEmptyEl) return
  currentThreadFriendId = friend_id
  threadNameEl.textContent = friend_name
  messagesListEl.hidden = true
  messagesEmptyEl.hidden = true
  threadViewEl.hidden = false
  onRequestThread?.(friend_id)
  renderThreadView()
  threadInputEl?.focus()
}

function closeThreadView() {
  if (!threadViewEl) return
  threadViewEl.hidden = true
  currentThreadFriendId = null
}

export function renderThreadView() {
  if (!threadMessagesEl || !threadProvider || !currentThreadFriendId) return
  threadMessagesEl.innerHTML = ''
  const messages = threadProvider(currentThreadFriendId)
  for (const m of messages.slice().reverse()) {
    const li = document.createElement('li')
    li.className = m.mine ? 'out' : 'in'
    li.textContent = m.text
    threadMessagesEl.appendChild(li)
  }
  threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight
}

export function refreshMessagesBadge(unread: number) {
  if (!messagesBadgeEl) messagesBadgeEl = document.getElementById('lounge-messages-badge')
  if (!messagesBadgeEl) return
  if (unread > 0) {
    messagesBadgeEl.textContent = unread > 99 ? '99+' : String(unread)
    messagesBadgeEl.hidden = false
  } else {
    messagesBadgeEl.hidden = true
  }
}

export function hideMessagesPanel() {
  if (!messagesPanelEl || messagesPanelEl.hidden) return
  messagesPanelEl.hidden = true
  closeThreadView()
  playSfx('menu_close')
}

export function getCurrentThreadFriendId(): string | null {
  return currentThreadFriendId
}

// V5.1 — Letter modal + read card

let letterModalEl: HTMLElement | null = null
let letterInputEl: HTMLTextAreaElement | null = null
let letterErrorEl: HTMLElement | null = null
let letterCountEl: HTMLElement | null = null
let letterSaveBtn: HTMLButtonElement | null = null
let letterCancelBtn: HTMLButtonElement | null = null
let letterReadEl: HTMLElement | null = null
let letterReadAuthorEl: HTMLElement | null = null
let letterReadAgoEl: HTMLElement | null = null
let letterReadContentEl: HTMLElement | null = null
let letterReadCloseBtn: HTMLButtonElement | null = null
let onLetterModalSubmit: ((content: string | null, eternal: boolean) => void) | null = null
let letterEternalEl: HTMLInputElement | null = null

export function showLetterModal(onSubmit: (content: string | null, eternal: boolean) => void) {
  if (!letterModalEl) {
    letterModalEl = document.getElementById('lounge-letter-modal')
    letterInputEl = document.getElementById('lounge-letter-input') as HTMLTextAreaElement | null
    letterErrorEl = document.getElementById('lounge-letter-error')
    letterCountEl = document.getElementById('lounge-letter-count')
    letterSaveBtn = document.getElementById('lounge-letter-save') as HTMLButtonElement | null
    letterCancelBtn = document.getElementById('lounge-letter-cancel') as HTMLButtonElement | null
    // V12.2 — eternal checkbox
    letterEternalEl = document.getElementById('lounge-letter-eternal') as HTMLInputElement | null

    letterSaveBtn?.addEventListener('click', () => submitLetterModal())
    letterCancelBtn?.addEventListener('click', () => { const cb = onLetterModalSubmit; hideLetterModal(); cb?.(null, false) })
    letterInputEl?.addEventListener('input', () => {
      if (letterCountEl && letterInputEl) letterCountEl.textContent = String(letterInputEl.value.length)
    })
    letterInputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); const cb = onLetterModalSubmit; hideLetterModal(); cb?.(null, false) }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitLetterModal() }
    })
  }
  if (!letterModalEl || !letterInputEl) return
  onLetterModalSubmit = onSubmit
  letterInputEl.value = ''
  if (letterCountEl) letterCountEl.textContent = '0'
  if (letterErrorEl) { letterErrorEl.hidden = true; letterErrorEl.textContent = '' }
  if (letterEternalEl) letterEternalEl.checked = false
  letterModalEl.hidden = false
  requestAnimationFrame(() => letterInputEl?.focus())
}

function submitLetterModal() {
  if (!letterInputEl) return
  const text = letterInputEl.value.trim()
  if (text.length === 0 || text.length > 80) {
    if (letterErrorEl) {
      letterErrorEl.textContent = text.length === 0 ? 'Please write something.' : 'Max 80 characters.'
      letterErrorEl.hidden = false
    }
    letterInputEl.focus()
    return
  }
  const cb = onLetterModalSubmit
  const eternal = !!letterEternalEl?.checked
  hideLetterModal()
  cb?.(text, eternal)
}

export function hideLetterModal() {
  if (!letterModalEl) return
  letterModalEl.hidden = true
  onLetterModalSubmit = null
}

function timeAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime()
    if (ms < 60_000) return 'just now'
    if (ms < 3600_000) return Math.round(ms / 60_000) + 'm ago'
    if (ms < 86400_000) return Math.round(ms / 3600_000) + 'h ago'
    return Math.round(ms / 86400_000) + 'd ago'
  } catch { return '' }
}

export function showLetterRead(author: string | null, content: string, dropped_at: string) {
  if (!letterReadEl) {
    letterReadEl = document.getElementById('lounge-letter-read')
    letterReadAuthorEl = document.getElementById('lounge-letter-read-author')
    letterReadAgoEl = document.getElementById('lounge-letter-read-ago')
    letterReadContentEl = document.getElementById('lounge-letter-read-content')
    letterReadCloseBtn = document.getElementById('lounge-letter-read-close') as HTMLButtonElement | null
    letterReadCloseBtn?.addEventListener('click', () => hideLetterRead())
  }
  if (!letterReadEl || !letterReadAuthorEl || !letterReadAgoEl || !letterReadContentEl) return
  letterReadAuthorEl.textContent = author || '(anonymous)'
  letterReadAgoEl.textContent = timeAgo(dropped_at)
  letterReadContentEl.textContent = content
  letterReadEl.hidden = false
}

export function hideLetterRead() {
  if (!letterReadEl) return
  letterReadEl.hidden = true
}

// V5.2 — Wishboard

type WishUI = { id: number; author_visitor_id: string; author_name: string | null; category: string; content: string; submitted_at: string; vote_count: number; voted_by_me: boolean }
let wishboardBtnEl: HTMLElement | null = null
let wishboardPanelEl: HTMLElement | null = null
let wishboardListEl: HTMLElement | null = null
let wishboardEmptyEl: HTMLElement | null = null
let wishboardFormEl: HTMLFormElement | null = null
let wishboardCategoryEl: HTMLSelectElement | null = null
let wishboardInputEl: HTMLTextAreaElement | null = null
let wishboardCountEl: HTMLElement | null = null
let onWishboardOpen: (() => void) | null = null
let onWishSubmit: ((category: string, content: string) => void) | null = null
let onWishToggleVote: ((wish_id: number) => void) | null = null
let myVisitorIdForWishes = ''

export function setupWishboard(
  myVisitorId: string,
  onOpen: () => void,
  onSubmit: (category: string, content: string) => void,
  onToggleVote: (wish_id: number) => void
) {
  myVisitorIdForWishes = myVisitorId
  onWishboardOpen = onOpen
  onWishSubmit = onSubmit
  onWishToggleVote = onToggleVote
  if (!wishboardBtnEl) {
    wishboardBtnEl = document.getElementById('lounge-wishboard-btn')
    wishboardPanelEl = document.getElementById('lounge-wishboard-panel')
    wishboardListEl = document.getElementById('lounge-wish-list')
    wishboardEmptyEl = document.getElementById('lounge-wish-empty')
    wishboardFormEl = document.getElementById('lounge-wish-form') as HTMLFormElement | null
    wishboardCategoryEl = document.getElementById('lounge-wish-category') as HTMLSelectElement | null
    wishboardInputEl = document.getElementById('lounge-wish-input') as HTMLTextAreaElement | null
    wishboardCountEl = document.getElementById('lounge-wish-count')

    wishboardBtnEl?.addEventListener('click', (e) => {
      e.stopPropagation()
      if (wishboardPanelEl?.hidden) {
        wishboardPanelEl.hidden = false
        playSfx('menu_open')
        onWishboardOpen?.()
      } else hideWishboardPanel()
    })
    wishboardPanelEl?.addEventListener('click', (e) => e.stopPropagation())
    wishboardInputEl?.addEventListener('input', () => {
      if (wishboardCountEl && wishboardInputEl) wishboardCountEl.textContent = String(wishboardInputEl.value.length)
    })
    wishboardFormEl?.addEventListener('submit', (e) => {
      e.preventDefault()
      const cat = wishboardCategoryEl?.value ?? 'other'
      const content = wishboardInputEl?.value?.trim() ?? ''
      if (!content) return
      onWishSubmit?.(cat, content)
      if (wishboardInputEl) wishboardInputEl.value = ''
      if (wishboardCountEl) wishboardCountEl.textContent = '0'
    })
  }
}

export function renderWishboard(wishes: WishUI[]) {
  if (!wishboardListEl || !wishboardEmptyEl) return
  wishboardListEl.innerHTML = ''
  if (wishes.length === 0) {
    wishboardEmptyEl.hidden = false
    return
  }
  wishboardEmptyEl.hidden = true
  for (const w of wishes) {
    const li = document.createElement('li')
    if (w.author_visitor_id === myVisitorIdForWishes) li.classList.add('is-mine')
    const cat = document.createElement('span')
    cat.className = 'category'
    cat.textContent = w.category
    const voteBtn = document.createElement('button')
    voteBtn.className = 'vote-btn' + (w.voted_by_me ? ' voted' : '')
    voteBtn.type = 'button'
    voteBtn.textContent = (w.voted_by_me ? '★ ' : '☆ ') + w.vote_count
    voteBtn.addEventListener('click', () => onWishToggleVote?.(w.id))
    const content = document.createElement('span')
    content.className = 'content'
    content.textContent = w.content
    const meta = document.createElement('span')
    meta.className = 'meta'
    meta.textContent = `by ${w.author_name ?? '(anonymous)'}`
    li.appendChild(cat)
    li.appendChild(voteBtn)
    li.appendChild(content)
    li.appendChild(meta)
    wishboardListEl.appendChild(li)
  }
}

export function hideWishboardPanel() {
  if (!wishboardPanelEl || wishboardPanelEl.hidden) return
  wishboardPanelEl.hidden = true
  playSfx('menu_close')
}
