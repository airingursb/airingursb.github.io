// V12.7 — Party room create/join panel.

import { createPartyRoom, resolvePartyCode, partyRoomId, type PartyRoom } from './party'

let panelEl: HTMLElement | null = null
let openBtnEl: HTMLElement | null = null
let closeBtnEl: HTMLElement | null = null
let topicInputEl: HTMLInputElement | null = null
let createBtnEl: HTMLButtonElement | null = null
let createResultEl: HTMLElement | null = null
let codeInputEl: HTMLInputElement | null = null
let joinBtnEl: HTMLButtonElement | null = null
let joinResultEl: HTMLElement | null = null

let displayName: string | null = null
let onEnterParty: ((roomId: string) => void) | null = null

function ensure(): boolean {
  if (panelEl) return true
  panelEl       = document.getElementById('lounge-party-panel')
  openBtnEl     = document.getElementById('lounge-info-party')
  closeBtnEl    = document.getElementById('lounge-party-close')
  topicInputEl  = document.getElementById('lounge-party-topic')  as HTMLInputElement | null
  createBtnEl   = document.getElementById('lounge-party-create') as HTMLButtonElement | null
  createResultEl = document.getElementById('lounge-party-create-result')
  codeInputEl   = document.getElementById('lounge-party-code')   as HTMLInputElement | null
  joinBtnEl     = document.getElementById('lounge-party-join')   as HTMLButtonElement | null
  joinResultEl  = document.getElementById('lounge-party-join-result')
  if (!panelEl) return false
  openBtnEl?.addEventListener('click', () => show())
  closeBtnEl?.addEventListener('click', () => hide())
  createBtnEl?.addEventListener('click', onCreate)
  joinBtnEl?.addEventListener('click', onJoin)
  return true
}

export function setPartyOnEnter(fn: (roomId: string) => void) { onEnterParty = fn }
export function setPartyDisplayName(name: string | null) { displayName = name }

export function show() {
  if (!ensure() || !panelEl) return
  panelEl.hidden = false
  if (createResultEl) createResultEl.innerHTML = ''
  if (joinResultEl)   joinResultEl.innerHTML = ''
  if (topicInputEl)   topicInputEl.value = ''
  if (codeInputEl)    codeInputEl.value = ''
}
export function hide() {
  if (!ensure() || !panelEl) return
  panelEl.hidden = true
}

async function onCreate() {
  if (!createBtnEl || !createResultEl) return
  const topic = topicInputEl?.value?.trim() || ''
  createBtnEl.disabled = true
  createResultEl.textContent = 'Creating…'
  const r = await createPartyRoom({ topic, owner_name: displayName })
  createBtnEl.disabled = false
  if (r.ok) {
    renderInviteCode(createResultEl, r.party, /*owner*/true)
  } else {
    createResultEl.textContent = errorMsg(r.reason)
    createResultEl.style.color = '#ff6080'
  }
}

async function onJoin() {
  if (!codeInputEl || !joinBtnEl || !joinResultEl) return
  const raw = codeInputEl.value.trim().toUpperCase()
  joinBtnEl.disabled = true
  joinResultEl.textContent = 'Looking up…'
  joinResultEl.style.color = ''
  const r = await resolvePartyCode(raw)
  joinBtnEl.disabled = false
  if (r.ok) {
    renderInviteCode(joinResultEl, r.party, /*owner*/false)
  } else {
    joinResultEl.textContent = errorMsg(r.reason)
    joinResultEl.style.color = '#ff6080'
  }
}

function renderInviteCode(host: HTMLElement, party: PartyRoom, owner: boolean) {
  host.innerHTML = ''
  host.style.color = ''
  const code = document.createElement('div')
  code.className = 'pr-code-display'
  code.textContent = party.code
  host.appendChild(code)
  if (owner) {
    const blurb = document.createElement('p')
    blurb.className = 'pr-blurb'
    blurb.textContent = `Share this code. Expires ${shortAgo(party.expires_at, true)}.`
    host.appendChild(blurb)
    const copy = document.createElement('button')
    copy.type = 'button'; copy.className = 'pr-secondary'
    copy.textContent = 'Copy code'
    copy.addEventListener('click', () => {
      navigator.clipboard?.writeText(party.code).then(() => { copy.textContent = 'Copied ✓' })
    })
    host.appendChild(copy)
  } else {
    const topic = party.topic
      ? `“${party.topic}” · ${party.owner_name ?? 'anonymous'}`
      : `Hosted by ${party.owner_name ?? 'anonymous'}`
    const p = document.createElement('p'); p.className = 'pr-blurb'; p.textContent = topic
    host.appendChild(p)
  }
  const enter = document.createElement('button')
  enter.type = 'button'; enter.className = 'pr-primary'
  enter.textContent = '🎉 Enter party'
  enter.addEventListener('click', () => {
    const room = partyRoomId(party.code)
    onEnterParty?.(room)
    hide()
  })
  host.appendChild(enter)
}

function errorMsg(reason: string): string {
  const m: Record<string, string> = {
    no_token: 'Hold on — still connecting.',
    bad_code: 'Code must be 6 characters (A-Z, 2-9).',
    expired_or_unknown: 'That code expired or doesn’t exist.',
    code_collision_max: 'Server glitched — try again.',
    table_missing: 'Service not ready.',
    db_error: 'Server error.',
    network: 'Network error.'
  }
  return m[reason] ?? `Failed (${reason})`
}

function shortAgo(iso: string, future = false): string {
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  if (abs < 3600_000)  return `in ${Math.max(1, Math.floor(abs / 60_000))}m`
  return `in ${Math.floor(abs / 3600_000)}h`
}

if (typeof document !== 'undefined') {
  const init = () => ensure()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
