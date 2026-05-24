// K + L series — natural floor patches (grass / stream / stone / moss) and
// garden props (stone bench, fountain, koi pond, vine arch, bonsai).
// Creates a small "indoor garden" in the south pavilion + scattered nature
// touches in the wings so the museum feels biophilic, not sterile.
//
// All carpets paint an opaque themed base FIRST (green for lawn, slate for
// stone, dark moss for moss) and then overlay the K-series diamond tile,
// so the rhombus PNGs' transparent corners read as the correct substrate
// instead of leaking gray/black void through the gaps. All coords are
// constrained INSIDE south pavilion (384-896, 704-960) and wing bounds —
// the cruciform's empty corners don't have a floor at all (it's the void).

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let tileLayer: Phaser.GameObjects.Container | null = null
let propLayer: Phaser.GameObjects.Container | null = null

type TilePlacement = { asset: string; x: number; y: number; scale?: number; alpha?: number }
type PropPlacement = { asset: string; x: number; y: number; scale?: number; flipX?: boolean; origin?: { x: number; y: number } }

type GardenCarpet = {
  asset: string
  baseColor: number          // opaque tint under the K diamonds
  x: number; y: number; w: number; h: number
  tileScale?: number
}

const GARDEN_CARPETS: GardenCarpet[] = [
  // Grass lawn — left half of south pavilion. Deep moss-green base reads
  // as actual lawn through the K01 grass-blade diamonds layered on top.
  { asset: 'K01-grass-patch', baseColor: 0x4a6a3a, x: 400, y: 720, w: 220, h: 200, tileScale: 0.4 },
  // Stone path strip running south through the garden — slate-grey base
  { asset: 'K03-stone-path',  baseColor: 0x5a5048, x: 620, y: 720, w: 60,  h: 200, tileScale: 0.4 },
  // Moss strip across the bottom of the garden (frames the koi pond area)
  { asset: 'K04-moss-rock',   baseColor: 0x3a5236, x: 400, y: 920, w: 280, h: 32,  tileScale: 0.4 },
  // West wing far corner mossy patch (inside west wing zone 0..384, 320..704)
  { asset: 'K04-moss-rock',   baseColor: 0x3a5236, x: 24,  y: 632, w: 72,  h: 64,  tileScale: 0.4 },
  // East wing far corner mossy patch (inside east wing zone 896..1280, 320..704)
  { asset: 'K04-moss-rock',   baseColor: 0x3a5236, x: 1184,y: 632, w: 72,  h: 64,  tileScale: 0.4 },
]

// K02 stream — explicit teal-blue diamonds overlaid on the moss strip to
// suggest flowing water cutting through the garden.
const TILE_PLACEMENTS: TilePlacement[] = [
  { asset: 'K02-stream-flow', x: 460, y: 880, scale: 0.5, alpha: 0.95 },
  { asset: 'K02-stream-flow', x: 520, y: 880, scale: 0.5, alpha: 0.95 },
  { asset: 'K02-stream-flow', x: 580, y: 880, scale: 0.5, alpha: 0.95 },
]

// ── L-series garden props ──────────────────────────────────────────────────
const PROP_PLACEMENTS: PropPlacement[] = [
  // L02 fountain — center of the grass lawn
  { asset: 'L02-fountain-small', x: 500, y: 800, scale: 0.6 },
  // L03 koi pond — at the southern edge of the lawn
  { asset: 'L03-koi-pond',       x: 460, y: 900, scale: 0.55 },
  // L01 stone bench — beside the lawn, facing the fountain
  { asset: 'L01-stone-bench',    x: 460, y: 760, scale: 0.55 },
  // L04 vine trellis arch — flanking the south arch
  { asset: 'L04-vine-arch',      x: 564, y: 800, scale: 0.55 },
  { asset: 'L04-vine-arch',      x: 716, y: 800, scale: 0.55, flipX: true },
  // L05 bonsai — display pieces in the rotunda (flanking the centerpiece)
  { asset: 'L05-bonsai',         x: 820, y: 668, scale: 0.7 },
  { asset: 'L05-bonsai',         x: 460, y: 668, scale: 0.7 },
]

export function setupGalleryGarden(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryGarden()
  if (roomId !== 'room_gallery') return
  // Sit above zone floors (2.04) but below veining (2.1) so the garden
  // substrate feels like the actual floor of that patch.
  tileLayer = scene.add.container(0, 0).setDepth(2.08)
  // Carpeted nature patches: opaque base, then K-series diamonds on top
  for (const c of GARDEN_CARPETS) {
    const base = scene.add.rectangle(c.x + c.w / 2, c.y + c.h / 2, c.w, c.h, c.baseColor, 1.0)
    tileLayer.add(base)
    const meta = getAsset(c.asset)
    if (!meta || !scene.textures.exists(meta.key)) continue
    const ts = scene.add.tileSprite(
      c.x + c.w / 2, c.y + c.h / 2,
      c.w, c.h,
      meta.key,
    )
    if (c.tileScale !== undefined) ts.setTileScale(c.tileScale, c.tileScale)
    tileLayer.add(ts)
  }
  // Single accent tiles (K02 stream) on top of the moss strip
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
