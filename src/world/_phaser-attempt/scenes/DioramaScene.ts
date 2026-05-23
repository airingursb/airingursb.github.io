// Isometric diorama scene — 2.5D portfolio world.
//
// Player walks around a small 14×10 garden. 5 work-zone buildings sit in
// the corners; walking near one shows a label + dispatches 'world-interact'
// event to the page shell, which opens an HTML panel for that category.

import Phaser from 'phaser'
import { isoToScreen, depthFor, TILE_W, TILE_H } from '../iso'
import { TILES, OBJECTS, GRID_W, GRID_H, type Interaction } from '../layout'

const SPRITE_BASE = '/world/sprites'

interface InteractableObj {
  sprite: Phaser.GameObjects.Image
  gx: number
  gy: number
  kind: Interaction
  label: string
}

export class DioramaScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image
  private playerGx = 6.5
  private playerGy = 4.5
  private playerDir: 'south' | 'east' | 'north' | 'west' = 'south'
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private eKey!: Phaser.Input.Keyboard.Key
  private originX = 0
  private originY = 0
  private interactables: InteractableObj[] = []
  private hintText!: Phaser.GameObjects.Text
  private currentHint: InteractableObj | null = null

  constructor() {
    super('Diorama')
  }

  preload() {
    // Tiles (5)
    this.load.image('tile-grass', `${SPRITE_BASE}/tiles/A01-grass.png`)
    this.load.image('tile-stone', `${SPRITE_BASE}/tiles/A02-stone.png`)
    this.load.image('tile-wood',  `${SPRITE_BASE}/tiles/A03-wood.png`)
    this.load.image('tile-water', `${SPRITE_BASE}/tiles/A04-water.png`)
    this.load.image('tile-sand',  `${SPRITE_BASE}/tiles/A05-sand.png`)
    // Character (4)
    this.load.image('player-south', `${SPRITE_BASE}/character/B01-idle-south.png`)
    this.load.image('player-east',  `${SPRITE_BASE}/character/B02-idle-east.png`)
    this.load.image('player-north', `${SPRITE_BASE}/character/B03-idle-north.png`)
    this.load.image('player-west',  `${SPRITE_BASE}/character/B04-idle-west.png`)
    // Buildings (5)
    this.load.image('bookshelf', `${SPRITE_BASE}/buildings/C01-bookshelf.png`)
    this.load.image('easel',     `${SPRITE_BASE}/buildings/C02-easel.png`)
    this.load.image('record',    `${SPRITE_BASE}/buildings/C03-record-player.png`)
    this.load.image('chair',     `${SPRITE_BASE}/buildings/C04-armchair.png`)
    this.load.image('fire',      `${SPRITE_BASE}/buildings/C05-campfire.png`)
    // Decorations (5)
    this.load.image('pine',     `${SPRITE_BASE}/decorations/D01-pine.png`)
    this.load.image('bush',     `${SPRITE_BASE}/decorations/D02-bush.png`)
    this.load.image('rocks',    `${SPRITE_BASE}/decorations/D03-rocks.png`)
    this.load.image('lamp',     `${SPRITE_BASE}/decorations/D04-lamp.png`)
    this.load.image('lavender', `${SPRITE_BASE}/decorations/D05-lavender.png`)
  }

  create() {
    // Center the grid on screen — origin = top of the diamond
    const w = this.scale.width
    const h = this.scale.height
    this.originX = w / 2
    this.originY = h / 2 - (GRID_H * TILE_H) / 4

    // 1. Tiles
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const tile = TILES[gy]?.[gx] ?? 'grass'
        const { x, y } = isoToScreen(gx, gy, this.originX, this.originY)
        this.add.image(x, y, `tile-${tile}`).setDepth(0)
      }
    }

    // 2. Objects — sorted by depth so back-row draws first
    const sorted = [...OBJECTS].sort((a, b) => depthFor(a.gx, a.gy) - depthFor(b.gx, b.gy))
    for (const obj of sorted) {
      const { x, y } = isoToScreen(obj.gx, obj.gy, this.originX, this.originY)
      const img = this.add.image(x, y - obj.yOffset, obj.sprite)
        .setOrigin(0.5, 1) // bottom-center; objects "stand on" the tile
        .setDepth(depthFor(obj.gx, obj.gy) + 1)
      if (obj.interactable && obj.label) {
        this.interactables.push({ sprite: img, gx: obj.gx, gy: obj.gy, kind: obj.interactable, label: obj.label })
      }
    }

    // 3. Player
    this.player = this.add.image(0, 0, 'player-south').setOrigin(0.5, 1)
    this.updatePlayerPosition()

    // 4. Floating hint text — single label that floats above the nearest interactable
    this.hintText = this.add.text(0, 0, '', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px',
      color: '#f4ead5',
      backgroundColor: 'rgba(30, 20, 30, 0.85)',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
    }).setOrigin(0.5, 1).setDepth(99999).setVisible(false)

    // 5. Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd
    this.eKey = this.input.keyboard!.addKey('E')

    // 6. Resize handler — re-center grid
    this.scale.on('resize', () => {
      this.originX = this.scale.width / 2
      this.originY = this.scale.height / 2 - (GRID_H * TILE_H) / 4
      this.scene.restart()
    })
  }

  update(_t: number, dt: number) {
    const speed = 0.005 // grid units per ms — ~5 tiles/sec
    let dx = 0, dy = 0

    // Iso-aware controls: visually "up" on screen = -gx -gy diagonal
    // For player-relative WASD we use: W=north, S=south, A=west, D=east
    // where each cardinal moves along one grid axis combination.
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown

    // In iso projection: pressing up should move toward camera-far (decrease both gx, gy)
    // Pressing right should move toward screen-right (+gx, -gy)
    if (up)    { dx -= 1; dy -= 1; this.playerDir = 'north' }
    if (down)  { dx += 1; dy += 1; this.playerDir = 'south' }
    if (left)  { dx -= 1; dy += 1; this.playerDir = 'west' }
    if (right) { dx += 1; dy -= 1; this.playerDir = 'east' }
    // Normalize diagonals
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy)
      dx /= len; dy /= len
      this.playerGx = Phaser.Math.Clamp(this.playerGx + dx * speed * dt, 0.5, GRID_W - 1.5)
      this.playerGy = Phaser.Math.Clamp(this.playerGy + dy * speed * dt, 0.5, GRID_H - 1.5)
      this.updatePlayerPosition()
    }
    this.player.setTexture(`player-${this.playerDir}`)

    // 7. Proximity check — find nearest interactable within 1.5 tiles
    let nearest: InteractableObj | null = null
    let bestDist = 1.6
    for (const it of this.interactables) {
      const d = Math.hypot(it.gx - this.playerGx, it.gy - this.playerGy)
      if (d < bestDist) { bestDist = d; nearest = it }
    }

    if (nearest && nearest !== this.currentHint) {
      this.currentHint = nearest
      this.hintText.setText(`${nearest.label}\n(按 E 进入)`).setVisible(true)
      const hp = isoToScreen(nearest.gx, nearest.gy, this.originX, this.originY)
      this.hintText.setPosition(hp.x, hp.y - 100)
    } else if (!nearest && this.currentHint) {
      this.currentHint = null
      this.hintText.setVisible(false)
    }

    // 8. Interact key
    if (this.currentHint && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      window.dispatchEvent(new CustomEvent('world-interact', {
        detail: { kind: this.currentHint.kind, label: this.currentHint.label },
      }))
    }
  }

  private updatePlayerPosition() {
    const { x, y } = isoToScreen(this.playerGx, this.playerGy, this.originX, this.originY)
    this.player.setPosition(x, y)
    this.player.setDepth(depthFor(this.playerGx, this.playerGy) + 2)
  }
}
