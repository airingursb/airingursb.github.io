// M-series premium rotunda marble: large center medallion + herringbone
// scatter + 4 corner rosettes. E-series (cream marble) keeps its sparse
// accent role at the cardinal axes leading into each wing.
// Sits at depth 2.7 — above carpet, below architecture sprites.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let layer: Phaser.GameObjects.Container | null = null

const CENTER_X = 640
const CENTER_Y = 528

export function setupGalleryFloorInlay(scene: Phaser.Scene, roomId: RoomId) {
  teardownGalleryFloorInlay()
  if (roomId !== 'room_gallery') return
  layer = scene.add.container(0, 0).setDepth(2.7)

  const e01 = getAsset('E01-marble-pale')
  const e02 = getAsset('E02-marble-veined')
  const m01 = getAsset('M01-marble-herringbone')
  const m02 = getAsset('M02-marble-medallion')
  const m04 = getAsset('M04-marble-rosette')

  // ── M02: the big central medallion under the centerpiece ────────────────
  if (m02 && scene.textures.exists(m02.key)) {
    const medallion = scene.add.image(CENTER_X, CENTER_Y, m02.key)
      .setOrigin(0.5)
      .setScale(0.85)
      .setAlpha(0.92)
    layer.add(medallion)
  }

  // ── M01: herringbone scatter ringing the medallion (8 tiles) ────────────
  if (m01 && scene.textures.exists(m01.key)) {
    const RADIUS_X = 240
    const RADIUS_Y = 180
    const COUNT = 8
    for (let i = 0; i < COUNT; i++) {
      const ang = (i / COUNT) * Math.PI * 2 - Math.PI / 2
      const x = CENTER_X + Math.cos(ang) * RADIUS_X
      const y = CENTER_Y + Math.sin(ang) * RADIUS_Y
      const t = scene.add.image(x, y, m01.key).setOrigin(0.5).setScale(0.45).setAlpha(0.75)
      layer.add(t)
    }
  }

  // ── M04: 4 corner rosettes (rotated mirrors) ────────────────────────────
  if (m04 && scene.textures.exists(m04.key)) {
    const corners: Array<{ x: number; y: number; flipX: boolean; flipY: boolean }> = [
      { x: 420, y: 360, flipX: false, flipY: false },
      { x: 860, y: 360, flipX: true,  flipY: false },
      { x: 420, y: 700, flipX: false, flipY: true  },
      { x: 860, y: 700, flipX: true,  flipY: true  },
    ]
    for (const c of corners) {
      const r = scene.add.image(c.x, c.y, m04.key).setOrigin(0.5).setScale(0.55).setAlpha(0.78)
      r.setFlip(c.flipX, c.flipY)
      layer.add(r)
    }
  }

  // ── E-series cardinal accents — push further out to wing thresholds ─────
  const axisPicks: Array<{ x: number; y: number; asset: 'E01-marble-pale' | 'E02-marble-veined' }> = [
    { x: CENTER_X, y: 300, asset: 'E02-marble-veined' },
    { x: CENTER_X, y: 756, asset: 'E02-marble-veined' },
    { x: 340,      y: CENTER_Y, asset: 'E01-marble-pale' },
    { x: 940,      y: CENTER_Y, asset: 'E01-marble-pale' },
  ]
  for (const pick of axisPicks) {
    const meta = pick.asset === 'E01-marble-pale' ? e01 : e02
    if (!meta || !scene.textures.exists(meta.key)) continue
    const t = scene.add.image(pick.x, pick.y, meta.key)
      .setScale(0.4)
      .setAlpha(0.55)
    layer.add(t)
  }
}

export function teardownGalleryFloorInlay() {
  if (layer) { layer.destroy(); layer = null }
}
