import Phaser from 'phaser'
import { Bear, registerBearAnimations } from '../bear'
import { connect, sendPos, sendAct, sendRoomChange, sendName, type ActMsg, type SnapMsg, type JoinMsg, type LeaveMsg, type PosMsg, type WelcomeMsg, type NameChangedMsg } from '../net'
import { REGIONS, WALK_SPEED, ccToRegion, prefersReducedMotion, isValidRoom, DEFAULT_ROOM, type Region, type RoomId } from '../config'
import { preloadAudio, bindAudio, preloadRoomAudio, playRoomBgm, playRoomAmbient, stopRoomAudio } from '../audio'
import { onUIEvent, showMenuAt, showBubble, updateBubblePos, showInteractPrompt, hideInteractPrompt, updateInteractPromptPos, showNameModal, setInfoPanelDataProvider, showReplacedOverlay } from '../ui'
import { getEmote } from '../emotes'
import { getOverlayAt } from '../atmosphere'
import { getIdentity, setLocalDisplayName, isFirstVisit, markNameChoicePrompted } from '../identity'

const ROOM_AUDIO: Record<RoomId, { bgmKey: string; bgmPath: string; ambKey: string; ambPath: string }> = {
  room_lobby:    { bgmKey: 'bgm_lobby_day',      bgmPath: '/lounge/assets/audio/bgm/lobby_day.ogg',
                   ambKey: 'amb_cafe_chatter',   ambPath: '/lounge/assets/audio/ambient/cafe_chatter.ogg' },
  room_dj_floor: { bgmKey: 'bgm_dj_floor_party', bgmPath: '/lounge/assets/audio/bgm/dj_floor_party.ogg',
                   ambKey: 'amb_beat_thump',     ambPath: '/lounge/assets/audio/ambient/beat_thump.ogg' },
  room_balcony:  { bgmKey: 'bgm_balcony_outside',bgmPath: '/lounge/assets/audio/bgm/balcony_outside.ogg',
                   ambKey: 'amb_wind',           ambPath: '/lounge/assets/audio/ambient/wind.ogg' },
  room_library:  { bgmKey: 'bgm_library_quiet',  bgmPath: '/lounge/assets/audio/bgm/library_quiet.ogg',
                   ambKey: 'amb_pages_turning',  ambPath: '/lounge/assets/audio/ambient/pages_turning.ogg' }
}

const PIXEL_TEX_KEY = 'lounge_pixel'

function ensurePixelTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics({ x: 0, y: 0 })
  g.fillStyle(0xffffff, 1)
  g.fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}

type Direction = 'up' | 'down' | 'left' | 'right'

type Portal = { x: number; y: number; w: number; h: number; targetRoom: RoomId; targetSpawn: string }
type Interactable = { x: number; y: number; w: number; h: number; kind: string; anchorX: number; anchorY: number; facing: Direction; name: string }

export class RoomScene extends Phaser.Scene {
  private currentRoomId: RoomId = DEFAULT_ROOM
  private spawnPointName = 'default'
  private myBear?: Bear
  private myDirection: Direction = 'down'
  private peers = new Map<string, { bear: Bear; lastUpdate: number }>()
  private statusEl: HTMLDivElement | null = null
  private myCC: string | null = null
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private eKey?: Phaser.Input.Keyboard.Key
  private mapInfo = { widthPx: 480, heightPx: 320, collisionRects: [] as Array<{ x: number; y: number; w: number; h: number }> }
  private autoWaveOnArrive = false
  private portals: Portal[] = []
  private interactables: Interactable[] = []
  private nearbyInteractable: Interactable | null = null
  private currentSitInteractable: Interactable | null = null
  private transitioning = false
  private atmosphereOverlay?: Phaser.GameObjects.Rectangle
  private atmosphereTimer?: Phaser.Time.TimerEvent
  private particleEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private myDisplayName: string | null = null
  private myRegion: Region = 'unknown'
  private welcomeApplied = false
  private pendingSpawn: { x: number; y: number } | null = null

  constructor() {
    super({ key: 'Room' })
  }

