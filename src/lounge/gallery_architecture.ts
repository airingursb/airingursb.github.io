// Places the fixed architectural sprites in the gallery room: marble columns
// + Greco-Roman statues in the rotunda, info desk near the entrance, benches
// in the wings, rope barriers around exhibits, a display case in the north
// hall, and the grand arch doorway in the south pavilion that opens onto
// Mochi's 3D grove. Codex PNGs are preferred; if any are missing, a
// programmatic placeholder keeps the scene shippable.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'

let layer: Phaser.GameObjects.Container | null = null
let arcGroveHitArea: Phaser.GameObjects.Container | null = null

type ArchPlacement = {
  asset: string                 // slug like 'C01-marble-column'
  x: number
  y: number
  scale?: number                // optional uniform scale
  flipX?: boolean
  depth?: number                // override (default 3)
  origin?: { x: number; y: number }   // default 0.5, 0.5
}

const PLACEMENTS: ArchPlacement[] = [
  // ── Rotunda — 4 marble columns around the centerpiece
  { asset: 'C01-marble-column', x: 464, y: 432, scale: 0.5 },
  { asset: 'C01-marble-column', x: 816, y: 432, scale: 0.5 },
  { asset: 'C01-marble-column', x: 464, y: 624, scale: 0.5 },
  { asset: 'C01-marble-column', x: 816, y: 624, scale: 0.5 },

  // ── Rotunda — 4 statues at the corners
  { asset: 'C04-statue', x: 432, y: 384, scale: 0.45 },
  { asset: 'C04-statue', x: 848, y: 384, scale: 0.45, flipX: true },
  { asset: 'C04-statue', x: 432, y: 672, scale: 0.45 },
  { asset: 'C04-statue', x: 848, y: 672, scale: 0.45, flipX: true },

  // ── Rotunda — info desk at the south wall, just before the south door
  { asset: 'C03-info-desk', x: 640, y: 666, scale: 0.55 },

  // ── Rotunda — rope barriers around the centerpiece (4 corners)
  { asset: 'C08-rope-barrier', x: 568, y: 480, scale: 0.5 },
  { asset: 'C08-rope-barrier', x: 712, y: 480, scale: 0.5, flipX: true },
  { asset: 'C08-rope-barrier', x: 568, y: 560, scale: 0.5 },
  { asset: 'C08-rope-barrier', x: 712, y: 560, scale: 0.5, flipX: true },

  // ── North Hall — display case in the center
  { asset: 'C06-display-case', x: 640, y: 220, scale: 0.55 },

  // ── West Wing — bench in middle walkway + 1 statue near far wall
  { asset: 'C02-bench',  x: 192, y: 670, scale: 0.65 },
  { asset: 'C04-statue', x: 192, y: 380, scale: 0.45 },

  // ── East Wing — bench + statue (mirror of west)
  { asset: 'C02-bench',  x: 1088, y: 670, scale: 0.65 },
  { asset: 'C04-statue', x: 1088, y: 380, scale: 0.45, flipX: true },

  // ── South Pavilion — grand arch doorway (the grove portal entry)
  { asset: 'C05-arch-door', x: 640, y: 824, scale: 1.0 },
]

export function setupGalleryArchitecture(
  scene: Phaser.Scene,
  roomId: RoomId,
  onArchClick?: () => void
) {
  teardownGalleryArchitecture()
  if (roomId !== 'room_gallery') return

  layer = scene.add.container(0, 0).setDepth(3)

  for (const p of PLACEMENTS) {
    const meta = getAsset(p.asset)
    if (!meta) continue
    if (scene.textures.exists(meta.key)) {
      const img = scene.add.image(p.x, p.y, meta.key)
        .setOrigin(p.origin?.x ?? 0.5, p.origin?.y ?? 0.5)
      if (p.scale !== undefined) img.setScale(p.scale)
      if (p.flipX) img.setFlipX(true)
      layer.add(img)
    } else {
      // Asset-specific placeholders. The arch door is the most prominent —
      // missing PNG would leave only an invisible click hitbox, so we draw a
      // recognizable doorway shape.
      if (p.asset === 'C05-arch-door') {
        const archW = 56, archH = 80
        // Doorframe — dark slate with brass keystone
        layer.add(scene.add.rectangle(p.x, p.y, archW, archH, 0x1a1f2a)
          .setStrokeStyle(2, 0xc8a058, 0.8))
        // Inner doorway (lighter — suggests beyond the door)
        layer.add(scene.add.rectangle(p.x, p.y + 4, archW - 12, archH - 12, 0x3a3848))
        // Brass keystone at top
        layer.add(scene.add.rectangle(p.x, p.y - archH / 2 + 4, 10, 6, 0xc8a058))
        // Small "to grove" label
        layer.add(scene.add.text(p.x, p.y + archH / 2 + 6, '→ Grove', {
          fontSize: '7px', color: '#c8a058',
          fontFamily: 'ui-monospace, monospace',
        }).setOrigin(0.5))
      } else {
        // Generic placeholder for missing arch sprites
        const ph = scene.add.rectangle(p.x, p.y, 24, 32, 0x3a3848, 0.85)
          .setStrokeStyle(1, 0xc8a058, 0.6)
        layer.add(ph)
      }
    }
  }

  // ── Wire the grove arch as an interactive entry to the 3D pocket world.
  // The arch is the LARGE doorway sprite in the south pavilion; clicking it
  // dispatches open-pocket-world (caught by nook.astro to mount the iframe).
  if (onArchClick) {
    const archX = 640, archY = 824
    const hit = scene.add.container(archX, archY).setDepth(2.9)
    const inv = scene.add.rectangle(0, 0, 90, 110, 0x000000, 0.001).setInteractive({ useHandCursor: true })
    hit.add(inv)
    inv.on('pointerdown', () => onArchClick())
    arcGroveHitArea = hit
  }
}

export function teardownGalleryArchitecture() {
  if (layer) { layer.destroy(); layer = null }
  if (arcGroveHitArea) { arcGroveHitArea.destroy(); arcGroveHitArea = null }
}
