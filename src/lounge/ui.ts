import { playSfx } from './audio'
import { prefersReducedMotion, validateClientName, type VolumeChannel } from './config'
import { getVolume, setVolume } from './volume'

export type EmoteVerb = 'wave' | 'sit' | 'dance' | 'say' | 'letter'

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
export function updateSpeciesButtonLabel(currentSpecies: 'bear' | 'cat') {
  if (!infoSpeciesBtn) return
  infoSpeciesBtn.dataset.species = currentSpecies
  infoSpeciesBtn.textContent = currentSpecies === 'bear' ? 'Switch to 🐱 Cat' : 'Switch to 🐻 Bear'
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

// V8.4 — Shells counter + Mio's Shop
import { getShells, spendShells, onShellsChange, SHOP, hasPurchased, markPurchased, type ShopItem } from './shells'

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
  for (const item of SHOP) {
    const owned = hasPurchased(item.id)
    const canAfford = bal >= item.cost
    const row = document.createElement('div')
    row.className = 'shop-item'
    const name = document.createElement('div')
    name.className = 'si-name'
    const title = document.createElement('div'); title.className = 'si-title'; title.textContent = item.name
    const blurb = document.createElement('div'); blurb.className = 'si-blurb'; blurb.textContent = item.blurb
    name.appendChild(title); name.appendChild(blurb)
    const cost = document.createElement('div'); cost.className = 'si-cost'; cost.textContent = `🐚 ${item.cost}`
    const buy = document.createElement('button'); buy.type = 'button'
    buy.textContent = owned ? 'Owned' : 'Buy'
    buy.disabled = owned || !canAfford
    buy.addEventListener('click', () => buyItem(item))
    row.appendChild(name); row.appendChild(cost); row.appendChild(buy)
    shopListEl.appendChild(row)
  }
}

function buyItem(item: ShopItem) {
  if (hasPurchased(item.id)) return
  if (!spendShells(item.cost)) return
  markPurchased(item.id)
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
let invViewBtnGrid: HTMLButtonElement | null = null
let invViewBtnList: HTMLButtonElement | null = null
let invCurrentView: 'grid' | 'list' = 'grid'
const INVENTORY_GRID_SLOTS = 36
let invDataProvider: (() => { items: Array<{ id: string; name: string; collected: boolean; giftedByName?: string | null; placedInHome?: boolean }>; total: number; collected: number; canPlace?: boolean }) | null = null
let onInventoryPlace: ((id: string, name: string) => void) | null = null

export function setInventoryDataProvider(provider: () => { items: Array<{ id: string; name: string; collected: boolean; giftedByName?: string | null; placedInHome?: boolean }>; total: number; collected: number; canPlace?: boolean }, onPlace?: (id: string, name: string) => void) {
  if (onPlace) onInventoryPlace = onPlace
  invDataProvider = provider
  if (!invBtnEl) {
    invBtnEl = document.getElementById('lounge-inventory-btn')
    invPanelEl = document.getElementById('lounge-inventory-panel')
    invCountEl = document.getElementById('lounge-inv-count')
    invTotalEl = document.getElementById('lounge-inv-total')
    invListEl = document.getElementById('lounge-inv-list')
    invGridEl = document.getElementById('lounge-inv-grid')
    invViewBtnGrid = document.getElementById('lounge-inv-view-grid') as HTMLButtonElement | null
    invViewBtnList = document.getElementById('lounge-inv-view-list') as HTMLButtonElement | null
    if (invViewBtnGrid) invViewBtnGrid.addEventListener('click', () => setInventoryView('grid'))
    if (invViewBtnList) invViewBtnList.addEventListener('click', () => setInventoryView('list'))
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
  for (let i = 0; i < INVENTORY_GRID_SLOTS; i++) {
    const slot = document.createElement('div')
    slot.className = 'inv-slot'
    const it = collected[i]
    if (it) {
      slot.classList.add('filled')
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
    }
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

type PeerMenuAction = 'wave' | 'gift' | 'dm'
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
let onLetterModalSubmit: ((content: string | null) => void) | null = null

export function showLetterModal(onSubmit: (content: string | null) => void) {
  if (!letterModalEl) {
    letterModalEl = document.getElementById('lounge-letter-modal')
    letterInputEl = document.getElementById('lounge-letter-input') as HTMLTextAreaElement | null
    letterErrorEl = document.getElementById('lounge-letter-error')
    letterCountEl = document.getElementById('lounge-letter-count')
    letterSaveBtn = document.getElementById('lounge-letter-save') as HTMLButtonElement | null
    letterCancelBtn = document.getElementById('lounge-letter-cancel') as HTMLButtonElement | null

    letterSaveBtn?.addEventListener('click', () => submitLetterModal())
    letterCancelBtn?.addEventListener('click', () => { const cb = onLetterModalSubmit; hideLetterModal(); cb?.(null) })
    letterInputEl?.addEventListener('input', () => {
      if (letterCountEl && letterInputEl) letterCountEl.textContent = String(letterInputEl.value.length)
    })
    letterInputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); const cb = onLetterModalSubmit; hideLetterModal(); cb?.(null) }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitLetterModal() }
    })
  }
  if (!letterModalEl || !letterInputEl) return
  onLetterModalSubmit = onSubmit
  letterInputEl.value = ''
  if (letterCountEl) letterCountEl.textContent = '0'
  if (letterErrorEl) { letterErrorEl.hidden = true; letterErrorEl.textContent = '' }
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
  hideLetterModal()
  cb?.(text)
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
