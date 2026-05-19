// V23.0 — Transit NPCs.
//
// Background bears that enter from one edge of the room, walk in a
// straight line to the opposite edge, and despawn. No interaction, no
// dialog, no name labels. Their job is to make the room feel inhabited
// even when no players are around.
//
// Rules:
//   - One transit bear at a time per scene (avoid clutter)
//   - Spawn cooldown: 90-180 seconds after the previous one despawns
//   - Walk speed slightly slower than player (40 px/s)
//   - Random species + region for visual variety
//   - Reduced-motion mode: skip entirely (matches the rest of the lounge)
//
// All state is in-scene — no persistence needed. Cleanup on scene
// shutdown by destroying any active sprite + clearing the timer.

import type Phaser from 'phaser'
import { Bear } from './bear'
import { ccToRegion, SPECIES, type Species, prefersReducedMotion } from './config'

const TRANSIT_SPEED = 40    // px/sec
const MIN_COOLDOWN_MS = 90_000
const MAX_COOLDOWN_MS = 180_000

/** Per-scene state holder. RoomScene owns one instance and ticks it. */
export class TransitNpcController {
  private scene: Phaser.Scene
  private mapWidthPx: number
  private mapHeightPx: number
  private currentBear: Bear | null = null
  private exitX = 0
  private timer?: Phaser.Time.TimerEvent
  private speciesPool: Species[]

  constructor(scene: Phaser.Scene, mapWidthPx: number, mapHeightPx: number) {
    this.scene = scene
    this.mapWidthPx = mapWidthPx
    this.mapHeightPx = mapHeightPx
    // Avoid bear-only sameness — include the visually-distinct V16 species
    this.speciesPool = [...SPECIES]
  }

  start() {
    if (prefersReducedMotion()) return
    this.scheduleNext(MIN_COOLDOWN_MS / 3)   // first one comes faster than steady-state
  }

  /** Called every frame from the scene's update(). */
  tick(dtMs: number) {
    if (!this.currentBear) return
    this.currentBear.update(dtMs, true)
    // Despawn when reached exit
    if (Math.abs(this.currentBear.x - this.exitX) < 4) {
      this.currentBear.destroy()
      this.currentBear = null
      this.scheduleNext()
    }
  }

  /** Cleanup on scene shutdown. */
  destroy() {
    this.timer?.remove(false)
    this.timer = undefined
    this.currentBear?.destroy()
    this.currentBear = null
  }

  private scheduleNext(delayMs?: number) {
    const delay = delayMs ?? (MIN_COOLDOWN_MS + Math.random() * (MAX_COOLDOWN_MS - MIN_COOLDOWN_MS))
    this.timer = this.scene.time.delayedCall(delay, () => this.spawn())
  }

  private spawn() {
    if (this.currentBear) return  // shouldn't happen but guard
    // Pick a random horizontal lane in the lower half of the room
    const y = this.mapHeightPx * 0.4 + Math.random() * (this.mapHeightPx * 0.4)
    const fromLeft = Math.random() < 0.5
    const startX = fromLeft ? -16 : this.mapWidthPx + 16
    this.exitX = fromLeft ? this.mapWidthPx + 16 : -16
    const species = this.speciesPool[Math.floor(Math.random() * this.speciesPool.length)]
    // Region is irrelevant for transit; just pick a stable one. 'unknown' guarantees existence.
    const bear = new Bear(this.scene, startX, y, ccToRegion(null), species)
    bear.sprite.setDepth(3)        // behind player (depth 5) so it really feels background
    bear.sprite.setAlpha(0.85)
    bear.facing = fromLeft ? 'right' : 'left'
    bear.walkTo(this.exitX, y)
    // V18-style cosmetic atlas may not be loaded for this species. Bear's
    // setSpecies fallback already handles that — sprite will render as
    // bear texture if the species atlas isn't ready. We skip the
    // ensureSpeciesLoaded dance to keep transit NPCs lightweight.
    this.currentBear = bear
  }
}
