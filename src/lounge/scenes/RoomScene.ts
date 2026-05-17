import Phaser from 'phaser'
import { Bear, registerBearAnimations } from '../bear'
import { connect, sendPos, sendAct, sendRoomChange, sendName, sendCollect, sendGift, sendDm, requestDmThread, sendDmRead, sendPlace, sendPickup, requestHomeDecorations, sendJamTap, type ActMsg, type SnapMsg, type JoinMsg, type LeaveMsg, type PosMsg, type WelcomeMsg, type NameChangedMsg, type CollectedMsg, type FriendUpdateMsg, type FriendshipEntry, type GiftEntry, type GiftReceivedMsg, type GiftSentOkMsg, type GiftFailedMsg, type DmReceivedMsg, type DmSentOkMsg, type DmFailedMsg, type DmThreadMsg, type DmEntry, type HomeDecoration, type PlaceOkMsg, type PlaceFailedMsg, type PickupOkMsg, type PickupFailedMsg, type HomeDecorationBroadcast, type HomeDecorationsResponseMsg, type JamTapMsg, type JamBurstMsg } from '../net'
import { loadPebbles, getPebblesInRoom, findPebble, getAllPebbles, type Pebble } from '../pebbles'
import { loadSeasons, getCurrentSeason, getCurrentHoliday, hexToInt } from '../seasons'
import { REGIONS, WALK_SPEED, ccToRegion, prefersReducedMotion, isValidRoom, DEFAULT_ROOM, isHomeRoom, homeRoomFor as homeRoomForVisitor, type Region, type RoomId } from '../config'
import { preloadAudio, bindAudio, preloadRoomAudio, playRoomBgm, playRoomAmbient, stopRoomAudio } from '../audio'
import { onUIEvent, showMenuAt, showBubble, updateBubblePos, showInteractPrompt, hideInteractPrompt, updateInteractPromptPos, showNameModal, setInfoPanelDataProvider, showReplacedOverlay, showBoothPicker, hideBoothPicker, showNowPlaying, hideNowPlaying, setInventoryDataProvider, refreshInventoryPanel, showPeerMenu, showGiftModal, showToast, setMessagesProvider, refreshMessagesBadge, renderThreadView, getCurrentThreadFriendId } from '../ui'
import { getBoothTracks, preloadBoothTracks, playBoothTrack, stopBoothTrack, getCurrentTrackName, type BoothTrack } from '../booth'
import { getEmote } from '../emotes'
import { getOverlayAt } from '../atmosphere'
import { getIdentity, setLocalDisplayName, isFirstVisit, markNameChoicePrompted } from '../identity'
import { loadNpcManifest, getActiveBracket, pickDialog, type NpcDef, type NpcManifest } from '../npcs'

const NPC_LABEL_COLOR = '#ffd166'
const NPC_LABEL_PREFIX = '✦ '
const NPC_REFRESH_MS = 10_000

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

