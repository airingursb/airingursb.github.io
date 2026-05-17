import Phaser from 'phaser'
import { WALK_SPEED, type Region } from './config'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type BearState = 'idle' | 'walk' | 'wave' | 'sit' | 'dance'

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
    const waveKey = `${key}_wave`
    if (!scene.anims.exists(waveKey)) {
      scene.anims.create({ key: waveKey, frames: [{ key, frame: 'wave' }], frameRate: 1, repeat: 0 })
    }
    const sitKey = `${key}_sit`
    if (!scene.anims.exists(sitKey)) {
      scene.anims.create({ key: sitKey, frames: [{ key, frame: 'sit' }], frameRate: 1, repeat: 0 })
    }
  }
}

export class Bear {
  scene: Phaser.Scene
  sprite: Phaser.GameObjects.Sprite
  region: Region
  target: { x: number; y: number } | null = null
  facing: Direction = 'down'
  state: BearState = 'idle'
  stateUntil = 0
  reducedMotion = false
  private baseY = 0
  private nameLabel?: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, x: number, y: number, region: Region) {
    this.scene = scene
    this.region = region
    this.sprite = scene.add.sprite(x, y, `bear_${region}`, 'idle_down')
    this.sprite.setOrigin(0.5, 1)
    this.baseY = y
    this.nameLabel = scene.add.text(x, y - 52, '', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '9px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 2
    }).setOrigin(0.5, 1).setDepth(6)
    this.playIdle()
  }

  setDisplayName(name: string | null, opts?: { color?: string; prefix?: string }) {
    if (!this.nameLabel) return
    const text = name && name.length > 0
      ? (opts?.prefix ? `${opts.prefix}${name}` : name)
      : ''
    this.nameLabel.setText(text)
    this.nameLabel.setColor(opts?.color ?? '#ffffff')
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
    if (this.state === 'idle') this.state = 'walk'
    if (this.state === 'walk') this.playWalk()
  }

  applyEmote(verb: string, durationMs: number, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion
    const now = performance.now()
    if (verb === 'wave') {
      this.state = 'wave'
      this.stateUntil = now + durationMs
      this.playWave()
    } else if (verb === 'sit') {
      if (this.state === 'sit') {
        this.state = 'idle'
        this.stateUntil = 0
        this.playIdle()
      } else {
        this.state = 'sit'
        this.stateUntil = 0
        this.target = null
        this.playSit()
      }
    } else if (verb === 'dance') {
      this.state = 'dance'
      this.stateUntil = now + durationMs
      this.target = null
      this.baseY = this.sprite.y
      this.playWalk()
    }
  }

  update(dtMs: number, isPeer = false) {
    const now = performance.now()
    if (this.nameLabel) {
      this.nameLabel.x = this.sprite.x
      this.nameLabel.y = this.sprite.y - 52
    }

    if (this.stateUntil > 0 && now >= this.stateUntil) {
      this.state = 'idle'
      this.stateUntil = 0
      this.sprite.y = this.baseY
      this.playIdle()
    }

    if (this.state === 'sit' || this.state === 'wave') {
      return
    }

    if (this.state === 'dance') {
      if (!this.reducedMotion) {
        const bounce = Math.sin(now / 120) * 4
        this.sprite.y = this.baseY + bounce
      }
      return
    }

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
      this.baseY = this.sprite.y
      this.playIdle()
      return
    }
    const speed = isPeer ? WALK_SPEED * 1.2 : WALK_SPEED
    const step = Math.min((speed * dtMs) / 1000, dist)
    this.sprite.x += (dx / dist) * step
    this.sprite.y += (dy / dist) * step
    this.baseY = this.sprite.y
    if (this.reducedMotion) {
      this.sprite.anims.stop()
      this.sprite.setFrame(`walk_${this.facing}_0`)
    }
  }

  playWalk() {
    if (this.reducedMotion) {
      this.sprite.anims.stop()
      this.sprite.setFrame(`walk_${this.facing}_0`)
    } else {
      this.sprite.anims.play(`bear_${this.region}_walk_${this.facing}`, true)
    }
  }
  playIdle() { this.sprite.anims.play(`bear_${this.region}_idle_${this.facing}`, true) }
  playWave() { this.sprite.anims.play(`bear_${this.region}_wave`, true) }
  playSit()  { this.sprite.anims.play(`bear_${this.region}_sit`, true) }

  setRegion(region: Region) {
    if (region === this.region) return
    this.region = region
    this.sprite.setTexture(`bear_${region}`)
    if (this.state === 'walk') this.playWalk()
    else if (this.state === 'wave') this.playWave()
    else if (this.state === 'sit') this.playSit()
    else this.playIdle()
  }

  destroy() {
    this.nameLabel?.destroy()
    this.sprite.destroy()
  }

  get x() { return this.sprite.x }
  get y() { return this.sprite.y }
}
