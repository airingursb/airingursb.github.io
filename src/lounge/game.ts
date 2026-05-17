import Phaser from 'phaser'
import { LobbyScene } from './scenes/Lobby'
import { ROOM_WIDTH, ROOM_HEIGHT } from './config'

export function bootGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
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
    scene: [LobbyScene]
  })
}
