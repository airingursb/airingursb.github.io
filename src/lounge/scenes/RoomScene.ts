import Phaser from 'phaser'
import { Bear, registerBearAnimations } from '../bear'
import { connect, sendPos, sendAct, sendRoomChange, sendName, sendCollect, sendGift, sendDm, requestDmThread, sendDmRead, sendPlace, sendPickup, requestHomeDecorations, sendJamTap, sendLetterDrop, requestLettersInRoom, requestWishes, sendWishSubmit, sendWishVote, type ActMsg, type SnapMsg, type JoinMsg, type LeaveMsg, type PosMsg, type WelcomeMsg, type NameChangedMsg, type CollectedMsg, type FriendUpdateMsg, type FriendshipEntry, type GiftEntry, type GiftReceivedMsg, type GiftSentOkMsg, type GiftFailedMsg, type DmReceivedMsg, type DmSentOkMsg, type DmFailedMsg, type DmThreadMsg, type DmEntry, type HomeDecoration, type PlaceOkMsg, type PlaceFailedMsg, type PickupOkMsg, type PickupFailedMsg, type HomeDecorationBroadcast, type HomeDecorationsResponseMsg, type JamTapMsg, type JamBurstMsg, type LetterEntry, type LetterDropOkMsg, type LetterDropFailedMsg, type LetterAppearedMsg, type LettersInRoomMsg, type WishesListMsg, type WishSubmitOkMsg, type WishVoteOkMsg, type WishFailedMsg } from '../net'
import { loadPebbles, getPebblesInRoom, findPebble, getAllPebbles, type Pebble } from '../pebbles'
import { loadSeasons, getCurrentSeason, getCurrentHoliday, hexToInt } from '../seasons'
import { renderMinimap, showDoorLabel, hideDoorLabel, MAP_ROOMS } from '../minimap'
import { REGIONS, WALK_SPEED, ccToRegion, ccToFlag, ccToCountryName, prefersReducedMotion, isValidRoom, DEFAULT_ROOM, isHomeRoom, homeRoomFor as homeRoomForVisitor, getMySpecies, type Region, type RoomId, type Species } from '../config'
import { preloadAudio, bindAudio, preloadRoomAudio, playRoomBgm, playRoomAmbient, stopRoomAudio } from '../audio'
import { onUIEvent, showMenuAt, showBubble, updateBubblePos, showInteractPrompt, hideInteractPrompt, updateInteractPromptPos, showNameModal, setInfoPanelDataProvider, showReplacedOverlay, showBoothPicker, hideBoothPicker, showNowPlaying, hideNowPlaying, setInventoryDataProvider, refreshInventoryPanel, showPeerMenu, showGiftModal, showToast, setMessagesProvider, refreshMessagesBadge, renderThreadView, getCurrentThreadFriendId, showLetterModal, showLetterRead, setupWishboard, renderWishboard, setOnSpeciesToggle, updateSpeciesButtonLabel } from '../ui'
import { getBoothTracks, preloadBoothTracks, playBoothTrack, stopBoothTrack, getCurrentTrackName, type BoothTrack } from '../booth'
import { getEmote } from '../emotes'
import { getOverlayAt } from '../atmosphere'
import { getWeatherForDate } from '../weather'
import { footstepDust, clickRipple, pebbleSparkle, sitImpact, waveArc, letterFlutter } from '../feedback'
import { getIdentity, setLocalDisplayName, isFirstVisit, markNameChoicePrompted } from '../identity'
import { loadNpcManifest, getActiveBracket, pickDialog, buildDialogContext, type NpcDef, type NpcManifest } from '../npcs'
import { getActiveFestivalId, getActiveFestival, hasCompletedTodaysActivity, markActivityDone, rollActivity } from '../festivals'
import { QUESTS, acceptQuest, getQuestState, onPebbleCollected as onPebbleCollectedQuest, onRoomVisited as onRoomVisitedQuest, onWaveAt as onWaveAtQuest } from '../quests'
import { findCutsceneForRoom, markFired, type CutsceneStep, type CutsceneDef } from '../cutscenes'
import { getEnergy, consumeEnergy, restoreEnergy, COST as ENERGY_COST } from '../energy'
import { getEquippedTool, captureMemory } from '../memories'
import { awardShells, claimDailyVisitBonus, SHELL_REWARD, hasPurchased } from '../shells'
import { awardXp, onLevelUp, walkSpeedMultiplier, bonusInventorySlots, SKILLS, type SkillId } from '../skills'
import { getActiveSpots, markPicked, addMaterial, removeMaterial as removeMaterialFn, getMaterial, MATERIALS, type MaterialId, type Spot as ResourceSpot } from '../resources'
import { activityForRoom, hasCompletedToday as hasCoopDoneToday, awardActivity as awardCoopActivity } from '../coop'
import { shouldPromptSleep, markSleepPrompted, performSleep } from '../sleep'
import { showSleepOverlay, refreshMailboxBadge, setProgressDataProvider, setWhosAroundProvider, type WhosAroundEntry, showSpeciesPicker, setCraftEnvProvider, setBundleAutoProvider } from '../ui'
import { formatGameTime, getGameNow } from '../gametime'
import { seedMailForToday, unreadCount as mailUnread } from '../mailbox'

const NPC_LABEL_COLOR = '#ffd166'
const NPC_LABEL_PREFIX = '✦ '
const NPC_REFRESH_MS = 10_000

