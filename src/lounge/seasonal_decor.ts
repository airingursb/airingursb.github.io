// V23.2 — Seasonal decoration overlays.
//
// Pure visual atmosphere added to rooms based on the current season.
// Examples:
//   - Spring grove: cherry blossom petals drifting down
//   - Autumn grove + beach: amber leaves falling
//   - Summer beach: heat shimmer on the horizon
//
// Snow + rain are already covered by setupWeather() in RoomScene (they
// react to real weather, not season). This module layers on top —
// season ⊥ weather: a snowy spring day shows snow + cherry blossoms.
//
// All overlays auto-clean on scene shutdown via a returned dispose fn.

import Phaser from 'phaser'
import { getCurrentSeason } from './seasons'

// Local copy of the same pixel-texture helper RoomScene uses for particles.
const PIXEL_TEX_KEY = 'lounge_pixel'
function ensurePixelTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1)
  g.fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}

export type SeasonalDecorDispose = () => void

/** Spawn the season-appropriate decoration for this room (if any).
 *  Returns a cleanup fn to call on scene shutdown. */
export function spawnSeasonalDecor(
  scene: Phaser.Scene,
  roomId: string,
  mapWidthPx: number,
  mapHeightPx: number,
  reducedMotion: boolean
): SeasonalDecorDispose {
  if (reducedMotion) return () => {}
  const season = getCurrentSeason()
  if (!season) return () => {}
  const sid = season.id

  const objects: Array<{ destroy: () => void }> = []
  const dispose = () => { for (const o of objects) { try { o.destroy() } catch {} } }

  ensurePixelTexture(scene)

  // ─── Spring ───────────────────────────────────────────────────────
  if (sid === 'spring') {
    // Cherry blossoms in the grove — slow drifting pink particles
    if (roomId === 'room_grove') {
      const emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: mapWidthPx }, y: -8,
        lifespan: 7000, quantity: 1, frequency: 220,
        speedY: { min: 18, max: 30 },
        speedX: { min: -12, max: 4 },
        scale: { start: 1.6, end: 1.6 },
        tint: [0xffc8d8, 0xffb0c8, 0xffdce8],
        alpha: { start: 0.85, end: 0.4 },
        rotate: { min: 0, max: 360 }
      }).setDepth(990)
      objects.push(emitter)
    }
    // Lobby + balcony get sparse pollen specks
    if (roomId === 'room_lobby' || roomId === 'room_balcony') {
      const emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: mapWidthPx }, y: { min: 0, max: mapHeightPx },
        lifespan: 5000, quantity: 1, frequency: 800,
        speedY: { min: -4, max: 4 }, speedX: { min: -6, max: 6 },
        scale: { start: 1, end: 1 },
        tint: 0xffe4a0,
        alpha: { start: 0.5, end: 0 }
      }).setDepth(990)
      objects.push(emitter)
    }
  }

  // ─── Summer ───────────────────────────────────────────────────────
  if (sid === 'summer') {
    // Heat shimmer band across the beach — a wide thin overlay that
    // oscillates alpha slowly.
    if (roomId === 'room_beach') {
      const shimmer = scene.add.rectangle(mapWidthPx / 2, mapHeightPx * 0.45, mapWidthPx, 8, 0xffd4a0, 0)
        .setDepth(992).setBlendMode(Phaser.BlendModes.SCREEN)
      const tween = scene.tweens.add({
        targets: shimmer, alpha: { from: 0, to: 0.25 },
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
      objects.push(shimmer, { destroy: () => tween.remove() })
    }
    // Grove cicada-style flicker (tiny yellow sparks)
    if (roomId === 'room_grove') {
      const emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: mapWidthPx }, y: { min: 30, max: mapHeightPx - 30 },
        lifespan: 500, quantity: 1, frequency: 600,
        scale: { start: 1, end: 1 },
        tint: 0xffea60, alpha: { start: 0.7, end: 0 }
      }).setDepth(990)
      objects.push(emitter)
    }
  }

  // ─── Autumn ───────────────────────────────────────────────────────
  if (sid === 'autumn') {
    if (roomId === 'room_grove' || roomId === 'room_balcony') {
      const emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: mapWidthPx }, y: -8,
        lifespan: 6500, quantity: 1, frequency: 280,
        speedY: { min: 22, max: 38 },
        speedX: { min: -14, max: 6 },
        scale: { start: 1.8, end: 1.6 },
        tint: [0xd07840, 0xb86028, 0xe89060, 0xa84830],
        alpha: { start: 0.95, end: 0.55 },
        rotate: { min: 0, max: 360 }
      }).setDepth(990)
      objects.push(emitter)
    }
    if (roomId === 'room_beach') {
      // Occasional dry gust — horizontal pebble streaks
      const emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: -10, y: { min: mapHeightPx * 0.55, max: mapHeightPx * 0.75 },
        lifespan: 2200, quantity: 1, frequency: 1400,
        speedX: { min: 60, max: 90 },
        scale: { start: 0.8, end: 0.4 },
        tint: 0xc8a878, alpha: { start: 0.6, end: 0 }
      }).setDepth(990)
      objects.push(emitter)
    }
  }

  // ─── Winter ───────────────────────────────────────────────────────
  if (sid === 'winter') {
    // Snow handled by setupWeather. Indoor rooms get a warm window glow
    // patch on the floor (visible in lobby + library).
    if (roomId === 'room_lobby' || roomId === 'room_library') {
      const glow = scene.add.rectangle(mapWidthPx * 0.5, mapHeightPx * 0.65, 110, 38, 0xffd590, 0.18)
        .setDepth(2).setBlendMode(Phaser.BlendModes.SCREEN)
      objects.push(glow)
    }
  }

  return dispose
}
