// K + L series — natural floor patches (grass / stream / stone / moss) and
// garden props (stone bench, fountain, koi pond, vine arch, bonsai).
// Creates a small "indoor garden" in the south pavilion + scattered nature
// touches in the wings so the museum feels biophilic, not sterile.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let tileLayer: Phaser.GameObjects.Container | null = null
let propLayer: Phaser.GameObjects.Container | null = null

type TilePlacement = { asset: string; x: number; y: number; scale?: number; alpha?: number }
type PropPlacement = { asset: string; x: number; y: number; scale?: number; flipX?: boolean; origin?: { x: number; y: number } }

// ── K-series natural floor — proper carpeted patches (TileSprite-based) ────
// South pavilion's west half becomes an "indoor garden": grass carpet
// + stone path snaking through + moss/rocks around the koi pond. East/west
// wing corners get a smaller mossy patch each.
type GardenCarpet = {
  asset: string
  x: number; y: number; w: number; h: number
  alpha?: number
  tileScale?: number
}
const GARDEN_CARPETS: GardenCarpet[] = [
  // South pavilion garden: grass main plot
  { asset: 'K01-grass-patch', x: 280, y: 720, w: 240, h: 224, alpha: 0.65, tileScale: 0.45 },
  // Stone path snaking through the garden — narrow strip
  { asset: 'K03-stone-path',  x: 520, y: 800, w: 80,  h: 120, alpha: 0.7,  tileScale: 0.4 },
  // West wing far corner mossy patch
  { asset: 'K04-moss-rock',   x: 16,  y: 624, w: 80,  h: 80,  alpha: 0.55, tileScale: 0.4 },
  // East wing far corner mossy patch
  { asset: 'K04-moss-rock',   x: 1184,y: 624, w: 80,  h: 80,  alpha: 0.55, tileScale: 0.4 },
]
// Plus the stream + lily individual tiles as accents (not carpeted)
const TILE_PLACEMENTS: TilePlacement[] = [
  // K02 stream — explicit single tiles to suggest flowing water
  { asset: 'K02-stream-flow', x: 380, y: 820, scale: 0.55, alpha: 0.85 },
  { asset: 'K02-stream-flow', x: 440, y: 870, scale: 0.55, alpha: 0.85 },
  { asset: 'K02-stream-flow', x: 380, y: 920, scale: 0.55, alpha: 0.85 },
]

// ── L-series garden props ──────────────────────────────────────────────────
const PROP_PLACEMENTS: PropPlacement[] = [
  // L02 fountain — in the garden cluster (south pavilion west)
  { asset: 'L02-fountain-small', x: 380, y: 860, scale: 0.6 },
  // L03 koi pond — adjacent to fountain, downhill
  { asset: 'L03-koi-pond',       x: 320, y: 906, scale: 0.55 },
  // L01 stone bench — facing the fountain
  { asset: 'L01-stone-bench',    x: 460, y: 906, scale: 0.55 },
  // L04 vine trellis arch — flanking the south arch
  { asset: 'L04-vine-arch',      x: 564, y: 800, scale: 0.55 },
  { asset: 'L04-vine-arch',      x: 716, y: 800, scale: 0.55, flipX: true },
  // L05 bonsai — display piece in the rotunda east column area
  { asset: 'L05-bonsai',         x: 820, y: 668, scale: 0.7 },
  { asset: 'L05-bonsai',         x: 460, y: 668, scale: 0.7 },
]

export function setupGalleryGarden(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryGarden()
  if (roomId !== 'room_gallery') return
  // Natural tiles sit just above zone floors (2.05) but below carpet (2.5)
  tileLayer = scene.add.container(0, 0).setDepth(2.15)
  // Carpeted nature patches (TileSprite-based, fill an area)
  for (const c of GARDEN_CARPETS) {
    const meta = getAsset(c.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const ts = scene.add.tileSprite(
      c.x + c.w / 2, c.y + c.h / 2,
      c.w, c.h,
      meta.key,
    ).setAlpha(c.alpha ?? 0.6)
    if (c.tileScale !== undefined) ts.setTileScale(c.tileScale, c.tileScale)
    tileLayer.add(ts)
  }
  // Single accent tiles on top of carpets
  for (const t of TILE_PLACEMENTS) {
    const meta = getAsset(t.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const img = scene.add.image(t.x, t.y, meta.key)
      .setOrigin(0.5)
      .setScale(t.scale ?? 0.5)
      .setAlpha(t.alpha ?? 0.78)
    tileLayer.add(img)
  }
  // Props sit on architecture depth band
  propLayer = scene.add.container(0, 0).setDepth(3.3)
  for (const p of PROP_PLACEMENTS) {
    const meta = getAsset(p.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const img = scene.add.image(p.x, p.y, meta.key)
      .setOrigin(p.origin?.x ?? 0.5, p.origin?.y ?? 0.5)
    if (p.scale !== undefined) img.setScale(p.scale)
    if (p.flipX) img.setFlipX(true)
    propLayer.add(img)
  }
}

export function teardownGalleryGarden(): void {
  if (tileLayer) { tileLayer.destroy(); tileLayer = null }
  if (propLayer) { propLayer.destroy(); propLayer = null }
}
