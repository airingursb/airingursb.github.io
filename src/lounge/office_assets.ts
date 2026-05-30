// Office asset manifest — the 26 sprites in office-studio, loaded as Phaser textures.
// Mirrors gallery_assets.ts: rendering code checks `scene.textures.exists(key)` and
// falls back to a placeholder if a sprite is missing, so the room is always shippable.

import type Phaser from 'phaser'

export type OfficeAsset = { key: string; dir: 'tiles' | 'furniture'; slug: string; url: string }

const BASE = '/lounge/assets/office'
const def = (dir: 'tiles' | 'furniture', slug: string): OfficeAsset => ({
  key: `office_${slug.replace(/-/g, '_')}`,
  dir, slug, url: `${BASE}/${dir}/${slug}.png`,
})

export const OFFICE_ASSETS: OfficeAsset[] = [
  // tiles used as sprites (rug)
  def('tiles', 'F02-rug'),
  // workstations
  def('furniture', 'B01-desk'),
  def('furniture', 'B02-monitor-on'),
  def('furniture', 'B03-monitor-off'),
  def('furniture', 'B04-chair-down'),
  def('furniture', 'B05-chair-up'),
  def('furniture', 'B06-desk-props'),
  // boss
  def('furniture', 'C01-boss-desk'),
  def('furniture', 'C02-boss-chair'),
  def('furniture', 'C03-dual-monitor'),
  // collaboration
  def('furniture', 'D01-whiteboard'),
  def('furniture', 'D02-round-table'),
  def('furniture', 'D03-meeting-chair'),
  // pantry & infra
  def('furniture', 'E01-coffee'),
  def('furniture', 'E02-counter'),
  def('furniture', 'E03-server-rack'),
  def('furniture', 'E04-treadmill'),
  // lounge
  def('furniture', 'F01-couch'),
  def('furniture', 'F03-side-table'),
  // decor
  def('furniture', 'G01-plant-tall'),
  def('furniture', 'G02-plant-small'),
]

/** key for a slug like 'B01-desk' → 'office_B01_desk'. */
export const officeKey = (slug: string) => `office_${slug.replace(/-/g, '_')}`

export function preloadOfficeAssets(scene: Phaser.Scene): void {
  for (const a of OFFICE_ASSETS) {
    if (!scene.textures.exists(a.key)) scene.load.image(a.key, a.url)
  }
}
