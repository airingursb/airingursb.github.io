import Phaser from 'phaser'
import { WALK_SPEED, type Region } from './config'

export type Direction = 'up' | 'down' | 'left' | 'right'

export function registerBearAnimations(scene: Phaser.Scene, regions: readonly Region[]) {
  for (const region of regions) {
    const key = `bear_${region}`
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      const idleKey = `${key}_idle_${dir}`
      if (!scene.anims.exists(idleKey)) {
        scene.anims.create({
          key: idleKey,
          frames: [{ key, frame: `idle_${dir}` }],
          frameRate: 1,
          repeat: -1
        })
      }
      const walkKey = `${key}_walk_${dir}`
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: [
            { key, frame: `walk_${dir}_0` },
            { key, frame: `walk_${dir}_1` }
          ],
          frameRate: 8,
          repeat: -1
        })
      }
    }
  }
}

export class Bear {
  scene: Phaser.Scene
  sprite: Phaser.GameObjects.Sprite
  region: Region
  target: { x: number; y: number } | null = null
  facing: Direction = 'down'
  state: 'idle' | 'walk' = 'idle'

  constructor(scene: Phaser.Scene, x: number, y: number, region: Region) {
    this.scene = scene
    this.region = region
    this.sprite = scene.add.sprite(x, y, `bear_${region}`, 'idle_down')
    this.sprite.setOrigin(0.5, 1)
    this.playIdle()
  }

  walkTo(x: number, y: number) {
    this.target = { x, y }
    const dx = x - this.sprite.x
    const dy = y - this.sprite.y
    this.facing = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up')
    this.state = 'walk'
    this.playWalk()
  }

  setRemoteTarget(x: number, y: number, vx: number, vy: number) {
    this.target = { x, y }
    this.facing = Math.abs(vx) > Math.abs(vy)
      ? (vx >= 0 ? 'right' : 'left')
      : (vy >= 0 ? 'down' : 'up')
    this.state = 'walk'
    this.playWalk()
  }

  update(dtMs: number, isPeer = false) {
    if (!this.target) return
    const dx = this.target.x - this.sprite.x
    const dy = this.target.y - this.sprite.y
    const dist = Math.hypot(dx, dy)
    const arriveDist = isPeer ? 1 : 2
    if (dist <= arriveDist) {
      this.sprite.x = this.target.x
      this.sprite.y = this.target.y
      this.target = null
      this.state = 'idle'
      this.playIdle()
      return
    }
    const speed = isPeer ? WALK_SPEED * 1.2 : WALK_SPEED
    const step = Math.min((speed * dtMs) / 1000, dist)
    this.sprite.x += (dx / dist) * step
    this.sprite.y += (dy / dist) * step
  }

  playWalk() {
    this.sprite.anims.play(`bear_${this.region}_walk_${this.facing}`, true)
  }

  playIdle() {
    this.sprite.anims.play(`bear_${this.region}_idle_${this.facing}`, true)
  }

  setRegion(region: Region) {
    if (region === this.region) return
    this.region = region
    this.sprite.setTexture(`bear_${region}`)
    if (this.state === 'walk') this.playWalk()
    else this.playIdle()
  }

  destroy() {
    this.sprite.destroy()
  }

  get x() {
    return this.sprite.x
  }
  get y() {
    return this.sprite.y
  }
}