const ROOM_AUDIO: Record<string, { bgmKey: string; bgmPath: string; ambKey: string; ambPath: string }> = {
  room_lobby:    { bgmKey: 'bgm_lobby_day',      bgmPath: '/lounge/assets/audio/bgm/lobby_day.ogg',
                   ambKey: 'amb_cafe_chatter',   ambPath: '/lounge/assets/audio/ambient/cafe_chatter.ogg' },
  room_dj_floor: { bgmKey: 'bgm_dj_floor_party', bgmPath: '/lounge/assets/audio/bgm/dj_floor_party.ogg',
                   ambKey: 'amb_beat_thump',     ambPath: '/lounge/assets/audio/ambient/beat_thump.ogg' },
  room_balcony:  { bgmKey: 'bgm_balcony_outside',bgmPath: '/lounge/assets/audio/bgm/balcony_outside.ogg',
                   ambKey: 'amb_wind',           ambPath: '/lounge/assets/audio/ambient/wind.ogg' },
  room_library:  { bgmKey: 'bgm_library_quiet',  bgmPath: '/lounge/assets/audio/bgm/library_quiet.ogg',
                   ambKey: 'amb_pages_turning',  ambPath: '/lounge/assets/audio/ambient/pages_turning.ogg' },
  room_beach:    { bgmKey: 'bgm_beach_calm',     bgmPath: '/lounge/assets/audio/bgm/beach_calm.ogg',
                   ambKey: 'amb_waves',          ambPath: '/lounge/assets/audio/ambient/waves.ogg' }
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
  private cutsceneFadeRect?: Phaser.GameObjects.Rectangle  // V7.7
  private energyDrainBucket = 0
  private energyRestoreBucket = 0
  private lastSpeciesToggleAt?: number   // P7-review I7
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
  private peerCCs = new Map<string, string | null>()      // session id → country code (for flag display)
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
  // V5.1 — letters
  private letters = new Map<number, LetterEntry>()
  private letterSprites = new Map<number, Phaser.GameObjects.Text>()

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
    this.load.tilemapTiledJSON('room_beach',    '/lounge/assets/rooms/beach.tmj')
    this.load.tilemapTiledJSON('room_grove',    '/lounge/assets/rooms/grove.tmj')
    this.load.tilemapTiledJSON('room_kitchen',  '/lounge/assets/rooms/kitchen.tmj')
    this.load.tilemapTiledJSON('room_workshop', '/lounge/assets/rooms/workshop.tmj')
    this.load.tilemapTiledJSON('room_rooftop',  '/lounge/assets/rooms/rooftop.tmj')
    this.load.tilemapTiledJSON('room_bedroom_mio',   '/lounge/assets/rooms/bedroom_mio.tmj')
    this.load.tilemapTiledJSON('room_bedroom_halle', '/lounge/assets/rooms/bedroom_halle.tmj')
    this.load.tilemapTiledJSON('room_bedroom_sora',  '/lounge/assets/rooms/bedroom_sora.tmj')
    this.load.tilemapTiledJSON('room_bedroom_theo',  '/lounge/assets/rooms/bedroom_theo.tmj')
    this.load.image('indoor_lobby_v0', '/lounge/assets/tilesets/indoor_lobby_v0/tiles.png')
    this.load.image('indoor_lobby_v1', '/lounge/assets/tilesets/indoor_lobby_v1/tiles.png')
    this.load.image('outdoor_beach_v0', '/lounge/assets/tilesets/outdoor_beach_v0/tiles.png')
    this.load.image('outdoor_grove_v1', '/lounge/assets/tilesets/outdoor_grove_v1/tiles.png')
    // E5-P1a + N1 — preload only bear (universal fallback) + the local
    // player's chosen species. Other species lazy-load when a peer with
    // that species joins (see ensureSpeciesLoaded).
    const mine = getMySpecies()
    const speciesToPreload = new Set<string>(['bear', mine])
    for (const region of REGIONS) {
      for (const sp of speciesToPreload) {
        this.load.atlas(
          `${sp}_${region}`,
          `/lounge/assets/sprites/${sp}/${region}/sprite.png`,
          `/lounge/assets/sprites/${sp}/${region}/sprite.json`
        )
      }
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
    // Tilemap may reference any of these tilesets. Phaser uses whichever name matches
    // the map's tileset entry; others return null and are ignored.
    const tileset = (
      map.addTilesetImage('indoor_lobby_v1', 'indoor_lobby_v1') ??
      map.addTilesetImage('outdoor_grove_v1', 'outdoor_grove_v1') ??
      map.addTilesetImage('outdoor_beach_v0', 'outdoor_beach_v0') ??
      map.addTilesetImage('indoor_lobby_v0', 'indoor_lobby_v0')
    )!

    const floorLayer = map.createLayer('floor', tileset, 0, 0)
    const fb = map.createLayer('furniture_below', tileset, 0, 0)
    const above = map.createLayer('furniture_above', tileset, 0, 0)
    above?.setDepth(10)

    // E5-P1b + N5 — Tile-index animations. Gated by tileset (avoids corrupting
    // indoor rooms). Per layer, pre-scan to find which animated frame indices
    // actually exist — skip replaceByIndex on layers that have none. For a
    // 30×20 map × 3 layers × 4 anims, this can cut 15k+ tile scans/sec down
    // to near zero on rooms that only use a few of the animated tiles.
    //
    // Caveat (intentional): the layerHasIt cache is built ONCE here. If any
    // future code dynamically writes an animated frame id into a layer that
    // didn't have one at boot, that layer won't be picked up. We don't mutate
    // tilemaps post-boot today; revisit if that changes.
    if (tileset?.name === 'outdoor_grove_v1') {
      const ANIMS: Array<{ frames: number[]; ms: number; layerHasIt: boolean[] }> = [
        { frames: [8, 41, 45], ms: 480,  layerHasIt: [] },
        { frames: [26, 42],    ms: 1200, layerHasIt: [] },
        { frames: [28, 43],    ms: 1300, layerHasIt: [] },
        { frames: [40, 44],    ms: 1100, layerHasIt: [] }
      ]
      const animLayers = [floorLayer, fb, above].filter(Boolean) as Phaser.Tilemaps.TilemapLayer[]
      // Pre-scan: per (anim, layer) → does any cell currently hold a frame in this anim's set?
      for (const a of ANIMS) {
        const frameSet = new Set(a.frames)
        for (let li = 0; li < animLayers.length; li++) {
          const grid = animLayers[li].layer.data
          let found = false
          outer: for (let y = 0; y < grid.length; y++) {
            const row = grid[y]
            for (let x = 0; x < row.length; x++) {
              if (frameSet.has(row[x]?.index)) { found = true; break outer }
            }
          }
          a.layerHasIt.push(found)
        }
      }
      for (const a of ANIMS) {
        if (!a.layerHasIt.some(Boolean)) continue   // skip entire anim if no layer has it
        let phase = 0
        this.time.addEvent({
          delay: a.ms, loop: true,
          callback: () => {
            phase = (phase + 1) % a.frames.length
            const from = a.frames[(phase + a.frames.length - 1) % a.frames.length]
            const to   = a.frames[phase]
            if (from === to) return
            for (let li = 0; li < animLayers.length; li++) {
              if (!a.layerHasIt[li]) continue   // skip layers known to lack this anim
              animLayers[li].replaceByIndex(from, to)
            }
          }
        })
      }
    }

    // V6.3 — at night (18:00-06:00), draw soft warm glow on light-source tiles.
    // Tile IDs (indoor_lobby_v1):
    //   14 = wall sconce, 21 = hanging lantern, 22 = floor lamp,
    //   23 = fireplace logs, 38 = strobe panel, 39 = neon DJ
    this.addNightGlow(map, [fb, above].filter(Boolean) as Phaser.Tilemaps.TilemapLayer[])

    registerBearAnimations(this, REGIONS)
    bindAudio(this)

    const ra = ROOM_AUDIO[this.currentRoomId]
    if (ra) {
      playRoomBgm(this, ra.bgmKey)
      playRoomAmbient(this, ra.ambKey)
    }

    ensurePixelTexture(this)
    this.setupParallaxBackground(map.widthInPixels, map.heightInPixels)
    this.setupAtmosphere(map.widthInPixels, map.heightInPixels)
    this.setupParticles(map.widthInPixels, map.heightInPixels)
    this.setupWeather(map.widthInPixels, map.heightInPixels)
    this.setupFestival(map.widthInPixels, map.heightInPixels)
    this.setupCoopActivity()
    this.loadAndStartNpcs()
    this.loadAndStartPebbles()
    this.spawnResourceSpots()
    this.loadAndStartSeasons(map.widthInPixels, map.heightInPixels)
    // Request letters for this room (after WS welcome + snap arrive)
    this.time.delayedCall(800, () => requestLettersInRoom(this.currentRoomId))

    // V9.0 — level-up toast (registered once per scene boot)
    onLevelUp((skill, level) => {
      const meta = SKILLS.find(s => s.id === skill)
      const name = meta?.name ?? skill
      const emoji = meta?.emoji ?? '✨'
      showToast(`${emoji} ${name} lv ${level}!`, 3500)
    })
    // V6.0 — Minimap (initial render; refresh every 30s for NPC schedule drift)
    this.refreshMinimap()
    this.time.addEvent({ delay: 30_000, loop: true, callback: () => this.refreshMinimap() })
    // V8.5 — poll every 20s for "should we trigger today's sleep prompt"
    this.time.addEvent({ delay: 20_000, loop: true, callback: () => this.checkSleepPrompt() })

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
    this.myBear = new Bear(this, spawnX, spawnY, this.myRegion, getMySpecies())
    // V6.7 — camera follows player smoothly. No-op for rooms that match canvas (currently all);
    // useful as future rooms grow larger than 480×320.
    this.cameras.main.startFollow(this.myBear.sprite, true, 0.08, 0.08)
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

      // V6.6 — every click gets a small ring ripple for tactile feedback
      clickRipple(this, wx, wy)

      // V8.3 — camera equipped → capture a memory at the click point
      if (getEquippedTool() === 'camera') {
        this.captureMomentHere(wx, wy)
        return
      }

      // V5.1 — letter has highest priority (small clickable icon)
      if (this.tryReadLetterAt(wx, wy)) return

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
        // V5.1 — 'letter' opens drop modal (doesn't go through sendAct)
        if (e.verb === 'letter') {
          if (!this.myBear) return
          const dropX = this.myBear.x
          const dropY = this.myBear.y
          letterFlutter(this, dropX, dropY)
          showLetterModal((content) => {
            if (content) sendLetterDrop(content, dropX, dropY)
          })
          return
        }
        sendAct(e.verb, e.text, this.currentRoomId)
        this.applyAct(undefined, e.verb, e.text)
        // V6.6 — local feedback for the player's own actions
        if (this.myBear) {
          if (e.verb === 'wave')      waveArc(this, this.myBear.x, this.myBear.y)
          else if (e.verb === 'sit')  sitImpact(this, this.myBear.x, this.myBear.y)
        }
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
        this.peerCCs.clear()
        for (const p of m.peers) {
          if (p.room !== this.currentRoomId) continue
          // E5-P0c — render peer with their actual species (default bear)
          const species = (p.species as any) || 'bear'
          // N1 — Bear ctor falls back to bear texture if species atlas missing
          const bear = new Bear(this, p.x, p.y, ccToRegion(p.cc), species)
          bear.sprite.setDepth(5)
          bear.setDisplayName(this.fallbackName(p.display_name ?? null, p.cc))
          this.peerCCs.set(p.id, p.cc)
          if (p.visitor_id) {
            this.peerVisitorIds.set(p.id, p.visitor_id)
            const fr = this.friendships.get(p.visitor_id)
            if (fr) bear.setFriendshipLevel(fr.level)
          }
          this.peers.set(p.id, { bear, lastUpdate: performance.now() })
          // Lazy-load the real atlas in background, then upgrade the sprite
          if (species !== 'bear') {
            this.ensureSpeciesLoaded(species).then(() => bear.setSpecies(species))
          }
        }
      },
      onJoin: (m: JoinMsg) => {
        if (m.room !== this.currentRoomId) return
        if (this.peers.has(m.id)) return
        const species = (m.species as any) || 'bear'
        const bear = new Bear(this, m.x, m.y, ccToRegion(m.cc), species)
        bear.sprite.setDepth(5)
        bear.setDisplayName(this.fallbackName(m.display_name ?? null, m.cc))
        this.peerCCs.set(m.id, m.cc)
        if (m.visitor_id) {
          this.peerVisitorIds.set(m.id, m.visitor_id)
          const fr = this.friendships.get(m.visitor_id)
          if (fr) bear.setFriendshipLevel(fr.level)
        }
        this.peers.set(m.id, { bear, lastUpdate: performance.now() })
        if (species !== 'bear') {
          this.ensureSpeciesLoaded(species).then(() => bear.setSpecies(species))
        }
      },
      onLeave: (m: LeaveMsg) => {
        const peer = this.peers.get(m.id)
        if (peer) { peer.bear.destroy(); this.peers.delete(m.id) }
        this.peerVisitorIds.delete(m.id)
        this.peerCCs.delete(m.id)
      },
      onPos: (m: PosMsg) => {
        if (m.room !== this.currentRoomId) return
        let peer = this.peers.get(m.id)
        if (!peer) {
          const bear = new Bear(this, m.x, m.y, 'unknown')
          bear.sprite.setDepth(5)
          bear.setDisplayName(this.fallbackName(null, null))
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
      onSpeciesChanged: (m) => {
        const peer = this.peers.get(m.id)
        if (!peer) return
        // N1 — if this species atlas isn't loaded yet, fetch then apply
        this.ensureSpeciesLoaded(m.species as any).then(() => {
          peer.bear.setSpecies(m.species as any)
        })
      },
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
      onJamBurst: (m: JamBurstMsg) => this.applyJamBurst(m),
      onLetterDropOk: (m: LetterDropOkMsg) => this.applyLetterDropOk(m),
      onLetterDropFailed: (m: LetterDropFailedMsg) => this.applyLetterDropFailed(m),
      onLetterAppeared: (m: LetterAppearedMsg) => this.applyLetterAppeared(m),
      onLettersInRoom: (m: LettersInRoomMsg) => this.applyLettersInRoom(m),
      onWishesList: (m: WishesListMsg) => renderWishboard(m.wishes as any),
      onWishSubmitOk: () => showToast('🌟 Wish submitted'),
      onWishVoteOk: () => {},
      onWishFailed: (m: WishFailedMsg) => {
        const map: Record<string, string> = {
          rate_limited: '🌟 Slow down', length: '🌟 1-140 chars', blocked: '🌟 Blocked',
          invalid_category: '🌟 Invalid category', invalid_id: '🌟 Invalid wish'
        }
        showToast(map[m.reason] ?? `🌟 Failed (${m.reason})`)
      }
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

    // V6.5 — species toggle: flips bear ↔ cat, applies to own sprite, persists locally.
    updateSpeciesButtonLabel(getMySpecies())
    setOnSpeciesToggle(async () => {
      // E5-P1a — cycle through all 5 species (bear→cat→fox→capybara→bird→bear)
      const { nextSpeciesFrom } = await import('../ui')
      const next = nextSpeciesFrom(getMySpecies()) as any
      // N1 — ensure target atlas loaded before swap so we don't flash bear
      await this.ensureSpeciesLoaded(next)
      const { setMySpecies } = await import('../config')
      setMySpecies(next)
      this.myBear?.setSpecies(next)
      updateSpeciesButtonLabel(next)
      const { sendSpecies } = await import('../net')
      sendSpecies(next)
      this.lastSpeciesToggleAt = performance.now()  // P7-review I7
    })

    // E5-P1a — first-visit species picker. Shown when localStorage has no
    // lounge_species_v1 entry (i.e. visitor never picked).
    try {
      if (!localStorage.getItem('lounge_species_v1')) {
        this.time.delayedCall(1500, () => {
          showSpeciesPicker(async (s) => {
            const { setMySpecies } = await import('../config')
            setMySpecies(s)
            this.myBear?.setSpecies(s)
            updateSpeciesButtonLabel(s)
            const { sendSpecies } = await import('../net')
            sendSpecies(s)
            showToast(`You chose ${s}. You can change it anytime in info panel.`, 3000)
          })
        })
      }
    } catch {}

    // V8.7 — progress panel data provider (pebbles + friendships + npc count)
    setProgressDataProvider(() => {
      const allPebbles = getAllPebbles()
      const friendsArr = Array.from(this.friendships.values()).map(f => ({ level: f.level, display_name: f.display_name }))
      // npc total = manifest npcs (excluding human visitors). We have 11.
      const npcIds = new Set<string>()
      this.npcBears.forEach((_v, k) => npcIds.add(k))
      if (this.npcManifest) for (const n of this.npcManifest.npcs) npcIds.add(n.id)
      return {
        pebblesCollected: this.inventory.size,
        pebblesTotal: allPebbles.length,
        friendships: friendsArr,
        totalNpcs: Math.max(npcIds.size, 11)
      }
    })

    // V9.1 — crafting env provider: exposes pebble inventory + materials.
    // Materials (V9.2 placeholder): empty until resource gathering ships;
    // recipes that need materials will fail with missing_material.
    // V9.7 — Bundle auto-slot provider: memories count + per-NPC friendship levels
    setBundleAutoProvider(() => {
      let memCount = 0
      try { memCount = JSON.parse(localStorage.getItem('lounge_memories_v1') || '[]').length } catch {}
      const levels = Array.from(this.friendships.values()).map(f => f.level ?? 0)
      return { memoriesCount: memCount, friendshipsMaxLevels: levels }
    })

    setCraftEnvProvider(() => ({
      inventoryHas: (id: string) => this.inventory.has(id),
      inventorySize: this.inventory.size,
      pebbleIds: Array.from(this.inventory),
      removePebble: (id: string) => {
        this.inventory.delete(id)
        refreshInventoryPanel()
      },
      // V9.2 — real materials from gathering
      hasMaterial: (id: string) => getMaterial(id as MaterialId),
      removeMaterial: (id: string, n: number) => { removeMaterialFn(id as MaterialId, n) }
    }))

    // E5-P0b — Who's around panel: for every NPC in manifest, report current
    // bracket (room + state) and the formatted HH:MM of the next bracket change.
    setWhosAroundProvider((): WhosAroundEntry[] => {
      const npcs = this.npcManifest?.npcs ?? []
      const labelMap: Record<string, string> = {
        room_lobby: 'Lobby', room_dj_floor: 'DJ Floor', room_balcony: 'Balcony',
        room_library: 'Library', room_beach: 'Beach', room_grove: 'Grove',
        room_kitchen: 'Kitchen', room_workshop: 'Workshop', room_rooftop: 'Rooftop',
        room_bedroom_mio: "Mio's room", room_bedroom_halle: "Halle's room",
        room_bedroom_sora: "Sora's room", room_bedroom_theo: "Theo's room"
      }
      const now = getGameNow()
      const minutes = now.getHours() * 60 + now.getMinutes()
      const out: WhosAroundEntry[] = []
      for (const def of npcs) {
        const active = getActiveBracket(def, now)
        if (!active) {
          out.push({ name: def.name, roomLabel: '—', state: 'offline' })
          continue
        }
        // N6 — Find next bracket boundary. If none later today, wrap to the
        // earliest bracket of the next day (prefixed with "+1d ").
        let nextMin: number | null = null
        let earliestMin: number | null = null   // for wrap
        for (const b of def.schedule) {
          const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(b.from)
          if (!m) continue
          const t = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
          if (t > minutes && (nextMin == null || t < nextMin)) nextMin = t
          if (earliestMin == null || t < earliestMin) earliestMin = t
        }
        let nextStr: string | null = null
        if (nextMin != null) {
          const h = String(Math.floor(nextMin / 60)).padStart(2, '0')
          const m = String(nextMin % 60).padStart(2, '0')
          nextStr = `${h}:${m}`
        } else if (earliestMin != null) {
          const h = String(Math.floor(earliestMin / 60)).padStart(2, '0')
          const m = String(earliestMin % 60).padStart(2, '0')
          nextStr = `+1d ${h}:${m}`
        }
        out.push({
          name: def.name,
          roomLabel: labelMap[active.room] ?? active.room,
          state: active.state as any,
          nextChangeAt: nextStr
        })
      }
      // Sort: not-asleep first, then by name
      out.sort((a, b) => {
        if ((a.state === 'sleep') !== (b.state === 'sleep')) return a.state === 'sleep' ? 1 : -1
        return a.name.localeCompare(b.name)
      })
      return out
    })

    setupWishboard(
      getIdentity().visitor_id,
      () => requestWishes(),
      (cat, content) => sendWishSubmit(cat as 'sprite' | 'room' | 'dialog' | 'other', content),
      (wish_id) => sendWishVote(wish_id)
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
        // P1 + V9.1 — append decoration items the player owns (shop purchase
        // OR crafted). All use the same lounge_purchases_v1 storage flag.
        const OWNED_DECO: Array<{ id: string; name: string; source: string }> = [
          { id: 'shop_lantern_keepsake',  name: 'Lantern Keepsake',          source: "Mio's Shop" },
          { id: 'shop_fox_figurine',      name: 'Fox Figurine',              source: "Mio's Shop" },
          { id: 'shop_sketch_print',      name: 'Sketch Print (Cole)',       source: "Mio's Shop" },
          { id: 'craft_friendship_charm', name: 'Friendship Charm',          source: 'crafted' },
          { id: 'craft_memory_locket',    name: 'Memory Locket',             source: 'crafted' },
          { id: 'craft_wanderer_compass', name: "Wanderer's Compass",        source: 'crafted' },
          { id: 'craft_curator_lamp',     name: "Curator's Lamp",            source: 'crafted' },
          { id: 'craft_shared_kettle',    name: 'Shared Kettle',             source: 'crafted' }
        ]
        for (const d of OWNED_DECO) {
          const key = d.id.replace(/^(shop_|craft_)/, '')
          if (!hasPurchased(key as any)) continue
          items.push({
            id: d.id,
            name: d.name,
            collected: true,
            giftedByName: d.source,
            placedInHome: placedIds.has(d.id)
          })
        }
        // V9.0 — Curating perk grants additional slots on top of shop's +8
        const shopSlots = hasPurchased('pebble_bag_plus') ? 8 : 0
        return {
          items,
          total: all.length + OWNED_DECO.filter(d => hasPurchased(d.id.replace(/^(shop_|craft_)/, '') as any)).length,
          collected: items.filter(i => i.collected).length,
          canPlace: this.amInMyHome(),
          gridSlots: 36 + shopSlots + bonusInventorySlots()
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

    // V6.7 — softer crossfade-in (warm cream tone instead of harsh black) + camera
    // bounds so once any future room exceeds 480×320, follow becomes a real follow.
    if (!prefersReducedMotion()) {
      this.cameras.main.fadeIn(220, 248, 240, 220)
    }
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    // myBear isn't created yet at this point — wire follow once it exists, below.

    // V7.4 — quest progress on room visit
    onRoomVisitedQuest(this.currentRoomId)
    // V9.0 — room transitions feed Wayfaring
    awardXp('wayfaring', 1)

    // V8.4 — once per UTC day, award the daily-visit shells bonus
    const dailyBonus = claimDailyVisitBonus()
    if (dailyBonus > 0) {
      this.time.delayedCall(2200, () => showToast(`🐚 +${dailyBonus} shells (daily visit)`, 2800))
    }

    // V7.7 — try to run a cutscene on room entry (NPCs spawn shortly after,
    // so delay a bit). At most one cutscene per scene boot.
    this.time.delayedCall(1500, () => {
      const cut = findCutsceneForRoom(this.currentRoomId, new Date(), {
        friendships: this.friendships,
        activeEvent: getActiveFestivalId()
      })
      if (cut) this.runCutscene(cut)
    })

    // Drain cached welcome (set by applyWelcome before this scene was restarted)
    if (welcomeCache) {
      const cached = welcomeCache
      welcomeCache = null
      // Re-apply non-spawn parts of welcome on this scene (already-spawned bear etc.)
      this.welcomeApplied = false
      this.applyWelcome(cached)
    }
  }

  /**
   * Bear label format. Country flag always prefixes when known.
   *   Named visitor + CC:    "🇨🇳 Pat"
   *   Named visitor, no CC:  "🌍 Pat"
   *   Anonymous + CC:        "🇨🇳 Bear"
   *   Anonymous, no CC:      "🌍 Bear"
   */
  private fallbackName(name: string | null, cc?: string | null): string {
    const flag = ccToFlag(cc ?? this.myCC)
    if (name && name.length > 0) return `${flag} ${name}`
    return `${flag} Bear`
  }

  private applyWelcome(m: WelcomeMsg) {
    if (this.welcomeApplied) return
    this.welcomeApplied = true
    // P7 — pass HMAC token to sync layer so PUT can authenticate
    if (m.progress_token) {
      import('../progress_sync').then(({ setProgressToken }) => setProgressToken(m.progress_token ?? null))
    }
    // E5-P0c + P7-review I7 — reconcile species, but skip if we just toggled
    // locally (in-flight sendSpecies may not have hit the DB yet). Recently =
    // last 5s.
    const recentToggle = (performance.now() - (this.lastSpeciesToggleAt ?? -Infinity)) < 5000
    if (m.species && m.species !== getMySpecies() && !recentToggle) {
      const s = m.species as 'bear' | 'cat' | 'fox' | 'capybara' | 'bird'
      import('../config').then(({ setMySpecies }) => setMySpecies(s))
      this.myBear?.setSpecies(s)
      updateSpeciesButtonLabel(s)
    }

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
    // V8.6 — seed NPC mail (welcome, festival invites, completed quests, friendship milestones)
    try {
      const fmap = new Map<string, { level: number; display_name?: string | null }>()
      for (const [k, v] of this.friendships) fmap.set(k, { level: v.level, display_name: v.display_name })
      const isFirstEverVisit = !localStorage.getItem('lounge_visitor_id_seen_once')
      try { localStorage.setItem('lounge_visitor_id_seen_once', '1') } catch {}
      seedMailForToday({ isFirstEverVisit, friendships: fmap })
      refreshMailboxBadge()
      const n = mailUnread()
      if (n > 0) this.time.delayedCall(1800, () => showToast(`📬 ${n} new in mailbox`, 2400))
    } catch (e) { console.warn('mail seed failed', e) }
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
      peer.bear.setDisplayName(this.fallbackName(m.display_name, this.peerCCs.get(m.id) ?? null))
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
        // V6.6 — sparkle burst at pickup point
        pebbleSparkle(this, sprite.x, sprite.y)
        // V7.4 — quest progress
        onPebbleCollectedQuest(id)
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
    awardXp('hospitality', 3)  // V9.0
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
    // V8.4 — accepting a gift earns shells
    awardShells(SHELL_REWARD.gift_accepted)
    this.time.delayedCall(2000, () => showToast(`🐚 +${SHELL_REWARD.gift_accepted} shells (gift accepted)`, 2000))
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

    // Bigger celebration for full jam: brief sparkle burst + screen shake
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
      // V6.7 — small screen shake for impact
      this.cameras.main.shake(200, 0.006)
    }
  }

  // V5.1 — Letters

  private renderLetters() {
    this.letterSprites.forEach(s => s.destroy())
    this.letterSprites.clear()
    for (const [id, l] of this.letters) this.spawnLetterSprite(id, l)
  }

  private spawnLetterSprite(id: number, l: LetterEntry) {
    const text = this.add.text(l.x, l.y, '📜', {
      fontSize: '14px',
      resolution: 2
    }).setOrigin(0.5, 0.5).setDepth(4).setInteractive({ useHandCursor: true })
    // Slow bob
    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: text, y: l.y - 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
    }
    this.letterSprites.set(id, text)
  }

  private tryReadLetterAt(wx: number, wy: number): boolean {
    for (const [id, sprite] of this.letterSprites) {
      if (Math.abs(wx - sprite.x) < 12 && Math.abs(wy - sprite.y) < 12) {
        const letter = this.letters.get(id)
        if (letter) {
          showLetterRead(letter.author_name, letter.content, letter.dropped_at)
          return true
        }
      }
    }
    return false
  }

  private applyLetterDropOk(m: LetterDropOkMsg) {
    // Add own letter to the local map + render (server doesn't broadcast back to sender)
    const myId = getIdentity().visitor_id
    const entry: LetterEntry = {
      id: m.id, author_visitor_id: myId, author_name: this.myDisplayName,
      x: m.x, y: m.y, content: m.content, dropped_at: m.dropped_at
    }
    // Replace any prior letter of mine in this room (UNIQUE per room+author)
    for (const [oldId, l] of this.letters) {
      if (l.author_visitor_id === myId) {
        this.letterSprites.get(oldId)?.destroy()
        this.letterSprites.delete(oldId)
        this.letters.delete(oldId)
      }
    }
    this.letters.set(m.id, entry)
    this.spawnLetterSprite(m.id, entry)
    showToast(`📜 Note dropped`)
  }

  private applyLetterDropFailed(m: LetterDropFailedMsg) {
    const map: Record<string, string> = {
      rate_limited: '📜 Slow down — too many notes',
      length: '📜 1-80 chars',
      blocked: '📜 Note blocked',
      invalid: '📜 Invalid'
    }
    showToast(map[m.reason] ?? `📜 Drop failed (${m.reason})`)
  }

  private applyLetterAppeared(m: LetterAppearedMsg) {
    if (m.room !== this.currentRoomId) return
    // Replace any prior letter from this author in this room
    for (const [oldId, l] of this.letters) {
      if (l.author_visitor_id === m.author_visitor_id) {
        this.letterSprites.get(oldId)?.destroy()
        this.letterSprites.delete(oldId)
        this.letters.delete(oldId)
      }
    }
    const entry: LetterEntry = {
      id: m.id, author_visitor_id: m.author_visitor_id, author_name: m.author_name,
      x: m.x, y: m.y, content: m.content, dropped_at: m.dropped_at
    }
    this.letters.set(m.id, entry)
    this.spawnLetterSprite(m.id, entry)
  }

  private applyLettersInRoom(m: LettersInRoomMsg) {
    if (m.room !== this.currentRoomId) return
    this.letters.clear()
    for (const l of m.letters) this.letters.set(l.id, l)
    this.renderLetters()
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
    // V9.0 — placing a decoration feeds Curating; bigger reward if it's a
    // new item-kind they haven't placed before.
    const distinct = new Set(this.myHomeDecorations.map(d => d.item_id))
    awardXp('curating', distinct.size === this.myHomeDecorations.length ? 5 : 1)
    showToast(`📦 Placed.`)
  }

  private applyPlaceFailed(m: PlaceFailedMsg) {
    const map: Record<string, string> = {
      not_in_home: '📦 Must be in your home',
      not_owned: '📦 You don\'t own this pebble',
      cap: `📦 Home decoration cap reached — build more extensions to expand`,
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

  // N1 — Lazy-load a species' atlas (all 6 region tints) on demand.
  // Returns a promise that resolves when every region atlas is in cache,
  // or immediately if they already are. Idempotent / dedup'd via the
  // speciesLoadInFlight map so multiple peers joining at once don't double-load.
  private speciesLoadInFlight = new Map<string, Promise<void>>()
  private ensureSpeciesLoaded(species: Species): Promise<void> {
    if (species === 'bear') return Promise.resolve()
    // Check if every region already cached
    const allLoaded = REGIONS.every(r => this.textures.exists(`${species}_${r}`))
    if (allLoaded) return Promise.resolve()
    const pending = this.speciesLoadInFlight.get(species)
    if (pending) return pending
    // N-review I2 — also handle load errors + a 10s timeout so a 404 doesn't
    // leave the promise pending forever (which would also lock speciesLoadInFlight).
    const p = new Promise<void>((resolve) => {
      let remaining = 0
      const settled = { done: false }
      const finish = () => {
        if (settled.done) return
        settled.done = true
        registerBearAnimations(this, REGIONS)
        resolve()
      }
      for (const region of REGIONS) {
        const key = `${species}_${region}`
        if (this.textures.exists(key)) continue
        remaining++
        this.load.atlas(
          key,
          `/lounge/assets/sprites/${species}/${region}/sprite.png`,
          `/lounge/assets/sprites/${species}/${region}/sprite.json`
        )
        this.load.once(`filecomplete-json-${key}`, () => {
          remaining--
          if (remaining <= 0) finish()
        })
      }
      // Loader errors → still resolve so caller falls back to bear texture
      const onError = (file: Phaser.Loader.File) => {
        if (file.key?.startsWith(`${species}_`)) {
          remaining = 0
          finish()
        }
      }
      this.load.on('loaderror', onError)
      // Safety timeout
      this.time.delayedCall(10_000, finish)
      if (remaining === 0) resolve()
      else this.load.start()
    }).finally(() => this.speciesLoadInFlight.delete(species))
    this.speciesLoadInFlight.set(species, p)
    return p
  }

  // V9.4 + V9.7-review I1 — co-op activity banner. Uses Phaser's scene timer
  // (pauses with the scene when tab is backgrounded) instead of window.setInterval.
  private coopTimer?: Phaser.Time.TimerEvent
  private setupCoopActivity() {
    const banner = document.getElementById('lounge-coop-banner') as HTMLElement | null
    const emoji  = document.getElementById('lounge-coop-emoji')  as HTMLElement | null
    const text   = document.getElementById('lounge-coop-text')   as HTMLElement | null
    const startBtn = document.getElementById('lounge-coop-start') as HTMLButtonElement | null
    const timerEl  = document.getElementById('lounge-coop-timer') as HTMLElement | null
    if (!banner || !emoji || !text || !startBtn || !timerEl) return
    if (this.coopTimer) { this.coopTimer.remove(false); this.coopTimer = undefined }
    timerEl.hidden = true
    const a = activityForRoom(this.currentRoomId)
    if (!a || hasCoopDoneToday(a.id)) { banner.hidden = true; return }
    emoji.textContent = a.emoji
    text.textContent  = `${a.name} — ${a.blurb}`
    startBtn.hidden = false
    startBtn.disabled = false
    startBtn.textContent = 'Start'
    banner.hidden = false
    const handler = () => {
      startBtn.disabled = true
      timerEl.hidden = false
      let remaining = a.durationSec
      timerEl.textContent = `${remaining}s`
      this.coopTimer = this.time.addEvent({
        delay: 1000, repeat: a.durationSec - 1,
        callback: () => {
          remaining -= 1
          if (remaining <= 0) {
            awardCoopActivity(a)
            showToast(`${a.emoji} +🐚 ${a.shells} · +${a.companionshipXp} companionship`, 3500)
            banner.hidden = true
            this.coopTimer = undefined
          } else {
            timerEl.textContent = `${remaining}s`
          }
        }
      })
    }
    startBtn.onclick = handler
    this.events.once('shutdown', () => {
      if (this.coopTimer) { this.coopTimer.remove(false); this.coopTimer = undefined }
      banner.hidden = true
      startBtn.onclick = null as any
    })
  }

  // V9.2 — Render gather spots in the current room. Each spot is a small
  // sprite with a label; click handler awards a material + sparkles.
  private resourceSpotSprites: Phaser.GameObjects.GameObject[] = []
  private spawnResourceSpots() {
    // Clean previous (scene restart will create a fresh array)
    for (const s of this.resourceSpotSprites) s.destroy()
    this.resourceSpotSprites = []
    const spots = getActiveSpots(this.currentRoomId)
    if (spots.length === 0) return
    ensurePixelTexture(this)
    for (const spot of spots) {
      const meta = MATERIALS[spot.material]
      // sparkly square + emoji label
      const sprite = this.add.text(spot.x, spot.y, meta.emoji, {
        fontSize: '14px', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5, 0.5).setDepth(6).setInteractive({ useHandCursor: true })
      // pulse
      this.tweens.add({
        targets: sprite, alpha: { from: 0.7, to: 1 }, scale: { from: 0.95, to: 1.1 },
        duration: 700 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.InOut'
      })
      sprite.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation()
        this.gatherSpot(spot, sprite)
      })
      this.resourceSpotSprites.push(sprite)
    }
  }

  private gatherSpot(spot: ResourceSpot, sprite: Phaser.GameObjects.Text) {
    if (!this.myBear) return
    // Proximity check: within ~40px
    const dx = this.myBear.x - spot.x, dy = this.myBear.y - spot.y
    if (Math.hypot(dx, dy) > 48) {
      showToast('Walk closer to gather.', 1400)
      return
    }
    markPicked(spot.id)
    addMaterial(spot.material, 1)
    const meta = MATERIALS[spot.material]
    pebbleSparkle(this, spot.x, spot.y)
    showToast(`${meta.emoji} +1 ${meta.name}`, 1800)
    // Fade out + remove
    this.tweens.add({
      targets: sprite, alpha: 0, scale: 1.5, duration: 350,
      onComplete: () => { sprite.destroy() }
    })
    // V9.0 — gathering feeds Wayfaring slightly
    awardXp('wayfaring', 1)
  }

  // E5-P2c — Per-room parallax background. A subtle tinted TileSprite at
  // depth -10 (behind the tilemap) whose tilePosition drifts slowly. Color
  // chosen per room family. Skipped under prefers-reduced-motion.
  private setupParallaxBackground(widthPx: number, heightPx: number) {
    if (prefersReducedMotion()) return
    const TEX = 'lounge_parallax_noise'
    if (!this.textures.exists(TEX)) {
      const size = 64
      const c = document.createElement('canvas')
      c.width = size; c.height = size
      const g = c.getContext('2d')!
      // Soft diagonal noise pattern (deterministic)
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = (Math.sin(x * 0.13 + y * 0.07) + Math.cos(x * 0.09 - y * 0.11)) * 0.5
          const a = Math.max(0, Math.min(255, 60 + v * 40))
          g.fillStyle = `rgba(255,255,255,${(a / 255).toFixed(2)})`
          g.fillRect(x, y, 1, 1)
        }
      }
      this.textures.addCanvas(TEX, c)
    }
    // Per-room tint
    let tint = 0x404060
    const r = this.currentRoomId
    if (r === 'room_balcony' || r === 'room_beach' || r === 'room_grove') tint = 0x4a78a8
    else if (r === 'room_dj_floor')                                       tint = 0x6020a0
    else if (r === 'room_library' || r.startsWith('room_bedroom_'))        tint = 0x504030
    else if (r === 'room_rooftop')                                        tint = 0x1a2050
    else if (r === 'room_kitchen' || r === 'room_workshop')               tint = 0x5a4032
    const bg = this.add.tileSprite(0, 0, widthPx, heightPx, TEX)
      .setOrigin(0).setDepth(-10).setAlpha(0.18).setTint(tint)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
    // N2 — Continuous drift via per-frame delta (no progress 1→0 snap).
    // ~64 px / 30s on X, ~32 px / 30s on Y → smooth wrap, no visible reset.
    const SPEED_X = 64 / 30_000  // px per ms
    const SPEED_Y = 32 / 30_000
    const handler = (_t: number, dtMs: number) => {
      if (!bg.active) return   // N-review I3 — guard if Phaser fired one last update post-destroy
      bg.tilePositionX += SPEED_X * dtMs
      bg.tilePositionY += SPEED_Y * dtMs
    }
    this.events.on('update', handler)
    const detach = () => this.events.off('update', handler)
    this.events.once('shutdown', detach)
    this.events.once('destroy',  detach)
  }

  // V6.3 + E5-P2b — radial-gradient glow on light-source tiles at night.
  //   • Soft radial falloff (was hard circle) via baked gradient texture
  //   • Window tiles now ALSO get a tint at sunrise/sunset/night so daylight
  //     reflection through the glass changes with time of day
  private addNightGlow(map: Phaser.Tilemaps.Tilemap, layers: Phaser.Tilemaps.TilemapLayer[]) {
    // E5-P2b review I1+I2: use game time (not wall clock) + non-overlapping
    // sunset window (17 + 6) so 18:xx isn't double-counted as both states.
    const hour = getGameNow().getHours()
    const isNight = hour >= 18 || hour < 6
    const isSunset = (hour === 17 || hour === 6) && !isNight

    // E5-P2b — bake a soft-gradient texture once, reuse across all glows
    const GLOW_TEX = 'lounge_soft_glow'
    if (!this.textures.exists(GLOW_TEX)) {
      const size = 64
      const c = document.createElement('canvas')
      c.width = size; c.height = size
      const g = c.getContext('2d')!
      const grd = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
      grd.addColorStop(0, 'rgba(255,255,255,1)')
      grd.addColorStop(0.5, 'rgba(255,255,255,0.4)')
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd; g.fillRect(0, 0, size, size)
      this.textures.addCanvas(GLOW_TEX, c)
    }

    // Window tiles (id 13) get a tint when sun is low
    const WINDOW_ID = 13
    const TILE = 16
    if (isSunset || isNight) {
      for (const layer of layers) {
        const grid = layer?.layer?.data
        if (!grid) continue
        for (let y = 0; y < layer.layer.height; y++) {
          for (let x = 0; x < layer.layer.width; x++) {
            if (grid[y][x]?.index !== WINDOW_ID) continue
            const cx = x * TILE + TILE / 2
            const cy = y * TILE + TILE / 2
            const winColor = isNight ? 0x2a3a6a : 0xff8a40  // night = deep blue, sunset = orange
            const winAlpha = isNight ? 0.45 : 0.35
            this.add.rectangle(x * TILE, y * TILE, TILE, TILE, winColor, winAlpha)
              .setOrigin(0).setDepth(9).setBlendMode(Phaser.BlendModes.MULTIPLY)
          }
        }
      }
    }

    if (!isNight) return

    // Light-emitter tile IDs (1-indexed Tiled gid; v1 tileset's IDs)
    const GLOW_TILES = new Set([14, 21, 22, 23, 38, 39])
    for (const layer of layers) {
      if (!layer) continue
      const grid = layer.layer.data
      for (let y = 0; y < layer.layer.height; y++) {
        for (let x = 0; x < layer.layer.width; x++) {
          const t = grid[y][x]
          if (!t || !GLOW_TILES.has(t.index)) continue
          const cx = x * TILE + TILE / 2
          const cy = y * TILE + TILE / 2
          // Color by tile type: neon DJ = pink, strobe = white, others = warm orange
          let tint = 0xffd070
          if (t.index === 38) tint = 0xffffff
          else if (t.index === 39) tint = 0xff80c0
          // E5-P2b — sprite from baked gradient texture for soft radial falloff
          const glow = this.add.image(cx, cy, GLOW_TEX)
            .setTint(tint)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(9)
            .setAlpha(0.55)
            .setScale(1.4)  // 64 × 1.4 ≈ 90px radius
          this.tweens.add({
            targets: glow,
            alpha: { from: 0.45, to: 0.65 },
            scale: { from: 1.35, to: 1.45 },
            duration: 800 + Math.random() * 500,
            yoyo: true, repeat: -1, ease: 'Sine.InOut'
          })
        }
      }
    }
  }

  // V7.3 — Festival visual layer + top banner UI.
  //   Banner: shown if any festival is active today (regardless of room).
  //   Decorations: rendered only in host_room — small particle / overlay accent.
  private setupFestival(widthPx: number, heightPx: number) {
    const fest = getActiveFestival()
    const banner = document.getElementById('lounge-festival-banner') as HTMLElement | null
    const bannerEmoji = document.getElementById('lounge-festival-banner-emoji') as HTMLElement | null
    const bannerText = document.getElementById('lounge-festival-banner-text') as HTMLElement | null
    if (!fest) {
      if (banner) banner.hidden = true
      return
    }
    if (banner && bannerEmoji && bannerText) {
      bannerEmoji.textContent = fest.emoji
      bannerText.textContent = `${fest.name} — ${fest.blurb}`
      banner.hidden = false
    }
    // P6 — show the "Join 🎟" button in the banner if we're in the host room
    //       and the activity hasn't been done today
    const actionBtn = document.getElementById('lounge-festival-action') as HTMLButtonElement | null
    if (actionBtn) {
      if (this.currentRoomId === fest.host_room && !hasCompletedTodaysActivity(fest.id)) {
        actionBtn.hidden = false
        actionBtn.textContent = (
          fest.id === 'spring_open_house' ? 'Enter raffle 🎟' :
          fest.id === 'summer_solstice'   ? 'Join bonfire 🔥' :
          fest.id === 'autumn_harvest'    ? 'Trade pebbles 🍂' :
          fest.id === 'winter_festival'   ? 'Open gift 🎁' : 'Join 🎟'
        )
        if (!actionBtn.dataset.bound) {
          actionBtn.dataset.bound = '1'
          actionBtn.addEventListener('click', () => {
            const f = getActiveFestival()
            if (!f) return
            if (hasCompletedTodaysActivity(f.id)) return
            // P7-fix: only mark activity done AFTER rewards land, so a thrown
            // shop-state write doesn't burn the slot without paying out.
            const res = rollActivity(f.id)
            try {
              if (res.shellReward > 0) awardShells(res.shellReward)
              if (res.itemReward) {
                const shopId = res.itemReward.id.replace('shop_', '')
                const raw = localStorage.getItem('lounge_purchases_v1') || '{}'
                const m = JSON.parse(raw)
                if (!m[shopId]) m[shopId] = Date.now()
                localStorage.setItem('lounge_purchases_v1', JSON.stringify(m))
              }
              markActivityDone(f.id)
              showToast(res.message, 3800)
              actionBtn.hidden = true
            } catch (e) {
              showToast('Activity reward failed — try again.', 2400)
            }
          })
        }
      } else {
        actionBtn.hidden = true
      }
    }
    if (this.currentRoomId !== fest.host_room) return
    // Host-room decoration overlay
    if (prefersReducedMotion()) return
    ensurePixelTexture(this)
    if (fest.decoration === 'tea') {
      // gentle pink petals drifting down
      this.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: widthPx }, y: -5,
        lifespan: 7000, quantity: 1, frequency: 220,
        speedY: { min: 12, max: 24 }, speedX: { min: -10, max: 10 },
        scale: 1.4, tint: [0xffc0cb, 0xff8fb0, 0xffe0ec],
        alpha: { start: 0.85, end: 0.4 }, rotate: { min: 0, max: 360 }
      }).setDepth(999)
    } else if (fest.decoration === 'bonfire') {
      // warm sparks rising in center of room
      this.add.particles(widthPx / 2, heightPx - 40, PIXEL_TEX_KEY, {
        lifespan: 1400, quantity: 2, frequency: 80,
        speedY: { min: -50, max: -20 }, speedX: { min: -15, max: 15 },
        scale: { start: 1.5, end: 0 },
        tint: [0xff6020, 0xffa040, 0xffe080],
        alpha: { start: 0.95, end: 0 },
        blendMode: Phaser.BlendModes.ADD
      }).setDepth(999)
    } else if (fest.decoration === 'harvest') {
      // gold leaves falling
      this.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: widthPx }, y: -5,
        lifespan: 6500, quantity: 1, frequency: 280,
        speedY: { min: 18, max: 32 }, speedX: { min: -16, max: 16 },
        scale: 1.6, tint: [0xd87a20, 0xe8a040, 0xb05010, 0xf8c060],
        alpha: { start: 0.9, end: 0.5 }, rotate: { min: 0, max: 360 }
      }).setDepth(999)
    } else if (fest.decoration === 'gifts') {
      // snow + occasional gift-box flash
      this.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: widthPx }, y: -5,
        lifespan: 6000, quantity: 1, frequency: 100,
        speedY: { min: 25, max: 45 }, speedX: { min: -8, max: 8 },
        scale: 1.3, tint: 0xffffff,
        alpha: { start: 0.85, end: 0.5 }, rotate: { min: 0, max: 360 }
      }).setDepth(999)
    }
  }

  // V6.4 — Weather: deterministic from date, falls back to clear.
  //   • Outdoor rooms (balcony, beach, grove): full effect — clouds + rain/snow particles
  //   • Indoor rooms: lighter cloudy tint only; no particles indoors
  //   • Skipped on prefers-reduced-motion
  private setupWeather(widthPx: number, heightPx: number) {
    if (prefersReducedMotion()) return
    const today = new Date()
    const weather = getWeatherForDate(today)
    if (weather === 'clear') return
    const isOutdoor = (this.currentRoomId === 'room_balcony' || this.currentRoomId === 'room_beach' || this.currentRoomId === 'room_grove')
    // Cloudy tint overlay (above the night atmosphere)
    if (weather === 'cloudy' || weather === 'rain' || weather === 'snow' || weather === 'storm') {
      const tintAlpha = (weather === 'storm') ? 0.32 : (weather === 'rain' ? 0.22 : weather === 'snow' ? 0.18 : 0.12)
      this.add.rectangle(0, 0, widthPx, heightPx, 0x6878a0, tintAlpha)
        .setOrigin(0).setDepth(1001).setBlendMode(Phaser.BlendModes.MULTIPLY)
    }
    if (!isOutdoor) return  // indoor rooms get tint only

    ensurePixelTexture(this)
    if (weather === 'rain' || weather === 'storm') {
      this.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: widthPx }, y: -10,
        lifespan: 1200, quantity: (weather === 'storm' ? 4 : 2), frequency: 60,
        speedX: { min: -10, max: -2 },
        speedY: { min: 280, max: 360 },
        scale: { start: 1.5, end: 1.5 },
        tint: 0x8fb8d8, alpha: { start: 0.7, end: 0.4 }
      }).setDepth(1002)
      // Splash burst at ground
      this.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: widthPx }, y: heightPx - 4,
        lifespan: 220, quantity: (weather === 'storm' ? 2 : 1), frequency: 100,
        speedY: { min: -30, max: -10 }, speedX: { min: -20, max: 20 },
        scale: 1, tint: 0xa0c8e0, alpha: { start: 0.5, end: 0 }
      }).setDepth(1002)
    } else if (weather === 'snow') {
      this.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: 0, max: widthPx }, y: -10,
        lifespan: 6000, quantity: 1, frequency: 80,
        speedY: { min: 25, max: 45 }, speedX: { min: -8, max: 8 },
        scale: { start: 1.4, end: 1.4 },
        tint: 0xffffff, alpha: { start: 0.85, end: 0.5 },
        rotate: { min: 0, max: 360 }
      }).setDepth(1002)
      // E5-P1c — snow accumulation: a white overlay above the floor whose
      // alpha grows over real-time. Capped at 0.45 so the room is still
      // readable. Cleanup on shutdown (P7-review fix I3).
      const snow = this.add.rectangle(0, 0, widthPx, heightPx, 0xffffff, 0)
        .setOrigin(0).setDepth(995)
        .setBlendMode(Phaser.BlendModes.SCREEN)
      const snowTimer = this.time.addEvent({
        delay: 30_000, loop: true,
        callback: () => { if (snow.fillAlpha < 0.45) snow.fillAlpha += 0.04 }
      })
      this.events.once('shutdown', () => { snowTimer.remove(false); snow.destroy() })
      this.events.once('destroy',  () => { snowTimer.remove(false); snow.destroy() })
    }

    // E5-P1c — weather ambient audio. Hooks into existing audio system;
    // if the .ogg files aren't deployed yet the calls silent-fail safely.
    if (weather === 'rain' || weather === 'storm') {
      this.tryPlayWeatherAmbient('weather_rain', '/lounge/assets/audio/ambient/rain.ogg')
    } else if (weather === 'snow') {
      this.tryPlayWeatherAmbient('weather_wind', '/lounge/assets/audio/ambient/wind.ogg')
    }
  }

  // E5-P1c + P7-review fix I4 — load + loop a weather ambient track. Stop on
  // scene shutdown so room transitions don't accumulate looping ambients.
  private weatherSound?: Phaser.Sound.BaseSound
  private tryPlayWeatherAmbient(key: string, url: string) {
    const start = () => {
      try {
        this.weatherSound = this.sound.add(key, { loop: true, volume: 0.25 })
        this.weatherSound.play()
      } catch {}
    }
    if (this.cache.audio.exists(key)) { start(); }
    else {
      this.load.audio(key, [url])
      this.load.once(`filecomplete-audio-${key}`, start)
      this.load.start()
    }
    this.events.once('shutdown', () => { try { this.weatherSound?.stop() } catch {} })
    this.events.once('destroy',  () => { try { this.weatherSound?.stop() } catch {} })
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
    } else if (roomId === 'room_beach') {
      // Seagulls flying horizontally across the sky
      cfg = {
        x: -10, y: 40,
        emit: {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 1, 60), quantity: 1 } as any,
          frequency: 3500,
          lifespan: 8000,
          quantity: 1,
          maxAliveParticles: 3,
          speedX: { min: 60, max: 90 },
          speedY: { min: -3, max: 3 },
          alpha: { start: 0.8, end: 0.5 },
          scale: 2,
          tint: 0xffffff
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
    this.refreshMinimap()  // now that we know NPC locations, repaint the minimap dots
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
    } else if (b.state === 'sleep') {
      // V7.6 — sleeping NPC: sit pose, dimmer alpha, floating "zZz" indicator
      bear.applyEmote('sit', 0, prefersReducedMotion())
      bear.sprite.setAlpha(0.55)
      const zzz = this.add.text(b.x, b.y - 56, 'zZz', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '10px', color: '#a0c8ff', stroke: '#000', strokeThickness: 2,
        resolution: 2
      }).setOrigin(0.5, 1).setDepth(6)
      this.tweens.add({
        targets: zzz, alpha: { from: 0.5, to: 1 },
        y: zzz.y - 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut'
      })
      // Stash on the bear sprite so despawn can clean it up
      ;(bear.sprite as any).__sleep_zzz = zzz
    } else {
      bear.playIdle()
    }
    this.npcBears.set(def.id, { bear, def })
  }

  private despawnNpc(id: string) {
    const entry = this.npcBears.get(id)
    if (!entry) return
    const zzz = (entry.bear.sprite as any).__sleep_zzz as Phaser.GameObjects.Text | undefined
    if (zzz) zzz.destroy()
    entry.bear.destroy()
    this.npcBears.delete(id)
  }

  // V8.5 — Once per game-day, when game time crosses 02:00, prompt the player to sleep.
  private checkSleepPrompt() {
    if (!shouldPromptSleep()) return
    markSleepPrompted()
    const venue = isHomeRoom(this.currentRoomId) ? 'home' : 'floor'
    showSleepOverlay({
      time: formatGameTime(getGameNow()),
      venue,
      onChoice: (slept) => {
        if (!slept) {
          showToast('You stayed up. Energy will be hard tomorrow.', 2500)
          return
        }
        const res = performSleep(this.currentRoomId)
        const msg = res.venue === 'home'
          ? `💤 Slept at home. Energy restored to ${res.restored}.`
          : `💤 Slept rough. +${res.restored} energy.`
        showToast(msg, 3000)
      }
    })
  }

  // V8.3 — Camera capture: build a Memory from current scene state and play a flash + sound.
  private captureMomentHere(_wx: number, _wy: number) {
    const npcs = Array.from(this.npcBears.values()).map(e => e.def.name)
    const peers = Array.from(this.peers.values()).map(p => p.bear)
    const weather = getWeatherForDate(new Date())
    const labelMap: Record<string, string> = {
      room_lobby: 'Lobby', room_dj_floor: 'DJ Floor', room_balcony: 'Balcony',
      room_library: 'Library', room_beach: 'Beach', room_grove: 'Grove',
      room_kitchen: 'Kitchen', room_workshop: 'Workshop', room_rooftop: 'Rooftop'
    }
    const roomLabel = isHomeRoom(this.currentRoomId) ? 'Home' : (labelMap[this.currentRoomId] ?? this.currentRoomId)
    captureMemory({
      roomId: this.currentRoomId, roomLabel,
      visibleNpcs: npcs,
      visiblePeers: peers.map((_, i) => `peer_${i}`),
      weather: weather === 'clear' ? undefined : weather
    })
    // White flash overlay
    const flash = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.85)
      .setOrigin(0).setDepth(1500).setScrollFactor(0)
    this.tweens.add({
      targets: flash, alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    })
    consumeEnergy(ENERGY_COST.tool_use)
    showToast('📷 Memory captured', 1600)
    awardXp('memory_making', 3)  // V9.0
  }

  // V7.7 — Sequential cutscene runner.
  private async runCutscene(def: CutsceneDef) {
    markFired(def.id)
    for (const step of def.steps) {
      await this.runCutsceneStep(step)
    }
  }

  private runCutsceneStep(step: CutsceneStep): Promise<void> {
    return new Promise<void>((resolve) => {
      const cam = this.cameras.main
      switch (step.type) {
        case 'wait':
          this.time.delayedCall(step.ms, () => resolve())
          return
        case 'say': {
          const entry = this.npcBears.get(step.npc_id)
          if (entry) {
            const screen = this.bearScreenPos(entry.bear)
            showBubble('cutscene_' + step.npc_id + '_' + Date.now(), step.text, screen.x, screen.y)
          }
          this.time.delayedCall(step.duration_ms ?? 2400, () => resolve())
          return
        }
        case 'camera_pan':
          cam.pan(step.x, step.y, step.duration_ms, 'Sine.InOut', false, (_c, p) => {
            if (p >= 1) resolve()
          })
          // pan callback fires repeatedly; resolve on next tick if it didn't yet
          this.time.delayedCall(step.duration_ms + 50, () => resolve())
          return
        case 'camera_zoom':
          cam.zoomTo(step.zoom, step.duration_ms, 'Sine.InOut', false, (_c, p) => {
            if (p >= 1) resolve()
          })
          this.time.delayedCall(step.duration_ms + 50, () => resolve())
          return
        case 'move_npc': {
          const entry = this.npcBears.get(step.npc_id)
          if (entry) {
            const bear = entry.bear
            this.tweens.add({
              targets: bear.sprite,
              x: step.x, y: step.y,
              duration: step.duration_ms,
              onComplete: () => resolve()
            })
          } else {
            resolve()
          }
          return
        }
        case 'fade': {
          if (!this.cutsceneFadeRect) {
            this.cutsceneFadeRect = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, step.color ?? 0x000000, 0)
              .setOrigin(0).setDepth(1500).setScrollFactor(0)
          }
          if (step.color !== undefined) this.cutsceneFadeRect.fillColor = step.color
          this.tweens.add({
            targets: this.cutsceneFadeRect,
            fillAlpha: step.alpha,
            duration: step.duration_ms,
            onComplete: () => resolve()
          })
          return
        }
        case 'shake':
          cam.shake(step.duration_ms, step.intensity ?? 0.005)
          this.time.delayedCall(step.duration_ms + 50, () => resolve())
          return
        default:
          resolve()
      }
    })
  }

  private handleNpcClick(id: string) {
    const entry = this.npcBears.get(id)
    if (!entry) return
    // V7.0 — build dialog context from runtime state (friendship + active festival + first-meeting)
    const friendship = this.friendships.get(id)
    const ctx = buildDialogContext({
      heart: friendship?.level ?? 0,
      event: getActiveFestivalId() ?? undefined,
      isFirstMeeting: !this.npcDialogMemory.has(id)
    })
    const line = pickDialog(entry.def, this.npcDialogMemory, ctx)
    const screen = this.bearScreenPos(entry.bear)
    showBubble('npc_' + id, line, screen.x, screen.y)
    // V7.4 — auto-give quests this NPC has, if friendship prereq met and not yet accepted
    for (const q of QUESTS) {
      if (q.giver_npc !== id) continue
      const heart = friendship?.level ?? 0
      if (heart < (q.prereq_heart ?? 0)) continue
      const st = getQuestState(q.id)
      if (st.accepted) continue
      acceptQuest(q.id)
      showToast(`📋 New quest: ${q.title}`, 3000)
      // Only auto-give one per click to avoid spam
      break
    }
    // V7.4 — count NPC click as "wave at" for quest progress
    onWaveAtQuest(id)
    // V8.1 — talking takes a sip of energy
    consumeEnergy(ENERGY_COST.interact)
    // V8.4 — meeting an NPC for the first time awards a few shells
    if (ctx.isFirstMeeting) {
      awardShells(SHELL_REWARD.npc_first_meet)
      this.time.delayedCall(700, () => showToast(`🐚 +${SHELL_REWARD.npc_first_meet} shells (first meet ${entry.def.name})`, 2400))
      // V9.0 — meeting an NPC counts as hospitality XP
      awardXp('hospitality', 5)
    } else {
      awardXp('hospitality', 1)
    }
    // V9.0 — high-heart NPC interaction also feeds companionship
    if ((friendship?.level ?? 0) >= 2) awardXp('companionship', 2)
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

  // V6.0 — door proximity (floating "→ Library" label near portals)
  private nearbyDoorPortal: Portal | null = null

  private checkDoorProximity() {
    if (!this.myBear) return
    const PROX = 48
    let nearest: Portal | null = null
    let bestD = Infinity
    for (const p of this.portals) {
      const cx = p.x + p.w / 2
      const cy = p.y + p.h / 2
      const d = Math.hypot(cx - this.myBear.x, cy - this.myBear.y)
      if (d < PROX && d < bestD) { nearest = p; bestD = d }
    }
    if (nearest !== this.nearbyDoorPortal) {
      this.nearbyDoorPortal = nearest
      if (!nearest) hideDoorLabel()
    }
    if (this.nearbyDoorPortal && this.myBear) {
      const screen = this.bearScreenPos(this.myBear)
      const target = this.nearbyDoorPortal.targetRoom
      let roomLabel = MAP_ROOMS.find(r => r.id === target)?.label
      if (!roomLabel) {
        if (isHomeRoom(target) || target === ('room_home_self' as RoomId)) roomLabel = 'Home'
        else roomLabel = String(target)
      }
      showDoorLabel(`→ ${roomLabel}`, screen.x, screen.y - 12)
    }
  }

  /** V6.0 — refresh minimap. Computes which rooms currently have NPCs. */
  private refreshMinimap() {
    const npcRooms: string[] = []
    if (this.npcManifest) {
      const now = new Date()
      for (const def of this.npcManifest.npcs) {
        for (const b of def.schedule) {
          // Mirror getActiveBracket logic (don't import again to keep this O(N) local)
          const from = b.from.split(':').map(Number)
          const to = b.to.split(':').map(Number)
          const fromMin = from[0]*60+from[1]
          const toMin = to[0]*60+to[1]
          const minutes = now.getHours()*60+now.getMinutes()
          if (toMin === 1439 ? (minutes >= fromMin && minutes <= toMin) : (minutes >= fromMin && minutes < toMin)) {
            npcRooms.push(b.room)
            break
          }
        }
      }
    }
    renderMinimap(this.currentRoomId, npcRooms)
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
          hideDoorLabel()
          sendRoomChange(targetRoom)
          this.scene.restart({ roomId: targetRoom, spawnPoint: targetSpawn })
        }
        if (fade) {
          // V6.7 — fade to warm cream rather than harsh black for softer transition
          this.cameras.main.fadeOut(220, 248, 240, 220)
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
      const prevX = this.myBear.x, prevY = this.myBear.y
      const usedKeyboard = this.applyKeyboard(dtMs)
      if (!usedKeyboard) {
        if (!this.myBear.target && this.myBear.state === 'walk') {
          this.myBear.state = 'idle'
          this.myBear.playIdle()
        }
        this.myBear.update(dtMs, false)
      }
      // V8.1 — energy: drain by distance walked, restore slowly while sitting
      const dx = this.myBear.x - prevX, dy = this.myBear.y - prevY
      const dist = Math.hypot(dx, dy)
      if (dist > 0.1) {
        // 30 tiles = 480px = 1 energy → 480/30 px per energy = 16 px/energy
        // accumulate fractional energy in a private bucket to avoid 0/0 drift
        this.energyDrainBucket = (this.energyDrainBucket ?? 0) + dist * ENERGY_COST.walk_per_tile / 16
        if (this.energyDrainBucket >= 1) {
          consumeEnergy(Math.floor(this.energyDrainBucket))
          this.energyDrainBucket -= Math.floor(this.energyDrainBucket)
        }
      } else if (this.myBear.state === 'sit') {
        // restore +1 every ~3s while sitting
        this.energyRestoreBucket = (this.energyRestoreBucket ?? 0) + dtMs / 3000
        if (this.energyRestoreBucket >= 1) {
          restoreEnergy(Math.floor(this.energyRestoreBucket))
          this.energyRestoreBucket -= Math.floor(this.energyRestoreBucket)
        }
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
      this.checkDoorProximity()
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
