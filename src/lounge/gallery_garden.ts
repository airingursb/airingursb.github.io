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

// ── K-series natural floor patches ─────────────────────────────────────────
// Concentrated in the south pavilion's west corner as a small "garden plot"
// + scattered touches in the wings.
const TILE_PLACEMENTS: TilePlacement[] = [
  // South pavilion garden cluster (west side, away from comics + arch)
  { asset: 'K01-grass-patch', x: 360, y: 836, scale: 0.5, alpha: 0.78 },
  { asset: 'K01-grass-patch', x: 420, y: 800, scale: 0.5, alpha: 0.78 },
  { asset: 'K01-grass-patch', x: 360, y: 896, scale: 0.5, alpha: 0.78 },
  { asset: 'K02-stream-flow', x: 420, y: 866, scale: 0.5, alpha: 0.85 },
  { asset: 'K02-stream-flow', x: 480, y: 836, scale: 0.5, alpha: 0.85 },
  { asset: 'K03-stone-path',  x: 300, y: 836, scale: 0.5, alpha: 0.7 },
  { asset: 'K03-stone-path',  x: 300, y: 896, scale: 0.5, alpha: 0.7 },
  { asset: 'K04-moss-rock',   x: 420, y: 920, scale: 0.5, alpha: 0.7 },
  // East/west wing corners — a small mossy + grass touch at the far end
  { asset: 'K04-moss-rock',   x: 60,   y: 700, scale: 0.45, alpha: 0.65 },
  { asset: 'K01-grass-patch', x: 60,   y: 660, scale: 0.45, alpha: 0.7 },
  { asset: 'K04-moss-rock',   x: 1220, y: 700, scale: 0.45, alpha: 0.65 },
  { asset: 'K01-grass-patch', x: 1220, y: 660, scale: 0.45, alpha: 0.7 },
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
  // Natural tiles sit just above carpet — alpha-blended
  tileLayer = scene.add.container(0, 0).setDepth(2.68)
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