  init(data: { roomId?: RoomId; spawnPoint?: string; welcomeX?: number; welcomeY?: number }) {
    this.currentRoomId = (data?.roomId && isValidRoom(data.roomId)) ? data.roomId : DEFAULT_ROOM
    this.spawnPointName = data?.spawnPoint ?? 'default'
    this.pendingSpawn = (typeof data?.welcomeX === 'number' && typeof data?.welcomeY === 'number')
      ? { x: data.welcomeX, y: data.welcomeY } : null
    this.welcomeApplied = false
  }

  preload() {
    preloadAudio(this)
    this.load.tilemapTiledJSON('room_lobby',    '/lounge/assets/rooms/lobby.tmj')
    this.load.tilemapTiledJSON('room_dj_floor', '/lounge/assets/rooms/dj_floor.tmj')
    this.load.tilemapTiledJSON('room_balcony',  '/lounge/assets/rooms/balcony.tmj')
    this.load.tilemapTiledJSON('room_library',  '/lounge/assets/rooms/library.tmj')
    this.load.image('indoor_lobby_v0', '/lounge/assets/tilesets/indoor_lobby_v0/tiles.png')
    for (const region of REGIONS) {
      this.load.atlas(
        `bear_${region}`,
        `/lounge/assets/sprites/bear/${region}/sprite.png`,
        `/lounge/assets/sprites/bear/${region}/sprite.json`
      )
    }
    const ra = ROOM_AUDIO[this.currentRoomId]
    if (ra) preloadRoomAudio(this, ra.bgmKey, ra.bgmPath, ra.ambKey, ra.ambPath)
  }

  create() {
    const map = this.make.tilemap({ key: this.currentRoomId })
    const tileset = map.addTilesetImage('indoor_lobby_v0', 'indoor_lobby_v0')!

    map.createLayer('floor', tileset, 0, 0)
    map.createLayer('furniture_below', tileset, 0, 0)
    const above = map.createLayer('furniture_above', tileset, 0, 0)
    above?.setDepth(10)

    registerBearAnimations(this, REGIONS)
    bindAudio(this)

    const ra = ROOM_AUDIO[this.currentRoomId]
    if (ra) {
      playRoomBgm(this, ra.bgmKey)
      playRoomAmbient(this, ra.ambKey)
    }

    ensurePixelTexture(this)
    this.setupAtmosphere(map.widthInPixels, map.heightInPixels)
    this.setupParticles(map.widthInPixels, map.heightInPixels)

    const spawnObj = map.findObject('spawn_points', (o) => o.name === this.spawnPointName)
      ?? map.findObject('spawn_points', (o) => o.name === 'default')
    const defaultSpawnX = (spawnObj?.x as number | undefined) ?? 240
    const defaultSpawnY = (spawnObj?.y as number | undefined) ?? 296
    const spawnX = this.pendingSpawn?.x ?? defaultSpawnX
    const spawnY = this.pendingSpawn?.y ?? defaultSpawnY

    try { this.myCC = sessionStorage.getItem('vp_country') } catch { this.myCC = null }
    this.myRegion = ccToRegion(this.myCC)
    this.myBear = new Bear(this, spawnX, spawnY, this.myRegion)
    this.myBear.sprite.setDepth(5)

    // Apply locally-cached display name immediately (will be overridden by welcome msg)
    const localIdentity = getIdentity()
    this.myDisplayName = localIdentity.display_name
    this.myBear.setDisplayName(this.fallbackName(this.myDisplayName))

    const collisionLayer = map.getObjectLayer('collision')
    const collisionRects = (collisionLayer?.objects ?? []).map((o) => ({
      x: (o.x as number) ?? 0,
      y: (o.y as number) ?? 0,
      w: (o.width as number) ?? 0,
      h: (o.height as number) ?? 0
    }))
    this.mapInfo = { widthPx: map.widthInPixels, heightPx: map.heightInPixels, collisionRects }

    const portalsLayer = map.getObjectLayer('portals')
    this.portals = (portalsLayer?.objects ?? []).map((o) => {
      const props = (o.properties ?? []) as Array<{ name: string; value: unknown }>
      const get = (name: string) => props.find((p) => p.name === name)?.value
      return {
        x: (o.x as number) ?? 0,
        y: (o.y as number) ?? 0,
        w: (o.width as number) ?? 0,
        h: (o.height as number) ?? 0,
        targetRoom: get('target_room') as RoomId,
        targetSpawn: (get('target_spawn') as string) ?? 'default'
      }
    })

    const interactsLayer = map.getObjectLayer('interactables')
    this.interactables = (interactsLayer?.objects ?? []).map((o) => {
      const props = (o.properties ?? []) as Array<{ name: string; value: unknown }>
      const get = (name: string) => props.find((p) => p.name === name)?.value
      return {
        name: (o.name as string) ?? '',
        x: (o.x as number) ?? 0,
        y: (o.y as number) ?? 0,
        w: (o.width as number) ?? 0,
        h: (o.height as number) ?? 0,
        kind: (get('kind') as string) ?? 'unknown',
        anchorX: (get('anchor_x') as number) ?? ((o.x as number) + ((o.width as number) ?? 16) / 2),
        anchorY: (get('anchor_y') as number) ?? ((o.y as number) + ((o.height as number) ?? 16) / 2),
        facing: ((get('facing') as Direction) ?? 'down')
      }
    })

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      }
      this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
      this.eKey.on('down', () => this.tryInteract())
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const wx = p.worldX, wy = p.worldY

