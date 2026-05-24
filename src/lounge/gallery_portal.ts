// Renders the visible 作品集 door at the top wall of room_lobby. The
// underlying portal+spawn are defined in lobby.tmj (to_gallery + from_gallery)
// so walking into the doorway also teleports — this sprite is the visual
// affordance + a clickable shortcut.

import Phaser from 'phaser'
import type { RoomId } from './config'

// Door slot in lobby.tmj: x=144..160, y=0..16 (16×16 carved out of wall_top_l)
const DOOR_CENTER_X = 152
const DOOR_CENTER_Y = 12

let group: Phaser.GameObjects.Container | null = null

export function setupGalleryPortal(
  scene: Phaser.Scene,
  roomId: RoomId,
  onEnter?: () => void
) {
  teardownGalleryPortal()
  if (roomId !== 'room_lobby') return

  const container = scene.add.container(DOOR_CENTER_X, DOOR_CENTER_Y).setDepth(2.5)

  // Doorframe — dark stone arch, slightly wider than the opening
  const archOuter = scene.add.rectangle(0, 0, 20, 22, 0x1f1812)
  container.add(archOuter)
  const archInner = scene.add.rectangle(0, 0, 16, 18, 0x0e0a07)
  container.add(archInner)

  // Door panel — dark wood with brass inlay
  const door = scene.add.rectangle(0, 1, 12, 16, 0x4a2e16)
    .setStrokeStyle(1, 0x8a6028, 0.9)
  container.add(door)

  // Brass knob (small dot on right)
  const knob = scene.add.circle(3, 1, 1, 0xd4a058)
  container.add(knob)

  // Top-edge brass plaque
  const plaque = scene.add.rectangle(0, -8, 14, 3, 0x2a1808)
    .setStrokeStyle(1, 0xa07028, 0.7)
  container.add(plaque)

  // Floating label below — the door itself + the interact prompt are
  // the primary affordance; this small caption inside the room is just a
  // gentle reminder of what's through this door.
  const label = scene.add.text(0, 22, '作品集', {
    fontSize: '9px',
    color: '#f5e6c8',
    fontFamily: 'ui-monospace, monospace',
    backgroundColor: 'rgba(20, 14, 8, 0.78)',
    padding: { left: 4, right: 4, top: 1, bottom: 1 },
  }).setOrigin(0.5)
  container.add(label)

  // Click anywhere on the doorframe → enter
  container.setSize(24, 32)
  container.setInteractive({ useHandCursor: true })
  container.on('pointerdown', () => { if (onEnter) onEnter() })

  group = container
}

export function teardownGalleryPortal() {
  if (group) {
    group.destroy()
    group = null
  }
}
