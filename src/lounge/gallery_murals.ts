// SHU-737 — H-series zone murals: large 256×128 banners hung on the far
// wall of each wing as a "section header" announcement. One per wing.
// Sits at depth 3.4 — above architecture (3) and inlays, below NPCs (4+).

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let layer: Phaser.GameObjects.Container | null = null

type MuralPlacement = {
  asset: string
  x: number
  y: number
  scale?: number
}

const PLACEMENTS: MuralPlacement[] = [
  // North hall — top wall, above the immersive paintings
  { asset: 'H01-mural-networks',    x: 640,  y: 60,   scale: 0.42 },
  // East wing — far east wall (between the east-most painting column)
  { asset: 'H02-mural-internals',   x: 1232, y: 256,  scale: 0.42 },
  // West wing — far west wall (mirror)
  { asset: 'H03-mural-performance', x: 48,   y: 256,  scale: 0.42 },
  // South pavilion — far south wall (well clear of rotunda counter + arch)
  { asset: 'H04-mural-comics',      x: 220,  y: 880,  scale: 0.4 },
]

export function setupGalleryMurals(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryMurals()
  if (roomId !== 'room_gallery') return
  layer = scene.add.container(0, 0).setDepth(3.4)

  for (const p of PLACEMENTS) {
    const meta = getAsset(p.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const img = scene.add.image(p.x, p.y, meta.key).setOrigin(0.5)
    if (p.scale !== undefined) img.setScale(p.scale)
    // Add a thin brass mounting bar at the top — sells "hung from above"
    const bar = scene.add.rectangle(p.x, p.y - (img.displayHeight / 2) - 2, img.displayWidth + 8, 2, 0xc8a058, 0.85)
    layer.add([img, bar])
  }
}

export function teardownGalleryMurals(): void {
  if (layer) { layer.destroy(); layer = null }
}
