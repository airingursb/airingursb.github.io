// V14.3 — Group Jam Combo.
//
// The V8 server already detects multi-player jam events server-side and
// broadcasts jam_burst with tier ('jam'/'circle'/'full') + distinct
// visitor count. We piggyback on those bursts: each 'circle' or 'full'
// counts as one combo toward a session-shared 10-combo target. Reach
// the target with ≥2 members → all current members get +5 shells.
//
// The group session is auto-created when player enters DJ Floor with ≥1
// other peer (avoid empty solo sessions).

import { getCurrentSession, onSessionChange, type GroupSession } from './group'
import { sendGroupCreate, sendGroupJoin, sendGroupState, sendGroupLeave, sendGroupList } from './net'
import { awardShells } from './shells'

const KIND = 'jam_combo'
const ROOM = 'room_dj_floor'
const COMBO_TARGET = 10
const COMBO_SESSION_MS = 60_000

let _initialized = false
let _bannerHandler: ((text: string | null) => void) | null = null
let _payoutGranted = false

export function setJamBannerHandler(fn: (text: string | null) => void) {
  _bannerHandler = fn
}

/** Called when player enters DJ Floor + at least 1 peer is present. */
export function maybeJoinJamCombo(currentRoomId: string, peerCount: number) {
  if (currentRoomId !== ROOM) { _bannerHandler?.(null); return }
  if (peerCount < 1) return  // solo: no jam combo session
  if (!_initialized) {
    _initialized = true
    onSessionChange(handleSessionChange)
  }
  sendGroupList({ kind: KIND, room: ROOM })
  // List response triggers handleListChange (in handleSessionChange via group.ts)
  // Race: list might return before our subscribe; instead, retry-join after a tick.
  setTimeout(() => {
    if (getCurrentSession()) return  // already in some session
    const known = (window as any).__loungeTest?.getKnownGroups?.() ?? []
    const existing = known.find((s: GroupSession) => s.kind === KIND && s.room === ROOM)
    if (existing) sendGroupJoin(existing.id)
    else sendGroupCreate(KIND, ROOM as any, { combos: 0, startedAt: Date.now(), deadline: Date.now() + COMBO_SESSION_MS })
  }, 500)
}

export function leaveJamComboIfNeeded(currentRoomId: string) {
  if (currentRoomId === ROOM) return
  const s = getCurrentSession()
  if (s && s.kind === KIND) sendGroupLeave(s.id)
  _payoutGranted = false
  _bannerHandler?.(null)
}

/** Called by RoomScene.applyJamBurst — server's tier classifies the event,
 *  we only count circle/full as a "combo" (i.e. ≥3 distinct visitors). */
export function noticeJamBurstTier(tier: string) {
  if (tier !== 'circle' && tier !== 'full') return
  onComboHit()
}

function onComboHit() {
  const s = getCurrentSession()
  if (s && s.kind === KIND) {
    // Only the local player's perspective writes — server merges, but we just
    // overwrite with our local view. Real games would need a server-side
    // counter to avoid count-divergence between peers; acceptable for MVP.
    const next = ((s.state as any).combos ?? 0) + 1
    sendGroupState(s.id, { combos: next })
  }
  refreshBanner()
}

function handleSessionChange(s: GroupSession | null) {
  if (!s || s.kind !== KIND) { _bannerHandler?.(null); return }
  refreshBanner()
  const combos = Number((s.state as any).combos ?? 0)
  const deadline = Number((s.state as any).deadline ?? 0)
  if (!_payoutGranted && (combos >= COMBO_TARGET || Date.now() > deadline) && s.members.length >= 2 && combos >= COMBO_TARGET) {
    awardShells(5)
    _payoutGranted = true
    _bannerHandler?.(`🎧 Jam Combo ×${combos} — +5 shells!`)
  }
}

function refreshBanner() {
  const s = getCurrentSession()
  if (!s || s.kind !== KIND) { _bannerHandler?.(null); return }
  const combos = Number((s.state as any).combos ?? 0)
  _bannerHandler?.(`🎧 Jam Combo: ${combos} / ${COMBO_TARGET} · ${s.members.length} on the floor`)
}
