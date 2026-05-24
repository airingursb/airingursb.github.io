// SHU-737 — drops the G-series zone-specific floor tiles into each wing.
// Strategy: scatter ~9-12 tiles per wing as accent inlays (not a full tile
// carpet — that'd fight the programmatic marble base). Each wing gets its
// own G-tile so the floor visually signals which wing you're in.
// Sits at depth 2.65 — above carpet (2.5), below E inlays (2.7).

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let layer: Phaser.GameObjects.Container | null = null

type ZoneSpec = {
  asset: string
  positions: Array<[number, number]>
}

const ZONES: ZoneSpec[] = [
  // ── North Hall (Networks) — G01 circuit-board hexagonal
  {
    asset: 'G01-floor-networks',
    positions: [
      [560, 200], [720, 200],
      [560, 264], [720, 264],
      [480, 232], [800, 232],
      [640, 168],
    ],
  },
  // ── East Wing (Web Internals) — G02 terrazzo
  {
    asset: 'G02-floor-internals',
    positions: [
      [968, 384], [1088, 384], [1208, 384],
      [968, 512], [1088, 512], [1208, 512],
      [968, 608], [1088, 608], [1208, 608],
      [1148, 448], [1028, 448],
    ],
  },
  // ── West Wing (Performance) — G03 clockwork
  {
    asset: 'G03-floor-performance',
    positions: [
      [72, 384], [192, 384], [312, 384],
      [72, 512], [192, 512], [312, 512],
      [72, 608], [192, 608], [312, 608],
      [252, 448], [132, 448],
    ],
  },
  // ── South Pavilion (Comics) — G04 comic-panel grid
  {
    asset: 'G04-floor-comics',
    positions: [
      [432, 776], [848, 776],
      [432, 856], [848, 856],
      [432, 928], [848, 928],
      [496, 816], [784, 816],
    ],
  },
]

export function setupGalleryZoneFloors(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryZoneFloors()
  if (roomId !== 'room_gallery') return
  layer = scene.add.container(0, 0).setDepth(2.65)

  // G03 (performance / clockwork) is dramatic — drop its alpha further so
  // it doesn't overwhelm the west wing.
  for (const zone of ZONES) {
    const meta = getAsset(zone.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const alpha = zone.asset === 'G03-floor-performance' ? 0.42 : 0.55
    for (const [x, y] of zone.positions) {
      const tile = scene.add.image(x, y, meta.key)
        .setScale(0.48)
        .setAlpha(alpha)
      layer.add(tile)
    }
  }
}

export function teardownGalleryZoneFloors(): void {
  if (layer) { layer.destroy(); layer = null }
}
