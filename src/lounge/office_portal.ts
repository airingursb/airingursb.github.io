// A clickable "Agent Office" door in room_lobby — a clean modern glass door (vs the
// gallery's dark-wood arch). Click → enter room_office. (The office→lobby return is
// the to_lobby portal baked into office.tmj.) Primary entry is /nook?room=office;
// this is the in-world shortcut.

import Phaser from 'phaser'
import type { RoomId } from './config'

const DOOR_X = 328
const DOOR_Y = 12

let group: Phaser.GameObjects.Container | null = null

export function setupOfficePortal(scene: Phaser.Scene, roomId: RoomId, onEnter?: () => void) {
  teardownOfficePortal()
  if (roomId !== 'room_lobby') return

  const c = scene.add.container(DOOR_X, DOOR_Y).setDepth(2.5)
  // light frame
  c.add(scene.add.rectangle(0, 0, 20, 22, 0xd8d6d0))
  c.add(scene.add.rectangle(0, 0, 16, 18, 0xf2f0ec))
  // glass door with a cool cyan sheen + monitor-glow line
  c.add(scene.add.rectangle(0, 1, 12, 16, 0xcfe4ee).setStrokeStyle(1, 0x6cc8e8, 0.9))
  c.add(scene.add.rectangle(-1, 1, 1, 14, 0x6cc8e8, 0.5))
  // handle
  c.add(scene.add.circle(3, 1, 1, 0x3a3a42))
  // small dark plaque (a "screen") above
  c.add(scene.add.rectangle(0, -8, 14, 3, 0x2a2a30).setStrokeStyle(1, 0x6cc8e8, 0.5))

  c.setSize(24, 32)
  c.setInteractive({ useHandCursor: true })
  c.on('pointerdown', () => { if (onEnter) onEnter() })
  group = c
}

export function teardownOfficePortal() {
  if (group) { group.destroy(); group = null }
}
