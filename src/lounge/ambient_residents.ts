// Ambient animal "residents" in the lobby — represent people who are online
// on the blog but not inside the nook. Real Bear avatars that idle/wander
// the lobby floor, slightly faded, with no name labels.
//
// Replaces the old "ghost silhouettes" system (ambient_ghosts.ts).
// Pattern mirrors transit_npcs.ts for Bear creation/movement.

import type Phaser from 'phaser'
import { Bear } from './bear'
import { ccToRegion, SPECIES, type Species, type RoomId } from './config'
import { startOnlinePolling, getOnlineSite, onOnlineChange } from './online_presence'
export { residentTargetCount } from './ambient_residents_logic'
import { residentTargetCount } from './ambient_residents_logic'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RESIDENTS = 5

// Lobby is 480×320 px. Safe floor region avoids top ~100 px (entrance / NPCs)
// and the very edges. ~12 hand-picked stand-points within the open floor.
// (Carried over from ambient_ghosts.ts — verified to sit on the lobby floor.)
const LOBBY_POINTS: Array<[number, number]> = [
  [100, 196], [160, 220], [220, 196], [280, 220],
  [340, 196], [380, 220], [300, 248], [160, 248],
  [240, 268], [200, 180], [320, 268], [260, 240],
]

const POLL_INTERVAL_MS = 45_000   // reconcile with online count every 45 s
const FADE_IN_ALPHA = 0.85        // matches transit NPC alpha

// ─── Module-level state ───────────────────────────────────────────────────────

type Resident = {
  bear: Bear
  targetX: number
  targetY: number
  pauseUntil: number    // ms (scene.time.now)
}

let residents: Resident[] = []
let updateEvent: Phaser.Time.TimerEvent | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let unsubOnline: (() => void) | null = null
let sceneRef: Phaser.Scene | null = null
let getPeerCountFn: (() => number) | null = null

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

export function setupAmbientResidents(
  scene: Phaser.Scene,
  roomId: RoomId,
  getPeerCount: () => number,
) {
  teardownAmbientResidents()
  if (roomId !== 'room_lobby') return

  sceneRef = scene
  getPeerCountFn = getPeerCount

  // Start the shared online poll (idempotent — only starts once)
  startOnlinePolling()

  // Reconcile as soon as the online count arrives (the first poll is async, so
  // the immediate reconcile below sees 0 on a cold load — this fires when the
  // real count lands ~<1s later, so residents don't wait the full poll cadence).
  unsubOnline = onOnlineChange(() => { if (sceneRef) reconcileResidents(sceneRef) })

  // Kick off first reconcile immediately (uses cached count if already warm)
  reconcileResidents(scene)

  // Periodic re-reconcile in sync with the online-count poll cadence
  pollTimer = setInterval(() => {
    if (sceneRef) reconcileResidents(sceneRef)
  }, POLL_INTERVAL_MS)

  // 4-Hz movement update loop — same cadence as transit/gallery_visitors
  updateEvent = scene.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => tickResidents(scene),
  })
}

export function teardownAmbientResidents() {
  if (updateEvent) { updateEvent.remove(false); updateEvent = null }
  if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null }
  if (unsubOnline) { unsubOnline(); unsubOnline = null }
  for (const r of residents) {
    try { r.bear.destroy() } catch {}
  }
  residents = []
  sceneRef = null
  getPeerCountFn = null
  // Note: do NOT call stopOnlinePolling() here — transit_npcs also uses it.
  // RoomScene owns that lifecycle via its shutdown/destroy events.
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function reconcileResidents(scene: Phaser.Scene) {
  const onlineSite = getOnlineSite()
  const realPeers = getPeerCountFn ? getPeerCountFn() : 0
  const target = residentTargetCount(onlineSite, realPeers, MAX_RESIDENTS)

  const current = residents.length

  if (target > current) {
    // Spawn new residents, fade in
    for (let i = current; i < target; i++) {
      const [sx, sy] = LOBBY_POINTS[Math.floor(Math.random() * LOBBY_POINTS.length)]
      const species = pickSpecies(scene)
      const region = ccToRegion(null)
      const bear = new Bear(scene, sx, sy, region, species)
      bear.sprite.setDepth(3)
      bear.sprite.setAlpha(0)
      // No name label — distinguishes residents from interactive peers
      // (do NOT call bear.setDisplayName)

      // Fade sprite in to 0.85 (same as transit NPCs)
      scene.tweens.add({
        targets: bear.sprite,
        alpha: FADE_IN_ALPHA,
        duration: 1200,
        ease: 'Sine.easeIn',
      })

      const [tx, ty] = pickLobbyTarget(sx, sy)
      const r: Resident = {
        bear,
        targetX: tx,
        targetY: ty,
        pauseUntil: scene.time.now + Math.random() * 3000,
      }
      residents.push(r)
    }
  } else if (target < current) {
    // Fade out + destroy excess residents (LIFO — remove from end)
    const excess = residents.splice(target)
    for (const r of excess) {
      scene.tweens.add({
        targets: r.bear.sprite,
        alpha: 0,
        duration: 1000,
        ease: 'Sine.easeOut',
        onComplete: () => { try { r.bear.destroy() } catch {} },
      })
    }
  }
}

function tickResidents(scene: Phaser.Scene) {
  const now = scene.time.now
  const dtMs = 250  // fixed tick interval

  for (const r of residents) {
    // Drive the Bear's built-in walk logic
    r.bear.update(dtMs, true)

    if (now < r.pauseUntil) continue

    const cx = r.bear.x
    const cy = r.bear.y
    const dx = r.targetX - cx
    const dy = r.targetY - cy
    const dist = Math.hypot(dx, dy)

    if (dist <= 4) {
      // Arrived — pause 3-6 s then wander to a new target
      r.pauseUntil = now + 3000 + Math.random() * 3000
      ;[r.targetX, r.targetY] = pickLobbyTarget(r.bear.x, r.bear.y)
      // walkTo will update facing + animation on next tick; clear target for now
      r.bear.walkTo(r.targetX, r.targetY)
    } else if (!r.bear.target) {
      // Kick off walking toward the current target if Bear has no active target
      r.bear.walkTo(r.targetX, r.targetY)
    }
  }
}

/** Pick next lobby floor point not too close to the current position. */
function pickLobbyTarget(currentX: number, currentY: number): [number, number] {
  const candidates = LOBBY_POINTS
    .filter(([x, y]) => Math.hypot(x - currentX, y - currentY) > 20)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
  if (candidates.length === 0) return [currentX, currentY]
  return candidates[Math.floor(Math.random() * candidates.length)] as [number, number]
}

/** Pick a random species that has a loaded texture (mirrors transit_npcs.ts pick()). */
function pickSpecies(scene: Phaser.Scene): Species {
  const region = ccToRegion(null)
  const cached = SPECIES.filter(sp =>
    sp === 'bear' || scene.textures.exists(`${sp}_${region}`)
  )
  const pool = cached.length > 0 ? cached : [...SPECIES]
  return pool[Math.floor(Math.random() * pool.length)]
}
