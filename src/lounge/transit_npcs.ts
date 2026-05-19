// V23.0 — Transit NPCs.
//
// Background bears that enter from one edge of the room, walk in a
// straight line to the opposite edge, and despawn. No interaction, no
// dialog, no name labels.
//
// V23.10 additions:
//   - 30% chance the NPC pauses at the midpoint and "looks around" for
//     2-4s before continuing (changes facing twice)
//   - 25% chance a PAIR of NPCs spawns together with ~16px x-offset

import type Phaser from 'phaser'
import { Bear, type Direction } from './bear'
import { ccToRegion, SPECIES, type Species, prefersReducedMotion } from './config'
import { footprintKindFor, type FootprintKind } from './footprints'

const MIN_COOLDOWN_MS = 90_000
const MAX_COOLDOWN_MS = 180_000

type Walker = {
  bear: Bear
  exitX: number
  /** Walk phase: in transit → optional midpoint pause → continuing → exit. */
  stage: 'walking_to_midpoint' | 'pausing' | 'walking_to_exit' | 'walking_direct'
  midX: number
  facingForward: Direction
  pauseUntil: number
  // V23.15 — per-walker footprint state (alternating L/R + travel counter).
  fpLastX: number
  fpLastY: number
  fpTravel: number
  fpParity: 0 | 1
}

export class TransitNpcController {
  private scene: Phaser.Scene
  private mapWidthPx: number
  private mapHeightPx: number
  private walkers: Walker[] = []
  private timer?: Phaser.Time.TimerEvent
  private speciesPool: Species[]
  // V23.15 — footprint kind for this room (null = no prints, 'sand' / 'snow' = leave them)
  private footprintKind: FootprintKind
  /** All footprint sprites this controller has dropped, capped + auto-pruned. */
  private footprints: Phaser.GameObjects.Container[] = []

  constructor(scene: Phaser.Scene, mapWidthPx: number, mapHeightPx: number, roomId: string) {
    this.scene = scene
    this.mapWidthPx = mapWidthPx
    this.mapHeightPx = mapHeightPx
    this.speciesPool = [...SPECIES]
    this.footprintKind = footprintKindFor(roomId)
  }

  start() {
    if (prefersReducedMotion()) return
    this.scheduleNext(MIN_COOLDOWN_MS / 3)
  }

  tick(dtMs: number) {
    if (this.walkers.length === 0) return
    const now = this.scene.time.now
    const stillAlive: Walker[] = []
    for (const w of this.walkers) {
      w.bear.update(dtMs, true)
      // V23.15 — drop footprints on snow/sand if this room supports them
      if (this.footprintKind) {
        this.tryDropFootprint(w)
      }
      // State machine
      if (w.stage === 'walking_to_midpoint') {
        if (Math.abs(w.bear.x - w.midX) < 4) {
          // Reached midpoint — pause and look around
          w.stage = 'pausing'
          w.pauseUntil = now + 2000 + Math.random() * 2000
          w.bear.target = null  // stop walking
          // Look up briefly, then to the side
          w.bear.facing = 'up'
          w.bear.playIdle()
          this.scene.time.delayedCall(700, () => {
            if (w.bear.scene) {
              w.bear.facing = (Math.random() < 0.5 ? 'left' : 'right')
              w.bear.playIdle()
            }
          })
        }
      } else if (w.stage === 'pausing') {
        if (now >= w.pauseUntil) {
          // Resume — restore forward facing, walk to exit
          w.bear.facing = w.facingForward
          w.bear.walkTo(w.exitX, w.bear.y)
          w.stage = 'walking_to_exit'
        }
      } else if (w.stage === 'walking_to_exit' || w.stage === 'walking_direct') {
        if (Math.abs(w.bear.x - w.exitX) < 4) {
          w.bear.destroy()
          continue
        }
      }
      stillAlive.push(w)
    }
    this.walkers = stillAlive
    if (this.walkers.length === 0 && !this.timer) {
      this.scheduleNext()
    }
  }

  destroy() {
    this.timer?.remove(false)
    this.timer = undefined
    for (const w of this.walkers) { try { w.bear.destroy() } catch {} }
    this.walkers.length = 0
    // V23.15 — destroy any leftover transit footprints (they would
    // otherwise leak across scene shutdown since they're scene-owned).
    for (const f of this.footprints) { try { f.destroy() } catch {} }
    this.footprints.length = 0
  }

