// SHU-733 Phase 8 · In-game sparkle portal in the grove room.
//
// Places a pulsing glow + cherry-blossom sprite at the central position
// of the grove map. Click → dispatches `open-pocket-world` (caught by
// nook.astro's iframe portal bridge → mounts /nook/inner/mochi-grove/).
//
// No-op for any room other than 'room_grove'.

import Phaser from 'phaser'
import type { RoomId } from './config'

const PORTAL_X = 240   // grove map is ~480px wide, center
const PORTAL_Y = 240   // ~mid-height

let portalLayer: Phaser.GameObjects.Container | null = null
let pulseTween: Phaser.Tweens.Tween | null = null

/** Call from RoomScene.create() — installs portal if room is grove. */
export function setupGrovePortal(scene: Phaser.Scene, roomId: RoomId) {
  // Teardown any prior instance (in case of room restart)
  teardownGrovePortal()
  if (roomId !== 'room_grove') return

  const container = scene.add.container(PORTAL_X, PORTAL_Y).setDepth(995)

  // Pulsing soft glow ring (under everything else in the portal)
  const glow = scene.add.graphics()
  glow.fillStyle(0xffb0d0, 0.45)
  glow.fillCircle(0, 0, 22)
  glow.lineStyle(2, 0xff80b0, 0.85)
  glow.strokeCircle(0, 0, 22)
  container.add(glow)

  // Cherry blossom emoji as the visual anchor
  const flower = scene.add.text(0, -2, '🌸', {
    fontSize: '20px',
    fontFamily: 'ui-monospace, monospace',
  }).setOrigin(0.5)
  container.add(flower)

  // Floating label above
  const label = scene.add.text(0, -28, '跟 Airing 散步', {
    fontSize: '10px',
    color: '#fce8ee',
    fontFamily: 'ui-monospace, monospace',
    backgroundColor: 'rgba(30, 20, 30, 0.72)',
    padding: { left: 5, right: 5, top: 2, bottom: 2 },
  }).setOrigin(0.5)
  container.add(label)

  // Pulse animation — scale + alpha sin wave
  pulseTween = scene.tweens.add({
    targets: container,
    scale: { from: 1, to: 1.18 },
    alpha: { from: 0.85, to: 1 },
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  // Click handler — fire the same custom event nook.astro listens for
  container.setSize(60, 60)
  container.setInteractive({ useHandCursor: true })
  container.on('pointerdown', () => {
    try {
      // 'mochi-grove' is a LEGACY URL/persistence slug. The NPC was
      // renamed to Airing but URL paths + DB world_3d records still use
      // the old slug to preserve bookmarks / memory continuity.
      window.dispatchEvent(new CustomEvent('open-pocket-world', {
        detail: { slug: 'mochi-grove' },
      }))
    } catch (err) {
      console.warn('[grove-portal] dispatch failed:', err)
    }
  })

  portalLayer = container
}

export function teardownGrovePortal() {
  if (pulseTween) {
    pulseTween.stop()
    pulseTween = null
  }
  if (portalLayer) {
    portalLayer.destroy()
    portalLayer = null
  }
}
