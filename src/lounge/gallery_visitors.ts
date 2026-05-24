// Procedural "visitors" that wander the gallery — small ink silhouettes
// that idle in front of exhibits and slowly drift between them. Fills the
// "70% populated, looks unfinished" gap until Codex delivers proper NPC art.
// Each visitor picks a random nearby exhibit anchor, walks there over 6-9
// seconds, stands for 4-7 seconds (admiring), then picks the next one.

import Phaser from 'phaser'
import type { RoomId } from './config'

type Visitor = {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Rectangle
  targetX: number
  targetY: number
  speed: number               // px/sec
  pauseUntil: number          // ms timestamp when admiration ends
}

let visitors: Visitor[] = []
let updateEvent: Phaser.Time.TimerEvent | null = null
let getBearFn: (() => { x: number; y: number } | null) | null = null
const BEAR_AVOID_RADIUS = 28

// Hand-picked "interesting" stand-points around the gallery. Mix of in front
// of paintings + general circulation.
const POINTS: Array<[number, number]> = [
  // East wing painting anchors
  [984, 416], [1192, 416], [984, 512], [1192, 512], [984, 608], [1192, 608],
  // West wing painting anchors
  [88, 416], [296, 416], [88, 512], [296, 512], [88, 608], [296, 608],
  // North hall
  [560, 144], [688, 144],
  // Rotunda — walking around the centerpiece
  [560, 480], [720, 480], [560, 560], [720, 560],
  // South pavilion
  [500, 800], [780, 800],
]

const SUIT_COLORS = [0x1a1a1a, 0x2a2818, 0x1a2030, 0x2a1818, 0x1a1820]
const HEAD_COLOR = 0xf0e8c8

export function setupGalleryVisitors(
  scene: Phaser.Scene,
  roomId: RoomId,
  getBearPos?: () => { x: number; y: number } | null
) {
  teardownGalleryVisitors()
  if (roomId !== 'room_gallery') return
  getBearFn = getBearPos ?? null

  // Spawn 5 visitors at random initial points
  const visitorCount = 5
  for (let i = 0; i < visitorCount; i++) {
    const [sx, sy] = POINTS[Math.floor(Math.random() * POINTS.length)]
    visitors.push(makeVisitor(scene, sx, sy))
  }

  // 4-Hz update loop — pick new targets when arrived + admire-done
  updateEvent = scene.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => {
      const now = scene.time.now
      const bear = getBearFn?.()
      for (const v of visitors) {
        // If admiring, skip movement
        if (now < v.pauseUntil) continue
        const cx = v.container.x, cy = v.container.y
        // Slow to a crawl when the bear is in personal-bubble range (museum politeness)
        const bearDist = bear ? Math.hypot(bear.x - cx, bear.y - cy) : Infinity
        const speedMult = bearDist < BEAR_AVOID_RADIUS ? 0.15 : 1
        const dx = v.targetX - cx, dy = v.targetY - cy
        const dist = Math.hypot(dx, dy)
        const step = v.speed * 0.25 * speedMult  // 250ms tick
        if (dist <= step + 2) {
          // Arrived — admire 4-7s, then pick new target
          v.container.x = v.targetX
          v.container.y = v.targetY
          v.pauseUntil = now + 4000 + Math.random() * 3000
          // Face the painting (look toward the wall)
          ;[v.targetX, v.targetY] = pickNextTarget(v.targetX, v.targetY)
        } else {
          v.container.x += (dx / dist) * step
          v.container.y += (dy / dist) * step
        }
      }
    },
  })
}

function makeVisitor(scene: Phaser.Scene, x: number, y: number): Visitor {
  const c = scene.add.container(x, y).setDepth(4.2)
  const suitColor = SUIT_COLORS[Math.floor(Math.random() * SUIT_COLORS.length)]
  // Warm rim-light halo behind the silhouette so it reads as "lit person"
  // not "ghost cutout" (per design review 2026-05-24).
  const rim = scene.add.ellipse(0, -2, 14, 22, 0xffd8a0, 0.18)
  const shadow = scene.add.ellipse(0, 7, 12, 3, 0x000000, 0.35)
  const body = scene.add.rectangle(0, 0, 9, 16, suitColor)
  const head = scene.add.circle(0, -10, 4, HEAD_COLOR)
  // Tiny ink collar dab — adds dressed-up read
  const collar = scene.add.rectangle(0, -6, 5, 1.5, 0x1a1a1a)
  c.add([shadow, rim, body, head, collar])
  const [tx, ty] = pickNextTarget(x, y)
  return {
    container: c,
    body,
    targetX: tx,
    targetY: ty,
    speed: 14 + Math.random() * 8,    // 14-22 px/sec — slow, dignified
    pauseUntil: scene.time.now + Math.random() * 2000,
  }
}

// Zone bbox lookup so visitors stay in the same wing (don't phase through
// inner walls between rotunda and the wings).
function zoneOf(x: number, y: number): string {
  if (x >= 384 && x < 896 && y >= 320 && y < 704) return 'rotunda'
  if (x >= 0   && x < 384 && y >= 320 && y < 704) return 'west'
  if (x >= 896                              && y >= 320 && y < 704) return 'east'
  if (x >= 512 && x < 768 && y >= 0   && y < 320) return 'north'
  if (x >= 384 && x < 896 && y >= 704 && y < 960) return 'south'
  return 'unknown'
}

function pickNextTarget(currentX: number, currentY: number): [number, number] {
  const currentZone = zoneOf(currentX, currentY)
  // Keep visitors in their current zone — no wall-phasing between wings.
  const sameZone = POINTS.filter(([x, y]) => zoneOf(x, y) === currentZone)
  const candidates = (sameZone.length > 1 ? sameZone : POINTS)
    .filter(([x, y]) => Math.hypot(x - currentX, y - currentY) > 4)
    .sort((a, b) => {
      const da = Math.hypot(a[0] - currentX, a[1] - currentY)
      const db = Math.hypot(b[0] - currentX, b[1] - currentY)
      return da - db
    })
    .slice(0, 4)
  if (candidates.length === 0) return [currentX, currentY]
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return pick as [number, number]
}

export function teardownGalleryVisitors() {
  if (updateEvent) { updateEvent.remove(false); updateEvent = null }
  for (const v of visitors) v.container.destroy()
  visitors = []
  getBearFn = null
}
