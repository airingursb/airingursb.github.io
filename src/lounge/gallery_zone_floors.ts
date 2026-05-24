// Per-wing characteristic floor — each zone is fully tiled with its own
// G-series sprite so wandering anywhere in that wing reads "you're in
// Networks/Internals/Performance/Comics". Uses Phaser.TileSprite which
// renders the source PNG as a repeating texture across the rect.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let layer: Phaser.GameObjects.Container | null = null

type ZoneFill = {
  asset: string
  x: number; y: number; w: number; h: number
  alpha?: number
  tileScale?: number   // 1 = native; 0.5 = half-size repeat
}

const ZONES: ZoneFill[] = [
  // North Hall (Networks) — col 32-48, row 0-20 → 512..768, 0..320
  { asset: 'G01-floor-networks',    x: 528, y: 16,  w: 224, h: 288, alpha: 0.5, tileScale: 0.45 },
  // East Wing (Internals) — col 56-80, row 20-44 → 896..1280, 320..704
  { asset: 'G02-floor-internals',   x: 912, y: 336, w: 352, h: 352, alpha: 0.55, tileScale: 0.45 },
  // West Wing (Performance) — col 0-24, row 20-44 → 0..384, 320..704
  { asset: 'G03-floor-performance', x: 16,  y: 336, w: 352, h: 352, alpha: 0.38, tileScale: 0.45 },
  // South Pavilion (Comics) — col 24-56, row 44-60 → 384..896, 704..960
  { asset: 'G04-floor-comics',      x: 400, y: 720, w: 480, h: 224, alpha: 0.45, tileScale: 0.45 },
]

export function setupGalleryZoneFloors(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryZoneFloors()
  if (roomId !== 'room_gallery') return
  layer = scene.add.container(0, 0).setDepth(2.05)   // just above floor base (2.0), below veining (2.1)

  for (const z of ZONES) {
    const meta = getAsset(z.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const tile = scene.add.tileSprite(
      z.x + z.w / 2, z.y + z.h / 2,
      z.w, z.h,
      meta.key,
    ).setAlpha(z.alpha ?? 0.5)
    if (z.tileScale !== undefined) tile.setTileScale(z.tileScale, z.tileScale)
    layer.add(tile)
  }
}

export function teardownGalleryZoneFloors(): void {
  if (layer) { layer.destroy(); layer = null }
}
