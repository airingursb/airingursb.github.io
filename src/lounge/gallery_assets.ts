// Gallery asset manifest. Single source of truth for which Codex-generated
// PNG files we expect to load into Phaser as image textures. Rendering layers
// query this manifest and check `scene.textures.exists(key)` — if missing
// (because Codex hasn't generated it yet), they fall back to a programmatic
// placeholder so the gallery is always shippable.

import type Phaser from 'phaser'

export type GalleryAssetCategory =
  | 'paintings'
  | 'centerpieces'
  | 'architecture'
  | 'npc'
  | 'tiles'
  | 'decorations'
  | 'murals'
  | 'props'
  | 'nature'

export type GalleryAsset = {
  key: string                       // Phaser texture key, e.g. 'gallery_painting_A01_chromium_renderer'
  category: GalleryAssetCategory
  slug: string                      // e.g. 'A01-chromium-renderer'
  url: string                       // absolute path Phaser loads from
}

const BASE = '/lounge/assets/gallery'

const def = (
  category: GalleryAssetCategory,
  slug: string,
): GalleryAsset => ({
  key: `gallery_${category}_${slug.replace(/-/g, '_')}`,
  category,
  slug,
  url: `${BASE}/${category}/${slug}.png`,
})

// ── A · Paintings (14 immersive demos)
export const PAINTINGS: GalleryAsset[] = [
  def('paintings', 'A01-chromium-renderer'),
  def('paintings', 'A02-css-engine'),
  def('paintings', 'A03-gc'),
  def('paintings', 'A04-helio'),
  def('paintings', 'A05-http3'),
  def('paintings', 'A06-image-formats'),
  def('paintings', 'A07-jank-stutter'),
  def('paintings', 'A08-llm-inference-life'),
  def('paintings', 'A09-quickjs'),
  def('paintings', 'A10-react-internals'),
  def('paintings', 'A11-tls-handshake'),
  def('paintings', 'A12-v8-fast-js'),
  def('paintings', 'A13-webassembly'),
  def('paintings', 'A14-webgpu'),
]

// ── B · Centerpieces
export const CENTERPIECES: GalleryAsset[] = [
  def('centerpieces', 'B01-grove-sakura'),
]

// ── C · Architecture sprites
export const ARCHITECTURE: GalleryAsset[] = [
  def('architecture', 'C01-marble-column'),
  def('architecture', 'C02-bench'),
  def('architecture', 'C03-info-desk'),
  def('architecture', 'C04-statue'),
  def('architecture', 'C05-arch-door'),
  def('architecture', 'C06-display-case'),
  def('architecture', 'C07-picture-light'),
  def('architecture', 'C08-rope-barrier'),
]

// ── D · NPC docent (4 directions)
export const NPC_ASSETS: GalleryAsset[] = [
  def('npc', 'D01-docent-down'),
  def('npc', 'D02-docent-up'),
  def('npc', 'D03-docent-left'),
  def('npc', 'D04-docent-right'),
]

// ── E · Tiles (marble floor variants — used as accent inlay)
export const TILES: GalleryAsset[] = [
  def('tiles', 'E01-marble-pale'),
  def('tiles', 'E02-marble-veined'),
  def('tiles', 'E03-marble-border'),
]

// ── F · Decorations
export const DECORATIONS: GalleryAsset[] = [
  def('decorations', 'F01-plant-ficus'),
  def('decorations', 'F02-banner'),
  def('decorations', 'F03-plaque'),
  def('decorations', 'F04-trash-bin'),
]

// ── G · Zone floors — per-wing characteristic floor tiles
export const ZONE_FLOORS: GalleryAsset[] = [
  def('tiles', 'G01-floor-networks'),
  def('tiles', 'G02-floor-internals'),
  def('tiles', 'G03-floor-performance'),
  def('tiles', 'G04-floor-comics'),
]

// ── H · Zone murals — wall art for each wing's entry
export const MURALS: GalleryAsset[] = [
  def('murals', 'H01-mural-networks'),
  def('murals', 'H02-mural-internals'),
  def('murals', 'H03-mural-performance'),
  def('murals', 'H04-mural-comics'),
]

