// V14.5 — Group Dance (DJ Floor QTE).
//
// When ≥2 players are on DJ Floor, a 'Start Dance' button surfaces in the
// jam banner. Click → creates a 'dance' group session. The host's clock
// drives 8 step cues over 30s; each cue shows a direction (←↑↓→) and a
// 600ms window; players press the matching key. Correct hits aggregate
// into the shared session 'stamina' counter. If stamina ≥ 30 by the end
// (across all members), everyone gets +5 shells.

import { getCurrentSession, onSessionChange, type GroupSession } from './group'
import { sendGroupCreate, sendGroupJoin, sendGroupState, sendGroupLeave, sendGroupList } from './net'
import { awardShells } from './shells'

const KIND = 'dance'
const ROOM = 'room_dj_floor'
const ROUND_MS = 30_000
const CUE_COUNT = 8
const STAMINA_TARGET = 30
const KEY_TO_DIR: Record<string, string> = {
  ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D',
  a: 'L', A: 'L', d: 'R', D: 'R', w: 'U', W: 'U', s: 'D', S: 'D'
}
const DIRS = ['L', 'R', 'U', 'D'] as const
type Dir = typeof DIRS[number]

let _overlayEl: HTMLElement | null = null
let _cueEl: HTMLElement | null = null
let _staminaEl: HTMLElement | null = null
let _countdownEl: HTMLElement | null = null
let _payoutGranted = false
let _initialized = false
let _currentCue: Dir | null = null
let _onCueAt = 0
let _localStamina = 0

function ensureOverlay(): boolean {
  if (_overlayEl) return true
  _overlayEl = document.getElementById('lounge-dance-overlay')
  _cueEl = document.getElementById('lounge-dance-cue')
  _staminaEl = document.getElementById('lounge-dance-stamina')
  _countdownEl = document.getElementById('lounge-dance-countdown')
  if (!_overlayEl) return false
  if (!_overlayEl.dataset.bound) {
    _overlayEl.dataset.bound = '1'
    window.addEventListener('keydown', (e) => {
      const dir = KEY_TO_DIR[e.key]
      if (!dir) return
      onDirInput(dir as Dir)
    })
  }
  return true
}

function showOverlay(show: boolean) {
  ensureOverlay()
  if (_overlayEl) _overlayEl.hidden = !show
}

function paintCue() {
  if (!_cueEl) return
  _cueEl.textContent = _currentCue ?
    ({ L: '◀', R: '▶', U: '▲', D: '▼' } as Record<string, string>)[_currentCue]
    : '–'
}

function onDirInput(dir: Dir) {
  if (!_currentCue) return
  const dt = Date.now() - _onCueAt
  if (dt > 800) return
  if (dir === _currentCue) {
    _localStamina++
    const s = getCurrentSession()
    if (s && s.kind === KIND) {
      const newTotal = ((s.state as any).stamina ?? 0) + 1
      sendGroupState(s.id, { stamina: newTotal })
    }
    if (_staminaEl) _staminaEl.textContent = `${(getCurrentSession()?.state as any)?.stamina ?? _localStamina} / ${STAMINA_TARGET}`
  }
  _currentCue = null
  paintCue()
}

export function isDanceActive(): boolean {
  const s = getCurrentSession()
  return !!(s && s.kind === KIND)
}

/** Called from the DJ Floor 'Start Dance' button. */
export function startOrJoinDance() {
  const existing = (window as any).__loungeTest?.getKnownGroups?.()?.find?.(
    (s: GroupSession) => s.kind === KIND && s.room === ROOM
  )
  if (existing) {
    sendGroupJoin(existing.id)
  } else {
    sendGroupCreate(KIND, ROOM as any, {
      startedAt: Date.now(),
      endsAt: Date.now() + ROUND_MS,
      cues: scheduleCues(),
      stamina: 0
    })
  }
}

function scheduleCues(): Array<{ dir: Dir; at: number }> {
  const out: Array<{ dir: Dir; at: number }> = []
  const step = Math.floor(ROUND_MS / CUE_COUNT)
  for (let i = 0; i < CUE_COUNT; i++) {
    out.push({
      dir: DIRS[Math.floor(Math.random() * DIRS.length)],
      at: Date.now() + (i + 1) * step
    })
  }
  return out
}

let _cueTimers: number[] = []
function scheduleClientCues(cues: Array<{ dir: Dir; at: number }>) {
  for (const t of _cueTimers) clearTimeout(t)
  _cueTimers = []
  for (const c of cues) {
    const dt = c.at - Date.now()
    if (dt < 0) continue
    _cueTimers.push(window.setTimeout(() => {
      _currentCue = c.dir
      _onCueAt = Date.now()
      paintCue()
      setTimeout(() => { if (_currentCue === c.dir) { _currentCue = null; paintCue() } }, 800)
    }, dt))
  }
}

let _countdownTimer: number | null = null

function handleSessionChange(s: GroupSession | null) {
  if (!s || s.kind !== KIND) {
    showOverlay(false)
    for (const t of _cueTimers) clearTimeout(t); _cueTimers = []
    if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null }
    _payoutGranted = false
    _localStamina = 0
    return
  }
  ensureOverlay()
  showOverlay(true)
  // First time receiving this session — schedule the cues from its state
  const cues = (s.state as any).cues
  if (Array.isArray(cues) && _cueTimers.length === 0) scheduleClientCues(cues as any)
  if (_staminaEl) _staminaEl.textContent = `${(s.state as any).stamina ?? 0} / ${STAMINA_TARGET}`
  if (!_countdownTimer) {
    _countdownTimer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((((s.state as any).endsAt ?? 0) - Date.now()) / 1000))
      if (_countdownEl) _countdownEl.textContent = `${remaining}s`
      if (remaining <= 0) {
        const total = (s.state as any).stamina ?? 0
        if (!_payoutGranted && total >= STAMINA_TARGET && s.members.length >= 2) {
          awardShells(5)
          _payoutGranted = true
        }
        sendGroupLeave(s.id)
      }
    }, 500)
  }
}

export function initDance() {
  if (_initialized) return
  _initialized = true
  onSessionChange(handleSessionChange)
}

export function leaveDanceIfNeeded(currentRoomId: string) {
  if (currentRoomId === ROOM) return
  const s = getCurrentSession()
  if (s && s.kind === KIND) sendGroupLeave(s.id)
}
