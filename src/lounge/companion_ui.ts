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
import { sendMessage, sendGroupMessage, getUsage } from './companion_api'
import { isLoggedIn } from './auth'
import { showToast } from './ui'

let rootEl: HTMLElement | null = null
let historyEl: HTMLElement | null = null
let inputEl: HTMLInputElement | null = null
let sendBtnEl: HTMLButtonElement | null = null
let counterEl: HTMLElement | null = null
let nameEl: HTMLElement | null = null
let whereEl: HTMLElement | null = null
let groupToggleEl: HTMLButtonElement | null = null

type Hints = { time_phase?: string; weather?: string; current_room?: string; language?: string }
type RoomNpc = { id: string; name: string }
type OpenArgs = Hints & {
  npc_id: string;
  npc_name: string;
  npc_where?: string;
  // V3.0-X · E — other AI NPCs in same room (used for 群聊 toggle)
  other_room_npcs?: RoomNpc[]
}

let currentNpcId = 'npc_jue'
let currentNpcName = 'Mochi'
let currentHints: Hints = {}
let otherRoomNpcs: RoomNpc[] = []  // other AI NPCs in current room
let groupModeOn = false

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
        <button type="button" class="nook-companion-diary-btn" id="nook-companion-diary-btn" title="ta 最近写的日记">📔</button>
        <button type="button" class="nook-companion-memory-btn" id="nook-companion-memory-btn" title="ta 记住关于你的事 (可删)">🧠</button>
        <button type="button" class="nook-companion-group-toggle" id="nook-companion-group-toggle" hidden title="群聊 (让同房间的 NPC 都听见)">👥</button>
        <span class="nook-companion-counter" id="nook-companion-counter">— / 30</span>
        <button type="button" class="nook-companion-close" aria-label="Close">✕</button>
      </div>
      <ul class="nook-companion-history" id="nook-companion-history"></ul>
      <form class="nook-companion-input-row">
        <input type="text" class="nook-companion-input" placeholder="说点什么…" maxlength="500" autocomplete="off">
        <button type="submit" class="nook-companion-send">→</button>
      </form>
    </div>
    <div class="nook-diary-modal" id="nook-diary-modal" hidden>
      <div class="nook-diary-card">
        <div class="nook-diary-header">
          <span class="nook-diary-title">📔 <span id="nook-diary-npc-name">NPC</span> 的日记</span>
          <button type="button" class="nook-diary-close" aria-label="Close">✕</button>
        </div>
        <ul class="nook-diary-list" id="nook-diary-list"></ul>
      </div>
    </div>
    <div class="nook-memory-modal" id="nook-memory-modal" hidden>
      <div class="nook-memory-card">
        <div class="nook-memory-header">
          <span class="nook-memory-title">🧠 <span id="nook-memory-npc-name">NPC</span> 记得关于你的事</span>
          <button type="button" class="nook-memory-close" aria-label="Close">✕</button>
        </div>
        <p class="nook-memory-hint">删掉某条 = 让 ta 立刻"忘记"。下次再聊到时不会再提。</p>
        <ul class="nook-memory-list" id="nook-memory-list"></ul>
      </div>
    </div>
  `

  document.body.appendChild(rootEl)

  historyEl = rootEl.querySelector('#nook-companion-history') as HTMLElement
  inputEl = rootEl.querySelector('.nook-companion-input') as HTMLInputElement
  sendBtnEl = rootEl.querySelector('.nook-companion-send') as HTMLButtonElement
  counterEl = rootEl.querySelector('#nook-companion-counter') as HTMLElement
  nameEl = rootEl.querySelector('.nook-companion-name') as HTMLElement
  whereEl = rootEl.querySelector('.nook-companion-where') as HTMLElement
  groupToggleEl = rootEl.querySelector('#nook-companion-group-toggle') as HTMLButtonElement
  const closeBtn = rootEl.querySelector('.nook-companion-close') as HTMLButtonElement
  const form = rootEl.querySelector('form') as HTMLFormElement

  closeBtn.addEventListener('click', () => hide())
  // V3.0-X · A6 — diary modal toggle
  const diaryBtn = rootEl.querySelector('#nook-companion-diary-btn') as HTMLButtonElement | null
  diaryBtn?.addEventListener('click', () => openDiaryModal())
  const diaryModal = rootEl.querySelector('#nook-diary-modal') as HTMLElement | null
  const diaryClose = rootEl.querySelector('.nook-diary-close') as HTMLButtonElement | null
  diaryClose?.addEventListener('click', () => { if (diaryModal) diaryModal.hidden = true })
  diaryModal?.addEventListener('click', (e) => {
    if (e.target === diaryModal) diaryModal.hidden = true
  })

  // SHU-599 — memory modal: list facts NPC remembers, allow per-fact delete
  const memoryBtn = rootEl.querySelector('#nook-companion-memory-btn') as HTMLButtonElement | null
  memoryBtn?.addEventListener('click', () => openMemoryModal())
  const memoryModal = rootEl.querySelector('#nook-memory-modal') as HTMLElement | null
  const memoryClose = rootEl.querySelector('.nook-memory-close') as HTMLButtonElement | null
  memoryClose?.addEventListener('click', () => { if (memoryModal) memoryModal.hidden = true })
  memoryModal?.addEventListener('click', (e) => {
    if (e.target === memoryModal) memoryModal.hidden = true
  })

  groupToggleEl?.addEventListener('click', () => {
    groupModeOn = !groupModeOn
    if (groupToggleEl) {
      groupToggleEl.classList.toggle('on', groupModeOn)
      groupToggleEl.title = groupModeOn
        ? `群聊 ON · 同房间的 ${[currentNpcName, ...otherRoomNpcs.map((n) => n.name)].join(' / ')} 都会发言`
        : '群聊 (让同房间的 NPC 都听见)'
    }
    showToast(groupModeOn ? `群聊开了 · ${otherRoomNpcs.length + 1} 人在场` : '群聊关了', 2000)
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = inputEl?.value?.trim() ?? ''
    if (!text || inflight) return
    inflight = true
    if (inputEl) inputEl.value = ''
    if (sendBtnEl) { sendBtnEl.disabled = true; sendBtnEl.textContent = '…' }
    appendBubble('user', text)

    // Group-mode dispatch — different streaming protocol (per-NPC bubbles)
    if (groupModeOn && otherRoomNpcs.length > 0) {
      try {
        await runGroupTurn(text)
      } finally {
        inflight = false
        if (sendBtnEl) { sendBtnEl.disabled = false; sendBtnEl.textContent = '→' }
        inputEl?.focus()
      }
      return
    }

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

function appendBubble(role: 'user' | 'assistant', text: string, speakerName?: string): HTMLElement {
  if (!historyEl) return document.createElement('div')
  const li = document.createElement('li')
  li.className = `nook-companion-bubble nook-companion-${role}`
  // V3.0-X · E — when group mode emits per-NPC bubbles, prefix with name
  if (speakerName) {
    const label = document.createElement('span')
    label.className = 'nook-companion-speaker'
    label.textContent = speakerName
    li.appendChild(label)
    const body = document.createElement('span')
    body.className = 'nook-companion-bubble-body'
    body.textContent = text
    li.appendChild(body)
    Object.defineProperty(li, 'textContent', {
      get() { return body.textContent ?? '' },
      set(v: string) { body.textContent = v },
    })
  } else {
    li.textContent = text
  }
  // V3.0-X · Overnight C5 — save-to-clip button on assistant bubbles
  if (role === 'assistant') {
    const clip = document.createElement('button')
    clip.type = 'button'
    clip.className = 'nook-companion-clip-btn'
    clip.title = '保存这句话'
    clip.textContent = '💾'
    clip.addEventListener('click', async (e) => {
      e.stopPropagation()
      const text = li.textContent ?? ''
      if (!text.trim()) return
      // Grab the most recent user bubble as context
      let contextUserMsg = ''
      let prev = li.previousElementSibling
      while (prev) {
        if (prev.classList.contains('nook-companion-user')) {
          contextUserMsg = prev.textContent ?? ''
          break
        }
        prev = prev.previousElementSibling
      }
      clip.disabled = true; clip.textContent = '…'
      try {
        const res = await fetch(`https://chat.ursb.me/api/ai-companion/clip`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ npc_id: currentNpcId, text, context_user_msg: contextUserMsg }),
        })
        if (res.ok) {
          clip.textContent = '✓'
          showToast('已保存到你的 clips · 在设置里看', 2500)
          setTimeout(() => { clip.textContent = '💾'; clip.disabled = false }, 2000)
        } else {
          clip.textContent = '!'
          clip.disabled = false
        }
      } catch {
        clip.textContent = '!'
        clip.disabled = false
      }
    })
    li.appendChild(clip)
  }
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
  const { npc_id, npc_name, npc_where, other_room_npcs, ...hints } = args
  const npcSwitch = npc_id !== currentNpcId
  currentNpcId = npc_id
  currentNpcName = npc_name
  currentHints = hints
  otherRoomNpcs = Array.isArray(other_room_npcs) ? other_room_npcs : []
  // Reset group mode when switching NPC or re-opening
  if (npcSwitch) groupModeOn = false

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

  // Show 👥 toggle only when there's another AI NPC to talk to in this room
  if (groupToggleEl) {
    groupToggleEl.hidden = otherRoomNpcs.length === 0
    groupToggleEl.classList.toggle('on', groupModeOn)
  }

  root.hidden = false
  // SHU-611 — let mobile CSS hide the touch D-pad while chat is open
  document.body.classList.add('has-chat-open')
  playSfx('menu_open')

  const usage = await getUsage()
  if (usage) updateCounter(usage.sent, usage.cap)

  setTimeout(() => inputEl?.focus(), 100)
}

