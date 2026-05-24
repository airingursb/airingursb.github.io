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

  // ── I-series refined museum props ────────────────────────────────────────

  // I01 guidebook stand — one at each wing entry, info-stand vibe
  { asset: 'I01-guidebook-stand', x: 416, y: 484, scale: 0.65 },   // west threshold
  { asset: 'I01-guidebook-stand', x: 864, y: 484, scale: 0.65 },   // east threshold
  { asset: 'I01-guidebook-stand', x: 588, y: 282, scale: 0.55 },   // north threshold

  // I02 acoustic panel — quietly tucked in wing corners (pair effect)
  { asset: 'I02-acoustic-panel', x: 56, y: 720, scale: 0.55 },
  { asset: 'I02-acoustic-panel', x: 1224, y: 720, scale: 0.55, flipX: true },

  // I04 electric candle sconces — 4 corners of the rotunda for warmth
  { asset: 'I04-electric-candle', x: 408, y: 360, scale: 0.55 },
  { asset: 'I04-electric-candle', x: 872, y: 360, scale: 0.55, flipX: true },
  { asset: 'I04-electric-candle', x: 408, y: 696, scale: 0.55 },
  { asset: 'I04-electric-candle', x: 872, y: 696, scale: 0.55, flipX: true },

  // I05 museum map board — by the info desk in the rotunda
  { asset: 'I05-museum-map-board', x: 716, y: 656, scale: 0.6 },

  // I06 direction arrows — at each wing threshold
  { asset: 'I06-info-arrow-sign', x: 240, y: 460, scale: 0.7 },   // → west
  { asset: 'I06-info-arrow-sign', x: 1040, y: 460, scale: 0.7, flipX: true },  // ← east

  // I07 water fountain — by the south pavilion (so you can refill on the way out)
  { asset: 'I07-water-fountain', x: 360, y: 820, scale: 0.7 },

  // I08 recycling bin — alongside F04 trash bin pair
  { asset: 'I08-recycling-bin', x: 256, y: 678, scale: 0.85 },
  { asset: 'I08-recycling-bin', x: 1024, y: 678, scale: 0.85, flipX: true },

  // I09 postcard rack — south pavilion (gift shop vibe by the exit)
  { asset: 'I09-postcard-rack', x: 920, y: 820, scale: 0.65 },

  // I10 coat hook row — by the south arch entry
  { asset: 'I10-coat-hook-row', x: 420, y: 762, scale: 0.6 },

  // I03 floor grate — subtle decor in the rotunda
  { asset: 'I03-floor-grate', x: 480, y: 520, scale: 0.45 },
  { asset: 'I03-floor-grate', x: 800, y: 520, scale: 0.45 },

  // ── J-series nature touches ──────────────────────────────────────────────

  // J01 large fern — bigger than F01, occupies the far corners
  { asset: 'J01-fern-large', x: 64, y: 380, scale: 0.55 },         // far west
  { asset: 'J01-fern-large', x: 1216, y: 380, scale: 0.55, flipX: true },  // far east
  { asset: 'J01-fern-large', x: 480, y: 80, scale: 0.5 },          // north corner
  { asset: 'J01-fern-large', x: 800, y: 80, scale: 0.5, flipX: true },

  // J02 sleeping cat — on the west wing bench
  { asset: 'J02-cat-sleeping', x: 192, y: 660, scale: 1.0 },

  // J03 pigeon — perched on the south arch top
  { asset: 'J03-pigeon-perched', x: 670, y: 794, scale: 1.0 },

  // J04 floor runner — long rugs down the center of each wing
  { asset: 'J04-floor-runner', x: 192, y: 512, scale: 0.85 },      // west wing
  { asset: 'J04-floor-runner', x: 1088, y: 512, scale: 0.85 },     // east wing
  { asset: 'J04-floor-runner', x: 640, y: 200, scale: 0.7 },       // north hall
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
