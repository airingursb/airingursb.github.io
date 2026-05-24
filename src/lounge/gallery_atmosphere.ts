// Day/night atmosphere variation for the gallery. Boosts spotlight pool
// intensity + dims the overall hall at night, brightens during day. Uses the
// existing `atmosphere.ts` phase system so it stays in sync with other rooms.
//
// Effect: at night the museum feels intimate + theatrical (paintings stand
// out against deep shadow). During day it feels open + airy. Subtle but
// shifts the mood on extended visits.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getCurrentPhase } from './atmosphere'

let overlay: Phaser.GameObjects.Rectangle | null = null

export function setupGalleryAtmosphere(
  scene: Phaser.Scene,
  roomId: RoomId,
  mapWidth: number,
  mapHeight: number,
) {
  teardownGalleryAtmosphere()
  if (roomId !== 'room_gallery') return

  const phase = getCurrentPhase()
  // Night/dusk add a cool overlay that simulates dim hall lighting.
  // Day/dawn skip the overlay entirely — the museum is naturally bright.
  if (phase === 'night') {
    overlay = scene.add.rectangle(
      mapWidth / 2, mapHeight / 2,
      mapWidth, mapHeight,
      0x10141c, 0.32
    ).setDepth(2.7).setBlendMode(Phaser.BlendModes.MULTIPLY)
  } else if (phase === 'dusk') {
    overlay = scene.add.rectangle(
      mapWidth / 2, mapHeight / 2,
      mapWidth, mapHeight,
      0x2a2030, 0.18
    ).setDepth(2.7).setBlendMode(Phaser.BlendModes.MULTIPLY)
  }
  // 'dawn' and 'day' get no overlay
}

export function teardownGalleryAtmosphere() {
  if (overlay) { overlay.destroy(); overlay = null }
}