  /** V23.15 — drop a footprint behind a walker every ~24px traveled,
   *  alternating L/R via per-walker parity. Identical visual style to
   *  the player's footprint module to keep the world coherent. */
  private tryDropFootprint(w: Walker) {
    const dx = w.bear.x - w.fpLastX
    const dy = w.bear.y - w.fpLastY
    w.fpTravel += Math.hypot(dx, dy)
    w.fpLastX = w.bear.x; w.fpLastY = w.bear.y
    if (w.fpTravel < 24) return
    w.fpTravel = 0
    const sideOffset = 2.5
    let ox = 0, oy = 0
    const side = w.fpParity === 0 ? -1 : 1
    switch (w.bear.facing) {
      case 'up':    ox =  side * sideOffset; break
      case 'down':  ox = -side * sideOffset; break
      case 'left':  oy = -side * sideOffset; break
      case 'right': oy =  side * sideOffset; break
    }
    w.fpParity = (1 - w.fpParity) as 0 | 1
    const kind = this.footprintKind
    if (!kind) return
    const main = kind === 'snow' ? 0xa0c0d8 : 0x806848
    const c = this.scene.add.container(w.bear.x + ox, w.bear.y + oy - 1).setDepth(2)
    const pad  = this.scene.add.rectangle(0, 0, 4, 2, main, 0.55)
    const toe1 = this.scene.add.rectangle(2, -1.5, 1, 1, main, 0.45)
    const toe2 = this.scene.add.rectangle(2.5, 0, 1, 1, main, 0.45)
    const toe3 = this.scene.add.rectangle(2, 1.5, 1, 1, main, 0.45)
    c.add([pad, toe1, toe2, toe3])
    const angleByFacing: Record<Direction, number> = { right: 0, left: 180, down: 90, up: 270 }
    c.setAngle(angleByFacing[w.bear.facing])
    this.footprints.push(c)
    const dur = 8000 + Math.random() * 4000
    this.scene.tweens.add({
      targets: c, alpha: 0, duration: dur, ease: 'Sine.in',
      onComplete: () => {
        try { c.destroy() } catch {}
        const i = this.footprints.indexOf(c)
        if (i >= 0) this.footprints.splice(i, 1)
      }
    })
    // Cap to avoid unbounded growth on a never-shutting-down room
    while (this.footprints.length > 60) {
      const old = this.footprints.shift()
      if (old) { try { old.destroy() } catch {} }
    }
  }

  private scheduleNext(delayMs?: number) {
    const delay = delayMs ?? (MIN_COOLDOWN_MS + Math.random() * (MAX_COOLDOWN_MS - MIN_COOLDOWN_MS))
    this.timer = this.scene.time.delayedCall(delay, () => {
      this.timer = undefined
      this.spawn()
    })
  }

  private spawn() {
    if (this.walkers.length > 0) return
    const isPair = Math.random() < 0.25
    const willPause = !isPair && Math.random() < 0.3   // never pause when pair-walking
    const fromLeft = Math.random() < 0.5
    const baseY = this.mapHeightPx * 0.4 + Math.random() * (this.mapHeightPx * 0.4)
    const startX = fromLeft ? -16 : this.mapWidthPx + 16
    const exitX = fromLeft ? this.mapWidthPx + 16 : -16
    const midX = this.mapWidthPx / 2
    const region = ccToRegion(null)
    const pick = (): Species => {
      const cached = this.speciesPool.filter(sp =>
        sp === 'bear' || this.scene.textures.exists(`${sp}_${region}`)
      )
      const pool = cached.length > 0 ? cached : this.speciesPool
      return pool[Math.floor(Math.random() * pool.length)]
    }
    const facingForward: Direction = fromLeft ? 'right' : 'left'

    const makeWalker = (offsetX: number, offsetY: number, willPauseThis: boolean): Walker => {
      const species = pick()
      const bear = new Bear(this.scene, startX + offsetX, baseY + offsetY, region, species)
      bear.sprite.setDepth(3)
      bear.sprite.setAlpha(0.85)
      bear.facing = facingForward
      const target = willPauseThis ? midX + offsetX : exitX
      bear.walkTo(target, baseY + offsetY)
      return {
        bear,
        exitX,
        stage: willPauseThis ? 'walking_to_midpoint' : 'walking_direct',
        midX: midX + offsetX,
        facingForward,
        pauseUntil: 0,
        fpLastX: bear.sprite.x,
        fpLastY: bear.sprite.y,
        fpTravel: 0,
        fpParity: 0
      }
    }

    if (isPair) {
      // Two bears side by side, slight y-stagger so they don't fully overlap
      this.walkers.push(makeWalker(0, 0, false))
      this.walkers.push(makeWalker(fromLeft ? -16 : 16, 4, false))
    } else {
      this.walkers.push(makeWalker(0, 0, willPause))
    }
  }
}
