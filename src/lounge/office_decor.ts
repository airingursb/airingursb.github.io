// Office furniture placement. Lays the delivered sprites onto the 640×416 office
// floor per office-studio/FLOOR_PLAN.md. Furniture sits at depth 2–4 (below bears,
// which are fixed at depth 5), mirroring the gallery's static-prop convention.
//
// Every piece falls back to a labeled placeholder rect if its texture is missing,
// so the room is always shippable while art lands.

import Phaser from 'phaser'
import { officeKey } from './office_assets'

type Piece = { slug: string; x: number; y: number; depth?: number }

// ── layout (px on the 640×416 map) ────────────────────────────────────────
function buildLayout(): Piece[] {
  const P: Piece[] = []
  const add = (slug: string, x: number, y: number, depth?: number) => P.push({ slug, x, y, depth })

  // PANTRY ☕ (top-left)
  add('E02-counter', 104, 92)
  add('E01-coffee', 156, 90)
  add('G02-plant-small', 60, 96)

  // INFRA 🖥 (top-right)
  add('E03-server-rack', 580, 96)

  // WORKSTATION GRID (center) — 3 rows × 4 cols
  const cols = [112, 196, 280, 364]
  const rows = [156, 218, 280]
  for (const ry of rows) for (const cx of cols) {
    add('B01-desk', cx, ry)
    add('B02-monitor-on', cx, ry - 18)
    add('B04-chair-down', cx, ry + 16)
  }

  // BOSS ★ (right-middle)
  add('C01-boss-desk', 542, 214)
  add('C03-dual-monitor', 542, 190)
  add('C02-boss-chair', 542, 236)

  // WHITEBOARD / MEETING ▢ (bottom-left, the accent zone)
  add('D01-whiteboard', 96, 250)
  add('D02-round-table', 138, 332)
  add('D03-meeting-chair', 104, 338)
  add('D03-meeting-chair', 172, 338)

  // LOUNGE 🛋 (bottom-right)
  add('F02-rug', 548, 352, 1.4)
  add('F01-couch', 548, 344)
  add('F03-side-table', 598, 348)
  add('E04-treadmill', 604, 300)

  // greenery
  add('G01-plant-tall', 46, 384)
  add('G01-plant-tall', 600, 384)
  add('G02-plant-small', 470, 300)

  return P
}

let group: Phaser.GameObjects.GameObject[] = []

export function setupOfficeDecor(scene: Phaser.Scene): void {
  teardownOfficeDecor()
  for (const p of buildLayout()) {
    const key = officeKey(p.slug)
    const depth = p.depth ?? 2 + p.y * 0.002
    if (scene.textures.exists(key)) {
      const img = scene.add.image(p.x, p.y, key).setOrigin(0.5, 1).setDepth(depth)
      group.push(img)
    } else {
      // placeholder so layout reads even if a sprite is missing
      const r = scene.add.rectangle(p.x, p.y, 24, 20, 0x4a4a52, 0.6).setOrigin(0.5, 1).setDepth(depth)
      const t = scene.add.text(p.x, p.y - 10, p.slug.slice(0, 3), { fontFamily: 'monospace', fontSize: '7px', color: '#cfcdc6' }).setOrigin(0.5).setDepth(depth)
      group.push(r, t)
    }
  }
}

export function teardownOfficeDecor(): void {
  for (const o of group) o.destroy()
  group = []
}
