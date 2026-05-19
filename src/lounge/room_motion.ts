// V23.7 — Per-room small motion details.
//
// Tiny animated decorations that sit in specific rooms to make them
// feel inhabited even when nothing is happening: a swinging pendulum
// in the lobby, a candle flicker in the library, a stove flame and
// kettle steam in the kitchen, a wind chime on the balcony.
//
// Each detail is a small Phaser GameObject (Rectangle / Container)
// driven by a long-running tween. Returns a dispose fn that destroys
// every object + stops every tween.

import Phaser from 'phaser'

export type RoomMotionDispose = () => void

const PIXEL_TEX_KEY = 'lounge_pixel'
function ensurePixelTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}

export function spawnRoomMotion(
  scene: Phaser.Scene,
  roomId: string,
  mapWidthPx: number,
  mapHeightPx: number,
  reducedMotion: boolean
): RoomMotionDispose {
  if (reducedMotion) return () => {}
  const objects: Array<{ destroy: () => void }> = []
  const tweens: Phaser.Tweens.Tween[] = []
  const dispose = () => {
    for (const t of tweens) { try { t.remove() } catch {} }
    for (const o of objects) { try { o.destroy() } catch {} }
    objects.length = 0
    tweens.length = 0
  }

  // ─── Lobby: swinging wall clock pendulum ────────────────────────
  if (roomId === 'room_lobby') {
    // Clock face is a small circle on the back wall; pendulum hangs below.
    const wallY = 60
    const cx = mapWidthPx * 0.5
    const face = scene.add.circle(cx, wallY, 6, 0xe6dcc4).setDepth(3).setStrokeStyle(1, 0x3a2820)
    const center = scene.add.circle(cx, wallY, 1, 0x3a2820).setDepth(4)
    objects.push(face, center)
    // Pendulum: a small rod with a weighted bob
    const rodLen = 18
    const pendulum = scene.add.container(cx, wallY + 4).setDepth(3)
    const rod = scene.add.rectangle(0, rodLen / 2, 1, rodLen, 0x3a2820).setOrigin(0.5, 0.5)
    const bob = scene.add.circle(0, rodLen, 2.5, 0xc89030).setStrokeStyle(1, 0x3a2820)
    pendulum.add([rod, bob])
    objects.push(pendulum)
    const swing = scene.tweens.add({
      targets: pendulum, angle: 18,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    })
    pendulum.setAngle(-18)  // start at one extreme
    tweens.push(swing)
  }

  // ─── Library: candle flicker on a shelf ─────────────────────────
  if (roomId === 'room_library') {
    const cx = mapWidthPx * 0.18
    const cy = mapHeightPx * 0.45
    // Wax stub
    const wax = scene.add.rectangle(cx, cy + 4, 4, 6, 0xf0e8d0).setStrokeStyle(1, 0x3a2820)
    // Wick
    const wick = scene.add.rectangle(cx, cy - 1, 1, 3, 0x3a2820)
    // Flame
    const flame = scene.add.ellipse(cx, cy - 3, 3, 5, 0xff9c40).setBlendMode(Phaser.BlendModes.SCREEN)
    // Tiny halo (glow ring)
    const halo = scene.add.circle(cx, cy - 3, 8, 0xffd070, 0.18).setBlendMode(Phaser.BlendModes.SCREEN)
    objects.push(wax, wick, flame, halo)
    const flicker = scene.tweens.add({
      targets: flame, scaleY: { from: 0.85, to: 1.1 }, scaleX: { from: 0.95, to: 1.05 },
      duration: 220, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    })
    const haloPulse = scene.tweens.add({
      targets: halo, alpha: { from: 0.14, to: 0.22 },
      duration: 320, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    })
    tweens.push(flicker, haloPulse)
  }

  // ─── Kitchen: stove flame + kettle steam ────────────────────────
  if (roomId === 'room_kitchen') {
    // Stove flame — orange ellipse with a small flicker
    const fx = mapWidthPx * 0.32
    const fy = mapHeightPx * 0.62
    const flame = scene.add.ellipse(fx, fy, 8, 12, 0xff8030, 0.85).setBlendMode(Phaser.BlendModes.SCREEN)
    const innerFlame = scene.add.ellipse(fx, fy + 2, 4, 6, 0xffd060, 0.9).setBlendMode(Phaser.BlendModes.SCREEN)
    objects.push(flame, innerFlame)
    const flicker = scene.tweens.add({
      targets: [flame, innerFlame], scaleY: { from: 0.9, to: 1.15 }, scaleX: { from: 0.95, to: 1.05 },
      duration: 180, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    })
    tweens.push(flicker)
    // Kettle steam — rising particles from a fixed kettle position
    ensurePixelTexture(scene)
    const kx = mapWidthPx * 0.66
    const ky = mapHeightPx * 0.45
    const steam = scene.add.particles(kx, ky, PIXEL_TEX_KEY, {
      x: { min: -3, max: 3 }, y: 0,
      lifespan: 1800, quantity: 1, frequency: 250,
      speedY: { min: -22, max: -14 }, speedX: { min: -4, max: 4 },
      scale: { start: 1.6, end: 2.4 },
      tint: 0xf0f0f0, alpha: { start: 0.6, end: 0 }
    }).setDepth(4)
    objects.push(steam)
  }

  // ─── Balcony: wind chime (rotates slowly) ───────────────────────
  if (roomId === 'room_balcony') {
    const cx = mapWidthPx * 0.18
    const cy = 90
    const chimeBar = scene.add.rectangle(cx, cy, 14, 1, 0x6a4818)
    const t1 = scene.add.rectangle(cx - 4, cy + 6, 1, 8, 0xb0c8d8)
    const t2 = scene.add.rectangle(cx,     cy + 8, 1, 10, 0xb0c8d8)
    const t3 = scene.add.rectangle(cx + 4, cy + 6, 1, 8, 0xb0c8d8)
    const chime = scene.add.container(cx, cy, [chimeBar, t1, t2, t3])
    chime.setDepth(3)
    objects.push(chime)
    const sway = scene.tweens.add({
      targets: chime, angle: { from: -4, to: 4 },
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    })
    tweens.push(sway)
  }

  return dispose
}