      if (this.myBear) {
        const b = this.myBear
        if (Math.abs(wx - b.x) < 14 && wy > b.y - 50 && wy < b.y) {
          const sX = this.scale.canvasBounds.x + b.x * this.scale.displayScale.x
          const sY = this.scale.canvasBounds.y + (b.y - 30) * this.scale.displayScale.y
          showMenuAt(sX, sY)
          return
        }
      }

      for (const [, p2] of this.peers) {
        const b = p2.bear
        if (Math.abs(wx - b.x) < 14 && wy > b.y - 50 && wy < b.y) {
          const destX = Math.max(20, Math.min(map.widthInPixels - 20, b.x - 30))
          const destY = Math.max(20, Math.min(map.heightInPixels - 12, b.y))
          this.myBear?.walkTo(destX, destY)
          const ddx = destX - this.myBear!.x
          const ddy = destY - this.myBear!.y
          this.myDirection = Math.abs(ddx) > Math.abs(ddy)
            ? (ddx > 0 ? 'right' : 'left')
            : (ddy > 0 ? 'down' : 'up')
          this.autoWaveOnArrive = true
          return
        }
      }

      for (const it of this.interactables) {
        if (wx >= it.x && wx <= it.x + it.w && wy >= it.y && wy <= it.y + it.h) {
          this.activateInteractable(it)
          return
        }
      }

