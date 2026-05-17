import { playSfx } from './audio'
import { prefersReducedMotion, validateClientName, type VolumeChannel } from './config'
import { getVolume, setVolume } from './volume'

export type EmoteVerb = 'wave' | 'sit' | 'dance' | 'say'

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
      playSfx(verb)
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
    }
  })
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
let invDataProvider: (() => { items: Array<{ id: string; name: string; collected: boolean }>; total: number; collected: number }) | null = null

export function setInventoryDataProvider(provider: () => { items: Array<{ id: string; name: string; collected: boolean }>; total: number; collected: number }) {
  invDataProvider = provider
  if (!invBtnEl) {
    invBtnEl = document.getElementById('lounge-inventory-btn')
    invPanelEl = document.getElementById('lounge-inventory-panel')
    invCountEl = document.getElementById('lounge-inv-count')
    invTotalEl = document.getElementById('lounge-inv-total')
    invListEl = document.getElementById('lounge-inv-list')
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

function renderInventory() {
  if (!invDataProvider || !invListEl || !invCountEl || !invTotalEl) return
  const data = invDataProvider()
  invCountEl.textContent = String(data.collected)
  invTotalEl.textContent = String(data.total)
  invListEl.innerHTML = ''
  for (const it of data.items) {
    const li = document.createElement('li')
    li.className = it.collected ? 'is-collected' : 'is-locked'
    li.textContent = it.collected ? it.name : '???'
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
