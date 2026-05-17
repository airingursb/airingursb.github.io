import Phaser from 'phaser'
import { Bear, registerBearAnimations } from '../bear'
import { connect, sendPos } from '../net'
import { REGIONS, ccToRegion, type Region } from '../config'

type Direction = 'up' | 'down' | 'left' | 'right'

export class LobbyScene extends Phaser.Scene {
  private myBear?: Bear
  private myDirection: Direction = 'down'
  private peers = new Map<string, { bear: Bear; lastUpdate: number }>()
  private statusEl: HTMLDivElement | null = null
  private myCC: string | null = null

  constructor() {
    super({ key: 'Lobby' })
  }

  preload() {
    this.load.tilemapTiledJSON('lobby', '/lounge/assets/rooms/lobby.tmj')
    this.load.image('indoor_lobby_v0', '/lounge/assets/tilesets/indoor_lobby_v0/tiles.png')
    for (const region of REGIONS) {
      this.load.atlas(
        `bear_${region}`,
        `/lounge/assets/sprites/bear/${region}/sprite.png`,
        `/lounge/assets/sprites/bear/${region}/sprite.json`
      )
    }
  }

  create() {
    const map = this.make.tilemap({ key: 'lobby' })
    const tileset = map.addTilesetImage('indoor_lobby_v0', 'indoor_lobby_v0')!

    map.createLayer('floor', tileset, 0, 0)
    map.createLayer('furniture_below', tileset, 0, 0)
    const above = map.createLayer('furniture_above', tileset, 0, 0)
    above?.setDepth(10)

    registerBearAnimations(this, REGIONS)

    const spawnObj = map.findObject('spawn_points', (o) => o.name === 'default')
    const spawnX = (spawnObj?.x as number | undefined) ?? 240
    const spawnY = (spawnObj?.y as number | undefined) ?? 296

    try {
      this.myCC = sessionStorage.getItem('vp_country')
    } catch {
      this.myCC = null
    }

    const myRegion: Region = ccToRegion(this.myCC)
    this.myBear = new Bear(this, spawnX, spawnY, myRegion)
    this.myBear.sprite.setDepth(5)

    const collisionLayer = map.getObjectLayer('collision')
    const collisionRects = (collisionLayer?.objects ?? []).map((o) => ({
      x: (o.x as number) ?? 0,
      y: (o.y as number) ?? 0,
      w: (o.width as number) ?? 0,
      h: (o.height as number) ?? 0
    }))

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      let tx = p.worldX
      let ty = p.worldY
      tx = Math.max(20, Math.min(map.widthInPixels - 20, tx))
      ty = Math.max(20, Math.min(map.heightInPixels - 12, ty))

      for (const r of collisionRects) {
        if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
          const dxL = tx - r.x
          const dxR = r.x + r.w - tx
          const dyT = ty - r.y
          const dyB = r.y + r.h - ty
          const m = Math.min(dxL, dxR, dyT, dyB)
          if (m === dxL) tx = r.x - 4
          else if (m === dxR) tx = r.x + r.w + 4
          else if (m === dyT) ty = r.y - 4
          else ty = r.y + r.h + 4
          break
        }
      }

      this.myBear?.walkTo(tx, ty)
      const dx = tx - this.myBear!.x
      const dy = ty - this.myBear!.y
      this.myDirection = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up')
    })

    this.statusEl = document.createElement('div')
    this.statusEl.className = 'lounge-status'
    this.statusEl.textContent = 'connecting…'
    this.game.canvas.parentElement?.appendChild(this.statusEl)

    connect({
      onConnectionChange: (state) => {
        if (!this.statusEl) return
        if (state === 'open') {
          this.statusEl.textContent = ''
          this.statusEl.style.display = 'none'
        } else {
          this.statusEl.style.display = ''
          this.statusEl.textContent = state === 'connecting' ? 'connecting…' : 'reconnecting…'
        }
      },
      onSnap: (m) => {
        this.peers.forEach((p) => p.bear.destroy())
        this.peers.clear()
        for (const p of m.peers) {
          const bear = new Bear(this, p.x, p.y, ccToRegion(p.cc))
          bear.sprite.setDepth(5)
          this.peers.set(p.id, { bear, lastUpdate: performance.now() })
        }
      },
      onJoin: (m) => {
        if (this.peers.has(m.id)) return
        const bear = new Bear(this, m.x, m.y, ccToRegion(m.cc))
        bear.sprite.setDepth(5)
        this.peers.set(m.id, { bear, lastUpdate: performance.now() })
      },
      onLeave: (m) => {
        const peer = this.peers.get(m.id)
        if (peer) {
          peer.bear.destroy()
          this.peers.delete(m.id)
        }
      },
      onPos: (m) => {
        let peer = this.peers.get(m.id)
        if (!peer) {
          const bear = new Bear(this, m.x, m.y, 'unknown')
          bear.sprite.setDepth(5)
          peer = { bear, lastUpdate: performance.now() }
          this.peers.set(m.id, peer)
        }
        peer.lastUpdate = performance.now()
        peer.bear.setRemoteTarget(m.x, m.y, m.vx ?? 0, m.vy ?? 0)
      },
      onFull: () => {
        if (this.statusEl) {
          this.statusEl.style.display = ''
          this.statusEl.textContent = 'lounge at capacity'
        }
      }
    })
  }

  update(_time: number, dtMs: number) {
    if (this.myBear) {
      this.myBear.update(dtMs, false)
      const stateStr = this.myBear.state === 'walk'
        ? `walk_${this.myDirection}`
        : `idle_${this.myDirection}`
      const vx = this.myBear.target ? this.myBear.target.x - this.myBear.x : 0
      const vy = this.myBear.target ? this.myBear.target.y - this.myBear.y : 0
      sendPos(this.myBear.x, this.myBear.y, stateStr, vx, vy)
    }
    this.peers.forEach((p) => p.bear.update(dtMs, true))
  }
}
