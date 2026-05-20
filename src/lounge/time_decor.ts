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

    // V3.0-C — shooting stars in outdoor rooms at night.
    // Rare, magical, 60-90s between stars. One streak at a time.
    if (OUTDOOR_ROOMS.has(roomId as any)) {
      const scheduleNextStar = () => {
        const delay = 60_000 + Math.random() * 30_000
        const timer = scene.time.delayedCall(delay, () => {
          spawnShootingStar(scene, mapWidthPx, mapHeightPx, objects)
          scheduleNextStar()
        })
        objects.push({ destroy: () => timer.remove(false) })
      }
      // First star can appear sooner (5-20s) so you notice the feature
      const firstDelay = 5_000 + Math.random() * 15_000
      const firstTimer = scene.time.delayedCall(firstDelay, () => {
        spawnShootingStar(scene, mapWidthPx, mapHeightPx, objects)
        scheduleNextStar()
      })
      objects.push({ destroy: () => firstTimer.remove(false) })
    }
  }

  // ─── Dusk: boat silhouette on the beach horizon ─────────────────
  // V3.0-C batch 2 — a single distant boat drifts across the water band
  // during dusk. Slow, silent, slightly transparent — read as "someone
  // else is out there." Reuses the same drift-direction as today's wind
  // so it feels coherent with petals/leaves/gust.
  if (phase === 'dusk' && !reducedMotion && roomId === 'room_beach') {
    ensurePixelTexture(scene)
    // Hull on water band (lower third of map)
    const yBase = mapHeightPx * 0.78
    // Direction: with today's wind sign (positive → drift east → enter from west)
    const wind = Math.sign(Math.sin(Date.now() / 86400000)) || 1   // simple per-day flip
    const startX = wind > 0 ? -16 : mapWidthPx + 16
    const endX   = wind > 0 ? mapWidthPx + 16 : -16

    // Hull is two stacked rectangles for a tiny pixel-art silhouette
    const hull = scene.add.rectangle(startX, yBase, 14, 2, 0x2a1810, 0.55).setDepth(989)
    const mast = scene.add.rectangle(startX, yBase - 4, 1, 5, 0x2a1810, 0.55).setDepth(989)
    const sail = scene.add.rectangle(startX, yBase - 5, 4, 4, 0x6a4030, 0.45).setDepth(989)
    objects.push(hull, mast, sail)

    const tween = scene.tweens.add({
      targets: [hull, mast, sail],
      x: endX,
      duration: 90_000,  // 90 seconds to cross — slow & ambient
      ease: 'Linear',
      onComplete: () => {
        try { hull.destroy(); mast.destroy(); sail.destroy() } catch {}
      },
    })
    objects.push({ destroy: () => tween.remove() })
  }

  // ─── Night: cozy library + rooftop owl ───────────────────────────
  // V3.0-C batch 2 — library gets a small sleeping cat curled on the
  // central rug (companion energy to 觉 already there). Rooftop gets a
  // silhouette owl on the north railing that occasionally turns its head.
  if (phase === 'night' && !reducedMotion) {
    if (roomId === 'room_library') {
      // Curled gray cat at center-floor. Tiny — 6×3 oval body + 3×3 head.
      ensurePixelTexture(scene)
      const cx = mapWidthPx * 0.5
      const cy = mapHeightPx * 0.68
      const body = scene.add.rectangle(cx, cy, 8, 4, 0x6a5848, 0.85).setDepth(3)
      const head = scene.add.rectangle(cx + 5, cy - 2, 3, 3, 0x6a5848, 0.95).setDepth(3)
      const ear1 = scene.add.rectangle(cx + 4, cy - 4, 1, 1, 0x6a5848, 0.95).setDepth(3)
      const ear2 = scene.add.rectangle(cx + 6, cy - 4, 1, 1, 0x6a5848, 0.95).setDepth(3)
      objects.push(body, head, ear1, ear2)
      // Subtle breathing — body y oscillates by 0.5px
      const breath = scene.tweens.add({
        targets: body, y: cy - 0.5,
        duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      })
      objects.push({ destroy: () => breath.remove() })
    }
    if (roomId === 'room_rooftop') {
      // Owl on the north railing. 4×5 silhouette, head turn = brief flip
      // of which side the "eye" pixel is on.
      const ox = mapWidthPx * 0.78
      const oy = 26
      const body = scene.add.rectangle(ox, oy, 4, 5, 0x141414, 0.9).setDepth(988)
      const eye  = scene.add.rectangle(ox - 1, oy - 1, 1, 1, 0xffeb70, 1).setDepth(989)
      objects.push(body, eye)
      // Every 6-10s, head "turns" — eye flicks to other side then back
      let turnTimer: Phaser.Time.TimerEvent | null = null
      const scheduleTurn = () => {
        const delay = 6000 + Math.random() * 4000
        turnTimer = scene.time.delayedCall(delay, () => {
          eye.x = ox + 1   // turn right
          scene.time.delayedCall(900, () => { eye.x = ox - 1 })  // turn back
          scheduleTurn()
        })
      }
      scheduleTurn()
      objects.push({ destroy: () => { if (turnTimer) turnTimer.remove(false) } })
    }
  }

  // ─── Dawn: birds in outdoor rooms ────────────────────────────────
  // V3.0-C — a small flock crosses the sky once when scene loads at dawn.
  // Loose V formation, 3-5 birds, ~10s flight. They despawn after crossing.
  if (phase === 'dawn' && !reducedMotion && OUTDOOR_ROOMS.has(roomId as any)) {
    ensurePixelTexture(scene)
    const birdCount = 3 + Math.floor(Math.random() * 3)
    const direction = Math.random() < 0.5 ? 'left-to-right' : 'right-to-left'
    const startX = direction === 'left-to-right' ? -20 : mapWidthPx + 20
    const endX   = direction === 'left-to-right' ? mapWidthPx + 20 : -20
    const yBase  = 18 + Math.random() * (mapHeightPx * 0.12)

    for (let i = 0; i < birdCount; i++) {
      // V-formation offset: leader at 0, others trail behind & to the side
      const trail = i * 8
      const wingY = yBase + (i % 2 === 0 ? -i * 2 : i * 1.5)
      const bird = scene.add.rectangle(
        startX + (direction === 'left-to-right' ? -trail : trail),
        wingY, 2, 1, 0x2a2a2a, 0.85
      ).setDepth(990)
      objects.push(bird)
      const tween = scene.tweens.add({
        targets: bird,
        x: endX,
        duration: 10_000 + Math.random() * 2_000,
        ease: 'Sine.inOut',
        onComplete: () => bird.destroy(),
      })
      objects.push({ destroy: () => tween.remove() })
      // Subtle wing flap via y oscillation
      const flap = scene.tweens.add({
        targets: bird,
        y: wingY - 1.5,
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
      objects.push({ destroy: () => flap.remove() })
    }
  }

  return dispose
}

/** V3.0-C — single shooting star across the night sky. Self-disposing. */
function spawnShootingStar(
  scene: Phaser.Scene,
  mapWidthPx: number,
  mapHeightPx: number,
  objects: Array<{ destroy: () => void }>
) {
  // Start in upper-third, diagonal down 30deg, length ~40px
  const startX = Math.random() * mapWidthPx * 0.7
  const startY = 4 + Math.random() * (mapHeightPx * 0.18)
  const dx = 60 + Math.random() * 80
  const dy = dx * 0.45

  const head = scene.add.rectangle(startX, startY, 2, 2, 0xffffff, 1)
    .setDepth(993).setBlendMode(Phaser.BlendModes.SCREEN)
  const trail = scene.add.line(0, 0, startX, startY, startX, startY, 0xffffff, 0.6)
    .setLineWidth(1).setDepth(992).setBlendMode(Phaser.BlendModes.SCREEN)

  let tracked = true
  const tween = scene.tweens.add({
    targets: head,
    x: startX + dx,
    y: startY + dy,
    duration: 700,
    ease: 'Quad.out',
    onUpdate: () => {
      if (tracked) trail.setTo(startX, startY, head.x, head.y)
    },
    onComplete: () => {
      tracked = false
      // Fade out the trail over 250ms
      scene.tweens.add({
        targets: trail, alpha: 0, duration: 250,
        onComplete: () => { try { trail.destroy() } catch {} }
      })
      try { head.destroy() } catch {}
    },
  })

  objects.push(
    { destroy: () => { try { head.destroy() } catch {}; try { trail.destroy() } catch {} } },
    { destroy: () => tween.remove() }
  )
}