// Module-level cache so welcome data survives scene.restart when applyWelcome triggers a cross-room transition.
let welcomeCache: WelcomeMsg | null = null

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
type Interactable = { x: number; y: number; w: number; h: number; kind: string; anchorX: number; anchorY: number; facing: Direction; name: string; padIndex?: number }

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
  private npcManifest: NpcManifest | null = null
  private npcBears = new Map<string, { bear: Bear; def: NpcDef }>()
  private npcDialogMemory = new Map<string, string>()
  private npcRefreshTimer?: Phaser.Time.TimerEvent
  private boothTracks: BoothTrack[] = []
  private activeBoothInteractable: Interactable | null = null
  private currentBoothTrackId: string | null = null
  private inventory = new Set<string>()
  private pebbleSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private seasonOverlay?: Phaser.GameObjects.Rectangle
  private seasonalEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private holidayEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  // V4.0 — friendship
  private peerVisitorIds = new Map<string, string>()      // session id → visitor_id
  private friendships = new Map<string, FriendshipEntry>() // friend_visitor_id → entry
  private lastClickedPeerId: string | null = null         // for directed wave
  // V4.1 — gifts + DMs
  private giftsReceived: GiftEntry[] = []
  private giftsSentFromMe = new Set<string>()             // item_ids I've gifted to anyone (for "already gifted" UX hint)
  private dmThreads = new Map<string, DmEntry[]>()        // friend visitor_id → cached recent messages
  private unreadDmCount = 0
  // V4.2 — homes
  private myHomeDecorations: HomeDecoration[] = []
  private homeDecorationSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private placeMode: { item_id: string; name: string } | null = null
  private placeModeIndicator?: Phaser.GameObjects.Text
  // V4.3 — jam pads
  private jamPads = new Map<number, Phaser.GameObjects.Rectangle>()

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
    this.load.tilemapTiledJSON('room_home_template', '/lounge/assets/rooms/home.tmj')
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

    // V3.2 — only DJ Floor has the booth, preload synchronously
    if (this.currentRoomId === 'room_dj_floor') {
      this.boothTracks = getBoothTracks()
      preloadBoothTracks(this, this.boothTracks)
      // V4.3 — preload jam pad notes
      for (let i = 1; i <= 4; i++) {
        const key = `jam_pad${i}`
        if (!this.cache.audio.exists(key)) {
          try {
            this.load.audio(key, [
              `/lounge/assets/audio/jam/pad${i}.ogg`,
              `/lounge/assets/audio/jam/pad${i}.mp3`
            ])
          } catch {}
        }
      }
    }
  }

  create() {
    const mapKey = isHomeRoom(this.currentRoomId) ? 'room_home_template' : this.currentRoomId
    const map = this.make.tilemap({ key: mapKey })
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
    this.loadAndStartNpcs()
    this.loadAndStartPebbles()
    this.loadAndStartSeasons(map.widthInPixels, map.heightInPixels)

    // V4.2 — if in a home room, render decorations.
    if (isHomeRoom(this.currentRoomId)) {
      if (this.amInMyHome()) {
        // Use cached decorations from welcome
        this.renderHomeDecorations(this.myHomeDecorations)
      } else {
        // Friend's home — request fresh decorations
        const ownerShort = this.currentRoomId.slice('room_home_'.length)
        // Find friend by visitor_id short prefix
        for (const f of this.friendships.values()) {
          if (f.friend_id.startsWith(ownerShort)) {
            requestHomeDecorations(f.friend_id)
            break
          }
        }
      }
    }

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
      let targetRoom = get('target_room') as RoomId
      // Resolve placeholder: 'room_home_self' → caller's own home room id
      if (targetRoom === ('room_home_self' as unknown as RoomId)) {
        targetRoom = homeRoomForVisitor(getIdentity().visitor_id)
      }
      return {
        x: (o.x as number) ?? 0,
        y: (o.y as number) ?? 0,
        w: (o.width as number) ?? 0,
        h: (o.height as number) ?? 0,
        targetRoom,
        targetSpawn: (get('target_spawn') as string) ?? 'default'
      }
    })

    const interactsLayer = map.getObjectLayer('interactables')
    this.interactables = (interactsLayer?.objects ?? []).map((o) => {
      const props = (o.properties ?? []) as Array<{ name: string; value: unknown }>
      const get = (name: string) => props.find((p) => p.name === name)?.value
      const padIndex = get('pad_index')
      return {
        name: (o.name as string) ?? '',
        x: (o.x as number) ?? 0,
        y: (o.y as number) ?? 0,
        w: (o.width as number) ?? 0,
        h: (o.height as number) ?? 0,
        kind: (get('kind') as string) ?? 'unknown',
        anchorX: (get('anchor_x') as number) ?? ((o.x as number) + ((o.width as number) ?? 16) / 2),
        anchorY: (get('anchor_y') as number) ?? ((o.y as number) + ((o.height as number) ?? 16) / 2),
        facing: ((get('facing') as Direction) ?? 'down'),
        padIndex: typeof padIndex === 'number' ? padIndex : undefined
      }
    })

    // V4.3 — render jam pads as colored rectangles
    this.renderJamPads()

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
      const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      escKey.on('down', () => { if (this.placeMode) this.exitPlaceMode() })
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const wx = p.worldX, wy = p.worldY

      // V4.2 — place mode: click floor to place; click own decoration to pick up
      if (this.placeMode) {
        if (this.tryPlaceAt(wx, wy)) return
      }
      if (this.amInMyHome()) {
        if (this.tryPickupHomeDecorationAt(wx, wy)) return
      }

      if (this.myBear) {
        const b = this.myBear
        if (Math.abs(wx - b.x) < 14 && wy > b.y - 50 && wy < b.y) {
          const sX = this.scale.canvasBounds.x + b.x * this.scale.displayScale.x
          const sY = this.scale.canvasBounds.y + (b.y - 30) * this.scale.displayScale.y
          showMenuAt(sX, sY)
          return
        }
      }

      for (const [npcId, entry] of this.npcBears) {
        const b = entry.bear
        if (Math.abs(wx - b.x) < 14 && wy > b.y - 50 && wy < b.y) {
          this.handleNpcClick(npcId)
          return
        }
      }

      for (const [peerSessionId, p2] of this.peers) {
        const b = p2.bear
        if (Math.abs(wx - b.x) < 14 && wy > b.y - 50 && wy < b.y) {
          this.openPeerMenu(peerSessionId, p2.bear)
          return
        }
      }

      if (this.tryCollectPebbleAt(wx, wy)) return

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
        this.peerVisitorIds.clear()
        for (const p of m.peers) {
          if (p.room !== this.currentRoomId) continue
          const bear = new Bear(this, p.x, p.y, ccToRegion(p.cc))
          bear.sprite.setDepth(5)
          bear.setDisplayName(this.fallbackName(p.display_name ?? null, ccToRegion(p.cc)))
          if (p.visitor_id) {
            this.peerVisitorIds.set(p.id, p.visitor_id)
            const fr = this.friendships.get(p.visitor_id)
            if (fr) bear.setFriendshipLevel(fr.level)
          }
          this.peers.set(p.id, { bear, lastUpdate: performance.now() })
        }
      },
      onJoin: (m: JoinMsg) => {
        if (m.room !== this.currentRoomId) return
        if (this.peers.has(m.id)) return
        const bear = new Bear(this, m.x, m.y, ccToRegion(m.cc))
        bear.sprite.setDepth(5)
        bear.setDisplayName(this.fallbackName(m.display_name ?? null, ccToRegion(m.cc)))
        if (m.visitor_id) {
          this.peerVisitorIds.set(m.id, m.visitor_id)
          const fr = this.friendships.get(m.visitor_id)
          if (fr) bear.setFriendshipLevel(fr.level)
        }
        this.peers.set(m.id, { bear, lastUpdate: performance.now() })
      },
      onLeave: (m: LeaveMsg) => {
        const peer = this.peers.get(m.id)
        if (peer) { peer.bear.destroy(); this.peers.delete(m.id) }
        this.peerVisitorIds.delete(m.id)
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
      },
      onCollected: (m: CollectedMsg) => this.applyCollected(m),
      onFriendUpdate: (m: FriendUpdateMsg) => this.applyFriendUpdate(m),
      onGiftSentOk: (m: GiftSentOkMsg) => this.applyGiftSentOk(m),
      onGiftFailed: (m: GiftFailedMsg) => this.applyGiftFailed(m),
      onGiftReceived: (m: GiftReceivedMsg) => this.applyGiftReceived(m),
      onDmSentOk: (m: DmSentOkMsg) => this.applyDmSentOk(m),
      onDmFailed: (m: DmFailedMsg) => this.applyDmFailed(m),
      onDmReceived: (m: DmReceivedMsg) => this.applyDmReceived(m),
      onDmThread: (m: DmThreadMsg) => this.applyDmThread(m),
      onPlaceOk: (m: PlaceOkMsg) => this.applyPlaceOk(m),
      onPlaceFailed: (m: PlaceFailedMsg) => this.applyPlaceFailed(m),
      onPickupOk: (m: PickupOkMsg) => this.applyPickupOk(m),
      onPickupFailed: (m: PickupFailedMsg) => this.applyPickupFailed(m),
      onHomeDecoration: (m: HomeDecorationBroadcast) => this.applyHomeDecorationBroadcast(m),
      onHomeDecorations: (m: HomeDecorationsResponseMsg) => this.applyHomeDecorationsResponse(m),
      onJamTap: (m: JamTapMsg) => this.applyJamTap(m),
      onJamBurst: (m: JamBurstMsg) => this.applyJamBurst(m)
    }, this.currentRoomId)

    setInfoPanelDataProvider(
      () => {
        const friends = Array.from(this.friendships.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(f => ({ display_name: f.display_name, score: f.score, level: f.level }))
        return {
          visitorId: getIdentity().visitor_id,
          displayName: this.myDisplayName,
          region: this.myRegion,
          friends
        }
      },
      () => this.openRenameModal()
    )

    setInventoryDataProvider(
      () => {
        const all = getAllPebbles()
        const giftByItemId = new Map<string, string>()
        for (const g of this.giftsReceived) {
          giftByItemId.set(g.item_id, g.from_name ?? '(anonymous)')
        }
        const placedIds = new Set(this.myHomeDecorations.map(d => d.item_id))
        const items = all.map(p => ({
          id: p.id,
          name: p.name,
          collected: this.inventory.has(p.id),
          giftedByName: giftByItemId.get(p.id) ?? null,
          placedInHome: placedIds.has(p.id)
        }))
        return {
          items,
          total: all.length,
          collected: items.filter(i => i.collected).length,
          canPlace: this.amInMyHome()
        }
      },
      (id, name) => this.enterPlaceMode(id, name)
    )

    setMessagesProvider(
      () => {
        const threads: Array<{ friend_id: string; friend_name: string; unread: number; preview: string }> = []
        // Use friendships as the basis: only friends can DM
        for (const f of this.friendships.values()) {
          const msgs = this.dmThreads.get(f.friend_id) ?? []
          const unread = msgs.filter(m => m.to_visitor === getIdentity().visitor_id && !m.read_at).length
          const last = msgs[0]
          const preview = last ? (last.from_visitor === getIdentity().visitor_id ? `you: ${last.message}` : last.message) : '—'
          threads.push({
            friend_id: f.friend_id,
            friend_name: f.display_name ?? '(anonymous)',
            unread,
            preview
          })
        }
        // Sort: unread first, then by latest message
        threads.sort((a, b) => (b.unread - a.unread) || 0)
        return { threads, unreadTotal: this.unreadDmCount }
      },
      (friend_id) => {
        return (this.dmThreads.get(friend_id) ?? []).map(m => ({
          id: m.id,
          mine: m.from_visitor === getIdentity().visitor_id,
          text: m.message,
          sent_at: m.sent_at,
          read: !!m.read_at
        }))
      },
      (friend_id) => {
        requestDmThread(friend_id)
        // Mark as read locally + server
        const msgs = this.dmThreads.get(friend_id) ?? []
        const myId = getIdentity().visitor_id
        let cleared = 0
        for (const m of msgs) {
          if (m.to_visitor === myId && !m.read_at) {
            m.read_at = new Date().toISOString()
            cleared++
          }
        }
        if (cleared > 0) {
          this.unreadDmCount = Math.max(0, this.unreadDmCount - cleared)
          refreshMessagesBadge(this.unreadDmCount)
          sendDmRead(friend_id)
        }
      },
      (friend_id, text) => {
        sendDm(friend_id, text)
      }
    )

    if (!prefersReducedMotion()) {
      this.cameras.main.fadeIn(200, 0, 0, 0)
    }

    // Drain cached welcome (set by applyWelcome before this scene was restarted)
    if (welcomeCache) {
      const cached = welcomeCache
      welcomeCache = null
      // Re-apply non-spawn parts of welcome on this scene (already-spawned bear etc.)
      this.welcomeApplied = false
      this.applyWelcome(cached)
    }
  }

  private fallbackName(name: string | null, region?: Region): string {
    if (name && name.length > 0) return name
    return `Bear from ${region ?? this.myRegion}`
  }

  private applyWelcome(m: WelcomeMsg) {
    if (this.welcomeApplied) return
    this.welcomeApplied = true

    // Stash welcome data on a module-level cache so the post-restart scene can read it.
    welcomeCache = m

    // If server has a different last_room, transition there (using existing scene.restart pipeline)
    if (m.last_room && m.last_room !== this.currentRoomId && isValidRoom(m.last_room)) {
      const wx = (typeof m.last_x === 'number') ? m.last_x : undefined
      const wy = (typeof m.last_y === 'number') ? m.last_y : undefined
      this.transitioning = true
      stopRoomAudio()
      stopBoothTrack()
      hideNowPlaying()
      hideBoothPicker()
      if (this.atmosphereTimer) { this.atmosphereTimer.remove(false); this.atmosphereTimer = undefined }
      if (this.npcRefreshTimer) { this.npcRefreshTimer.remove(false); this.npcRefreshTimer = undefined }
      this.seasonalEmitter?.destroy(); this.seasonalEmitter = undefined
      this.holidayEmitter?.destroy(); this.holidayEmitter = undefined
      this.seasonOverlay?.destroy(); this.seasonOverlay = undefined
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

    // Inventory
    this.inventory.clear()
    if (Array.isArray(m.inventory)) {
      for (const id of m.inventory) this.inventory.add(id)
    }
    this.refreshPebbles()

    // Friendships
    this.friendships.clear()
    if (Array.isArray(m.friendships)) {
      for (const f of m.friendships) this.friendships.set(f.friend_id, f)
    }
    // Refresh hearts for currently-rendered peers
    this.peers.forEach((entry, sessionId) => {
      const vid = this.peerVisitorIds.get(sessionId)
      if (!vid) return
      const fr = this.friendships.get(vid)
      entry.bear.setFriendshipLevel(fr?.level ?? 0)
    })

    // V4.1 — gifts received + unread DM count
    this.giftsReceived = Array.isArray(m.gifts_received) ? m.gifts_received : []
    this.unreadDmCount = m.unread_dm_count ?? 0
    refreshMessagesBadge(this.unreadDmCount)
    refreshInventoryPanel()

    // V4.2 — homes
    this.myHomeDecorations = Array.isArray(m.my_home_decorations) ? m.my_home_decorations : []
    // If we're currently in our own home, render the decorations
    if (this.amInMyHome()) this.renderHomeDecorations(this.myHomeDecorations)

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

  private async loadAndStartPebbles() {
    await loadPebbles()
    this.refreshPebbles()
  }

  private refreshPebbles() {
    // Destroy existing sprites
    this.pebbleSprites.forEach((s) => s.destroy())
    this.pebbleSprites.clear()
    // Spawn pebbles in current room that are NOT in inventory
    const inRoom = getPebblesInRoom(this.currentRoomId)
    for (const p of inRoom) {
      if (this.inventory.has(p.id)) continue
      ensurePixelTexture(this)
      const sprite = this.add.sprite(p.x, p.y, PIXEL_TEX_KEY)
      sprite.setScale(4)
      sprite.setTint(0xffd166)
      sprite.setDepth(4)
      sprite.setOrigin(0.5, 0.5)
      sprite.setData('pebble_id', p.id)
      // Slow bob tween
      if (!prefersReducedMotion()) {
        this.tweens.add({
          targets: sprite, y: p.y - 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        })
        this.tweens.add({
          targets: sprite, alpha: 0.6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut'
        })
      }
      this.pebbleSprites.set(p.id, sprite)
    }
  }

  private tryCollectPebbleAt(wx: number, wy: number): boolean {
    for (const [id, sprite] of this.pebbleSprites) {
      if (Math.abs(wx - sprite.x) < 12 && Math.abs(wy - sprite.y) < 12) {
        sendCollect(id)
        this.inventory.add(id)
        refreshInventoryPanel()
        const pebble = findPebble(id)
        if (pebble) {
          const screen = {
            x: this.scale.canvasBounds.x + sprite.x * this.scale.displayScale.x,
            y: this.scale.canvasBounds.y + sprite.y * this.scale.displayScale.y
          }
          showBubble('pebble_' + id, '✦ ' + pebble.name, screen.x, screen.y)
        }
        this.tweens.add({
          targets: sprite,
          alpha: 0, scale: 8,
          duration: 350,
          onComplete: () => { sprite.destroy(); this.pebbleSprites.delete(id) }
        })
        return true
      }
    }
    return false
  }

  private applyCollected(m: CollectedMsg) {
    this.inventory.add(m.item_id)
    refreshInventoryPanel()
  }

  private openPeerMenu(peerSessionId: string, peerBear: Bear) {
    const screen = this.bearScreenPos(peerBear)
    showPeerMenu(screen.x, screen.y, (action) => {
      if (action === 'wave') {
        this.walkToAndWave(peerSessionId, peerBear)
      } else if (action === 'gift') {
        this.openGiftFlow(peerSessionId)
      } else if (action === 'dm') {
        this.openDmFlow(peerSessionId)
      }
    })
  }

  private walkToAndWave(peerSessionId: string, peerBear: Bear) {
    if (!this.myBear) return
    const map = { widthInPixels: this.mapInfo.widthPx, heightInPixels: this.mapInfo.heightPx }
    const destX = Math.max(20, Math.min(map.widthInPixels - 20, peerBear.x - 30))
    const destY = Math.max(20, Math.min(map.heightInPixels - 12, peerBear.y))
    this.myBear.walkTo(destX, destY)
    const ddx = destX - this.myBear.x
    const ddy = destY - this.myBear.y
    this.myDirection = Math.abs(ddx) > Math.abs(ddy)
      ? (ddx > 0 ? 'right' : 'left')
      : (ddy > 0 ? 'down' : 'up')
    this.autoWaveOnArrive = true
    this.lastClickedPeerId = peerSessionId
  }

  private openGiftFlow(peerSessionId: string) {
    const friendVisitorId = this.peerVisitorIds.get(peerSessionId)
    if (!friendVisitorId) { showToast('Need friendship first — wave at them.'); return }
    const friend = this.friendships.get(friendVisitorId)
    if (!friend || friend.score === 0) {
      showToast('Wave at them first to become friends.'); return
    }
    const allPebbles = getAllPebbles()
    const entries = allPebbles
      .filter(p => this.inventory.has(p.id))
      .map(p => ({
        item_id: p.id,
        name: p.name,
        alreadySent: this.giftsSentFromMe.has(p.id + '|' + friendVisitorId)
      }))
    const friendName = friend.display_name ?? '(anonymous)'
    showGiftModal(friendName, entries, (item_id) => {
      sendGift(friendVisitorId, item_id)
      this.giftsSentFromMe.add(item_id + '|' + friendVisitorId)
    })
  }

  private openDmFlow(peerSessionId: string) {
    const friendVisitorId = this.peerVisitorIds.get(peerSessionId)
    if (!friendVisitorId) { showToast('Need friendship first — wave at them.'); return }
    const friend = this.friendships.get(friendVisitorId)
    if (!friend || friend.score === 0) {
      showToast('Wave at them first to become friends.'); return
    }
    // Open messages panel + jump to thread for this friend
    // To minimise refactor, we'll just open the messages panel and request that thread
    const btn = document.getElementById('lounge-messages-btn') as HTMLButtonElement | null
    if (btn) btn.click()
    setTimeout(() => {
      const liToFind = Array.from(document.querySelectorAll<HTMLElement>('#lounge-messages-list li'))
        .find(li => li.querySelector('.name')?.textContent === (friend.display_name ?? '(anonymous)'))
      ;(liToFind as HTMLElement | undefined)?.click()
    }, 50)
  }

  private applyGiftSentOk(m: GiftSentOkMsg) {
    const itemName = getAllPebbles().find(p => p.id === m.item_id)?.name ?? m.item_id
    const friend = this.friendships.get(m.to)
    showToast(`🎁 Sent "${itemName}" to ${friend?.display_name ?? '(anonymous)'}`)
  }

  private applyGiftFailed(m: GiftFailedMsg) {
    const map: Record<string, string> = {
      rate_limited: '🎁 Slow down — too many gifts',
      not_friend: '🎁 You need to be friends first',
      duplicate: '🎁 Already sent this one',
      invalid: '🎁 Gift rejected (invalid)',
      db_unavailable: '🎁 Server unavailable',
      db_error: '🎁 Server error',
      exception: '🎁 Server error'
    }
    showToast(map[m.reason] ?? `🎁 Gift failed (${m.reason})`)
  }

  private applyGiftReceived(m: GiftReceivedMsg) {
    this.giftsReceived.unshift({
      id: 0, from_visitor: m.from, from_name: m.from_name, item_id: m.item_id, sent_at: m.sent_at
    })
    this.inventory.add(m.item_id)
    refreshInventoryPanel()
    const itemName = getAllPebbles().find(p => p.id === m.item_id)?.name ?? m.item_id
    showToast(`🎁 ${m.from_name ?? '(anonymous)'} gifted you "${itemName}"`)
  }

  private applyDmSentOk(m: DmSentOkMsg) {
    const thread = this.dmThreads.get(m.to) ?? []
    thread.unshift({
      id: m.id, from_visitor: getIdentity().visitor_id, to_visitor: m.to,
      message: m.text, sent_at: m.sent_at, read_at: null
    })
    this.dmThreads.set(m.to, thread)
    if (getCurrentThreadFriendId() === m.to) renderThreadView()
  }

  private applyDmFailed(m: DmFailedMsg) {
    const map: Record<string, string> = {
      rate_limited: '✉ Slow down — too many messages',
      not_friend: '✉ Friends only',
      length: '✉ 1-140 chars',
      blocked: '✉ Message blocked',
      invalid: '✉ Invalid message'
    }
    showToast(map[m.reason] ?? `✉ DM failed (${m.reason})`)
  }

  private applyDmReceived(m: DmReceivedMsg) {
    const thread = this.dmThreads.get(m.from) ?? []
    thread.unshift({
      id: m.id, from_visitor: m.from, to_visitor: getIdentity().visitor_id,
      message: m.text, sent_at: m.sent_at, read_at: null
    })
    this.dmThreads.set(m.from, thread)
    // Mark as read if user is currently viewing this thread
    if (getCurrentThreadFriendId() === m.from) {
      thread[0].read_at = new Date().toISOString()
      sendDmRead(m.from)
      renderThreadView()
    } else {
      this.unreadDmCount += 1
      refreshMessagesBadge(this.unreadDmCount)
      showToast(`✉ ${m.from_name ?? '(anonymous)'}: ${m.text.slice(0, 40)}${m.text.length > 40 ? '…' : ''}`)
    }
  }

  private applyDmThread(m: DmThreadMsg) {
    this.dmThreads.set(m.other, m.messages)
    if (getCurrentThreadFriendId() === m.other) renderThreadView()
  }

  private applyFriendUpdate(m: FriendUpdateMsg) {
    const existing = this.friendships.get(m.friend_id)
    const display_name = existing?.display_name ?? null
    this.friendships.set(m.friend_id, {
      friend_id: m.friend_id, display_name, score: m.score, level: m.level
    })
    // Update heart on any currently-rendered peer whose visitor_id matches
    this.peerVisitorIds.forEach((vid, sessionId) => {
      if (vid !== m.friend_id) return
      const peer = this.peers.get(sessionId)
      peer?.bear.setFriendshipLevel(m.level)
    })
  }

  // V4.3 — Jam Pads

  private static readonly JAM_COLORS: Record<number, number> = {
    1: 0xff5050,  // C — red
    2: 0xffd166,  // E — yellow
    3: 0x4ade80,  // G — green
    4: 0x60a5fa   // B — blue
  }

  private renderJamPads() {
    this.jamPads.forEach(r => r.destroy())
    this.jamPads.clear()
    for (const it of this.interactables) {
      if (it.kind !== 'jam' || typeof it.padIndex !== 'number') continue
      const color = RoomScene.JAM_COLORS[it.padIndex] ?? 0xffffff
      const rect = this.add.rectangle(it.x + it.w / 2, it.y + it.h / 2, it.w - 2, it.h - 2, color, 0.35)
        .setStrokeStyle(1, color, 0.8)
        .setDepth(4)
      this.jamPads.set(it.padIndex, rect)
    }
  }

  private tapJamPad(padIndex: number, it: Interactable) {
    sendJamTap(padIndex)
    // Optimistic local feedback (server will echo + we'll flash on echo too)
    this.flashJamPad(padIndex, RoomScene.JAM_COLORS[padIndex])
    this.playJamNote(padIndex)
    // Walk own bear over to it for visual cohesion
    if (this.myBear) {
      this.myBear.walkTo(it.anchorX, it.anchorY)
      this.myDirection = it.facing
    }
  }

  private flashJamPad(padIndex: number, color: number) {
    const rect = this.jamPads.get(padIndex)
    if (!rect) return
    rect.setFillStyle(color, 0.9)
    rect.setScale(1.4)
    this.tweens.add({
      targets: rect, scale: 1, duration: 350, ease: 'Cubic.out',
      onComplete: () => rect.setFillStyle(color, 0.35)
    })
  }

  private playJamNote(padIndex: number) {
    const key = `jam_pad${padIndex}`
    if (!this.cache.audio.exists(key)) return
    try { this.sound.play(key, { volume: 0.7 }) } catch {}
  }

  private applyJamTap(m: JamTapMsg) {
    // Don't double-play our own (we already flashed optimistically)
    if (m.visitor_id && m.visitor_id === getIdentity().visitor_id) return
    this.flashJamPad(m.pad_index, RoomScene.JAM_COLORS[m.pad_index] ?? 0xffffff)
    this.playJamNote(m.pad_index)
  }

  private applyJamBurst(m: JamBurstMsg) {
    const labels: Record<string, string> = {
      jam: `🎵 Jam! (${m.distinct_visitors} visitors, +${m.bonus_per_pair} each)`,
      circle: `✨ Jam Circle! (${m.distinct_visitors} visitors, +${m.bonus_per_pair} each)`,
      full: `🎵 Full Jam! all 4 pads, +${m.bonus_per_pair} each`
    }
    showToast(labels[m.tier] ?? '🎵 Jam!', m.tier === 'full' ? 3500 : 2500)

    // Bigger celebration for full jam: brief sparkle burst
    if (m.tier === 'full' && !prefersReducedMotion()) {
      ensurePixelTexture(this)
      const burst = this.add.particles(this.mapInfo.widthPx / 2, this.mapInfo.heightPx / 2, PIXEL_TEX_KEY, {
        speed: { min: 60, max: 200 },
        lifespan: 1200,
        quantity: 30,
        scale: { start: 3, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xff5050, 0xffd166, 0x4ade80, 0x60a5fa]
      })
      burst.setDepth(900)
      burst.explode(30)
      this.time.delayedCall(1500, () => burst.destroy())
    }
  }

  // V4.2 — Home decorations

  private amInMyHome(): boolean {
    return this.currentRoomId === homeRoomForVisitor(getIdentity().visitor_id)
  }

  private renderHomeDecorations(decorations: HomeDecoration[]) {
    this.homeDecorationSprites.forEach(s => s.destroy())
    this.homeDecorationSprites.clear()
    ensurePixelTexture(this)
    for (const d of decorations) {
      const sprite = this.add.sprite(d.x, d.y, PIXEL_TEX_KEY)
      sprite.setScale(5)
      sprite.setTint(0xffd166)
      sprite.setDepth(4)
      sprite.setOrigin(0.5, 0.5)
      sprite.setAlpha(0.92)
      sprite.setData('item_id', d.item_id)
      this.homeDecorationSprites.set(d.item_id, sprite)
    }
  }

  enterPlaceMode(item_id: string, name: string) {
    this.placeMode = { item_id, name }
    if (!this.placeModeIndicator) {
      this.placeModeIndicator = this.add.text(this.cameras.main.width / 2, 20, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '10px',
        color: '#ffd166',
        backgroundColor: '#000000c0',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      }).setOrigin(0.5, 0).setDepth(2000).setScrollFactor(0)
    }
    this.placeModeIndicator.setText(`Click floor to place "${name}" — Esc to cancel`)
    this.placeModeIndicator.setVisible(true)
  }

  exitPlaceMode() {
    this.placeMode = null
    this.placeModeIndicator?.setVisible(false)
  }

  private tryPlaceAt(wx: number, wy: number): boolean {
    if (!this.placeMode || !this.amInMyHome()) return false
    // Don't place on top of an existing decoration
    for (const [, s] of this.homeDecorationSprites) {
      if (Math.abs(wx - s.x) < 12 && Math.abs(wy - s.y) < 12) return false
    }
    sendPlace(this.placeMode.item_id, wx, wy)
    // optimistic — wait for server confirm to actually render
    showToast(`📦 Placing "${this.placeMode.name}"…`)
    return true
  }

  private tryPickupHomeDecorationAt(wx: number, wy: number): boolean {
    if (!this.amInMyHome()) return false
    for (const [id, s] of this.homeDecorationSprites) {
      if (Math.abs(wx - s.x) < 14 && Math.abs(wy - s.y) < 14) {
        sendPickup(id)
        showToast(`📦 Picking up…`)
        return true
      }
    }
    return false
  }

  private applyPlaceOk(m: PlaceOkMsg) {
    this.myHomeDecorations.push({ item_id: m.item_id, x: m.x, y: m.y })
    // Render the new sprite
    ensurePixelTexture(this)
    const sprite = this.add.sprite(m.x, m.y, PIXEL_TEX_KEY)
    sprite.setScale(5).setTint(0xffd166).setDepth(4).setOrigin(0.5, 0.5).setAlpha(0.92)
    sprite.setData('item_id', m.item_id)
    this.homeDecorationSprites.set(m.item_id, sprite)
    this.exitPlaceMode()
    showToast(`📦 Placed.`)
  }

  private applyPlaceFailed(m: PlaceFailedMsg) {
    const map: Record<string, string> = {
      not_in_home: '📦 Must be in your home',
      not_owned: '📦 You don\'t own this pebble',
      cap: '📦 Home decoration cap (30) reached',
      invalid: '📦 Invalid placement'
    }
    showToast(map[m.reason] ?? `📦 Place failed (${m.reason})`)
    this.exitPlaceMode()
  }

  private applyPickupOk(m: PickupOkMsg) {
    this.myHomeDecorations = this.myHomeDecorations.filter(d => d.item_id !== m.item_id)
    const s = this.homeDecorationSprites.get(m.item_id)
    if (s) {
      this.tweens.add({
        targets: s, alpha: 0, scale: 8, duration: 250,
        onComplete: () => { s.destroy(); this.homeDecorationSprites.delete(m.item_id) }
      })
    }
    showToast(`📦 Picked up.`)
  }

  private applyPickupFailed(m: PickupFailedMsg) {
    showToast(`📦 Pickup failed (${m.reason})`)
  }

  private applyHomeDecorationBroadcast(m: HomeDecorationBroadcast) {
    if (m.action === 'place' && typeof m.x === 'number' && typeof m.y === 'number') {
      ensurePixelTexture(this)
      const sprite = this.add.sprite(m.x, m.y, PIXEL_TEX_KEY)
      sprite.setScale(5).setTint(0xffd166).setDepth(4).setOrigin(0.5, 0.5).setAlpha(0.92)
      sprite.setData('item_id', m.item_id)
      this.homeDecorationSprites.set(m.item_id, sprite)
    } else if (m.action === 'pickup') {
      const s = this.homeDecorationSprites.get(m.item_id)
      if (s) { s.destroy(); this.homeDecorationSprites.delete(m.item_id) }
    }
  }

  private applyHomeDecorationsResponse(m: HomeDecorationsResponseMsg) {
    // Only render if we're currently in this owner's home
    const ownerHome = 'room_home_' + m.owner_visitor_id.slice(0, 8)
    if (this.currentRoomId === ownerHome) {
      this.renderHomeDecorations(m.decorations)
    }
  }

  private async loadAndStartSeasons(widthPx: number, heightPx: number) {
    await loadSeasons()
    this.applySeasonalAtmosphere(widthPx, heightPx)
  }

  private applySeasonalAtmosphere(widthPx: number, heightPx: number) {
    if (prefersReducedMotion()) return
    const season = getCurrentSeason()
    const holiday = getCurrentHoliday()

    // Holiday tint overrides season tint
    const tintSource = holiday ?? season
    if (tintSource) {
      this.seasonOverlay = this.add.rectangle(0, 0, widthPx, heightPx, hexToInt(tintSource.tint), tintSource.alpha)
        .setOrigin(0)
        .setDepth(999)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
    }

    // Stack particles: season first, holiday on top
    if (season) {
      this.seasonalEmitter = this.spawnSeasonalParticles(season.particle, season.id, widthPx, heightPx)
    }
    if (holiday) {
      this.holidayEmitter = this.spawnSeasonalParticles(holiday.particle, holiday.id, widthPx, heightPx)
    }
  }

  private spawnSeasonalParticles(kind: string, _label: string, widthPx: number, heightPx: number)
    : Phaser.GameObjects.Particles.ParticleEmitter | undefined {
    // Spawn config per known kind. Returns the emitter (or undefined if unknown).
    let config: { tint: number; speedY: { min: number; max: number }; speedX: { min: number; max: number };
                  lifespan: number; alpha: { start: number; end: number }; scale: number;
                  frequency: number; maxAlive: number; spawnZoneY?: number } | null = null

    switch (kind) {
      case 'petals':
        config = { tint: 0xffb0d0, speedY: { min: 4, max: 12 }, speedX: { min: -8, max: 8 },
                   lifespan: 9000, alpha: { start: 0.6, end: 0 }, scale: 1.5,
                   frequency: 800, maxAlive: 12 }
        break
      case 'sunlight':
        config = { tint: 0xfff0a0, speedY: { min: -1, max: 3 }, speedX: { min: -3, max: 3 },
                   lifespan: 6000, alpha: { start: 0.3, end: 0 }, scale: 1,
                   frequency: 1200, maxAlive: 8 }
        break
      case 'leaves':
        config = { tint: 0xd06030, speedY: { min: 5, max: 14 }, speedX: { min: -10, max: 10 },
                   lifespan: 8000, alpha: { start: 0.6, end: 0 }, scale: 2,
                   frequency: 1000, maxAlive: 8 }
        break
      case 'snow':
        config = { tint: 0xffffff, speedY: { min: 6, max: 14 }, speedX: { min: -5, max: 5 },
                   lifespan: 10000, alpha: { start: 0.8, end: 0 }, scale: 1.5,
                   frequency: 500, maxAlive: 20 }
        break
      case 'lanterns':
        config = { tint: 0xff4040, speedY: { min: -8, max: -3 }, speedX: { min: -3, max: 3 },
                   lifespan: 8000, alpha: { start: 0.7, end: 0 }, scale: 2.5,
                   frequency: 900, maxAlive: 10 }
        break
      case 'snowflakes':
        config = { tint: 0xe0f0ff, speedY: { min: 4, max: 10 }, speedX: { min: -8, max: 8 },
                   lifespan: 9000, alpha: { start: 0.85, end: 0 }, scale: 2,
                   frequency: 600, maxAlive: 14 }
        break
      default:
        return undefined
    }

    // Rising particles (negative speedY) spawn at the bottom; falling at the top.
    const rising = config.speedY.max < 0
    const spawnY = rising ? heightPx - 10 : 0
    const e = this.add.particles(widthPx / 2, spawnY, PIXEL_TEX_KEY, {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-widthPx / 2, 0, widthPx, 10), quantity: 1 } as any,
      frequency: config.frequency,
      lifespan: config.lifespan,
      quantity: 1,
      maxAliveParticles: config.maxAlive,
      speedX: config.speedX,
      speedY: config.speedY,
      alpha: config.alpha,
      scale: config.scale,
      tint: config.tint
    })
    e.setDepth(500)
    return e
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

  private async loadAndStartNpcs() {
    this.npcManifest = await loadNpcManifest()
    this.refreshNpcs()
    this.npcRefreshTimer = this.time.addEvent({
      delay: NPC_REFRESH_MS,
      loop: true,
      callback: () => this.refreshNpcs()
    })
  }

  private refreshNpcs() {
    if (!this.npcManifest) return
    const now = new Date()
    const active = new Map<string, { def: NpcDef; bracket: { x: number; y: number; state: string; room: string } }>()
    for (const def of this.npcManifest.npcs) {
      const b = getActiveBracket(def, now)
      if (b && b.room === this.currentRoomId) {
        active.set(def.id, { def, bracket: b })
      }
    }
    // Despawn anyone not active here anymore
    for (const id of Array.from(this.npcBears.keys())) {
      if (!active.has(id)) this.despawnNpc(id)
    }
    // Spawn newly-active NPCs
    for (const [id, { def, bracket }] of active) {
      if (!this.npcBears.has(id)) this.spawnNpc(def, bracket as any)
    }
  }

  private spawnNpc(def: NpcDef, b: { x: number; y: number; state: string }) {
    const bear = new Bear(this, b.x, b.y, def.region)
    bear.sprite.setDepth(4)
    bear.sprite.setAlpha(0.95)
    bear.facing = def.facing
    bear.setDisplayName(def.name, { color: NPC_LABEL_COLOR, prefix: NPC_LABEL_PREFIX })
    if (b.state === 'sit') {
      bear.applyEmote('sit', 0, prefersReducedMotion())
    } else if (b.state === 'dance') {
      bear.applyEmote('dance', 365 * 24 * 3600 * 1000, prefersReducedMotion())
    } else {
      bear.playIdle()
    }
    this.npcBears.set(def.id, { bear, def })
  }

  private despawnNpc(id: string) {
    const entry = this.npcBears.get(id)
    if (!entry) return
    entry.bear.destroy()
    this.npcBears.delete(id)
  }

  private handleNpcClick(id: string) {
    const entry = this.npcBears.get(id)
    if (!entry) return
    const line = pickDialog(entry.def, this.npcDialogMemory)
    const screen = this.bearScreenPos(entry.bear)
    showBubble('npc_' + id, line, screen.x, screen.y)
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
    if (it.kind === 'listen') {
      this.activeBoothInteractable = it
      this.openBoothPicker()
      return
    }
    if (it.kind === 'jam' && typeof it.padIndex === 'number') {
      this.tapJamPad(it.padIndex, it)
      return
    }
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

  private openBoothPicker() {
    if (!this.boothTracks || this.boothTracks.length === 0) return
    showBoothPicker(
      this.boothTracks.map(t => ({ id: t.id, name: t.name })),
      this.currentBoothTrackId,
      (id) => {
        const t = this.boothTracks.find(x => x.id === id)
        if (!t) return
        playBoothTrack(this, t)
        this.currentBoothTrackId = id
        const name = getCurrentTrackName()
        if (name) showNowPlaying(name)
      },
      () => {
        stopBoothTrack()
        this.currentBoothTrackId = null
        hideNowPlaying()
      }
    )
  }

  private monitorBoothDistance() {
    if (!this.currentBoothTrackId || !this.activeBoothInteractable || !this.myBear) return
    const it = this.activeBoothInteractable
    const cx = it.x + it.w / 2
    const cy = it.y + it.h / 2
    const d = Math.hypot(this.myBear.x - cx, this.myBear.y - cy)
    if (d > 80) {
      stopBoothTrack()
      this.currentBoothTrackId = null
      hideNowPlaying()
      hideBoothPicker()
      this.activeBoothInteractable = null
    }
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
          stopBoothTrack()
          hideNowPlaying()
          hideBoothPicker()
          if (this.atmosphereTimer) { this.atmosphereTimer.remove(false); this.atmosphereTimer = undefined }
          if (this.npcRefreshTimer) { this.npcRefreshTimer.remove(false); this.npcRefreshTimer = undefined }
          this.seasonalEmitter?.destroy(); this.seasonalEmitter = undefined
          this.holidayEmitter?.destroy(); this.holidayEmitter = undefined
          this.seasonOverlay?.destroy(); this.seasonOverlay = undefined
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
        const target = this.lastClickedPeerId ?? undefined
        this.lastClickedPeerId = null
        sendAct('wave', undefined, this.currentRoomId, target)
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
      this.monitorBoothDistance()
    }
    this.peers.forEach((p) => p.bear.update(dtMs, true))
    this.npcBears.forEach((entry) => entry.bear.update(dtMs, true))
    if (this.myBear) {
      const s = this.bearScreenPos(this.myBear)
      updateBubblePos('__me__', s.x, s.y)
    }
    this.peers.forEach((p, id) => {
      const s = this.bearScreenPos(p.bear)
      updateBubblePos(id, s.x, s.y)
    })
    this.npcBears.forEach((entry, id) => {
      const s = this.bearScreenPos(entry.bear)
      updateBubblePos('npc_' + id, s.x, s.y)
    })
  }
}
