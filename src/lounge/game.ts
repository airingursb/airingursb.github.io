import Phaser from 'phaser'
import { RoomScene } from './scenes/RoomScene'
import { ROOM_WIDTH, ROOM_HEIGHT, DEFAULT_ROOM } from './config'

export function bootGame(parent: HTMLElement): Phaser.Game {
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
  return game
}
