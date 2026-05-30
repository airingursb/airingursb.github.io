// Ambient "ghost" silhouettes in the lobby — represent people who are online
// on the blog but not inside the nook. Faint translucent wanderers that give
// the lobby a sense of living presence without any interactivity.
//
// Pattern mirrors gallery_visitors.ts exactly.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { ghostTargetCount } from './ambient_ghosts_logic'
export { ghostTargetCount } from './ambient_ghosts_logic'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GHOSTS = 8
// Lobby is 480×320 px. Safe floor region avoids top ~100 px (entrance / NPCs)
// and the very edges. ~8 hand-picked stand-points within the open floor.
const LOBBY_POINTS: Array<[number, number]> = [
  [100, 196], [160, 220], [220, 196], [280, 220],
  [340, 196], [380, 220], [300, 248], [160, 248],
  [240, 268], [200, 180], [320, 268], [260, 240],
]

const GHOST_COLORS = [0x8888aa, 0x9999bb, 0x7777aa, 0xaaaacc, 0x8899bb]
const POLL_INTERVAL_MS = 45_000   // re-fetch online count every 45 s

// ─── Module-level state ───────────────────────────────────────────────────────

type Ghost = {
  container: Phaser.GameObjects.Container
  targetX: number
  targetY: number
  speed: number          // px/sec
  pauseUntil: number     // ms timestamp
}

let ghosts: Ghost[] = []
let updateEvent: Phaser.Time.TimerEvent | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let sceneRef: Phaser.Scene | null = null
let getPeerCountFn: (() => number) | null = null

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

export function setupAmbientGhosts(
  scene: Phaser.Scene,
  roomId: RoomId,
  _getBearPos: () => { x: number; y: number } | null,
  getPeerCount: () => number,
) {
  teardownAmbientGhosts()
  if (roomId !== 'room_lobby') return

  sceneRef = scene
  getPeerCountFn = getPeerCount

  // Kick off first fetch immediately
  fetchAndReconcile(scene)

  // Periodic re-poll
  pollTimer = setInterval(() => fetchAndReconcile(scene), POLL_INTERVAL_MS)

  // 4-Hz movement update loop — same cadence as gallery_visitors
  updateEvent = scene.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => tickGhosts(scene),
  })
}

export function teardownAmbientGhosts() {
  if (updateEvent) { updateEvent.remove(false); updateEvent = null }
  if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null }
  for (const g of ghosts) g.container.destroy()
  ghosts = []
  sceneRef = null
  getPeerCountFn = null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchAndReconcile(scene: Phaser.Scene) {
  let onlineSite = 0
  try {
    const res = await fetch('https://chat.ursb.me/api/online/count')
    if (res.ok) {
      const data = await res.json() as { site?: number }
      onlineSite = typeof data.site === 'number' ? data.site : 0
    }
  } catch {
    // Network error — keep current ghost count
    return
  }

  const realPeers = getPeerCountFn ? getPeerCountFn() : 0
  const target = ghostTargetCount(onlineSite, realPeers, MAX_GHOSTS)
  reconcileGhosts(scene, target)
}

function reconcileGhosts(scene: Phaser.Scene, target: number) {
  const current = ghosts.length

  if (target > current) {
    // Spawn new ghosts, fade in
    for (let i = current; i < target; i++) {
      const [sx, sy] = LOBBY_POINTS[Math.floor(Math.random() * LOBBY_POINTS.length)]
      const g = makeGhost(scene, sx, sy)
      // Start transparent, tween to 0.3
      g.container.setAlpha(0)
      scene.tweens.add({
        targets: g.container,
        alpha: 0.3,
        duration: 1200,
        ease: 'Sine.easeIn',
      })
      ghosts.push(g)
    }
  } else if (target < current) {
    // Fade out + destroy excess ghosts
    const excess = ghosts.splice(target)
    for (const g of excess) {
      scene.tweens.add({
        targets: g.container,
        alpha: 0,
        duration: 1000,
        ease: 'Sine.easeOut',
        onComplete: () => g.container.destroy(),
      })
    }
  }
}

function makeGhost(scene: Phaser.Scene, x: number, y: number): Ghost {
  const c = scene.add.container(x, y).setDepth(3.5).setAlpha(0.3)
  const color = GHOST_COLORS[Math.floor(Math.random() * GHOST_COLORS.length)]

  // Soft ethereal glow behind the silhouette
  const glow = scene.add.ellipse(0, -1, 13, 20, color, 0.25)
  // Ground shadow (very faint)
  const shadow = scene.add.ellipse(0, 7, 10, 3, 0x000000, 0.20)
  // Body — slightly thinner/taller than gallery visitors to read as "different"
  const body = scene.add.rectangle(0, 0, 8, 15, color)
  // Head
  const head = scene.add.circle(0, -10, 3.5, color)

  c.add([shadow, glow, body, head])

  const [tx, ty] = pickLobbyTarget(x, y)
  return {
    container: c,
    targetX: tx,
    targetY: ty,
    speed: 12 + Math.random() * 8,  // 12-20 px/sec — slow, drifting
    pauseUntil: scene.time.now + Math.random() * 3000,
  }
}

function tickGhosts(scene: Phaser.Scene) {
  const now = scene.time.now
  for (const g of ghosts) {
    if (now < g.pauseUntil) continue
    const cx = g.container.x, cy = g.container.y
    const dx = g.targetX - cx, dy = g.targetY - cy
    const dist = Math.hypot(dx, dy)
    const step = g.speed * 0.25   // 250ms tick

    if (dist <= step + 2) {
      g.container.x = g.targetX
      g.container.y = g.targetY
      // Pause 3-6 s, then pick a new wander target
      g.pauseUntil = now + 3000 + Math.random() * 3000
      ;[g.targetX, g.targetY] = pickLobbyTarget(g.targetX, g.targetY)
    } else {
      g.container.x += (dx / dist) * step
      g.container.y += (dy / dist) * step
    }
  }
}

// Pick next target within the safe lobby floor region, not too close to current pos
function pickLobbyTarget(currentX: number, currentY: number): [number, number] {
  const candidates = LOBBY_POINTS
    .filter(([x, y]) => Math.hypot(x - currentX, y - currentY) > 20)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
  if (candidates.length === 0) return [currentX, currentY]
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return pick as [number, number]
}
