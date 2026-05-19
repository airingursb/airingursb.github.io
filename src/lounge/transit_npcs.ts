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
}

export class TransitNpcController {
  private scene: Phaser.Scene
  private mapWidthPx: number
  private mapHeightPx: number
  private walkers: Walker[] = []
  private timer?: Phaser.Time.TimerEvent
  private speciesPool: Species[]

  constructor(scene: Phaser.Scene, mapWidthPx: number, mapHeightPx: number) {
    this.scene = scene
    this.mapWidthPx = mapWidthPx
    this.mapHeightPx = mapHeightPx
    this.speciesPool = [...SPECIES]
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
        pauseUntil: 0
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
