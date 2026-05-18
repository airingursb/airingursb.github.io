// V6.6 + E5-P3 — Action feedback particles with emitter pooling.
//
// Each effect kind owns ONE Phaser.GameObjects.Particles.ParticleEmitter that
// stays attached to the scene. Call sites invoke .explode(count, x, y) so we
// don't allocate per-event.

import Phaser from 'phaser'

const PIXEL_TEX_KEY = 'lounge_pixel'

export function ensurePixel(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1)
  g.fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}

// Per-scene pool registry. Keyed by scene + effect kind.
const POOL_KEY = '__lounge_emitter_pool'

type EmitterKind = 'dust' | 'sparkle' | 'sitImpact'

function getPool(scene: Phaser.Scene): Partial<Record<EmitterKind, Phaser.GameObjects.Particles.ParticleEmitter>> {
  const reg = scene as any
  if (!reg[POOL_KEY]) reg[POOL_KEY] = {}
  return reg[POOL_KEY]
}

function getOrMakeEmitter(scene: Phaser.Scene, kind: EmitterKind): Phaser.GameObjects.Particles.ParticleEmitter {
  ensurePixel(scene)
  const pool = getPool(scene)
  if (pool[kind] && (pool[kind] as any).scene === scene) return pool[kind]!
  let emitter: Phaser.GameObjects.Particles.ParticleEmitter
  if (kind === 'dust') {
    emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
      lifespan: 350, speed: { min: 6, max: 18 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xc8b89c, gravityY: 30,
      emitting: false
    }).setDepth(2)
  } else if (kind === 'sparkle') {
    emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
      lifespan: 700, speed: { min: 25, max: 70 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xfff0a0, 0xffe040, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false
    }).setDepth(7)
  } else {  // sitImpact
    emitter = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
      lifespan: 450, speed: { min: 18, max: 32 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 0.65, end: 0 },
      tint: 0xc8b89c, gravityY: 20,
      emitting: false
    }).setDepth(2)
  }
  pool[kind] = emitter
  // Drop pool entry when scene shuts down so next scene boot rebuilds
  scene.events.once('shutdown', () => { delete pool[kind] })
  scene.events.once('destroy', () => { delete pool[kind] })
  return emitter
}

// ─── Public API (call signature unchanged from V6.6) ──────────────────

export function footstepDust(scene: Phaser.Scene, x: number, y: number) {
  getOrMakeEmitter(scene, 'dust').explode(3, x, y)
}

export function pebbleSparkle(scene: Phaser.Scene, x: number, y: number) {
  getOrMakeEmitter(scene, 'sparkle').explode(12, x, y)
}

export function sitImpact(scene: Phaser.Scene, x: number, y: number) {
  getOrMakeEmitter(scene, 'sitImpact').explode(6, x, y)
}

// Click ripple — uses single Circle tween per call, no emitter.
export function clickRipple(scene: Phaser.Scene, x: number, y: number, color = 0xffe070) {
  const ring = scene.add.circle(x, y, 4, color, 0).setStrokeStyle(2, color, 0.7).setDepth(6)
  scene.tweens.add({
    targets: ring,
    radius: 18, alpha: 0,
    duration: 380, ease: 'Cubic.Out',
    onComplete: () => ring.destroy()
  })
}

// Wave arc — 5 dots above head, each tween-dispatched then destroyed.
export function waveArc(scene: Phaser.Scene, x: number, y: number) {
  ensurePixel(scene)
  const centerY = y - 28
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI * (0.15 + 0.7 * (i / 4))
    const px = x + Math.cos(angle) * 12
    const py = centerY + Math.sin(angle) * 12
    const dot = scene.add.rectangle(px, py, 2, 2, 0xffffa0, 0.9).setDepth(7)
    scene.tweens.add({
      targets: dot,
      alpha: 0, scale: 2,
      delay: i * 60, duration: 350,
      onComplete: () => dot.destroy()
    })
  }
}

// Letter flutter — small one-shot, doesn't fire often; per-call allocation is fine.
export function letterFlutter(scene: Phaser.Scene, x: number, y: number) {
  for (let i = 0; i < 4; i++) {
    const paper = scene.add.rectangle(x, y - 10, 4, 5, 0xfff8dc, 0.95)
      .setStrokeStyle(1, 0xb8a878, 0.8).setDepth(6)
    const dx = (Math.random() - 0.5) * 30
    scene.tweens.add({
      targets: paper,
      x: x + dx,
      y: y + 12, angle: (Math.random() - 0.5) * 90,
      alpha: 0,
      delay: i * 80, duration: 700, ease: 'Sine.InOut',
      onComplete: () => paper.destroy()
    })
  }
}
