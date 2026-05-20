// V3.0-B — 觉's chat overlay.
//
// Lightweight wooden dialog box at the bottom of the screen. Shows a
// scrolling history + text input + usage counter. NOT a fullscreen modal —
// you stay in the world, can still see 觉 + your bear.
//
// Lazy-built DOM (created on first open, never destroyed — toggled via hidden).

import { playSfx } from './audio'
import { sendMessage, getUsage } from './companion_api'
import { isLoggedIn } from './auth'

let rootEl: HTMLElement | null = null
let historyEl: HTMLElement | null = null
let inputEl: HTMLInputElement | null = null
let sendBtnEl: HTMLButtonElement | null = null
let counterEl: HTMLElement | null = null

type Hints = { time_phase?: string; weather?: string; current_room?: string; language?: string }
let currentHints: Hints = {}

let inflight = false

function ensure(): HTMLElement {
  if (rootEl) return rootEl

  rootEl = document.createElement('div')
  rootEl.id = 'nook-companion-overlay'
  rootEl.className = 'nook-companion-overlay'
  rootEl.hidden = true

  rootEl.innerHTML = `
    <div class="nook-companion-card">
      <div class="nook-companion-header">
        <span class="nook-companion-name">觉</span>
        <span class="nook-companion-where">· library</span>
        <span class="nook-companion-counter" id="nook-companion-counter">— / 30</span>
        <button type="button" class="nook-companion-close" aria-label="Close">✕</button>
      </div>
      <ul class="nook-companion-history" id="nook-companion-history"></ul>
      <form class="nook-companion-input-row">
        <input type="text" class="nook-companion-input" placeholder="说点什么…" maxlength="500" autocomplete="off">
        <button type="submit" class="nook-companion-send">→</button>
      </form>
    </div>
  `

  document.body.appendChild(rootEl)

  historyEl = rootEl.querySelector('#nook-companion-history') as HTMLElement
  inputEl = rootEl.querySelector('.nook-companion-input') as HTMLInputElement
  sendBtnEl = rootEl.querySelector('.nook-companion-send') as HTMLButtonElement
  counterEl = rootEl.querySelector('#nook-companion-counter') as HTMLElement
  const closeBtn = rootEl.querySelector('.nook-companion-close') as HTMLButtonElement
  const form = rootEl.querySelector('form') as HTMLFormElement

  closeBtn.addEventListener('click', () => hide())

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = inputEl?.value?.trim() ?? ''
    if (!text || inflight) return
    inflight = true
    if (inputEl) inputEl.value = ''
    if (sendBtnEl) { sendBtnEl.disabled = true; sendBtnEl.textContent = '…' }
    appendBubble('user', text)

    // V3.0-B.1 — show typing indicator until first delta arrives, so the
    // user knows 觉 is thinking (network + Kimi cold-start can be 2-3s).
    const bubbleEl = appendBubble('assistant', '')
    bubbleEl.classList.add('nook-companion-thinking')
    bubbleEl.textContent = ''
    let firstDeltaSeen = false

    try {
      await sendMessage(text, currentHints, (ev) => {
        if (ev.type === 'delta') {
          if (!firstDeltaSeen) {
            firstDeltaSeen = true
            bubbleEl.classList.remove('nook-companion-thinking')
          }
          bubbleEl.textContent = (bubbleEl.textContent ?? '') + ev.text
          scrollToBottom()
        } else if (ev.type === 'done') {
          updateCounter(ev.usage.sent, ev.usage.cap)
        } else if (ev.type === 'error') {
          bubbleEl.classList.remove('nook-companion-thinking')
          if (ev.code === 'NOT_AUTHENTICATED') {
            bubbleEl.textContent = '（先登录才能跟觉聊天）'
          } else if (ev.code === 'DAILY_CAP_REACHED') {
            bubbleEl.textContent = ev.message || '今天聊够了，明早再来。'
          } else {
            bubbleEl.textContent = (bubbleEl.textContent ?? '') + ` … (${ev.message})`
          }
        }
      })
    } finally {
      // Guard: if stream closed without any delta (e.g. silent failure),
      // remove the indicator + give the user a hint.
      if (!firstDeltaSeen && bubbleEl.classList.contains('nook-companion-thinking')) {
        bubbleEl.classList.remove('nook-companion-thinking')
        if (!bubbleEl.textContent) bubbleEl.textContent = '（觉没接住——再试一次？）'
      }
      inflight = false
      if (sendBtnEl) { sendBtnEl.disabled = false; sendBtnEl.textContent = '→' }
      inputEl?.focus()
    }
  })

  // Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rootEl && !rootEl.hidden) hide()
  })

  return rootEl
}

function appendBubble(role: 'user' | 'assistant', text: string): HTMLElement {
  if (!historyEl) return document.createElement('div')
  const li = document.createElement('li')
  li.className = `nook-companion-bubble nook-companion-${role}`
  li.textContent = text
  historyEl.appendChild(li)
  scrollToBottom()
  return li
}

function scrollToBottom() {
  if (!historyEl) return
  historyEl.scrollTop = historyEl.scrollHeight
}

function updateCounter(sent: number, cap: number) {
  if (counterEl) counterEl.textContent = `${sent} / ${cap}`
}

/** Open the chat overlay. If not logged in, shows a single gate message. */
export async function openCompanionChat(hints: Hints = {}) {
  currentHints = hints
  const root = ensure()

  if (!isLoggedIn()) {
    // Soft-gate via the existing gated prompt
    const { requireLogin } = await import('./auth_ui')
    requireLogin('AI companion')
    return
  }

  root.hidden = false
  playSfx('menu_open')

  // Fetch usage counter (silent fail if endpoint hiccups)
  const usage = await getUsage()
  if (usage) updateCounter(usage.sent, usage.cap)

  // Focus input after slight delay (allows CSS transition)
  setTimeout(() => inputEl?.focus(), 100)
}

export function hide() {
  if (!rootEl || rootEl.hidden) return
  rootEl.hidden = true
  playSfx('menu_close')
}