// ── I · Refined small props
export const PROPS: GalleryAsset[] = [
  def('props', 'I01-guidebook-stand'),
  def('props', 'I02-acoustic-panel'),
  def('props', 'I03-floor-grate'),
  def('props', 'I04-electric-candle'),
  def('props', 'I05-museum-map-board'),
  def('props', 'I06-info-arrow-sign'),
  def('props', 'I07-water-fountain'),
  def('props', 'I08-recycling-bin'),
  def('props', 'I09-postcard-rack'),
  def('props', 'I10-coat-hook-row'),
]

// ── J · Nature touches (plants, animals, rug)
export const NATURE: GalleryAsset[] = [
  def('nature', 'J01-fern-large'),
  def('nature', 'J02-cat-sleeping'),
  def('nature', 'J03-pigeon-perched'),
  def('nature', 'J04-floor-runner'),
]

// ── K · Natural floor tiles (grass / stream / stone path / moss)
export const NATURE_FLOORS: GalleryAsset[] = [
  def('tiles', 'K01-grass-patch'),
  def('tiles', 'K02-stream-flow'),
  def('tiles', 'K03-stone-path'),
  def('tiles', 'K04-moss-rock'),
]

// ── L · Garden props (stone bench / fountain / koi pond / vine arch / bonsai)
export const GARDEN_PROPS: GalleryAsset[] = [
  def('nature', 'L01-stone-bench'),
  def('nature', 'L02-fountain-small'),
  def('nature', 'L03-koi-pond'),
  def('nature', 'L04-vine-arch'),
  def('nature', 'L05-bonsai'),
]

// ── M · Premium rotunda marble (herringbone / medallion / diagonal / rosette)
export const PREMIUM_MARBLE: GalleryAsset[] = [
  def('tiles', 'M01-marble-herringbone'),
  def('tiles', 'M02-marble-medallion'),
  def('tiles', 'M03-marble-diagonal'),
  def('tiles', 'M04-marble-rosette'),
]

export const ALL_GALLERY_ASSETS: GalleryAsset[] = [
  ...PAINTINGS,
  ...CENTERPIECES,
  ...ARCHITECTURE,
  ...NPC_ASSETS,
  ...TILES,
  ...DECORATIONS,
  ...ZONE_FLOORS,
  ...MURALS,
  ...PROPS,
  ...NATURE,
  ...NATURE_FLOORS,
  ...GARDEN_PROPS,
  ...PREMIUM_MARBLE,
]

/** Preload every gallery asset. Failures are non-fatal — the renderers check
 *  `scene.textures.exists()` per asset and fall back to a placeholder.
 *  Uses `.once()` rather than `.on()` so listeners don't accumulate across
 *  scene restarts. */
export function preloadGalleryAssets(scene: Phaser.Scene): void {
  const missing: string[] = []
  const onError = (file: { key?: string; src?: string }) => {
    if (file.key && file.key.startsWith('gallery_')) {
      missing.push(file.key)
    }
  }
  scene.load.on('loaderror', onError)
  scene.load.once('complete', () => {
    scene.load.off('loaderror', onError)
    if (missing.length > 0) {
      console.warn(`[gallery] ${missing.length} asset(s) missing — using placeholders:`, missing)
    }
  })
  for (const a of ALL_GALLERY_ASSETS) {
    scene.load.image(a.key, a.url)
  }
}

// Quick lookup helpers
const BY_SLUG = new Map<string, GalleryAsset>()
for (const a of ALL_GALLERY_ASSETS) {
  BY_SLUG.set(a.slug, a)
}

/** Look up an asset by its slug, e.g. 'A01-chromium-renderer'. */
export function getAsset(slug: string): GalleryAsset | undefined {
  return BY_SLUG.get(slug)
}

/** Texture key from a painting slug like 'A01-chromium-renderer'. Returns
 *  undefined if the slug isn't in the manifest. */
export function paintingKey(slug: string): string | undefined {
  return BY_SLUG.get(slug)?.key
}