async function openMemoryModal() {
  if (!rootEl) return
  const modal = rootEl.querySelector('#nook-memory-modal') as HTMLElement | null
  const list = rootEl.querySelector('#nook-memory-list') as HTMLElement | null
  const title = rootEl.querySelector('#nook-memory-npc-name') as HTMLElement | null
  if (!modal || !list) return
  if (title) title.textContent = currentNpcName
  list.innerHTML = '<li class="nook-memory-loading">读取中…</li>'
  modal.hidden = false
  try {
    const res = await fetch(`https://chat.ursb.me/api/ai-companion/facts/${currentNpcId}`, { credentials: 'include' })
    if (!res.ok) {
      const code = res.status === 401 ? 'login-required' : 'failed'
      list.innerHTML = code === 'login-required'
        ? '<li class="nook-memory-empty">登录后才能看 ta 记住了你什么。</li>'
        : '<li class="nook-memory-empty">没拿到记忆列表</li>'
      return
    }
    const body = await res.json()
    const facts = (body.facts ?? []) as Array<{
      id: number;
      key: string;
      value: string;
      observed_at: string;
      importance?: number;
      source_message_id?: number | null;
    }>
    if (facts.length === 0) {
      list.innerHTML = `<li class="nook-memory-empty">${currentNpcName} 还没记下任何关于你的事。多聊聊看。</li>`
      return
    }
    renderMemoryList(list, facts)
  } catch (err) {
    list.innerHTML = '<li class="nook-memory-empty">记忆暂时不可读：' + String((err as Error)?.message ?? err) + '</li>'
  }
}

