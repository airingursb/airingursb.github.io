// V23.3 — Time-of-day visual flourishes.
//
// Decorations gated by real-time phase (atmosphere.ts) — they appear
// when the player loads/enters the room in that phase, and the room is
// re-set up on scene restart so phase transitions are picked up next
// time the player moves between rooms. (Live phase swap inside a single
// scene-stay is acceptable to skip — phases change slowly.)
//
// Examples:
//   - Lobby at day: sun shaft on the floor
//   - Library at dusk: warm window glow on the wall
//   - Grove at night: fireflies drifting
//   - Rooftop at night: subtle aurora ribbon

import Phaser from 'phaser'
import { getCurrentPhase } from './atmosphere'
import { OUTDOOR_ROOMS } from './config'

export type TimeDecorDispose = () => void

const PIXEL_TEX_KEY = 'lounge_pixel'
function ensurePixelTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}

export function spawnTimeDecor(
  scene: Phaser.Scene,
  roomId: string,
  mapWidthPx: number,
  mapHeightPx: number,
  reducedMotion: boolean
): TimeDecorDispose {
  const phase = getCurrentPhase()
  const objects: Array<{ destroy: () => void }> = []
  const dispose = () => { for (const o of objects) { try { o.destroy() } catch {} } }

  // ─── Day: warm sun shafts in indoor rooms ───────────────────────
  if (phase === 'day') {
    if (roomId === 'room_lobby') {
      // A trapezoidal sun shaft from a window — approximate with a
      // slightly-rotated rectangle on the lobby floor.
      const shaft = scene.add.rectangle(mapWidthPx * 0.45, mapHeightPx * 0.7, 110, 70, 0xffe09a, 0.16)
        .setDepth(2).setBlendMode(Phaser.BlendModes.SCREEN)
      shaft.setRotation(-0.35)
      objects.push(shaft)
    }
    if (roomId === 'room_library') {
      const shaft = scene.add.rectangle(mapWidthPx * 0.65, mapHeightPx * 0.55, 90, 55, 0xffd890, 0.14)
        .setDepth(2).setBlendMode(Phaser.BlendModes.SCREEN)
      shaft.setRotation(0.3)
      objects.push(shaft)
    }
  }

  // ─── Dusk: warm window glow on the walls ────────────────────────
  if (phase === 'dusk') {
    if (roomId === 'room_lobby' || roomId === 'room_library' || roomId === 'room_kitchen' || roomId === 'room_workshop') {
      const glow = scene.add.rectangle(mapWidthPx * 0.5, 50, mapWidthPx * 0.6, 60, 0xff9870, 0.18)
        .setDepth(2).setBlendMode(Phaser.BlendModes.SCREEN)
      objects.push(glow)
    }
  }

  // ─── Night: fireflies in the grove, aurora on the rooftop ──────
  if (phase === 'night' && !reducedMotion) {
    ensurePixelTexture(scene)
    // V23.21 — twinkling stars in the sky band of outdoor rooms. Sparse,
    // 10-14 stars in the top ~25% of the room with staggered alpha tweens
    // so they don't all blink in sync.
    // V23.28 — sky rooms = outdoor rooms (same set, shared constant)
    if (OUTDOOR_ROOMS.has(roomId as any)) {
      const starCount = 10 + Math.floor(Math.random() * 5)
      for (let i = 0; i < starCount; i++) {
        const sx = 8 + Math.random() * (mapWidthPx - 16)
        const sy = 6 + Math.random() * (mapHeightPx * 0.22)
        // Mix of 1×1 (small) and 2×1 (slightly brighter) stars for variety
        const isBig = Math.random() < 0.3
        const w = isBig ? 2 : 1
        const star = scene.add.rectangle(sx, sy, w, 1, 0xffffff, 0.85)
          .setDepth(989).setBlendMode(Phaser.BlendModes.SCREEN)
        objects.push(star)
        // Stagger twinkle by phase-offset so the field shimmers organically
        const tween = scene.tweens.add({
          targets: star, alpha: { from: 0.3, to: 1 },
          duration: 800 + Math.random() * 1200,
          delay: Math.random() * 1500,
          yoyo: true, repeat: -1, ease: 'Sine.inOut'
        })
        objects.push({ destroy: () => tween.remove() })
      }
    }
    if (roomId === 'room_grove') {
      // Slow drifting yellow specks that fade out as they live
      const fireflies = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 20, max: mapWidthPx - 20 },
        y: { min: 80, max: mapHeightPx - 40 },
        lifespan: 3500, quantity: 1, frequency: 700,
        speedX: { min: -10, max: 10 }, speedY: { min: -6, max: 6 },
        scale: { start: 1.4, end: 1.4 },
        tint: 0xfff498,
        alpha: { start: 0.85, end: 0 }
      }).setDepth(992)
      objects.push(fireflies)
    }
    if (roomId === 'room_rooftop') {
      // Thin slow aurora ribbon across the top of the sky
      const aurora = scene.add.rectangle(mapWidthPx * 0.5, 30, mapWidthPx * 0.85, 12, 0x80ffd0, 0)
        .setDepth(991).setBlendMode(Phaser.BlendModes.SCREEN)
      const tween = scene.tweens.add({
        targets: aurora, alpha: { from: 0.05, to: 0.32 },
        duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
      objects.push(aurora, { destroy: () => tween.remove() })
    }
  }

  return dispose
}
