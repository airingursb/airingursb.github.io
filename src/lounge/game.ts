import Phaser from 'phaser'
import { RoomScene } from './scenes/RoomScene'
import { ROOM_WIDTH, ROOM_HEIGHT, DEFAULT_ROOM } from './config'
import { installProgressSync, pullProgress } from './progress_sync'

export function bootGame(parent: HTMLElement): Phaser.Game {
  // Era 6/7 P0 — install progress sync before any game code reads localStorage,
  // then kick off a pull. installProgressSync also patches setItem so any later
  // writes auto-schedule a push.
  installProgressSync()
  void pullProgress()
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: ROOM_WIDTH,
    height: ROOM_HEIGHT,
    pixelArt: true,
    backgroundColor: '#0d1117',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [RoomScene]
  })
  game.scene.start('Room', { roomId: DEFAULT_ROOM, spawnPoint: 'default' })
  // Expose for debugging / smoke tests
  ;(window as any).__loungeGame = game
  return game
}
