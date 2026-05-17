import Phaser from 'phaser'
import { Bear, registerBearAnimations } from '../bear'
import { connect, sendPos, sendAct, type ActMsg } from '../net'
import { REGIONS, WALK_SPEED, ccToRegion, prefersReducedMotion, type Region } from '../config'
import { preloadAudio, bindAudio, playSfx } from '../audio'
import { onUIEvent, showMenuAt, showBubble, updateBubblePos } from '../ui'
import { getEmote } from '../emotes'

type Direction = 'up' | 'down' | 'left' | 'right'

export class LobbyScene extends Phaser.Scene {
  private myBear?: Bear
  private myDirection: Direction = 'down'
  private peers = new Map<string, { bear: Bear; lastUpdate: number }>()
  private statusEl: HTMLDivElement | null = null
  private myCC: string | null = null
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private mapInfo: { widthPx: number; heightPx: number; collisionRects: Array<{ x: number; y: number; w: number; h: number }> } = {
    widthPx: 480, heightPx: 320, collisionRects: []
  }

  constructor() {
    super({ key: 'Lobby' })
  }

  preload() {
    preloadAudio(this)
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
    bindAudio(this)
    this.time.delayedCall(100, () => playSfx('click', 0.5))

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
    this.mapInfo = { widthPx: map.widthInPixels, heightPx: map.heightInPixels, collisionRects }

    // Keyboard: arrow keys + WASD
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      }
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const wx = p.worldX
      const wy = p.worldY

      // Click on own bear → open emote menu at bear's screen position
      if (this.myBear) {
        const b = this.myBear
        if (Math.abs(wx - b.x) < 14 && wy > b.y - 50 && wy < b.y) {
          const screenX = this.scale.canvasBounds.x + b.x * this.scale.displayScale.x
          const screenY = this.scale.canvasBounds.y + (b.y - 30) * this.scale.displayScale.y
          showMenuAt(screenX, screenY)
          return
        }
      }

      // (Phase 7 will add peer hit-test here.)

      // Floor walk-to
      let tx = wx
      let ty = wy
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

    onUIEvent((e) => {
      if (e.type === 'verb') {
        sendAct(e.verb, e.text)
        this.applyAct(undefined, e.verb, e.text)
      }
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
      onAct: (m: ActMsg) => {
        this.applyAct(m.id, m.verb, m.text)
      },
      onFull: () => {
        if (this.statusEl) {
          this.statusEl.style.display = ''
          this.statusEl.textContent = 'lounge at capacity'
        }
      }
    })
  }

  private collidesAt(x: number, y: number): boolean {
    for (const r of this.mapInfo.collisionRects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true
    }
    return false
  }

  private clampToWalkable(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(20, Math.min(this.mapInfo.widthPx - 20, x)),
      y: Math.max(20, Math.min(this.mapInfo.heightPx - 12, y))
    }
  }

  private applyKeyboard(dtMs: number): boolean {
    if (!this.myBear) return false
    const left = (this.cursors?.left.isDown ?? false) || (this.wasd?.A.isDown ?? false)
    const right = (this.cursors?.right.isDown ?? false) || (this.wasd?.D.isDown ?? false)
    const up = (this.cursors?.up.isDown ?? false) || (this.wasd?.W.isDown ?? false)
    const down = (this.cursors?.down.isDown ?? false) || (this.wasd?.S.isDown ?? false)

    if (!left && !right && !up && !down) return false

    // Cancel any click-target and move by velocity instead.
    this.myBear.target = null
    let vx = (right ? 1 : 0) - (left ? 1 : 0)
    let vy = (down ? 1 : 0) - (up ? 1 : 0)
    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.sqrt(2)
      vx *= inv
      vy *= inv
    }
    const step = (WALK_SPEED * dtMs) / 1000
    let nx = this.myBear.x + vx * step
    let ny = this.myBear.y + vy * step
    const clamped = this.clampToWalkable(nx, ny)
    nx = clamped.x
    ny = clamped.y
    // Collision: try axis-separated movement so player can slide along walls
    if (this.collidesAt(nx, ny)) {
      // Try X-only
      const nx2 = this.clampToWalkable(this.myBear.x + vx * step, this.myBear.y).x
      if (!this.collidesAt(nx2, this.myBear.y)) {
        nx = nx2; ny = this.myBear.y
      } else {
        // Try Y-only
        const ny2 = this.clampToWalkable(this.myBear.x, this.myBear.y + vy * step).y
        if (!this.collidesAt(this.myBear.x, ny2)) {
          nx = this.myBear.x; ny = ny2
        } else {
          nx = this.myBear.x; ny = this.myBear.y
        }
      }
    }

    this.myBear.sprite.x = nx
    this.myBear.sprite.y = ny

    // Pick a facing direction from velocity
    this.myDirection = Math.abs(vx) > Math.abs(vy)
      ? (vx > 0 ? 'right' : 'left')
      : (vy > 0 ? 'down' : 'up')
    this.myBear.facing = this.myDirection
    this.myBear.state = 'walk'
    this.myBear.playWalk()
    return true
  }

  private bearScreenPos(b: Bear): { x: number; y: number } {
    return {
      x: this.scale.canvasBounds.x + b.x * this.scale.displayScale.x,
      y: this.scale.canvasBounds.y + (b.y - 50) * this.scale.displayScale.y
    }
  }

  private applyAct(peerId: string | undefined, verb: string, text?: string) {
    const def = getEmote(verb)
    if (!def) return
    const target = peerId ? this.peers.get(peerId)?.bear : this.myBear
    if (!target) return

    if (verb === 'say' && text) {
      const sb = this.bearScreenPos(target)
      showBubble(peerId ?? '__me__', text, sb.x, sb.y)
      return
    }

    target.applyEmote(verb, def.durationMs, prefersReducedMotion())
  }

  update(_time: number, dtMs: number) {
    if (this.myBear) {
      const usedKeyboard = this.applyKeyboard(dtMs)
      if (!usedKeyboard) {
        if (!this.myBear.target && this.myBear.state === 'walk') {
          this.myBear.state = 'idle'
          this.myBear.playIdle()
        }
        this.myBear.update(dtMs, false)
      }
      const stateStr = this.myBear.state === 'walk'
        ? `walk_${this.myDirection}`
        : `idle_${this.myDirection}`
      const vx = this.myBear.target ? this.myBear.target.x - this.myBear.x : 0
      const vy = this.myBear.target ? this.myBear.target.y - this.myBear.y : 0
      sendPos(this.myBear.x, this.myBear.y, stateStr, vx, vy)
    }
    this.peers.forEach((p) => p.bear.update(dtMs, true))

    // Refresh bubble positions each frame
    if (this.myBear) {
      const s = this.bearScreenPos(this.myBear)
      updateBubblePos('__me__', s.x, s.y)
    }
    this.peers.forEach((p, id) => {
      const s = this.bearScreenPos(p.bear)
      updateBubblePos(id, s.x, s.y)
    })
  }
}
