// Drops the F-series Codex sprites (ficus plants, banners, plaques, trash
// bins) at hand-picked points around the gallery. Pure decoration — no
// collision, no interaction. If a sprite asset is missing, the slot is
// silently skipped (placeholders would clutter more than they help here).

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

type DecorPlacement = {
  asset: string
  x: number
  y: number
  scale?: number
  flipX?: boolean
  depth?: number
  origin?: { x: number; y: number }
}

const PLACEMENTS: DecorPlacement[] = [
  // F01 ficus — flanking key entries (info desk, arch, wing thresholds)
  { asset: 'F01-plant-ficus', x: 588, y: 668, scale: 0.7 },
  { asset: 'F01-plant-ficus', x: 692, y: 668, scale: 0.7 },
  { asset: 'F01-plant-ficus', x: 580, y: 812, scale: 0.7 },
  { asset: 'F01-plant-ficus', x: 700, y: 812, scale: 0.7 },
  { asset: 'F01-plant-ficus', x: 368, y: 440, scale: 0.65 },
  { asset: 'F01-plant-ficus', x: 912, y: 440, scale: 0.65, flipX: true },
  { asset: 'F01-plant-ficus', x: 520, y: 232, scale: 0.6 },
  { asset: 'F01-plant-ficus', x: 760, y: 232, scale: 0.6, flipX: true },

  // F02 banner — hung high on prominent walls. Origin top-center so
  // they read as "hanging from the rafters" rather than "stuck mid-air".
  { asset: 'F02-banner', x: 640,  y: 88,   scale: 0.5, origin: { x: 0.5, y: 0 } },
  { asset: 'F02-banner', x: 24,   y: 384,  scale: 0.45, origin: { x: 0.5, y: 0 } },
  { asset: 'F02-banner', x: 1256, y: 384,  scale: 0.45, origin: { x: 0.5, y: 0 } },
  { asset: 'F02-banner', x: 480,  y: 752,  scale: 0.45, origin: { x: 0.5, y: 0 } },
  { asset: 'F02-banner', x: 800,  y: 752,  scale: 0.45, origin: { x: 0.5, y: 0 } },

  // F04 trash bin — by each bench, gallery-polite placement
  { asset: 'F04-trash-bin', x: 240, y: 678, scale: 0.9 },
  { asset: 'F04-trash-bin', x: 1040, y: 678, scale: 0.9, flipX: true },

  // F03 plaque — wall-mounted brass markers at each zone threshold
  { asset: 'F03-plaque', x: 188, y: 332, scale: 0.7 },   // west wing entry
  { asset: 'F03-plaque', x: 1092, y: 332, scale: 0.7 },  // east wing entry
  { asset: 'F03-plaque', x: 640, y: 132, scale: 0.7 },   // north hall under banner
  { asset: 'F03-plaque', x: 640, y: 768, scale: 0.7 },   // south pavilion above arch
]

let layer: Phaser.GameObjects.Container | null = null

export function setupGalleryDecorations(scene: Phaser.Scene, roomId: RoomId) {
  teardownGalleryDecorations()
  if (roomId !== 'room_gallery') return
  layer = scene.add.container(0, 0).setDepth(3.2)

  for (const p of PLACEMENTS) {
    const meta = getAsset(p.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const img = scene.add.image(p.x, p.y, meta.key)
      .setOrigin(p.origin?.x ?? 0.5, p.origin?.y ?? 0.5)
    if (p.scale !== undefined) img.setScale(p.scale)
    if (p.flipX) img.setFlipX(true)
    layer.add(img)
  }
}

export function teardownGalleryDecorations() {
  if (layer) { layer.destroy(); layer = null }
}
