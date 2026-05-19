// V23.9 — Player footprints on sand / snow.
//
// Drops a small alternating L/R footprint sprite behind the moving bear
// every ~24px of walked distance. Two surfaces support this today:
//   - Beach: always sand prints (the surface is sandy)
//   - Any outdoor room (balcony / grove / beach / rooftop) when weather
//     is snow: snow footprints
//
// Each print fades out after 8-12s so they don't pile up indefinitely.
// Driven by RoomScene's update() loop — no extra timer.

import Phaser from 'phaser'
import type { Direction } from './bear'
import { getWeatherForDate } from './weather'

export type FootprintKind = 'sand' | 'snow' | null

const FOOTPRINT_ROOMS_SAND = new Set(['room_beach'])
const FOOTPRINT_ROOMS_OUTDOOR = new Set(['room_beach', 'room_balcony', 'room_grove', 'room_rooftop'])

/** Decide whether the player's current room should leave footprints, and
 *  if so what kind. Returns null if the surface doesn't accept prints
 *  (e.g. wood floor lobby). */
export function footprintKindFor(roomId: string): FootprintKind {
  // Snow takes precedence on any outdoor room
  if (FOOTPRINT_ROOMS_OUTDOOR.has(roomId)) {
    const w = getWeatherForDate(new Date())
    if (w === 'snow') return 'snow'
  }
  if (FOOTPRINT_ROOMS_SAND.has(roomId)) return 'sand'
  return null
}

const SAND_COLOR = 0xb89870
const SAND_DEEP  = 0x806848
const SNOW_COLOR = 0xc0d8e8
const SNOW_DEEP  = 0xa0c0d8

/** A small 4×3 oblong, tinted + slight offset based on facing.
 *  The footprint container is added at depth 2 (below player). */
function drawFootprint(
  scene: Phaser.Scene,
  x: number, y: number,
  facing: Direction,
  kind: 'sand' | 'snow'
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(2)
  const main = kind === 'snow' ? SNOW_DEEP : SAND_DEEP
  const sub  = kind === 'snow' ? SNOW_COLOR : SAND_COLOR
  // Tiny print: 4px long pad + 3 toe specks. Facing rotation handled by
  // the container angle.
  const pad  = scene.add.rectangle(0, 0, 4, 2, main, 0.65)
  const toe1 = scene.add.rectangle(2, -1.5, 1, 1, main, 0.55)
  const toe2 = scene.add.rectangle(2.5, 0, 1, 1, main, 0.55)
  const toe3 = scene.add.rectangle(2, 1.5, 1, 1, main, 0.55)
  c.add([pad, toe1, toe2, toe3])
  // Rotate based on facing so prints point forward
  const angleByFacing: Record<Direction, number> = {
    right: 0, left: 180, down: 90, up: 270
  }
  c.setAngle(angleByFacing[facing])
  // Use sub as a subtle highlight: not visible currently but reserved
  void sub
  return c
}

/** Per-scene helper holding minimal state. RoomScene constructs one in
 *  create() and calls onMove() each frame with the bear's current x/y
 *  and facing direction. */
export class FootprintTracker {
  private scene: Phaser.Scene
  private kind: FootprintKind
  private lastX = 0
  private lastY = 0
  private travel = 0
  private parity: 0 | 1 = 0   // alternate L (0) / R (1)
  /** All live footprint containers (for cleanup on scene shutdown). */
  private prints: Phaser.GameObjects.Container[] = []

  constructor(scene: Phaser.Scene, roomId: string) {
    this.scene = scene
    this.kind = footprintKindFor(roomId)
  }

  isActive(): boolean { return this.kind !== null }

  /** Call each frame with the bear's current position + facing. */
  onMove(x: number, y: number, facing: Direction) {
    if (!this.kind) return
    if (this.lastX === 0 && this.lastY === 0) { this.lastX = x; this.lastY = y; return }
    const dx = x - this.lastX, dy = y - this.lastY
    this.travel += Math.hypot(dx, dy)
    this.lastX = x; this.lastY = y
    if (this.travel < 24) return
    this.travel = 0
    // Offset to one side so prints alternate L/R
    const sideOffset = 2.5
    let ox = 0, oy = 0
    const side = this.parity === 0 ? -1 : 1
    switch (facing) {
      case 'up':    ox =  side * sideOffset; break
      case 'down':  ox = -side * sideOffset; break
      case 'left':  oy = -side * sideOffset; break
      case 'right': oy =  side * sideOffset; break
    }
    this.parity = (1 - this.parity) as 0 | 1
    const p = drawFootprint(this.scene, x + ox, y + oy - 1, facing, this.kind)
    this.prints.push(p)
    // Fade out 8-12s, then destroy + remove from tracker list
    const dur = 8000 + Math.random() * 4000
    this.scene.tweens.add({
      targets: p, alpha: 0,
      duration: dur, ease: 'Sine.in',
      onComplete: () => {
        try { p.destroy() } catch {}
        const idx = this.prints.indexOf(p)
        if (idx >= 0) this.prints.splice(idx, 1)
      }
    })
    // Cap total live prints to avoid unbounded growth on long walks
    while (this.prints.length > 40) {
      const old = this.prints.shift()
      if (old) { try { old.destroy() } catch {} }
    }
  }

  /** Destroy all live footprints — called on scene shutdown. */
  destroy() {
    for (const p of this.prints) { try { p.destroy() } catch {} }
    this.prints.length = 0
  }
}
