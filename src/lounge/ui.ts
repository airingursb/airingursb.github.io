import { playSfx } from './audio'
import { prefersReducedMotion, type VolumeChannel } from './config'
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