      this.autoWaveOnArrive = false
      let tx = wx, ty = wy
      tx = Math.max(20, Math.min(map.widthInPixels - 20, tx))
      ty = Math.max(20, Math.min(map.heightInPixels - 12, ty))
      for (const r of collisionRects) {
        if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
          const dxL = tx - r.x, dxR = r.x + r.w - tx
          const dyT = ty - r.y, dyB = r.y + r.h - ty
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
        sendAct(e.verb, e.text, this.currentRoomId)
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
      onSnap: (m: SnapMsg) => {
        this.peers.forEach((p) => p.bear.destroy())
        this.peers.clear()
        for (const p of m.peers) {
          if (p.room !== this.currentRoomId) continue
          const bear = new Bear(this, p.x, p.y, ccToRegion(p.cc))
          bear.sprite.setDepth(5)
          bear.setDisplayName(this.fallbackName(p.display_name ?? null, ccToRegion(p.cc)))
          this.peers.set(p.id, { bear, lastUpdate: performance.now() })
        }
      },
      onJoin: (m: JoinMsg) => {
        if (m.room !== this.currentRoomId) return
        if (this.peers.has(m.id)) return
        const bear = new Bear(this, m.x, m.y, ccToRegion(m.cc))
        bear.sprite.setDepth(5)
        bear.setDisplayName(this.fallbackName(m.display_name ?? null, ccToRegion(m.cc)))
        this.peers.set(m.id, { bear, lastUpdate: performance.now() })
      },
      onLeave: (m: LeaveMsg) => {
        const peer = this.peers.get(m.id)
        if (peer) { peer.bear.destroy(); this.peers.delete(m.id) }
      },
      onPos: (m: PosMsg) => {
        if (m.room !== this.currentRoomId) return
        let peer = this.peers.get(m.id)
        if (!peer) {
          const bear = new Bear(this, m.x, m.y, 'unknown')
          bear.sprite.setDepth(5)
          bear.setDisplayName(this.fallbackName(null, 'unknown'))
          peer = { bear, lastUpdate: performance.now() }
          this.peers.set(m.id, peer)
        }
        peer.lastUpdate = performance.now()
        peer.bear.setRemoteTarget(m.x, m.y, m.vx ?? 0, m.vy ?? 0)
      },
      onAct: (m: ActMsg) => {
        if (m.room !== this.currentRoomId) return
        this.applyAct(m.id, m.verb, m.text)
      },
      onFull: () => {
        if (this.statusEl) {
          this.statusEl.style.display = ''
          this.statusEl.textContent = 'lounge at capacity'
        }
      },
      onWelcome: (m: WelcomeMsg) => this.applyWelcome(m),
      onNameChanged: (m: NameChangedMsg) => this.applyNameChanged(m),
      onReplaced: () => {
        showReplacedOverlay()
        // Game still runs visually but no new server interaction; net.ts also stops reconnect
      }
    }, this.currentRoomId)

    setInfoPanelDataProvider(
      () => ({
        visitorId: getIdentity().visitor_id,
        displayName: this.myDisplayName,
        region: this.myRegion
      }),
      () => this.openRenameModal()
    )

    if (!prefersReducedMotion()) {
      this.cameras.main.fadeIn(200, 0, 0, 0)
    }
  }

  private fallbackName(name: string | null, region?: Region): string {
    if (name && name.length > 0) return name
    return `Bear from ${region ?? this.myRegion}`
  }

  private applyWelcome(m: WelcomeMsg) {
    if (this.welcomeApplied) return
    this.welcomeApplied = true

    // If server has a different last_room, transition there (using existing scene.restart pipeline)
    if (m.last_room && m.last_room !== this.currentRoomId && isValidRoom(m.last_room)) {
      const wx = (typeof m.last_x === 'number') ? m.last_x : undefined
      const wy = (typeof m.last_y === 'number') ? m.last_y : undefined
      this.transitioning = true
      stopRoomAudio()
      if (this.atmosphereTimer) { this.atmosphereTimer.remove(false); this.atmosphereTimer = undefined }
      sendRoomChange(m.last_room)
      this.scene.restart({ roomId: m.last_room, spawnPoint: 'default', welcomeX: wx, welcomeY: wy })
      return
    }

    // Same room: apply spawn override if provided (and not already applied via pendingSpawn)
    if (this.myBear && typeof m.last_x === 'number' && typeof m.last_y === 'number') {
      const lx = m.last_x, ly = m.last_y
      if (!this.collidesAt(lx, ly)) {
        this.myBear.sprite.x = lx
        this.myBear.sprite.y = ly
      }
    }

    // Display name
    if (m.display_name) {
      this.myDisplayName = m.display_name
      setLocalDisplayName(m.display_name)
    } else {
      this.myDisplayName = null
    }
    if (this.myBear) this.myBear.setDisplayName(this.fallbackName(this.myDisplayName))

    // First-visit modal
    if (m.display_name === null && isFirstVisit()) {
      showNameModal(null, (chosen) => {
        markNameChoicePrompted()
        if (chosen != null) {
          sendName(chosen)
          setLocalDisplayName(chosen)
          this.myDisplayName = chosen
          this.myBear?.setDisplayName(this.fallbackName(chosen))
        }
      })
    }
  }

  private applyNameChanged(m: NameChangedMsg) {
    // Server doesn't tell us our own peer id (it's `you` in snap). We track via the local identity check.
    const peer = this.peers.get(m.id)
    if (peer) {
      peer.bear.setDisplayName(this.fallbackName(m.display_name, peer.bear.region))
    } else {
      // It's us — broadcast loop-back. Update own bear + cache.
      this.myDisplayName = m.display_name
      setLocalDisplayName(m.display_name)
      this.myBear?.setDisplayName(this.fallbackName(m.display_name))
    }
  }

  private openRenameModal() {
    showNameModal(this.myDisplayName, (chosen) => {
      if (chosen != null) {
        sendName(chosen)
        setLocalDisplayName(chosen)
        this.myDisplayName = chosen
        this.myBear?.setDisplayName(this.fallbackName(chosen))
      }
    })
  }

  private setupAtmosphere(widthPx: number, heightPx: number) {
    this.atmosphereOverlay = this.add.rectangle(0, 0, widthPx, heightPx, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(1000)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
    this.refreshAtmosphere(true)
    this.atmosphereTimer = this.time.addEvent({
      delay: 30_000,
      loop: true,
      callback: () => this.refreshAtmosphere(false)
    })
  }

  private refreshAtmosphere(immediate: boolean) {
    if (!this.atmosphereOverlay) return
    const o = getOverlayAt()
    if (immediate || prefersReducedMotion()) {
      this.atmosphereOverlay.fillColor = o.color
      this.atmosphereOverlay.fillAlpha = o.alpha
      return
    }
    this.tweens.add({
      targets: this.atmosphereOverlay,
      fillAlpha: o.alpha,
      duration: 800,
      onStart: () => {
        if (this.atmosphereOverlay) this.atmosphereOverlay.fillColor = o.color
      }
    })
  }

  private setupParticles(_widthPx: number, _heightPx: number) {
    if (prefersReducedMotion()) return
    const roomId = this.currentRoomId
    let cfg: { x: number; y: number; emit: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig } | null = null

    if (roomId === 'room_lobby') {
      cfg = {
        x: 240, y: 160,
        emit: {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 460, 280), quantity: 1 } as any,
          frequency: 1500,
          lifespan: 12000,
          quantity: 1,
          maxAliveParticles: 8,
          speedX: { min: -5, max: 5 },
          speedY: { min: -8, max: -2 },
          alpha: { start: 0.25, end: 0 },
          scale: 1,
          tint: 0xfff0c0
        }
      }
    } else if (roomId === 'room_dj_floor') {
      cfg = {
        x: 120, y: 80,
        emit: {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-40, -20, 80, 40), quantity: 1 } as any,
          frequency: 1200,
          lifespan: 4000,
          quantity: 1,
          maxAliveParticles: 4,
          speedY: { min: -20, max: -10 },
          speedX: { min: -8, max: 8 },
          alpha: { start: 0.5, end: 0 },
          scale: 1.5,
          tint: 0xff80ff
        }
      }
    } else if (roomId === 'room_balcony') {
      cfg = {
        x: 200, y: 20,
        emit: {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-180, 0, 360, 10), quantity: 1 } as any,
          frequency: 1800,
          lifespan: 8000,
          quantity: 1,
          maxAliveParticles: 6,
          speedY: { min: 6, max: 12 },
          speedX: { min: -10, max: 10 },
          alpha: { start: 0.5, end: 0 },
          scale: 1.5,
          tint: 0xa0d060
        }
      }
    } else if (roomId === 'room_library') {
      cfg = {
        x: 200, y: 144,
        emit: {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-180, -100, 360, 200), quantity: 1 } as any,
          frequency: 2500,
          lifespan: 10000,
          quantity: 1,
          maxAliveParticles: 4,
          speedY: { min: -3, max: 3 },
          speedX: { min: -3, max: 3 },
          alpha: { start: 0.2, end: 0 },
          scale: 1,
          tint: 0xfff0c0
        }
      }
    }

    if (cfg) {
      this.particleEmitter = this.add.particles(cfg.x, cfg.y, PIXEL_TEX_KEY, cfg.emit)
      this.particleEmitter.setDepth(500)
    }
  }

  private tryInteract() {
    if (this.nearbyInteractable) {
      this.activateInteractable(this.nearbyInteractable)
    } else if (this.currentSitInteractable && this.myBear?.state === 'sit') {
      sendAct('sit', undefined, this.currentRoomId)
      this.applyAct(undefined, 'sit')
      this.currentSitInteractable = null
    }
  }

  private activateInteractable(it: Interactable) {
    if (it.kind !== 'sit') return
    if (!this.myBear) return
    if (this.currentSitInteractable === it && this.myBear.state === 'sit') {
      sendAct('sit', undefined, this.currentRoomId)
      this.applyAct(undefined, 'sit')
      this.currentSitInteractable = null
      return
    }
    this.myBear.walkTo(it.anchorX, it.anchorY)
    this.myDirection = it.facing
    this.currentSitInteractable = it
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

    this.myBear.target = null
    if (this.myBear.state === 'sit') {
      this.currentSitInteractable = null
    }
    let vx = (right ? 1 : 0) - (left ? 1 : 0)
    let vy = (down ? 1 : 0) - (up ? 1 : 0)
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.sqrt(2)
      vx *= inv; vy *= inv
    }
    const step = (WALK_SPEED * dtMs) / 1000
    let nx = this.myBear.x + vx * step
    let ny = this.myBear.y + vy * step
    const clamped = this.clampToWalkable(nx, ny)
    nx = clamped.x; ny = clamped.y
    if (this.collidesAt(nx, ny)) {
      const nx2 = this.clampToWalkable(this.myBear.x + vx * step, this.myBear.y).x
      if (!this.collidesAt(nx2, this.myBear.y)) { nx = nx2; ny = this.myBear.y }
      else {
        const ny2 = this.clampToWalkable(this.myBear.x, this.myBear.y + vy * step).y
        if (!this.collidesAt(this.myBear.x, ny2)) { nx = this.myBear.x; ny = ny2 }
        else { nx = this.myBear.x; ny = this.myBear.y }
      }
    }
    this.myBear.sprite.x = nx
    this.myBear.sprite.y = ny
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

  private checkPortals() {
    if (this.transitioning || !this.myBear) return
    for (const p of this.portals) {
      if (this.myBear.x >= p.x && this.myBear.x <= p.x + p.w &&
          this.myBear.y >= p.y && this.myBear.y <= p.y + p.h) {
        this.transitioning = true
        const targetRoom = p.targetRoom
        const targetSpawn = p.targetSpawn
        const fade = !prefersReducedMotion()
        const doRestart = () => {
          stopRoomAudio()
          if (this.atmosphereTimer) { this.atmosphereTimer.remove(false); this.atmosphereTimer = undefined }
          sendRoomChange(targetRoom)
          this.scene.restart({ roomId: targetRoom, spawnPoint: targetSpawn })
        }
        if (fade) {
          this.cameras.main.fadeOut(200, 0, 0, 0)
          this.cameras.main.once('camerafadeoutcomplete', doRestart)
        } else {
          doRestart()
        }
        return
      }
    }
  }

  private checkInteractableProximity() {
    if (!this.myBear) return
    const PROX = 32
    let nearest: Interactable | null = null
    let bestD = Infinity
    for (const it of this.interactables) {
      const cx = it.anchorX, cy = it.anchorY
      const d = Math.hypot(cx - this.myBear.x, cy - this.myBear.y)
      if (d < PROX && d < bestD) { nearest = it; bestD = d }
    }
    if (nearest !== this.nearbyInteractable) {
      this.nearbyInteractable = nearest
      if (nearest) showInteractPrompt(nearest.kind)
      else hideInteractPrompt()
    }
    if (this.nearbyInteractable) {
      const s = this.bearScreenPos(this.myBear)
      updateInteractPromptPos(s.x, s.y - 30)
    }
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
      if (this.autoWaveOnArrive && this.myBear.state === 'idle' && !this.myBear.target) {
        this.autoWaveOnArrive = false
        sendAct('wave', undefined, this.currentRoomId)
        this.applyAct(undefined, 'wave')
      }
      if (this.currentSitInteractable && this.myBear.state === 'idle' && !this.myBear.target) {
        const it = this.currentSitInteractable
        if (Math.abs(this.myBear.x - it.anchorX) < 2 && Math.abs(this.myBear.y - it.anchorY) < 2) {
          this.myBear.facing = it.facing
          sendAct('sit', undefined, this.currentRoomId)
          this.applyAct(undefined, 'sit')
        }
      }
      const stateStr = this.myBear.state === 'walk'
        ? `walk_${this.myDirection}`
        : `idle_${this.myDirection}`
      const vx = this.myBear.target ? this.myBear.target.x - this.myBear.x : 0
      const vy = this.myBear.target ? this.myBear.target.y - this.myBear.y : 0
      sendPos(this.myBear.x, this.myBear.y, stateStr, vx, vy, this.currentRoomId)
      this.checkPortals()
      this.checkInteractableProximity()
    }
    this.peers.forEach((p) => p.bear.update(dtMs, true))
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
