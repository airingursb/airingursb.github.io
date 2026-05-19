// V23.8 — Wildlife particles.
//
// Creature-shaped particles that occasionally appear: butterflies fluttering
// across the grove on warm days, a dragonfly skimming at dusk, bats flying
// over the rooftop at night, fish jumping out at the beach.
//
// All systems gate on (season × time-of-day × room). Pure visual sugar;
// no interaction, no audio, ~1 creature on screen at most.

import Phaser from 'phaser'
import { getCurrentSeason } from './seasons'
import { getCurrentPhase } from './atmosphere'

export type WildlifeDispose = () => void

const PIXEL_TEX_KEY = 'lounge_pixel'
function ensurePixelTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}

export function spawnWildlife(
  scene: Phaser.Scene,
  roomId: string,
  mapWidthPx: number,
  mapHeightPx: number,
  reducedMotion: boolean
): WildlifeDispose {
  if (reducedMotion) return () => {}
  const objects: Array<{ destroy: () => void }> = []
  const timers: Phaser.Time.TimerEvent[] = []
  const dispose = () => {
    for (const t of timers) { try { t.remove(false) } catch {} }
    for (const o of objects) { try { o.destroy() } catch {} }
    objects.length = 0
    timers.length = 0
  }

  const seasonId = getCurrentSeason()?.id ?? ''
  const phase = getCurrentPhase()
  ensurePixelTexture(scene)

  // ─── Butterflies in the grove (spring/summer day) ────────────────
  if (roomId === 'room_grove' && (seasonId === 'spring' || seasonId === 'summer') && (phase === 'day' || phase === 'dawn')) {
    const spawnButterfly = () => {
      const fromLeft = Math.random() < 0.5
      const startX = fromLeft ? -10 : mapWidthPx + 10
      const exitX = fromLeft ? mapWidthPx + 10 : -10
      const y = 50 + Math.random() * (mapHeightPx * 0.45)
      const butterfly = scene.add.container(startX, y).setDepth(989)
      // Two wing pixels + body
      const wingL = scene.add.rectangle(-2, 0, 2, 3, Math.random() < 0.5 ? 0xff70a0 : 0xfff070)
      const wingR = scene.add.rectangle( 2, 0, 2, 3, Math.random() < 0.5 ? 0xff70a0 : 0xfff070)
      const body = scene.add.rectangle(0, 0, 1, 2, 0x3a2820)
      butterfly.add([wingL, wingR, body])
      objects.push(butterfly)
      // Wing flap
      scene.tweens.add({
        targets: [wingL, wingR], scaleX: { from: 1, to: 0.3 },
        duration: 90, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
      // Wavy flight path (sine bob + horizontal travel)
      scene.tweens.add({
        targets: butterfly, x: exitX,
        duration: 10_000 + Math.random() * 4000, ease: 'Linear',
        onComplete: () => butterfly.destroy()
      })
      scene.tweens.add({
        targets: butterfly, y: y - 12,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
    }
    // First one after a short delay, then every 30-60s
    timers.push(scene.time.delayedCall(4000, spawnButterfly))
    timers.push(scene.time.addEvent({
      delay: 30_000 + Math.random() * 30_000, loop: true, callback: spawnButterfly
    }))
  }

  // ─── Dragonfly at grove dusk ────────────────────────────────────
  if (roomId === 'room_grove' && phase === 'dusk') {
    const spawnDragonfly = () => {
      const fromLeft = Math.random() < 0.5
      const startX = fromLeft ? -10 : mapWidthPx + 10
      const exitX = fromLeft ? mapWidthPx + 10 : -10
      const y = 80 + Math.random() * 40
      const drag = scene.add.container(startX, y).setDepth(989)
      // Long thin body + 2 wing pairs
      const body = scene.add.rectangle(0, 0, 5, 1, 0x60a060)
      const wing = scene.add.rectangle(0, -1, 4, 1, 0xa0e0a0, 0.7)
      drag.add([wing, body])
      objects.push(drag)
      scene.tweens.add({
        targets: wing, alpha: { from: 0.7, to: 0.3 },
        duration: 50, yoyo: true, repeat: -1
      })
      scene.tweens.add({
        targets: drag, x: exitX,
        duration: 6000, ease: 'Sine.inOut',
        onComplete: () => drag.destroy()
      })
      scene.tweens.add({
        targets: drag, y: y - 18,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
    }
    timers.push(scene.time.delayedCall(8000, spawnDragonfly))
    timers.push(scene.time.addEvent({ delay: 40_000, loop: true, callback: spawnDragonfly }))
  }

  // ─── Bats at rooftop night ──────────────────────────────────────
  if (roomId === 'room_rooftop' && phase === 'night') {
    const spawnBat = () => {
      const fromLeft = Math.random() < 0.5
      const startX = fromLeft ? -10 : mapWidthPx + 10
      const exitX = fromLeft ? mapWidthPx + 10 : -10
      const y = 30 + Math.random() * 40
      const bat = scene.add.container(startX, y).setDepth(989)
      // Two angled wings + body
      const wing = scene.add.rectangle(0, 0, 6, 1, 0x1a1a2a)
      const body = scene.add.rectangle(0, 0, 1, 2, 0x1a1a2a)
      bat.add([wing, body])
      objects.push(bat)
      scene.tweens.add({
        targets: wing, scaleX: { from: 1, to: 0.4 },
        duration: 80, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
      scene.tweens.add({
        targets: bat, x: exitX,
        duration: 4500, ease: 'Sine.inOut',
        onComplete: () => bat.destroy()
      })
      // Jerky up/down for that bat feel
      scene.tweens.add({
        targets: bat, y: y - 14,
        duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
    }
    timers.push(scene.time.delayedCall(6000, spawnBat))
    timers.push(scene.time.addEvent({ delay: 50_000, loop: true, callback: spawnBat }))
  }

  // ─── Fish jump at the beach (any time) ──────────────────────────
  if (roomId === 'room_beach') {
    const spawnFishJump = () => {
      const waterY = mapHeightPx * 0.5
      const x = mapWidthPx * 0.2 + Math.random() * (mapWidthPx * 0.6)
      const fish = scene.add.container(x, waterY).setDepth(992)
      const body = scene.add.ellipse(0, 0, 6, 3, 0xb0d0e8)
      const tail = scene.add.triangle(-4, 0,  0, -2,  -3, 0,  0, 2, 0x80a0c0)
      fish.add([body, tail])
      objects.push(fish)
      // Initial flip orientation
      fish.setAngle(-25)
      // Up-and-over arc with rotation
      scene.tweens.add({
        targets: fish, y: waterY - 28, x: x + 16,
        angle: 110,
        duration: 480, ease: 'Sine.out'
      })
      scene.tweens.add({
        targets: fish, y: waterY, x: x + 32,
        angle: 245,
        delay: 480, duration: 480, ease: 'Sine.in',
        onComplete: () => {
          // Tiny splash particles, then destroy fish
          const splash = scene.add.particles(x + 32, waterY, PIXEL_TEX_KEY, {
            x: 0, y: 0,
            lifespan: 400, quantity: 6, frequency: -1,
            speedY: { min: -40, max: -10 }, speedX: { min: -30, max: 30 },
            scale: 1, tint: 0xc0e0f0, alpha: { start: 0.8, end: 0 }
          }).setDepth(992)
          splash.explode(6, x + 32, waterY)
          objects.push(splash)
          scene.time.delayedCall(500, () => { try { splash.destroy() } catch {} })
          fish.destroy()
        }
      })
    }
    // First splash later, then every 40-90s
    timers.push(scene.time.delayedCall(12_000 + Math.random() * 8000, spawnFishJump))
    timers.push(scene.time.addEvent({
      delay: 40_000 + Math.random() * 50_000, loop: true, callback: spawnFishJump
    }))
  }

  return dispose
}
