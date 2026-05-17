// V6.6 — Action feedback particles. Small reusable burst helpers
// that paint reactive flashes when the player does things.
// All call sites pass the scene + world coords; nothing knows about UI state.

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

// Tiny grey dust puff at the feet — fires from Bear.update on direction change or arrival.
export function footstepDust(scene: Phaser.Scene, x: number, y: number) {
  ensurePixel(scene)
  scene.add.particles(x, y, PIXEL_TEX_KEY, {
    lifespan: 350, quantity: 3, speed: { min: 6, max: 18 },
    angle: { min: 200, max: 340 },
    scale: { start: 1.2, end: 0 },
    alpha: { start: 0.55, end: 0 },
    tint: 0xc8b89c, gravityY: 30
  }).setDepth(2).setActive(true).explode(3, x, y)
}

// Click ripple — concentric expanding ring at the click world position.
export function clickRipple(scene: Phaser.Scene, x: number, y: number, color = 0xffe070) {
  const ring = scene.add.circle(x, y, 4, color, 0).setStrokeStyle(2, color, 0.7).setDepth(6)
  scene.tweens.add({
    targets: ring,
    radius: 18, alpha: 0,
    duration: 380, ease: 'Cubic.Out',
    onComplete: () => ring.destroy()
  })
}

// Pebble pickup sparkle — bright burst at pickup point.
export function pebbleSparkle(scene: Phaser.Scene, x: number, y: number) {
  ensurePixel(scene)
  scene.add.particles(x, y, PIXEL_TEX_KEY, {
    lifespan: 700, quantity: 12,
    speed: { min: 25, max: 70 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.8, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xfff0a0, 0xffe040, 0xffffff],
    blendMode: Phaser.BlendModes.ADD
  }).setDepth(7).explode(12, x, y)
}

// Sit-down impact dust — small ring of dust at character feet.
export function sitImpact(scene: Phaser.Scene, x: number, y: number) {
  ensurePixel(scene)
  scene.add.particles(x, y, PIXEL_TEX_KEY, {
    lifespan: 450, quantity: 6,
    speed: { min: 18, max: 32 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.3, end: 0 },
    alpha: { start: 0.65, end: 0 },
    tint: 0xc8b89c, gravityY: 20
  }).setDepth(2).explode(6, x, y)
}

// Wave arc — semicircular trail of small dots above the bear's head.
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

// Letter-drop flutter — paper-like falling rectangles.
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
