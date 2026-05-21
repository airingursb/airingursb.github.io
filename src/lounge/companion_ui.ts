// V3.0-B-MEM-V3 — AI companion chat overlay (multi-NPC).
//
// Lightweight wooden dialog box at the bottom of the screen. Shows a
// scrolling history + text input + usage counter. NOT a fullscreen modal —
// you stay in the world, can still see the NPC + your bear.
//
// Lazy-built DOM (created on first open, never destroyed — toggled via hidden).
// When opened for a different NPC, only the header chip + history list reset;
// the input + counter persist.

import { playSfx } from './audio'
import { sendMessage, getUsage } from './companion_api'
import { isLoggedIn } from './auth'
import { showToast } from './ui'

let rootEl: HTMLElement | null = null
let historyEl: HTMLElement | null = null
let inputEl: HTMLInputElement | null = null
let sendBtnEl: HTMLButtonElement | null = null
let counterEl: HTMLElement | null = null
let nameEl: HTMLElement | null = null
let whereEl: HTMLElement | null = null

type Hints = { time_phase?: string; weather?: string; current_room?: string; language?: string }
type OpenArgs = Hints & { npc_id: string; npc_name: string; npc_where?: string }

let currentNpcId = 'npc_jue'
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
        <span class="nook-companion-name">Mochi</span>
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
  nameEl = rootEl.querySelector('.nook-companion-name') as HTMLElement
  whereEl = rootEl.querySelector('.nook-companion-where') as HTMLElement
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
      await sendMessage(currentNpcId, text, currentHints, (ev) => {
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
          // V3.0-A.10 — route most errors to toast (less intrusive than
          // inline-in-bubble); leave the bubble as 觉's actual partial reply.
          const npcName = nameEl?.textContent || 'NPC'
          if (ev.code === 'NOT_AUTHENTICATED') {
            bubbleEl.textContent = `（先登录才能跟 ${npcName} 聊天）`
          } else if (ev.code === 'DAILY_CAP_REACHED') {
            bubbleEl.textContent = '今天聊够了，明早再来。'
            showToast(ev.message || '今天 30 条聊够了 · 明早北京时间 0 点重置', 4000)
          } else if (!bubbleEl.textContent) {
            bubbleEl.textContent = `（${npcName} 走神了）`
            showToast(`${npcName} 走神了：${ev.message}`, 3000)
          } else {
            showToast(`流断了：${ev.message}`, 3000)
          }
        }
      })
    } finally {
      // Guard: if stream closed without any delta (e.g. silent failure),
      // remove the indicator + give the user a hint.
      if (!firstDeltaSeen && bubbleEl.classList.contains('nook-companion-thinking')) {
        bubbleEl.classList.remove('nook-companion-thinking')
        if (!bubbleEl.textContent) {
          const npcName = nameEl?.textContent || 'NPC'
          bubbleEl.textContent = `（${npcName} 没接住——再试一次？）`
        }
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

/** Open the chat overlay for a specific NPC. Resets history view if switching NPCs. */
export async function openCompanionChat(args: OpenArgs) {
  const { npc_id, npc_name, npc_where, ...hints } = args
  const npcSwitch = npc_id !== currentNpcId
  currentNpcId = npc_id
  currentHints = hints
  const root = ensure()

  if (!isLoggedIn()) {
    const { requireLogin } = await import('./auth_ui')
    requireLogin('AI companion')
    return
  }

  // Update header chip + clear stale transcript when switching NPCs
  if (nameEl) nameEl.textContent = npc_name
  if (whereEl) whereEl.textContent = npc_where ? `· ${npc_where}` : ''
  if (npcSwitch && historyEl) historyEl.innerHTML = ''

  root.hidden = false
  playSfx('menu_open')

  const usage = await getUsage()
  if (usage) updateCounter(usage.sent, usage.cap)

  setTimeout(() => inputEl?.focus(), 100)
}

export function hide() {
  if (!rootEl || rootEl.hidden) return
  rootEl.hidden = true
  playSfx('menu_close')
}
