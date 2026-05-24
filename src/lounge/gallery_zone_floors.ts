// Per-wing characteristic floor — paints an opaque themed base color over
// the room_decals gray marble, then carpets that base with the G-series
// diamond tiles via TileSprite. The G PNGs are rhombus-shaped with
// transparent corners, so the diamond pattern reads ON TOP of the tint
// instead of showing through to dead gray.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let layer: Phaser.GameObjects.Container | null = null

type Zone = {
  asset: string
  baseColor: number          // opaque tint poured under the diamond carpet
  x: number; y: number; w: number; h: number
  tileScale?: number
}

const ZONES: Zone[] = [
  // ── North Hall (Networks) — G01 hex circuit · cool slate blue base
  {
    asset: 'G01-floor-networks',
    baseColor: 0x4c5a76,
    x: 528, y: 16, w: 224, h: 288, tileScale: 0.42,
  },
  // ── East Wing (Internals) — G02 terrazzo · warm sand base
  {
    asset: 'G02-floor-internals',
    baseColor: 0x9c8c70,
    x: 912, y: 336, w: 352, h: 352, tileScale: 0.42,
  },
  // ── West Wing (Performance) — G03 clockwork · deep amber base
  {
    asset: 'G03-floor-performance',
    baseColor: 0x7a5a3a,
    x: 16,  y: 336, w: 352, h: 352, tileScale: 0.42,
  },
  // ── South Pavilion (Comics) — G04 panel grid · midnight ink base
  {
    asset: 'G04-floor-comics',
    baseColor: 0x3a3848,
    x: 400, y: 720, w: 480, h: 224, tileScale: 0.42,
  },
]

export function setupGalleryZoneFloors(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryZoneFloors()
  if (roomId !== 'room_gallery') return
  // Sits ABOVE the programmatic gray marble (depth 2.0) but BELOW
  // marble veining (2.1) so the wing tint feels like the actual floor.
  layer = scene.add.container(0, 0).setDepth(2.04)

  for (const z of ZONES) {
    // Step 1: opaque themed base — kills the gray gaps inside the diamond gaps
    const base = scene.add.rectangle(z.x + z.w / 2, z.y + z.h / 2, z.w, z.h, z.baseColor, 1.0)
    layer.add(base)
    // Step 2: the actual G-series diamond carpet on top
    const meta = getAsset(z.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const tile = scene.add.tileSprite(
      z.x + z.w / 2, z.y + z.h / 2,
      z.w, z.h,
      meta.key,
    )
    if (z.tileScale !== undefined) tile.setTileScale(z.tileScale, z.tileScale)
    layer.add(tile)
  }
}

export function teardownGalleryZoneFloors(): void {
  if (layer) { layer.destroy(); layer = null }
}
