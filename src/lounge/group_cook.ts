// V14.2 — Group Cook-along.
//
// In the Kitchen, any player can start (or join) a 'cook_along' group
// session. Each member plays the standard Stir-fry mini-game; their score
// patches into the shared state. After 90 seconds OR all current members
// have submitted, total score → shells reward (bigger than solo because
// it sums everyone, but also requires coordination).
//
// State shape:
//   { startedAt, deadlineAt, scores: { [visitor_id]: number }, finished: boolean }

import { getCurrentSession, onSessionChange, type GroupSession } from './group'
import { sendGroupCreate, sendGroupJoin, sendGroupState, sendGroupLeave, sendGroupList } from './net'
import { getOrCreateVisitorId } from './config'
import { awardShells } from './shells'

const KIND = 'cook_along'
const ROOM = 'room_kitchen'
const DURATION_MS = 90_000

let _bannerHandler: ((text: string | null) => void) | null = null
let _ownScoreSubmitted = false
let _payoutGranted = false
let _initialized = false

export function setCookBannerHandler(fn: (text: string | null) => void) {
  _bannerHandler = fn
}

/** Called when player enters Kitchen — refreshes session list so banner appears. */
export function maybeNoticeCookAlong(currentRoomId: string) {
  if (currentRoomId !== ROOM) { _bannerHandler?.(null); return }
  if (!_initialized) {
    _initialized = true
    onSessionChange(handleSessionChange)
  }
  sendGroupList({ kind: KIND, room: ROOM })
  refreshBanner()
}

export function leaveCookAlongIfNeeded(currentRoomId: string) {
  if (currentRoomId === ROOM) return
  const s = getCurrentSession()
  if (s && s.kind === KIND) sendGroupLeave(s.id)
  _ownScoreSubmitted = false
  _payoutGranted = false
  _bannerHandler?.(null)
}

/** Called from the Kitchen Cook button. Creates a session if none exists,
 *  otherwise joins the existing one. */
export function startOrJoinCookAlong() {
  const existing = (window as any).__loungeTest?.getKnownGroups?.()?.find?.(
    (s: GroupSession) => s.kind === KIND && s.room === ROOM
  )
  if (existing) sendGroupJoin(existing.id)
  else sendGroupCreate(KIND, ROOM as any, {
    startedAt: Date.now(),
    deadlineAt: Date.now() + DURATION_MS,
    scores: {},
    finished: false
  })
}

/** Called by the cook mini-game when this player finishes solo —
 *  submits their score into the shared session state. */
export function submitCookScore(score: number) {
  const s = getCurrentSession()
  if (!s || s.kind !== KIND) return
  if (_ownScoreSubmitted) return
  _ownScoreSubmitted = true
  const vid = getOrCreateVisitorId()
  const nextScores = { ...((s.state as any).scores ?? {}), [vid]: score }
  sendGroupState(s.id, { scores: nextScores })
}

function handleSessionChange(s: GroupSession | null) {
  if (!s || s.kind !== KIND) {
    _ownScoreSubmitted = false
    _payoutGranted = false
    _bannerHandler?.(null)
    return
  }
  refreshBanner()
  // If everyone in the session has submitted (or deadline passed), trigger payout once
  const scores = (s.state as any).scores ?? {}
  const everyoneSubmitted = s.members.every(m => typeof scores[m.visitor_id] === 'number')
  const deadlinePassed = Date.now() > Number((s.state as any).deadlineAt ?? 0)
  if (!_payoutGranted && (everyoneSubmitted || deadlinePassed) && s.members.length >= 1) {
    const totalScore = Object.values(scores).reduce((a: number, b: any) => a + (Number(b) || 0), 0) as number
    // Group reward: 1 shell per 10 points of TOTAL (vs 1 per 20 solo) — incentivizes co-op
    const reward = Math.max(0, Math.floor(totalScore / 10))
    if (reward > 0) awardShells(reward)
    _payoutGranted = true
    _bannerHandler?.(`🍳 Cook-along finished — total ${totalScore} · +${reward} shells`)
  }
}

function refreshBanner() {
  const s = getCurrentSession()
  if (!s || s.kind !== KIND) {
    _bannerHandler?.(null)
    return
  }
  const scores = (s.state as any).scores ?? {}
  const submitted = Object.keys(scores).length
  const remainingSec = Math.max(0, Math.floor((Number((s.state as any).deadlineAt) - Date.now()) / 1000))
  _bannerHandler?.(`🍳 Cook-along: ${s.members.length} joined · ${submitted} done · ${remainingSec}s left`)
}
