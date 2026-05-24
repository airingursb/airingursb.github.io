// Lays the E-series Codex marble tiles as inlay accents over the programmatic
// rotunda floor. E03 (gold-border diamond) forms a perimeter ring around the
// centerpiece — the visual "stage" boundary. E01/E02 (veined marble) drop in
// at the cardinal axes as transition markers between the rotunda and each wing.
// Subtle by design — depth sits above carpet (2.5) but below all sprites (3+).

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
  const e03 = getAsset('E03-marble-border')

  // Sparse perimeter ring of E03 around centerpiece — 8 diamonds, well clear
  // of the centerpiece painting (radius ~210). Smaller scale to feel inlaid
  // rather than tiled, and lower alpha so they don't fight the artwork.
  if (e03 && scene.textures.exists(e03.key)) {
    const RADIUS_X = 220
    const RADIUS_Y = 150
    const COUNT = 8
    for (let i = 0; i < COUNT; i++) {
      const ang = (i / COUNT) * Math.PI * 2 - Math.PI / 2
      const x = CENTER_X + Math.cos(ang) * RADIUS_X
      const y = CENTER_Y + Math.sin(ang) * RADIUS_Y
      const t = scene.add.image(x, y, e03.key)
        .setScale(0.32)
        .setAlpha(0.55)
      layer.add(t)
    }
  }

  // Cardinal accent diamonds — alternating veined / pale at the four axes
  // running out of the rotunda toward each wing. Pushed further out so they
  // sit at the wing thresholds, not inside the rotunda.
  const axisPicks: Array<{ x: number; y: number; asset: 'E01-marble-pale' | 'E02-marble-veined'; scale?: number }> = [
    { x: CENTER_X, y: 300, asset: 'E02-marble-veined' },  // north axis
    { x: CENTER_X, y: 756, asset: 'E02-marble-veined' },  // south axis
    { x: 340,      y: CENTER_Y, asset: 'E01-marble-pale' }, // west axis
    { x: 940,      y: CENTER_Y, asset: 'E01-marble-pale' }, // east axis
  ]
  for (const pick of axisPicks) {
    const meta = pick.asset === 'E01-marble-pale' ? e01 : e02
    if (!meta || !scene.textures.exists(meta.key)) continue
    const t = scene.add.image(pick.x, pick.y, meta.key)
      .setScale(pick.scale ?? 0.4)
      .setAlpha(0.55)
    layer.add(t)
  }
}

export function teardownGalleryFloorInlay() {
  if (layer) { layer.destroy(); layer = null }
}