function renderMemoryList(
  list: HTMLElement,
  facts: Array<{
    id: number;
    key: string;
    value: string;
    observed_at: string;
    importance?: number;
    source_message_id?: number | null;
  }>,
) {
  list.innerHTML = ''
  for (const f of facts) {
    const li = document.createElement('li')
    li.className = 'nook-memory-entry'
    li.dataset.factId = String(f.id)

    const meta = document.createElement('span')
    meta.className = 'nook-memory-key'
    // SHU-624: show importance as ★ count (1-10 → 1-3 stars buckets) so users
    // can see why a fact survives or gets evicted.
    const imp = typeof f.importance === 'number' ? f.importance : 5
    const stars = imp >= 8 ? '★★★' : imp >= 5 ? '★★' : '★'
    meta.textContent = `${stars} ${f.key}`
    meta.title = `importance ${imp}/10`

    const value = document.createElement('p')
    value.className = 'nook-memory-value'
    // SHU-625: hint when the source message is preserved (debug aid)
    const sourceHint = f.source_message_id
      ? ` ← #${f.source_message_id}`
      : ''
    value.textContent = f.value
    if (sourceHint) {
      const src = document.createElement('span')
      src.className = 'nook-memory-source'
      src.textContent = sourceHint
      src.title = '从哪条对话提取的（msg id，便于 debug）'
      value.appendChild(src)
    }

    const del = document.createElement('button')
    del.type = 'button'
    del.className = 'nook-memory-del'
    del.title = '让 ta 忘记这条'
    del.textContent = '×'
    del.addEventListener('click', async () => {
      if (del.disabled) return
      del.disabled = true
      del.textContent = '…'
      try {
        const res = await fetch(`https://chat.ursb.me/api/ai-companion/facts/${f.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        li.style.opacity = '0.4'
        li.style.textDecoration = 'line-through'
        del.textContent = '✓'
      } catch (err) {
        del.disabled = false
        del.textContent = '×'
        alert('删除失败：' + ((err as Error)?.message ?? err))
      }
    })

    li.appendChild(meta)
    li.appendChild(value)
    li.appendChild(del)
    list.appendChild(li)
  }
}

async function openDiaryModal() {
  if (!rootEl) return
  const modal = rootEl.querySelector('#nook-diary-modal') as HTMLElement | null
  const list = rootEl.querySelector('#nook-diary-list') as HTMLElement | null
  const title = rootEl.querySelector('#nook-diary-npc-name') as HTMLElement | null
  if (!modal || !list) return
  if (title) title.textContent = currentNpcName
  list.innerHTML = '<li class="nook-diary-loading">读取中…</li>'
  modal.hidden = false
  try {
    const res = await fetch(`https://chat.ursb.me/api/ai-companion/diary/${currentNpcId}?days=21`, { credentials: 'include' })
    if (!res.ok) { list.innerHTML = '<li class="nook-diary-empty">没拿到日记</li>'; return }
    const body = await res.json()
    const entries = (body.entries ?? []) as Array<{ entry_date: string; summary: string; message_count?: number; kind?: string }>
    if (entries.length === 0) {
      list.innerHTML = `<li class="nook-diary-empty">${currentNpcName} 最近没写日记。</li>`
      return
    }
    list.innerHTML = ''
    for (const e of entries) {
      const li = document.createElement('li')
      li.className = 'nook-diary-entry' + (e.kind === 'reading' ? ' is-reading' : '')
      const meta = document.createElement('span')
      meta.className = 'nook-diary-date'
      meta.textContent = e.entry_date + (e.kind === 'reading' ? ' · 📖 读书' : '')
      const body = document.createElement('p')
      body.className = 'nook-diary-text'
      body.textContent = e.summary
      li.appendChild(meta)
      li.appendChild(body)
      list.appendChild(li)
    }
  } catch (err) {
    list.innerHTML = '<li class="nook-diary-empty">日记暂时不可读：' + String((err as Error)?.message ?? err) + '</li>'
  }
}

/** Group-chat turn: send to all AI NPCs in current room, render one bubble per speaker. */
async function runGroupTurn(text: string) {
  const npcIds = [currentNpcId, ...otherRoomNpcs.map((n) => n.id)]

  // Map npc_id → its in-progress bubble element + name
  const bubbleByNpc = new Map<string, { el: HTMLElement; firstSeen: boolean }>()

  let currentSpeaker: string | null = null

  await sendGroupMessage(npcIds, text, currentHints, (ev) => {
    if (ev.type === 'speaker_start') {
      currentSpeaker = ev.npc_id
      const bubble = appendBubble('assistant', '', ev.npc_name)
      bubble.classList.add('nook-companion-thinking')
      bubble.textContent = ''
      bubbleByNpc.set(ev.npc_id, { el: bubble, firstSeen: false })
      scrollToBottom()
    } else if (ev.type === 'delta') {
      const id = ev.npc_id || currentSpeaker || ''
      const entry = bubbleByNpc.get(id)
      if (!entry) return
      if (!entry.firstSeen) {
        entry.firstSeen = true
        entry.el.classList.remove('nook-companion-thinking')
      }
      entry.el.textContent = (entry.el.textContent ?? '') + ev.text
      scrollToBottom()
    } else if (ev.type === 'speaker_end') {
      const entry = bubbleByNpc.get(ev.npc_id)
      if (entry && !entry.firstSeen) {
        entry.el.classList.remove('nook-companion-thinking')
        if (!entry.el.textContent) entry.el.textContent = '（没接住——再试一次？）'
      }
    } else if (ev.type === 'error') {
      const id = ev.npc_id || currentSpeaker || ''
      const entry = bubbleByNpc.get(id)
      if (entry) {
        entry.el.classList.remove('nook-companion-thinking')
        if (!entry.el.textContent) entry.el.textContent = `（${ev.message}）`
      } else {
        showToast(`群聊出错：${ev.message}`, 3000)
      }
    } else if (ev.type === 'all_done') {
      updateCounter(ev.usage.sent, ev.usage.cap)
    }
  })
}

export function hide() {
  if (!rootEl || rootEl.hidden) return
  rootEl.hidden = true
  document.body.classList.remove('has-chat-open')  // SHU-611 — restore D-pad
  playSfx('menu_close')
}
