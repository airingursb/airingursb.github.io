import Phaser from 'phaser'
import { Bear, registerBearAnimations } from '../bear'
import { connect, sendPos, sendAct, sendRoomChange, sendName, sendCollect, sendGift, sendDm, requestDmThread, sendDmRead, sendPlace, sendPickup, requestHomeDecorations, sendJamTap, sendLetterDrop, requestLettersInRoom, requestWishes, sendWishSubmit, sendWishVote, type ActMsg, type SnapMsg, type JoinMsg, type LeaveMsg, type PosMsg, type WelcomeMsg, type NameChangedMsg, type CollectedMsg, type FriendUpdateMsg, type FriendshipEntry, type GiftEntry, type GiftReceivedMsg, type GiftSentOkMsg, type GiftFailedMsg, type DmReceivedMsg, type DmSentOkMsg, type DmFailedMsg, type DmThreadMsg, type DmEntry, type HomeDecoration, type PlaceOkMsg, type PlaceFailedMsg, type PickupOkMsg, type PickupFailedMsg, type HomeDecorationBroadcast, type HomeDecorationsResponseMsg, type JamTapMsg, type JamBurstMsg, type LetterEntry, type LetterDropOkMsg, type LetterDropFailedMsg, type LetterAppearedMsg, type LettersInRoomMsg, type WishesListMsg, type WishSubmitOkMsg, type WishVoteOkMsg, type WishFailedMsg } from '../net'
import { loadPebbles, getPebblesInRoom, findPebble, getAllPebbles, type Pebble } from '../pebbles'
import { loadSeasons, getCurrentSeason, getCurrentHoliday, hexToInt } from '../seasons'
import { getCurrentPhase } from '../atmosphere'
import { renderMinimap, showDoorLabel, hideDoorLabel, setDoorLabelClickHandler, MAP_ROOMS } from '../minimap'
import { REGIONS, WALK_SPEED, ccToRegion, ccToFlag, ccToCountryName, prefersReducedMotion, isValidRoom, DEFAULT_ROOM, isHomeRoom, homeRoomFor as homeRoomForVisitor, getMySpecies, isOutdoorRoom, type Region, type RoomId, type Species } from '../config'
import { preloadAudio, bindAudio, preloadRoomAudio, playRoomBgm, playRoomAmbient, stopRoomAudio } from '../audio'
import { onUIEvent, showMenuAt, showBubble, hasActiveBubble, updateBubblePos, showInteractPrompt, hideInteractPrompt, updateInteractPromptPos, showNameModal, setInfoPanelDataProvider, showReplacedOverlay, showBoothPicker, hideBoothPicker, showNowPlaying, hideNowPlaying, setInventoryDataProvider, refreshInventoryPanel, showPeerMenu, showGiftModal, showToast, setMessagesProvider, refreshMessagesBadge, renderThreadView, getCurrentThreadFriendId, showLetterModal, showLetterRead, setupWishboard, renderWishboard, setOnSpeciesToggle, updateSpeciesButtonLabel, showProfileCard } from '../ui'
import { getBoothTracks, preloadBoothTracks, playBoothTrack, stopBoothTrack, getCurrentTrackName, type BoothTrack } from '../booth'
import { getEmote } from '../emotes'
import { getOverlayAt } from '../atmosphere'
import { getWeatherForDate } from '../weather'
import { footstepDust, clickRipple, pebbleSparkle, sitImpact, waveArc, letterFlutter } from '../feedback'
import { getIdentity, setLocalDisplayName, isFirstVisit, markNameChoicePrompted } from '../identity'
import { loadNpcManifest, getActiveBracket, pickDialog, buildDialogContext, type NpcDef, type NpcManifest } from '../npcs'
import { consumeStoryStep } from '../npc_stories'
import { getActiveFestivalId, getActiveFestival, hasCompletedTodaysActivity, markActivityDone, rollActivity } from '../festivals'
import { QUESTS, acceptQuest, getQuestState, onPebbleCollected as onPebbleCollectedQuest, onRoomVisited as onRoomVisitedQuest, onWaveAt as onWaveAtQuest } from '../quests'
import { findCutsceneForRoom, markFired, type CutsceneStep, type CutsceneDef } from '../cutscenes'
import { addNpcTalkHeart, getNpcHeartLevel, addNpcGiftHeart } from '../npc_hearts'
import { pickAmbientLine, pickNoticeLine } from '../npc_ambient'
import { pickExchange, pickPairFromPresent } from '../npc_smalltalk'
import { hasPet, activePetPerk, getPet } from '../pets'
import { PetSprite, ensurePetAtlasLoaded } from '../pet_sprite'
import { touchInput, consumeActionTap } from '../touch_input'
import { setBoardRoom, setBoardDisplayName } from '../board_ui'
import { setBoardProgressToken } from '../board'
import { setVisitsProgressToken } from '../home_visits'
import { portalHidden, getSeasonalInteractableFor } from '../seasonal_rules'
import { maybeJoinMorningCoffee, leaveMorningCoffeeIfNeeded, setCoffeeBannerHandler } from '../morning_coffee'
import { maybeNoticeCookAlong, leaveCookAlongIfNeeded, setCookBannerHandler, startOrJoinCookAlong } from '../group_cook'
import { maybeJoinJamCombo, leaveJamComboIfNeeded, setJamBannerHandler, noticeJamBurstTier } from '../group_jam'
import { tickNpcEvents, leaveNpcEventIfNeeded, setEventBannerHandler, currentEventStatus } from '../npc_events'
import { tickRandomEvents, getActiveEvent, attendEvent, type ActiveEvent } from '../random_events'
import { TransitNpcController } from '../transit_npcs'
import { spawnAmbientPets, tickAmbientPetProximity, reactPetsToPlayerEmote } from '../ambient_pets'
import { spawnSeasonalDecor } from '../seasonal_decor'
import { spawnTimeDecor } from '../time_decor'
import { spawnRoomDecals } from '../room_decals'
import { startAmbientSfx } from '../ambient_sfx'
import { spawnRoomMotion } from '../room_motion'
import { spawnWildlife } from '../wildlife'
import { FootprintTracker } from '../footprints'
import { startOrJoinDance, leaveDanceIfNeeded, initDance } from '../group_dance'
import { setPartyProgressToken } from '../party'
import { setPartyOnEnter, setPartyDisplayName } from '../party_ui'
import { getMarriage, setMarriage, getMarriagePebbleCount, consumeMarriagePebble, shouldGreetToday, markGreetedToday, spousePresenceWindow } from '../marriage'
import { recordEvent as recordAchievement, onAchievementUnlocked } from '../achievements'
import { getEnergy, consumeEnergy, restoreEnergy, COST as ENERGY_COST } from '../energy'
import { getEquippedTool, captureMemory } from '../memories'
import { savePhoto } from '../photos'
import { awardShells, claimDailyVisitBonus, SHELL_REWARD, hasPurchased, decoStorageKey } from '../shells'
import { awardXp, onLevelUp, walkSpeedMultiplier, bonusInventorySlots, SKILLS, type SkillId } from '../skills'
import { getActiveSpots, markPicked, addMaterial, removeMaterial as removeMaterialFn, getMaterial, MATERIALS, type MaterialId, type Spot as ResourceSpot } from '../resources'
import { activityForRoom, hasCompletedToday as hasCoopDoneToday, awardActivity as awardCoopActivity } from '../coop'
import { shouldPromptSleep, markSleepPrompted, performSleep } from '../sleep'
import { showSleepOverlay, refreshMailboxBadge, setProgressDataProvider, setWhosAroundProvider, type WhosAroundEntry, showSpeciesPicker, setCraftEnvProvider, setBundleAutoProvider } from '../ui'
import { formatGameTime, getGameNow } from '../gametime'
import { seedMailForToday, unreadCount as mailUnread, notifyFriendActivity } from '../mailbox'

const NPC_LABEL_COLOR = '#ffd166'
const NPC_LABEL_PREFIX = '✦ '
const NPC_REFRESH_MS = 10_000

// V11.3 + V11.8-review C1 fix — every room must be in this map or the
// audio loader silently skips it. Previously only 5 of 20 rooms had BGM
// (the rest played silent). All 10 bedrooms share bedroom_night.
const ROOM_AUDIO: Record<string, { bgmKey: string; bgmPath: string; ambKey: string; ambPath: string }> = {
  room_lobby:    { bgmKey: 'bgm_lobby_day',       bgmPath: '/lounge/assets/audio/bgm/lobby_day.ogg',
                   ambKey: 'amb_cafe_chatter',    ambPath: '/lounge/assets/audio/ambient/cafe_chatter.ogg' },
  room_dj_floor: { bgmKey: 'bgm_dj_floor_party',  bgmPath: '/lounge/assets/audio/bgm/dj_floor_party.ogg',
                   ambKey: 'amb_beat_thump',      ambPath: '/lounge/assets/audio/ambient/beat_thump.ogg' },
  room_balcony:  { bgmKey: 'bgm_balcony_outside', bgmPath: '/lounge/assets/audio/bgm/balcony_outside.ogg',
                   ambKey: 'amb_wind',            ambPath: '/lounge/assets/audio/ambient/wind.ogg' },
  room_library:  { bgmKey: 'bgm_library_quiet',   bgmPath: '/lounge/assets/audio/bgm/library_quiet.ogg',
                   ambKey: 'amb_pages_turning',   ambPath: '/lounge/assets/audio/ambient/pages_turning.ogg' },
  room_beach:    { bgmKey: 'bgm_beach_sun',       bgmPath: '/lounge/assets/audio/bgm/beach_sun.ogg',
                   ambKey: 'amb_waves',           ambPath: '/lounge/assets/audio/ambient/waves.ogg' },
  room_grove:    { bgmKey: 'bgm_grove_breeze',    bgmPath: '/lounge/assets/audio/bgm/grove_breeze.ogg',
                   ambKey: 'amb_wind',            ambPath: '/lounge/assets/audio/ambient/wind.ogg' },
  room_kitchen:  { bgmKey: 'bgm_kitchen_warm',    bgmPath: '/lounge/assets/audio/bgm/kitchen_warm.ogg',    ambKey: '', ambPath: '' },
  room_workshop: { bgmKey: 'bgm_workshop_tinker', bgmPath: '/lounge/assets/audio/bgm/workshop_tinker.ogg', ambKey: '', ambPath: '' },
  room_rooftop:  { bgmKey: 'bgm_rooftop_dusk',    bgmPath: '/lounge/assets/audio/bgm/rooftop_dusk.ogg',    ambKey: '', ambPath: '' },
  room_home_template:  { bgmKey: 'bgm_home_lullaby',   bgmPath: '/lounge/assets/audio/bgm/home_lullaby.ogg',  ambKey: '', ambPath: '' },
  room_bedroom_mio:    { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_halle:  { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_sora:   { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_theo:   { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_marin:  { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_cole:   { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_wren:   { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_dane:   { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_iris:   { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  room_bedroom_mox:    { bgmKey: 'bgm_bedroom_night',  bgmPath: '/lounge/assets/audio/bgm/bedroom_night.ogg', ambKey: '', ambPath: '' },
  // V13.1-V13.3 — 2nd floor rooms
  room_bath:        { bgmKey: 'bgm_home_lullaby',     bgmPath: '/lounge/assets/audio/bgm/home_lullaby.ogg',    ambKey: '', ambPath: '' },
  room_arcade:      { bgmKey: 'bgm_dj_floor_party',   bgmPath: '/lounge/assets/audio/bgm/dj_floor_party.ogg',  ambKey: 'amb_beat_thump', ambPath: '/lounge/assets/audio/ambient/beat_thump.ogg' },
  room_greenhouse:  { bgmKey: 'bgm_grove_breeze',     bgmPath: '/lounge/assets/audio/bgm/grove_breeze.ogg',    ambKey: '', ambPath: '' }
}

const PIXEL_TEX_KEY = 'lounge_pixel'

// Module-level cache so welcome data survives scene.restart when applyWelcome triggers a cross-room transition.
let welcomeCache: WelcomeMsg | null = null

// V3.0-A.9 — track whether the FIRST welcome's last_room snap-back has
// already been honored (or refused) once. After that flips true, every
// subsequent applyWelcome call skips the snap-back regardless of what
// room the user is currently in. Fixes the bug where transit beach→lobby
// would loop (lobby = DEFAULT_ROOM, the previous guard reopened on every
// scene.restart into lobby).
let firstWelcomeSnapBackResolved = false

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
type Interactable = { x: number; y: number; w: number; h: number; kind: string; anchorX: number; anchorY: number; facing: Direction; name: string; padIndex?: number; gameId?: string; material?: string; bathBuff?: boolean }

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
  // V15.0 — ambientNextAt drives idle-NPC ambient action cycling so they
  // don't read as mannequins. homeX/Y remember the spawn position so a
  // wandering NPC can stay within a small radius and not roam the room.
  // V15.1 — wanderNextAt drives short walks between home-relative points.
  // V15.2 — bubbleNextAt drives unprompted *thought* bubbles (humming, etc.).
  private npcBears = new Map<string, {
    bear: Bear; def: NpcDef
    ambientNextAt: number
    wanderNextAt: number
    bubbleNextAt: number
    homeX: number; homeY: number
  }>()
  private petSprite?: PetSprite                                    // V10.2 — follower
  private peerPets = new Map<string, PetSprite>()                  // V10.8c — peers' pet followers, keyed by session id
  private npcDialogMemory = new Map<string, string>()
  private npcRefreshTimer?: Phaser.Time.TimerEvent
  // V15.5 — pairwise NPC small-talk timer (scene-level, not per-NPC)
  private npcSmalltalkTimer?: Phaser.Time.TimerEvent
  private boothTracks: BoothTrack[] = []
  private activeBoothInteractable: Interactable | null = null
  private currentBoothTrackId: string | null = null
  private inventory = new Set<string>()
  private pebbleSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private seasonOverlay?: Phaser.GameObjects.Rectangle
  private seasonalEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private holidayEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private fireworksTimer?: Phaser.Time.TimerEvent           // V14.7
  // V21.2 — random event interactable + check timer
  private randomEventSprite?: Phaser.GameObjects.Container
  private randomEventTimer?: Phaser.Time.TimerEvent
  // V23.0 — transit NPCs (background bears walking through)
  private transitNpcs?: TransitNpcController
  // V23.9 — footprint tracker (sand / snow)
  private footprintTracker?: FootprintTracker
  // V23.12 — ambient pet sprites reference for proximity ticking
  private ambientPetSprites: Phaser.GameObjects.Container[] = []
  // V23.14 — winter breath puff state
  private breathPuffTimer?: Phaser.Time.TimerEvent
  // V23.17-review I4 — sentinel so the first idle-check after spawn
  // doesn't immediately satisfy (now - 0 > 3000) on every fresh scene.
  private lastBearMoveAt = -1
  private _lastBearPosX?: number
  private _lastBearPosY?: number
  // V23.13 + V23.17-review I1 — per-NPC heart-particle cooldown so
  // repeated room re-entries (each respawns NPCs) don't spam hearts.
  private heartParticleCooldown = new Map<string, number>()
  private static readonly HEART_PARTICLE_COOLDOWN_MS = 60_000
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
  // V22.5 — letter sprites are now pixel-art Containers (V22.5 replaced
  // the emoji Text). Container exposes x/y the same way Text did, so
  // tryReadLetterAt still works.
  private letterSprites = new Map<number, Phaser.GameObjects.Container>()

  constructor() {
    super({ key: 'Room' })
  }

  init(data: { roomId?: RoomId; spawnPoint?: string; welcomeX?: number; welcomeY?: number }) {
    this.currentRoomId = (data?.roomId && isValidRoom(data.roomId)) ? data.roomId : DEFAULT_ROOM
    this.spawnPointName = data?.spawnPoint ?? 'default'
    this.pendingSpawn = (typeof data?.welcomeX === 'number' && typeof data?.welcomeY === 'number')
      ? { x: data.welcomeX, y: data.welcomeY } : null
    this.welcomeApplied = false
    // CRITICAL: Phaser reuses the scene instance across restart(); class
    // field initializers only run in the constructor (once). Without this
    // reset, `transitioning` stays true after the first portal transition
    // and every subsequent portal early-returns in checkPortals/enterPortal,
    // breaking all doors in every room after the first.
    this.transitioning = false
    // V23.32 — same class-field-survival issue with the NPC + peer maps.
    // Phaser destroys sprites on shutdown but the Bear objects in these
    // Maps survive into the next scene, holding stale .sprite refs whose
    // .anims is undefined. First update() in the new room then calls
    // tickNpcWander → bear.walkTo → bear.playWalk → undefined.play and
    // throws, halting the entire scene update loop — observable as
    // "player stuck after walking into a new room".
    this.npcBears.clear()
    this.peers.clear()
    this.peerPets.clear()
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
    this.load.tilemapTiledJSON('room_bedroom_marin', '/lounge/assets/rooms/bedroom_marin.tmj')
    this.load.tilemapTiledJSON('room_bedroom_cole',  '/lounge/assets/rooms/bedroom_cole.tmj')
    this.load.tilemapTiledJSON('room_bedroom_wren',  '/lounge/assets/rooms/bedroom_wren.tmj')
    this.load.tilemapTiledJSON('room_bedroom_dane',  '/lounge/assets/rooms/bedroom_dane.tmj')
    this.load.tilemapTiledJSON('room_bedroom_iris',  '/lounge/assets/rooms/bedroom_iris.tmj')
    this.load.tilemapTiledJSON('room_bedroom_mox',   '/lounge/assets/rooms/bedroom_mox.tmj')
    this.load.tilemapTiledJSON('room_bath',          '/lounge/assets/rooms/bath.tmj')
    this.load.tilemapTiledJSON('room_arcade',        '/lounge/assets/rooms/arcade.tmj')
    this.load.tilemapTiledJSON('room_greenhouse',    '/lounge/assets/rooms/greenhouse.tmj')
    this.load.image('indoor_lobby_v0', '/lounge/assets/tilesets/indoor_lobby_v0/tiles.png')
    this.load.image('indoor_lobby_v1', '/lounge/assets/tilesets/indoor_lobby_v1/tiles.png')
    this.load.image('outdoor_beach_v0', '/lounge/assets/tilesets/outdoor_beach_v0/tiles.png')
    this.load.image('outdoor_grove_v1', '/lounge/assets/tilesets/outdoor_grove_v1/tiles.png')
    this.load.image('indoor_2f_v0',     '/lounge/assets/tilesets/indoor_2f_v0/tiles.png')
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
    // V11.8-review C1 fix: dynamic home rooms (room_home_<8hex>) inherit
    // the home_template entry so they get the lullaby BGM too.
    const audioKey = isHomeRoom(this.currentRoomId) ? 'room_home_template' : this.currentRoomId
    const ra = ROOM_AUDIO[audioKey]
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
    // V10.4 — log every room entry for the discovery-tier achievements
    recordAchievement({ type: 'visit_room', roomId: this.currentRoomId })
    // V12.7 — party rooms (room_party_<6chars>) reuse the lobby tilemap so
    // we don't need to bake a dedicated map. Server-side PARTY_FLOOR
    // already mirrors lobby's bounds.
    const isPartyRoom = /^room_party_[A-Z2-9]{6}$/.test(this.currentRoomId)
    const mapKey = isHomeRoom(this.currentRoomId)
      ? 'room_home_template'
      : isPartyRoom
        ? 'room_lobby'
        : this.currentRoomId
    const map = this.make.tilemap({ key: mapKey })
    // Tilemap may reference any of these tilesets. Phaser uses whichever name matches
    // the map's tileset entry; others return null and are ignored.
    const tileset = (
      map.addTilesetImage('indoor_2f_v0',     'indoor_2f_v0') ??
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

    // V11.8-review C1 fix: dynamic home rooms (room_home_<8hex>) inherit
    // the home_template entry so they get the lullaby BGM too.
    const audioKey = isHomeRoom(this.currentRoomId) ? 'room_home_template' : this.currentRoomId
    const ra = ROOM_AUDIO[audioKey]
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

    // V14.1 — morning coffee: try to join when entering Lobby in window,
    // leave when leaving the Lobby.
    leaveMorningCoffeeIfNeeded(this.currentRoomId)
    maybeJoinMorningCoffee(this.currentRoomId)
    setCoffeeBannerHandler((text) => {
      const el = document.getElementById('lounge-coffee-banner')
      const tx = document.getElementById('lounge-coffee-banner-text')
      if (!el) return
      if (text) { if (tx) tx.textContent = text; el.hidden = false }
      else el.hidden = true
    })

    // V14.2 — cook-along: notice on Kitchen entry, leave when not Kitchen
    leaveCookAlongIfNeeded(this.currentRoomId)
    maybeNoticeCookAlong(this.currentRoomId)
    setCookBannerHandler((text) => {
      const el = document.getElementById('lounge-cook-banner')
      const tx = document.getElementById('lounge-cook-banner-text')
      const btn = document.getElementById('lounge-cook-join') as HTMLButtonElement | null
      if (!el) return
      if (text) {
        if (tx) tx.textContent = text
        // Show "Join" button only when not yet in the session
        const inSession = !!((window as any).__loungeTest?.getCurrentGroup?.())
        if (btn) btn.hidden = inSession
        el.hidden = false
      } else el.hidden = true
    })
    // Wire "Start/Join cook-along" once
    const cookBtn = document.getElementById('lounge-cook-join') as HTMLButtonElement | null
    if (cookBtn && !cookBtn.dataset.bound) {
      cookBtn.dataset.bound = '1'
      cookBtn.addEventListener('click', () => startOrJoinCookAlong())
    }

    // V14.3 — jam combo on DJ Floor (only when ≥1 peer present)
    leaveJamComboIfNeeded(this.currentRoomId)
    if (this.currentRoomId === 'room_dj_floor') {
      // Delay so the snap message can populate peers first
      this.time.delayedCall(1500, () => {
        maybeJoinJamCombo(this.currentRoomId, this.peers.size)
      })
    }
    setJamBannerHandler((text) => {
      const el = document.getElementById('lounge-jam-banner')
      const tx = document.getElementById('lounge-jam-banner-text')
      if (!el) return
      if (text) { if (tx) tx.textContent = text; el.hidden = false }
      else el.hidden = true
    })
    // V14.5 — dance: leave on room change, init listener, wire Start button
    leaveDanceIfNeeded(this.currentRoomId)
    initDance()
    const danceBtn = document.getElementById('lounge-dance-start') as HTMLButtonElement | null
    if (danceBtn && !danceBtn.dataset.bound) {
      danceBtn.dataset.bound = '1'
      danceBtn.addEventListener('click', () => startOrJoinDance())
    }

    // V14.4 — NPC-hosted scheduled events banner + auto-join
    leaveNpcEventIfNeeded(this.currentRoomId)
    setEventBannerHandler((info) => {
      const el = document.getElementById('lounge-event-banner')
      const tx = document.getElementById('lounge-event-banner-text')
      const cta = document.getElementById('lounge-event-banner-cta') as HTMLButtonElement | null
      if (!el) return
      if (info) {
        if (tx) tx.textContent = info.text
        if (cta) { cta.hidden = !info.cta; cta.textContent = info.cta ?? '' }
        el.hidden = false
      } else el.hidden = true
    }, () => {
      // CTA: teleport to the event room if not already there
      const status = currentEventStatus()
      if (!status) return
      if (this.currentRoomId !== status.event.room) {
        sendRoomChange(status.event.room as RoomId)
        this.scene.restart({ roomId: status.event.room as RoomId, spawnPoint: 'default' })
      }
    })
    const eventCta = document.getElementById('lounge-event-banner-cta') as HTMLButtonElement | null
    if (eventCta && !eventCta.dataset.bound) {
      eventCta.dataset.bound = '1'
      eventCta.addEventListener('click', () => {
        import('../npc_events').then(m => m.triggerEventCta())
      })
    }
    tickNpcEvents(this.currentRoomId)

    // V14.7 — friday fireworks visual: when in Rooftop during the active
    // window, spawn periodic firework particle bursts in the sky area.
    this.fireworksTimer?.remove(false); this.fireworksTimer = undefined
    {
      const status = currentEventStatus()
      if (status && status.state === 'active' &&
          status.event.id === 'friday_fireworks' &&
          this.currentRoomId === 'room_rooftop') {
        ensurePixelTexture(this)
        const FIREWORK_COLORS = [0xff6080, 0x80ffa0, 0xffd166, 0x80b0ff, 0xff80c0]
        this.fireworksTimer = this.time.addEvent({
          delay: 800, loop: true, callback: () => {
            const x = 80 + Math.random() * (this.mapInfo.widthPx - 160)
            const y = 32 + Math.random() * 60
            const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
            const burst = this.add.particles(x, y, PIXEL_TEX_KEY, {
              speed: { min: 60, max: 140 },
              lifespan: 1100,
              quantity: 30,
              scale: { start: 2, end: 0 },
              tint: color,
              alpha: { start: 1, end: 0 }
            })
            this.time.delayedCall(120, () => burst.stop())
            this.time.delayedCall(1300, () => burst.destroy())
          }
        })
        this.events.once('shutdown', () => { this.fireworksTimer?.remove(false); this.fireworksTimer = undefined })
      }
    }

    // V21.0 — random event scheduler: tick every 30s to spawn/clear events.
    // Tick once at create() so a fresh page-load picks up an in-progress event.
    this.applyRandomEventState()
    this.randomEventTimer = this.time.addEvent({
      delay: 30_000, loop: true, callback: () => this.applyRandomEventState()
    })
    this.events.once('shutdown', () => {
      this.randomEventTimer?.remove(false); this.randomEventTimer = undefined
      this.randomEventSprite?.destroy(); this.randomEventSprite = undefined
    })
    // Click handler on the banner to teleport to the event room.
    const reBanner = document.getElementById('lounge-random-event-banner')
    if (reBanner && !reBanner.dataset.bound) {
      reBanner.dataset.bound = '1'
      reBanner.addEventListener('click', () => {
        const active = getActiveEvent()
        if (!active) return
        let targetRoom: RoomId = active.def.room
        if (targetRoom === ('room_home_self' as RoomId)) {
          targetRoom = homeRoomForVisitor(getIdentity().visitor_id) as RoomId
        }
        if (this.currentRoomId === targetRoom) return
        sendRoomChange(targetRoom)
        this.scene.restart({ roomId: targetRoom, spawnPoint: 'default' })
      })
    }

    // V12.1 — bind the community board to this room each scene boot
    {
      const lm: Record<string, string> = {
        room_lobby: 'Lobby', room_dj_floor: 'DJ Floor', room_balcony: 'Balcony',
        room_library: 'Library', room_beach: 'Beach', room_grove: 'Grove',
        room_kitchen: 'Kitchen', room_workshop: 'Workshop', room_rooftop: 'Rooftop',
        room_bath: 'Bath House', room_arcade: 'Arcade', room_greenhouse: 'Greenhouse'
      }
      const lbl = isHomeRoom(this.currentRoomId)
        ? 'Home'
        : (lm[this.currentRoomId] ?? this.currentRoomId.replace('room_', ''))
      setBoardRoom(this.currentRoomId, lbl)
    }

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
    // V17.1 — apply persisted mood (works before welcome lands, since
    // localStorage was hydrated last session or by applyWelcomeProfile)
    void import('../profile').then(p => this.myBear?.setMood(p.getMood() || null))
    // V18.0 — apply persisted cosmetics to myBear
    void import('../cosmetics').then(c => this.myBear?.setCosmetics(c.getEquippedCosmetics()))
    // V18.2 — when wardrobe equip/unequip happens, re-apply to bear and
    // push to server (in V18.3 onward — for now just updates the bear).
    void import('../wardrobe_ui').then(w => {
      w.setOnWardrobeChange(async (equipped) => {
        this.myBear?.setCosmetics(equipped)
        const { sendProfile } = await import('../net')
        sendProfile({ equipped_cosmetics: equipped })
      })
      w.setOnWardrobePurchase(async (_id, equipped) => {
        // Also sync owned set so the server remembers what the player unlocked.
        const { getOwnedCosmetics } = await import('../cosmetics')
        const { sendProfile } = await import('../net')
        sendProfile({ equipped_cosmetics: equipped, owned_cosmetics: getOwnedCosmetics() })
      })
    })
    // V6.7 — camera follows player smoothly. No-op for rooms that match canvas (currently all);
    // useful as future rooms grow larger than 480×320.
    this.cameras.main.startFollow(this.myBear.sprite, true, 0.08, 0.08)
    this.myBear.sprite.setDepth(5)

    // V10.2 — Pet follower. Lazy-loads cat atlas (universal art) then spawns
    // the small follower behind the player. Bound only when the player has
    // already adopted a pet (otherwise getPet() returns null and PetSprite
    // no-ops).
    if (hasPet()) {
      // V10.8b — load the actual pet atlas family (kitten→cat, puppy, bunny)
      const pet = getPet()
      if (pet) {
        ensurePetAtlasLoaded(this, pet.species, this.myRegion).then(() => {
          this.petSprite = new PetSprite(this, spawnX - 18, spawnY, this.myRegion)
        })
      }
    }
    // V10.7-review C2 fix: destroy the pet sprite on scene shutdown so room
    // transitions don't leak references onto a stale display list.
    // V10.8c — also clean up peer pets.
    this.events.once('shutdown', () => {
      this.petSprite?.destroy()
      this.petSprite = undefined
      this.peerPets.forEach(p => p.destroy())
      this.peerPets.clear()
    })

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
    // V12.8-review C1 fix: party rooms reuse the lobby TMJ, but the lobby's
    // portal objects would teleport party players right back out (to library,
    // beach, etc.). A party room is an ephemeral 4h hangout, not a hub —
    // skip portals entirely so the room is a sealed space.
    let portalObjects = isPartyRoom ? [] : (portalsLayer?.objects ?? [])
    // V13.6 — seasonal geometry: filter portals based on current season.
    // Currently winter blocks balcony→beach (toast tells the player why).
    portalObjects = portalObjects.filter((o: any) => {
      const props = (o.properties ?? []) as Array<{ name: string; value: unknown }>
      const target = props.find((p) => p.name === 'target_room')?.value
      if (typeof target !== 'string') return true
      return !portalHidden(this.currentRoomId, { name: (o.name as string) ?? '', targetRoom: target })
    })
    this.portals = portalObjects.map((o) => {
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
    // V13.7 — append a seasonal interactable to this room if one applies
    // right now (summer pool / fall pumpkin). Inserted before the map's
    // own interactables so prox-check stays simple.
    const seasonalIt = getSeasonalInteractableFor(this.currentRoomId)
    const allInteractObjs: any[] = [
      ...(seasonalIt ? [{
        name: seasonalIt.name,
        x: seasonalIt.x, y: seasonalIt.y,
        width: seasonalIt.w, height: seasonalIt.h,
        properties: [{ name: 'kind', type: 'string', value: seasonalIt.kind }]
      }] : []),
      ...(interactsLayer?.objects ?? [])
    ]
    this.interactables = allInteractObjs.map((o) => {
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
        padIndex: typeof padIndex === 'number' ? padIndex : undefined,
        // V13.2/V13.3 — new interactable kinds (arcade cabinets + gather spots)
        gameId: typeof get('game_id') === 'string' ? get('game_id') as string : undefined,
        material: typeof get('material') === 'string' ? get('material') as string : undefined,
        // V13.1 — bath_buff flag on the tub_sit interactable
        bathBuff: get('bath_buff') === true
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
      // Door-portal entry via Enter (matches the "↵ click" hint on the
      // floating door label). Without this binding the hint was a lie and
      // users had to find the orange pill at the bottom to teleport.
      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
      enterKey.on('down', () => this.tryInteract())
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
          // V23.35 — bear x/y are world coords; without camera scroll/zoom
          // the menu pinned to the canvas top-left whenever the camera had
          // moved. Convert world→canvas via camera matrix, then canvas→CSS.
          const cam = this.cameras.main
          const canvasX = (b.x - cam.worldView.x) * cam.zoom
          const canvasY = (b.y - 30 - cam.worldView.y) * cam.zoom
          const sX = this.scale.canvasBounds.x + canvasX * this.scale.displayScale.x
          const sY = this.scale.canvasBounds.y + canvasY * this.scale.displayScale.y
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

      // V23.22 — natural element click effects (pollen / ripple / dust).
      // Non-blocking: spawns the particle burst AND lets the bear walk
      // there. Per-room placements + visual effect both inline below.
      this.tryNaturalElementClick(wx, wy)

      this.autoWaveOnArrive = false
      let tx = wx, ty = wy
      tx = Math.max(20, Math.min(map.widthInPixels - 20, tx))
      ty = Math.max(20, Math.min(map.heightInPixels - 12, ty))
      // V23.24-review C2 — beach water is a tilemap background with no
      // collision rect, so a click in the upper 45% (water area) would
      // walk the bear ONTO the water visually. Clamp ty down to just
      // below the waterline so the bear approaches the shore instead.
      if (this.currentRoomId === 'room_beach') {
        const shoreY = Math.floor(map.heightInPixels * 0.48)
        if (ty < shoreY) ty = shoreY
      }
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
          showLetterModal((content, eternal) => {
            if (content) {
              sendLetterDrop(content, dropX, dropY, { eternal })
              recordAchievement({ type: 'letter_dropped' })
            }
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
        // V23.19 — NPC reactions to the player's emote. Nearby idle NPCs
        // (within 80px) have a 40% chance to wave back, and an 80% chance
        // to join in dancing. Triggered after a short delay so the social
        // exchange reads as call-and-response, not a robotic mirror.
        if (this.myBear && (e.verb === 'wave' || e.verb === 'dance')) {
          this.handleNpcReplyToEmote(e.verb)
          // V23.31 — ambient pets within ~70px also react with a happy
          // gesture (bigger hop / wag / stretch). Distinct from V23.12
          // proximity alert: this only fires on the player's emote.
          if (this.ambientPetSprites.length > 0) {
            reactPetsToPlayerEmote(this, this.ambientPetSprites, this.myBear.x, this.myBear.y, e.verb)
          }
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
        // V10.8c — also clear peer pets so we don't leak across rooms
        this.peerPets.forEach(p => p.destroy())
        this.peerPets.clear()
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
          // V10.8c — also rehydrate peer's pet
          if (p.pet_species && ['kitten','puppy','bunny'].includes(p.pet_species)) {
            this.spawnPeerPet(p.id, p.pet_species as any, p.pet_name ?? '', p.x - 18, p.y, ccToRegion(p.cc))
          }
          // V17.0 — cache profile fields the snap carries (server adds them on snap)
          // V17.1 — also apply mood to bear so peer's mood emoji appears immediately
          // V18.4 — and cosmetics so the bear arrives in the room already wearing them
          const anyP = p as any
          if (typeof anyP.mood === 'string') bear.setMood(anyP.mood || null)
          if (Array.isArray(anyP.equipped_cosmetics)) bear.setCosmetics(anyP.equipped_cosmetics)
          if (p.visitor_id) {
            void import('../profile').then(prof => prof.cachePeerProfile(p.visitor_id!, {
              bio: anyP.bio ?? null, status: anyP.status ?? null,
              mood: anyP.mood ?? null,
              pinned_achievements: Array.isArray(anyP.pinned_achievements) ? anyP.pinned_achievements : [],
              equipped_cosmetics: Array.isArray(anyP.equipped_cosmetics) ? anyP.equipped_cosmetics : [],
              pinned_photos: Array.isArray(anyP.pinned_photos) ? anyP.pinned_photos : []
            }))
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
          if (fr) {
            bear.setFriendshipLevel(fr.level)
            // V10.6 — friend visible (online or in this room). If the room is
            // my own Home, that's a "home_visit", else a generic "online".
            const myHome = `room_home_${getIdentity().visitor_id.slice(0, 8)}`
            const kind = this.currentRoomId === myHome ? 'home_visit' : 'online'
            notifyFriendActivity({ friend_id: m.visitor_id, friend_name: fr.display_name ?? null, kind })
            refreshMailboxBadge()
          }
        }
        this.peers.set(m.id, { bear, lastUpdate: performance.now() })
        if (species !== 'bear') {
          this.ensureSpeciesLoaded(species).then(() => bear.setSpecies(species))
        }
        // V17.0 — cache profile fields the join carries
        // V17.1 — also apply mood to the peer's bear immediately
        // V18.4 — and cosmetics so the bear renders with hat from the moment they arrive
        const anyM = m as any
        if (typeof anyM.mood === 'string') bear.setMood(anyM.mood || null)
        if (Array.isArray(anyM.equipped_cosmetics)) bear.setCosmetics(anyM.equipped_cosmetics)
        if (m.visitor_id) {
          void import('../profile').then(prof => prof.cachePeerProfile(m.visitor_id!, {
            bio: anyM.bio ?? null, status: anyM.status ?? null,
            mood: anyM.mood ?? null,
            pinned_achievements: Array.isArray(anyM.pinned_achievements) ? anyM.pinned_achievements : [],
            equipped_cosmetics: Array.isArray(anyM.equipped_cosmetics) ? anyM.equipped_cosmetics : [],
            pinned_photos: Array.isArray(anyM.pinned_photos) ? anyM.pinned_photos : []
          }))
        }
        // V10.8c — peer pet relay
        if (m.pet_species && ['kitten','puppy','bunny'].includes(m.pet_species)) {
          this.spawnPeerPet(m.id, m.pet_species as any, m.pet_name ?? '', m.x - 18, m.y, ccToRegion(m.cc))
        }
      },
      onLeave: (m: LeaveMsg) => {
        const peer = this.peers.get(m.id)
        if (peer) { peer.bear.destroy(); this.peers.delete(m.id) }
        this.peerVisitorIds.delete(m.id)
        this.peerCCs.delete(m.id)
        // V10.8c — clean up the peer's pet if any
        const pp = this.peerPets.get(m.id)
        if (pp) { pp.destroy(); this.peerPets.delete(m.id) }
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
      // V17.0 — cache peer profile updates (V17.2 card reads from cache)
      // V17.1 — also update the peer bear's mood emoji live
      // V18.4 — and re-equip cosmetics live so wardrobe changes show up
      onProfileChanged: (m) => {
        const vid = this.peerVisitorIds.get(m.id) ?? null
        const peer = this.peers.get(m.id)
        if (peer) {
          peer.bear.setMood(m.mood || null)
          if (Array.isArray(m.equipped_cosmetics)) peer.bear.setCosmetics(m.equipped_cosmetics)
        }
        void import('../profile').then(p => p.cachePeerProfile(vid, {
          bio: m.bio, status: m.status, mood: m.mood,
          pinned_achievements: m.pinned_achievements,
          equipped_cosmetics: m.equipped_cosmetics,
          pinned_photos: m.pinned_photos
        }))
      },
      // V17.5-review I2 — honest toast on profile save ack/fail
      onProfileOk: () => {
        void import('../ui').then(u => u.showProfileResultToast(true))
      },
      onProfileFailed: (m) => {
        void import('../ui').then(u => u.showProfileResultToast(false, m.reason))
      },
      // V20.3 — cache reaction sets when server replies, then re-render
      // the profile card (if open) so chips appear.
      // V20.4-review C1 — rerenderProfileCardIfOpen actually performs the
      // re-render; without this, first-open showed a blank chip row.
      onPhotoReactions: (m) => {
        void import('../ui').then(u => {
          u.setPhotoReactions(m.owner_visitor_id, m.photo_id, m.reactions)
          u.rerenderProfileCardIfOpen(m.owner_visitor_id)
        })
      },
      // Server broadcasts invalidation when someone reacts — refetch.
      onPhotoReactionsInvalidated: async (m) => {
        const { sendPhotoReactionsRequest } = await import('../net')
        sendPhotoReactionsRequest(m.owner_visitor_id, [m.photo_id])
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

    // V17.1 — when the profile editor saves a new mood, apply it to my bear
    // immediately (don't wait for the server's profile_changed echo since
    // that broadcast goes to peers only — not back to self).
    void import('../ui').then(u => u.setOnLocalMoodChange((mood: string) => {
      this.myBear?.setMood(mood || null)
    }))
    // V20.3 — wire photo reaction handler so card buttons send over WS.
    void import('../ui').then(async (u) => {
      const { sendPhotoReact } = await import('../net')
      u.setOnPhotoReact((ownerVid: string, photoId: string, emoji: string) => {
        sendPhotoReact(ownerVid, photoId, emoji)
      })
    })

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
            // CRITICAL: species atlases are lazy-loaded. Without
            // ensureSpeciesLoaded, setSpecies falls back to the default
            // 'bear_${region}' texture (see Bear.setSpecies in bear.ts) so
            // the player sees a bear regardless of what they picked. The
            // peer-side species change path already awaits this — the
            // first-visit picker was the only spot missing it.
            await this.ensureSpeciesLoaded(s)
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
        room_bedroom_sora: "Sora's room", room_bedroom_theo: "Theo's room",
        room_bedroom_marin: "Marin's room", room_bedroom_cole: "Cole's room",
        room_bedroom_wren: "Wren's room", room_bedroom_dane: "Dane's room",
        room_bedroom_iris: "Iris's room", room_bedroom_mox: "Mox's room",
        // V13.1-V13.3 — 2nd floor
        room_bath: "Bath House", room_arcade: "Arcade", room_greenhouse: "Greenhouse"
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
          if (!hasPurchased(decoStorageKey(d.id) as any)) continue
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
          total: all.length + OWNED_DECO.filter(d => hasPurchased(decoStorageKey(d.id) as any)).length,
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

    // V12.8-review I5 fix: keep welcomeCache populated across scene restarts.
    // The earlier impl nulled it after the first restart, so a second home/
    // party transition booted a scene with empty friendships / decorations /
    // gifts → friend-home decorations never rendered, peer hearts blank.
    // welcomeCache only clears on full WS disconnect (handled in net.ts via
    // setProgressToken(null), unrelated to scene lifecycle).
    if (welcomeCache) {
      this.welcomeApplied = false
      this.applyWelcome(welcomeCache)
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
      // V12.1 — same token gates the board POST/DELETE endpoints
      setBoardProgressToken(m.progress_token)
      // V12.5 — same token gates the home visit log read
      setVisitsProgressToken(m.progress_token)
      // V12.7 — party-room create requires the same HMAC token
      setPartyProgressToken(m.progress_token)
    }
    // V12.1 — display name for the board post author field
    setBoardDisplayName(m.display_name ?? this.myDisplayName ?? null)
    // V12.7 — same name shows as the party room owner
    setPartyDisplayName(m.display_name ?? this.myDisplayName ?? null)
    // E5-P0c + P7-review I7 — reconcile species, but skip if we just toggled
    // locally (in-flight sendSpecies may not have hit the DB yet). Recently =
    // last 5s.
    const recentToggle = (performance.now() - (this.lastSpeciesToggleAt ?? -Infinity)) < 5000
    if (m.species && m.species !== getMySpecies() && !recentToggle) {
      // V16.4-review I1 — was hardcoded to the original 5-species union and
      // would silently rot the day someone adds runtime narrowing in
      // setMySpecies. Use the shared Species type so future additions
      // (bunny/puppy/panda/hamster/penguin/frog and beyond) just work.
      const s = m.species as Species
      import('../config').then(({ setMySpecies }) => setMySpecies(s))
      // Same lazy-load gotcha as the species picker: setSpecies silently
      // falls back to bear when the atlas isn't cached, so we have to
      // await the atlas before applying.
      this.ensureSpeciesLoaded(s).then(() => {
        this.myBear?.setSpecies(s)
        updateSpeciesButtonLabel(s)
      })
    }

    // V17.0 — hydrate local profile from server's canonical values so a new
    // device picks up bio/status/mood/pinned set elsewhere.
    // V17.1 — also push the hydrated mood onto myBear immediately.
    // V18.6-review I4 — applyWelcomeProfile mutates owned + equipped
    // cosmetics asynchronously (lazy import of cosmetics module). Re-apply
    // to myBear after that resolves so stale local cosmetics from a prior
    // session don't linger on the bear after welcome lands with the
    // server's authoritative empty set.
    import('../profile').then(async (p) => {
      p.applyWelcomeProfile(m)
      this.myBear?.setMood(p.getMood() || null)
      const cosmeticsMod = await import('../cosmetics')
      // Give applyWelcomeProfile's own dynamic import a microtask to land.
      await Promise.resolve()
      this.myBear?.setCosmetics(cosmeticsMod.getEquippedCosmetics())
    })

    // Stash welcome data on a module-level cache so the post-restart scene can read it.
    welcomeCache = m

    // V3.0-A.9 — Snap-back happens AT MOST ONCE per JS context (the first
    // welcome message after page load). The PREVIOUS guard checked
    // `currentRoomId === DEFAULT_ROOM` but DEFAULT_ROOM = lobby, so
    // transit beach→lobby reopened the guard and looped (snap back to
    // beach → init → restart to lobby → snap back to beach → ...).
    //
    // Now we track a module-level flag that flips true after the first
    // applyWelcome's snap-back decision (whether taken or skipped).
    // Subsequent applyWelcome calls — which fire when scene.restart
    // re-runs from welcomeCache — never re-trigger snap-back.
    const shouldSnapBack =
      !firstWelcomeSnapBackResolved
      && m.last_room
      && m.last_room !== this.currentRoomId
      && isValidRoom(m.last_room)
    firstWelcomeSnapBackResolved = true

    if (shouldSnapBack) {
      const targetRoom = m.last_room as RoomId  // shouldSnapBack guarantees non-null + valid
      const wx = (typeof m.last_x === 'number') ? m.last_x : undefined
      const wy = (typeof m.last_y === 'number') ? m.last_y : undefined
      this.transitioning = true
      stopRoomAudio()
      stopBoothTrack()
      hideNowPlaying()
      hideBoothPicker()
      if (this.atmosphereTimer) { this.atmosphereTimer.remove(false); this.atmosphereTimer = undefined }
      if (this.npcRefreshTimer) { this.npcRefreshTimer.remove(false); this.npcRefreshTimer = undefined }
      if (this.npcSmalltalkTimer) { this.npcSmalltalkTimer.remove(false); this.npcSmalltalkTimer = undefined }
      this.seasonalEmitter?.destroy(); this.seasonalEmitter = undefined
      this.holidayEmitter?.destroy(); this.holidayEmitter = undefined
      this.seasonOverlay?.destroy(); this.seasonOverlay = undefined
      sendRoomChange(targetRoom)
      this.scene.restart({ roomId: targetRoom, spawnPoint: 'default', welcomeX: wx, welcomeY: wy })
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
        // V3.0-A.1 — if signed in, propagate to account so it survives device
        // switches and reaches all linked lounge_visitors rows server-side.
        void import('../auth').then(async (a) => {
          if (a.isLoggedIn()) {
            const r = await a.updateDisplayName(chosen)
            if (!r.ok) console.warn('[nook] account name update failed:', r.error)
          }
        })
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
      if (action === 'profile') {
        // V17.2 — surface the peer's bio/status/mood/pinned card
        // V20.2 — also passes ownerVisitorId so the card can show + send reactions
        const vid = this.peerVisitorIds.get(peerSessionId) ?? null
        const name = peerBear.displayName ?? this.fallbackName(null, this.peerCCs.get(peerSessionId) ?? null)
        void import('../profile').then(p => {
          const cached = p.getPeerProfile(vid)
          showProfileCard(name, cached, vid)
          // V20.3 — request reactions for any pinned photos this peer shows
          const photoIds = (cached?.pinned_photos ?? []).map(ph => ph.id)
          if (vid && photoIds.length > 0) {
            void import('../net').then(n => n.sendPhotoReactionsRequest(vid, photoIds))
          }
        })
        return
      }
      if (action === 'wave') {
        this.walkToAndWave(peerSessionId, peerBear)
      } else if (action === 'gift') {
        this.openGiftFlow(peerSessionId)
      } else if (action === 'dm') {
        this.openDmFlow(peerSessionId)
      } else if (action === 'visit_home') {
        // V12.4 — visit this peer's home. Friend-only gate keeps stranger
        // homes private; non-friends get a toast explaining why.
        const vid = this.peerVisitorIds.get(peerSessionId)
        if (!vid) { showToast('Could not find that visitor.'); return }
        if (!this.friendships.has(vid)) {
          showToast("You need to be friends to visit their home — spend time in the same room.", 2800)
          return
        }
        const targetRoom = `room_home_${vid.slice(0, 8)}` as RoomId
        sendRoomChange(targetRoom)
        this.scene.restart({ roomId: targetRoom, spawnPoint: 'default' })
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
    recordAchievement({ type: 'gift_sent' })
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
    // V8.4 — accepting a gift earns shells. V10.2: kitten pet perk → +10%.
    let reward = SHELL_REWARD.gift_accepted
    if (activePetPerk() === 'pet_kitten_shells') reward = Math.ceil(reward * 1.1)
    awardShells(reward)
    this.time.delayedCall(2000, () => showToast(`🐚 +${reward} shells (gift accepted)`, 2000))
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
    // V10.7-review C3 fix: feed player↔player friendship level to achievements
    recordAchievement({ type: 'friend_level', level: m.level })
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
    recordAchievement({ type: 'jam_tap' })
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
    // V14.3 — bubble tier up to the jam_combo group session counter
    noticeJamBurstTier(m.tier)

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
    // V22.5 — replaced the 📜 / 🌊 emoji with pixel-art Phaser Graphics
    // containers so floor letters share the visual language of the bear
    // sprites + V22 UI icons. Eternal letters render as a corked bottle
    // (drift bottle); regular letters as a folded paper.
    const container = l.eternal
      ? this.drawDriftBottleSprite(l.x, l.y)
      : this.drawLetterPaperSprite(l.x, l.y)
    container.setDepth(4)
    // Make a generously-sized hit area so taps land easily on mobile.
    container.setInteractive(new Phaser.Geom.Rectangle(-10, -10, 20, 20), Phaser.Geom.Rectangle.Contains)
    container.input!.cursor = 'pointer'
    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: container, y: l.y - 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
    }
    this.letterSprites.set(id, container)
  }

  /** V22.5 — folded paper, 14×11 px @ 1.5 game-px each. */
  private drawLetterPaperSprite(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y)
    const g = this.add.graphics()
    const PIX = 1.5
    // Color palette
    const OUTLINE = 0x3a2820, PAPER = 0xf0e6c8, FOLD = 0xc8b888, TEXT = 0x7a6040
    // Pixel grid (16×12; '.'=transparent, '1'=outline, '4'=paper, '2'=fold, '5'=text)
    const GRID = [
      '................',
      '..11111111111...',
      '..14444444441...',
      '..1422222444l...',
      '..1422224444l...',
      '..1422244444l...',
      '..14555555441...',
      '..14444444441...',
      '..14555555441...',
      '..11111111111...',
      '................',
      '................'
    ]
    const W = 16, H = 12
    const offX = -W * PIX / 2, offY = -H * PIX / 2
    for (let py = 0; py < GRID.length; py++) {
      const row = GRID[py]
      for (let px = 0; px < row.length; px++) {
        const ch = row[px]
        if (ch === '.') continue
        let color: number
        switch (ch) {
          case '1': color = OUTLINE; break
          case '4': color = PAPER; break
          case '2': color = FOLD; break
          case '5': color = TEXT; break
          case 'l': color = 0x2a1810; break  // shadow edge
          default: continue
        }
        g.fillStyle(color, 1)
        g.fillRect(offX + px * PIX, offY + py * PIX, PIX, PIX)
      }
    }
    c.add(g)
    return c
  }

  /** V22.5 — corked drift bottle, 12×16 px @ 1.5 game-px each. */
  private drawDriftBottleSprite(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y)
    const g = this.add.graphics()
    const PIX = 1.5
    const OUTLINE = 0x1a3838, GLASS = 0x80c8d8, CORK = 0xa87848, PAPER = 0xe6dcc4, SHINE = 0xffffff
    const GRID = [
      '................',
      '......11........',
      '.....1331.......',
      '......11........',
      '......11........',
      '.....1441.......',
      '....144441......',
      '...12444421.....',
      '..1224444421....',
      '..1224554421....',
      '..1224554421....',
      '..1224444421....',
      '..1224444421....',
      '..1224444421....',
      '..122444442l....',
      '..111111111l....'
    ]
    const W = 16, H = 16
    const offX = -W * PIX / 2, offY = -H * PIX / 2
    for (let py = 0; py < GRID.length; py++) {
      const row = GRID[py]
      for (let px = 0; px < row.length; px++) {
        const ch = row[px]
        if (ch === '.') continue
        let color: number, alpha = 1
        switch (ch) {
          case '1': color = OUTLINE; break
          case '2': color = GLASS; alpha = 0.85; break
          case '3': color = CORK; break
          case '4': color = GLASS; alpha = 0.55; break  // glass body fill
          case '5': color = PAPER; break                  // rolled note inside
          case 'l': color = OUTLINE; alpha = 0.5; break   // shadow edge
          default: continue
        }
        g.fillStyle(color, alpha)
        g.fillRect(offX + px * PIX, offY + py * PIX, PIX, PIX)
      }
    }
    // A tiny shine pixel on the bottle shoulder
    g.fillStyle(SHINE, 0.6)
    g.fillRect(offX + 3 * PIX, offY + 8 * PIX, PIX, PIX)
    c.add(g)
    return c
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
    // V10.6 — if the letter author is a friend, notify regardless of room.
    const fr = this.friendships.get(m.author_visitor_id)
    if (fr) { notifyFriendActivity({ friend_id: m.author_visitor_id, friend_name: m.author_name ?? fr.display_name ?? null, kind: 'sent_letter' }); refreshMailboxBadge() }
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
      x: m.x, y: m.y, content: m.content, dropped_at: m.dropped_at, eternal: m.eternal === true
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
    // V10.7-review C3 fix: home decoration placement → achievement
    recordAchievement({ type: 'home_decoration_placed' })
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
      // Loader errors → still resolve so caller falls back to bear texture.
      // V16.4-review N1 — emit a console.warn so a flaky CDN / asset typo
      // is debuggable instead of silently rendering as bear.
      const onError = (file: Phaser.Loader.File) => {
        if (file.key?.startsWith(`${species}_`)) {
          console.warn(`[lounge] species '${species}' atlas load failed (${file.key}); falling back to bear`)
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
                const shopId = decoStorageKey(res.itemReward.id)
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
    // V23.28 — shared OUTDOOR_ROOMS constant from config.ts.
    const isOutdoor = isOutdoorRoom(this.currentRoomId)
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
    // V23.20 — lightning + thunder during storms. Every 30-90s spawn a
    // brief white flash overlay; 1-3s later play a synth thunder boom
    // (delay simulates light vs sound speed). Only when isOutdoor so the
    // visual makes sense (rain still hits indoor windows but lightning
    // through a wall reads as a bug).
    if (weather === 'storm' && isOutdoor) {
      const fireLightning = () => {
        const flash = this.add.rectangle(0, 0, widthPx, heightPx, 0xffffff, 0)
          .setOrigin(0).setDepth(1003).setBlendMode(Phaser.BlendModes.SCREEN)
        // Double flash for realism (real lightning is multi-stroke)
        this.tweens.add({
          targets: flash, alpha: { from: 0, to: 0.65 },
          duration: 60, yoyo: true,
          onComplete: () => {
            this.tweens.add({
              targets: flash, alpha: { from: 0, to: 0.45 },
              delay: 80, duration: 70, yoyo: true,
              onComplete: () => flash.destroy()
            })
          }
        })
        // Thunder synth ~1-3s after lightning
        const thunderDelay = 1000 + Math.random() * 2000
        this.time.delayedCall(thunderDelay, () => this.playThunderBoom())
      }
      const startLightning = () => {
        this.lightningTimer = this.time.delayedCall(30_000 + Math.random() * 60_000, () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fireLightning()
          }
          startLightning()
        })
      }
      startLightning()
      this.events.once('shutdown', () => { this.lightningTimer?.remove(false); this.lightningTimer = undefined })
      this.events.once('destroy',  () => { this.lightningTimer?.remove(false); this.lightningTimer = undefined })
    }
  }

  private lightningTimer?: Phaser.Time.TimerEvent
  // V23.23 — player auto-idle gesture timer
  private idleGestureTimer?: Phaser.Time.TimerEvent

  /** V23.23 — small player-only ambient gesture when truly idle. Skips
   *  if the bear isn't in 'idle' state or hasn't been still ≥30s. Pure
   *  client-local; doesn't broadcast over WS (other peers see the
   *  position-stop, that's enough).
   *  Action mix: 60% change facing, 30% brief wave, 10% sit-and-stand. */
  private tryIdleGesture() {
    if (!this.myBear) return
    if (this.myBear.state !== 'idle' || this.myBear.target) return
    if (this.lastBearMoveAt < 0) return
    if (this.time.now - this.lastBearMoveAt < 30_000) return
    const reduced = prefersReducedMotion()
    const r = Math.random()
    if (r < 0.6) {
      const dirs = ['up', 'down', 'left', 'right'] as const
      const next = dirs[Math.floor(Math.random() * dirs.length)]
      if (next !== this.myBear.facing) {
        this.myBear.facing = next
        this.myBear.playIdle()
      }
    } else if (r < 0.9) {
      this.myBear.applyEmote('wave', 1500, reduced)
    } else {
      this.myBear.applyEmote('sit', 0, reduced)
      this.time.delayedCall(3500 + Math.random() * 2500, () => {
        if (this.myBear && this.myBear.state === 'sit') {
          this.myBear.applyEmote('sit', 0, reduced)
        }
      })
    }
  }

  /** V23.20 — synthesized thunder rumble: filtered low-freq noise burst
   *  with long decay. Uses Web Audio API directly (same pattern as
   *  V23.16 bird startle), gated by the player's SFX volume. */
  private playThunderBoom() {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return
    try {
      const ctx = new Ctor()
      if (ctx.state === 'suspended') void ctx.resume()
      const t = ctx.currentTime
      const dur = 2.4
      // Brown-noise-ish buffer
      const bufferSize = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buf.getChannelData(0)
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = (Math.random() * 2 - 1)
        data[i] = (lastOut + 0.02 * white) / 1.02
        lastOut = data[i]
      }
      const src = ctx.createBufferSource(); src.buffer = buf
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'; filter.frequency.value = 200; filter.Q.value = 0.7
      const master = ctx.createGain()
      // Sharp attack, long decay
      master.gain.setValueAtTime(0, t)
      master.gain.linearRampToValueAtTime(0.7, t + 0.04)
      master.gain.exponentialRampToValueAtTime(0.001, t + dur)
      const vol = ctx.createGain()
      const sfxVol = 0.6  // thunder is a feature; let it cut through
      vol.gain.value = sfxVol
      src.connect(filter); filter.connect(master); master.connect(vol); vol.connect(ctx.destination)
      src.start(t); src.stop(t + dur)
      setTimeout(() => { try { ctx.close() } catch {} }, (dur + 0.2) * 1000)
    } catch {}
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
    // V10.7-review N3 fix: publish manifest count so meet_all_npcs scales
    ;(window as any).__loungeNpcCount = this.npcManifest.npcs.length
    // V19.3 — expose manifest so stories_ui can look up npc names
    ;(window as any).__loungeNpcManifest = this.npcManifest
    this.refreshNpcs()
    this.refreshMinimap()  // now that we know NPC locations, repaint the minimap dots
    this.npcRefreshTimer = this.time.addEvent({
      delay: NPC_REFRESH_MS,
      loop: true,
      callback: () => this.refreshNpcs()
    })
    // V23.0 — transit NPCs: a background bear walks across the room
    // every 90-180s. Only in "social" rooms (lobby/dj/library/grove/beach),
    // skipped in personal homes + private party rooms.
    const TRANSIT_ROOMS = new Set(['room_lobby', 'room_dj_floor', 'room_library', 'room_grove', 'room_beach', 'room_balcony'])
    if (TRANSIT_ROOMS.has(this.currentRoomId)) {
      this.transitNpcs = new TransitNpcController(this, this.mapInfo.widthPx, this.mapInfo.heightPx, this.currentRoomId)
      this.transitNpcs.start()
      this.events.once('shutdown', () => { this.transitNpcs?.destroy(); this.transitNpcs = undefined })
      this.events.once('destroy',  () => { this.transitNpcs?.destroy(); this.transitNpcs = undefined })
    }
    // V23.1 — ambient pets per room (sleeping cat / sitting dog / curled bunny).
    // V23.5-review I4 — register both shutdown AND destroy listeners for
    // parity with V23.2-4. Phaser usually fires shutdown, but a forced
    // game destroy mid-preload races would leak the pets without this.
    const ambientPetSprites = spawnAmbientPets(this, this.currentRoomId, prefersReducedMotion())
    const cleanupPets = () => { for (const s of ambientPetSprites) s.destroy() }
    this.events.once('shutdown', cleanupPets)
    this.events.once('destroy',  cleanupPets)
    // V23.12 — proximity-react ticker (stored so update() can use)
    this.ambientPetSprites = ambientPetSprites
    // V23.2 — seasonal decorations (cherry blossoms in spring grove, etc.).
    // Layered on top of weather (snow + season co-exist).
    const seasonalDispose = spawnSeasonalDecor(this, this.currentRoomId, this.mapInfo.widthPx, this.mapInfo.heightPx, prefersReducedMotion())
    this.events.once('shutdown', seasonalDispose)
    this.events.once('destroy',  seasonalDispose)
    // V23.3 — time-of-day flourishes (sun shafts at day, fireflies at night).
    const timeDispose = spawnTimeDecor(this, this.currentRoomId, this.mapInfo.widthPx, this.mapInfo.heightPx, prefersReducedMotion())
    this.events.once('shutdown', timeDispose)
    this.events.once('destroy',  timeDispose)
    // V23.25 — per-room overlay decals (books in library, steam + utensils
    // in kitchen, anvil + sawdust in workshop, weather vane on rooftop).
    const decalDispose = spawnRoomDecals(this, this.currentRoomId, this.mapInfo.widthPx, this.mapInfo.heightPx, prefersReducedMotion())
    this.events.once('shutdown', decalDispose)
    this.events.once('destroy',  decalDispose)
    // V23.4 — sparse ambient micro-SFX (bell chime in library, gull cry on
    // the beach, etc.). Web-Audio synth, gated by player's SFX volume.
    const ambientSfxDispose = startAmbientSfx(this.currentRoomId)
    this.events.once('shutdown', ambientSfxDispose)
    this.events.once('destroy',  ambientSfxDispose)
    // V23.7 — per-room small motion details (clock pendulum, candle flame,
    // stove + kettle steam, wind chime).
    const roomMotionDispose = spawnRoomMotion(this, this.currentRoomId, this.mapInfo.widthPx, this.mapInfo.heightPx, prefersReducedMotion())
    this.events.once('shutdown', roomMotionDispose)
    this.events.once('destroy',  roomMotionDispose)
    // V23.8 — wildlife particles (butterflies, dragonfly, bats, fish jump).
    // Gated on season × time-of-day × room.
    const wildlifeDispose = spawnWildlife(this, this.currentRoomId, this.mapInfo.widthPx, this.mapInfo.heightPx, prefersReducedMotion())
    this.events.once('shutdown', wildlifeDispose)
    this.events.once('destroy',  wildlifeDispose)
    // V23.9 — footprint tracker. Only active on beach (sand) or any
    // outdoor room when weather is snow. onMove() is called from update().
    if (!prefersReducedMotion()) {
      this.footprintTracker = new FootprintTracker(this, this.currentRoomId)
      this.events.once('shutdown', () => { this.footprintTracker?.destroy(); this.footprintTracker = undefined })
      this.events.once('destroy',  () => { this.footprintTracker?.destroy(); this.footprintTracker = undefined })
    }
    // V23.16 — grove bird-startle Easter egg. Invisible hitzone covers the
    // canopy area (top ~30% of the room); clicking it flushes a small flock
    // of bird particles that fly off in fan + a brief chirp burst.
    if (this.currentRoomId === 'room_grove') {
      const canopy = this.add.zone(this.mapInfo.widthPx / 2, this.mapInfo.heightPx * 0.18,
                                   this.mapInfo.widthPx * 0.8, this.mapInfo.heightPx * 0.32)
      // V23.17-review I3 — depth -1 so any clickable in the canopy area
      // (NPCs, decor, seasonal blossoms) wins click priority over us;
      // canopy is only the fallback.
      canopy.setOrigin(0.5, 0.5).setDepth(-1).setInteractive({ useHandCursor: true })
      canopy.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.startleGroveBirds(p.worldX, p.worldY)
      })
      this.events.once('shutdown', () => { try { canopy.destroy() } catch {} })
      this.events.once('destroy',  () => { try { canopy.destroy() } catch {} })
    }

    // V23.23 — player auto-idle gestures. After 30s of no movement, the
    // bear occasionally changes facing / briefly waves / sits-stands.
    // Self-rescheduling so we don't pile work on the scene tick.
    if (!prefersReducedMotion()) {
      const armIdleGesture = () => {
        this.idleGestureTimer = this.time.delayedCall(15_000 + Math.random() * 15_000, () => {
          this.tryIdleGesture()
          armIdleGesture()
        })
      }
      armIdleGesture()
      this.events.once('shutdown', () => { this.idleGestureTimer?.remove(false); this.idleGestureTimer = undefined })
      this.events.once('destroy',  () => { this.idleGestureTimer?.remove(false); this.idleGestureTimer = undefined })
    }

    // V23.14 — winter breath puff: outdoor + winter + cool phase + player idle.
    // The timer checks every 4-6s; the actual puff only spawns when all
    // conditions hold at that instant.
    if (!prefersReducedMotion()) {
      if (isOutdoorRoom(this.currentRoomId)) {
        const startBreath = () => {
          this.breathPuffTimer = this.time.delayedCall(4000 + Math.random() * 2000, () => {
            this.tryBreathPuff()
            startBreath()
          })
        }
        startBreath()
        this.events.once('shutdown', () => { this.breathPuffTimer?.remove(false); this.breathPuffTimer = undefined })
        this.events.once('destroy',  () => { this.breathPuffTimer?.remove(false); this.breathPuffTimer = undefined })
      }
    }
    // V15.5 — small-talk timer: every 60-120s, if 2+ NPCs are co-present,
    // fire a paired exchange. Single timer per scene (cheaper than per-NPC).
    const startSmalltalk = () => {
      this.npcSmalltalkTimer = this.time.delayedCall(60_000 + Math.random() * 60_000, () => {
        this.maybeRunNpcSmalltalk()
        startSmalltalk()
      })
    }
    startSmalltalk()
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
    // V10.3 — spouse override: when the player is in their own Home room AND
    // it's a morning/evening window, force-add the spouse here even if their
    // canonical schedule says they should be elsewhere.
    const marriage = getMarriage()
    if (marriage && isHomeRoom(this.currentRoomId)) {
      const win = spousePresenceWindow(now)
      if (win) {
        const def = this.npcManifest.npcs.find(n => n.id === marriage.partner_npc_id)
        if (def) {
          // Center-ish, sitting. Reuse the same home interior coords used by
          // existing NPC schedules so the position feels intentional.
          active.set(def.id, {
            def,
            bracket: { x: 100, y: 80, state: 'sit', room: this.currentRoomId }
          })
        }
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
    // V10.3 — once-per-day spouse greeting when entering Home with spouse present
    if (marriage && isHomeRoom(this.currentRoomId) && spousePresenceWindow(now) && shouldGreetToday()) {
      const def = this.npcManifest.npcs.find(n => n.id === marriage.partner_npc_id)
      if (def) {
        markGreetedToday()
        this.time.delayedCall(500, () => {
          const e = this.npcBears.get(def.id)
          if (e) {
            const screen = this.bearScreenPos(e.bear)
            const lines = ['Welcome home, love.', 'I missed you today.', 'Tea is on.', 'Sit with me a minute.']
            showBubble('spouse_greet', lines[Math.floor(Math.random() * lines.length)], screen.x, screen.y)
          }
        })
      }
    }
  }

  private spawnNpc(def: NpcDef, b: { x: number; y: number; state: string }) {
    // V16.2 — NPCs can have a custom species (defaults to 'bear'). Bear
    // class falls back to the bear texture if the atlas isn't loaded, so
    // we kick off ensureSpeciesLoaded in parallel and re-apply once ready;
    // the NPC briefly shows as a bear then morphs when the atlas lands.
    const species = def.species ?? 'bear'
    const bear = new Bear(this, b.x, b.y, def.region, species)
    if (species !== 'bear') {
      this.ensureSpeciesLoaded(species).then(() => {
        const entry = this.npcBears.get(def.id)
        if (entry && entry.bear === bear) bear.setSpecies(species)
      })
    }
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
    this.npcBears.set(def.id, {
      bear, def,
      // V15.6-review C3 — use this.time.now (Phaser scene clock, pauses on
      // background) instead of performance.now() (kept advancing in
      // background → on tab-resume every NPC fires every tick at once).
      // Stagger initial ambient ticks so 3 NPCs in one room don't all wave
      // on the same frame.
      ambientNextAt: this.time.now + 5000 + Math.random() * 10000,
      wanderNextAt: this.time.now + 10000 + Math.random() * 10000,
      bubbleNextAt: this.time.now + 45000 + Math.random() * 45000,
      homeX: b.x, homeY: b.y
    })
    // V15.3 — shortly after the NPC appears (which also fires when the
    // player walks into their room → scene restart → loadAndStartNpcs),
    // turn to face the player and ~30% of the time pop a brief greeting.
    // Skip 'sit'/'sleep'/'dance' poses to respect the schedule bracket.
    if (b.state === 'idle') {
      this.time.delayedCall(300 + Math.random() * 500, () => {
        const entry = this.npcBears.get(def.id)
        if (!entry || !this.myBear) return
        if (entry.bear.state !== 'idle') return
        const dx = this.myBear.x - entry.bear.x
        const dy = this.myBear.y - entry.bear.y
        entry.bear.facing = Math.abs(dx) > Math.abs(dy)
          ? (dx >= 0 ? 'right' : 'left')
          : (dy >= 0 ? 'down' : 'up')
        entry.bear.playIdle()
        if (Math.random() < 0.3) {
          const screen = this.bearScreenPos(entry.bear)
          showBubble('npc_' + def.id, pickNoticeLine(def.id), screen.x, screen.y)
        }
        // V23.13 — high-heart NPCs emit a small floating ❤ on room entry.
        // Tier-gated so casual acquaintances don't spam hearts: heart 5
        // (Soulmate-Adjacent precursor) is the friendship threshold.
        // V23.17-review I1 — per-NPC cooldown so re-entering rooms (which
        // respawns NPCs) doesn't refire the heart every time.
        if (getNpcHeartLevel(def.id) >= 5) {
          const lastHeart = this.heartParticleCooldown.get(def.id) ?? 0
          if (this.time.now - lastHeart >= RoomScene.HEART_PARTICLE_COOLDOWN_MS) {
            this.heartParticleCooldown.set(def.id, this.time.now)
            this.spawnHeartParticle(entry.bear.x, entry.bear.y - 48)
          }
        }
      })
    }
  }

  /** V23.22 — fire a small particle burst when the player clicks a
   *  "natural" zone in select rooms: pollen in the grove's flowering
   *  band, water ripple at the beach's water area, dust at the library
   *  bookshelf row. Non-blocking — bear still walks to click point. */
  private tryNaturalElementClick(wx: number, wy: number) {
    const h = this.mapInfo.heightPx
    if (this.currentRoomId === 'room_grove') {
      // Lower 50% of the room is the flowering ground band
      if (wy > h * 0.5) this.naturalBurst(wx, wy, 'pollen')
    } else if (this.currentRoomId === 'room_beach') {
      // Top 45% of the room is the water area
      if (wy < h * 0.45) this.naturalBurst(wx, wy, 'ripple')
    } else if (this.currentRoomId === 'room_library') {
      // Wall band where bookshelves usually sit (upper third minus top decor)
      if (wy > h * 0.18 && wy < h * 0.45) this.naturalBurst(wx, wy, 'dust')
    }
  }

  private naturalBurst(x: number, y: number, kind: 'pollen' | 'ripple' | 'dust') {
    ensurePixelTexture(this)
    if (kind === 'ripple') {
      // V23.24-review I3 — initial radius bumped 2 → 5 so the ring is
      // legible from frame 0 (was a 1-px speck at scale 0.8).
      for (let i = 0; i < 2; i++) {
        const ring = this.add.circle(x, y, 5, 0xa0d8e8, 0)
          .setStrokeStyle(1, 0xa0e0f0, 0.9)
          .setDepth(990)
        this.tweens.add({
          targets: ring, scale: { from: 0.6, to: 3 + i * 1.2 }, alpha: { from: 0.85, to: 0 },
          delay: i * 150, duration: 700, ease: 'Sine.out',
          onComplete: () => ring.destroy()
        })
      }
      return
    }
    const tint = kind === 'pollen' ? 0xffd860 : 0xc8b890
    const burst = this.add.particles(x, y, PIXEL_TEX_KEY, {
      x: 0, y: 0,
      lifespan: 700, quantity: 8, frequency: -1,
      speedX: { min: -30, max: 30 },
      speedY: kind === 'pollen' ? { min: -40, max: -10 } : { min: -8, max: 8 },
      scale: { start: 1.2, end: 0.6 },
      tint, alpha: { start: 0.85, end: 0 }
    }).setDepth(991)
    burst.explode(8)
    this.time.delayedCall(800, () => { try { burst.destroy() } catch {} })
  }

  /** V23.19 — when the player waves or dances, nearby idle NPCs may
   *  reciprocate after a short delay. Wave: 40% chance back. Dance:
   *  80% chance (more contagious — easier to get NPCs joining a party).
   *  Skips NPCs that are sit/sleep/dance-already so we don't disturb
   *  their scheduled bracket pose. */
  private handleNpcReplyToEmote(verb: 'wave' | 'dance') {
    if (!this.myBear) return
    const NEAR = 80
    const chance = verb === 'wave' ? 0.4 : 0.8
    const delayMin = 350, delayMax = 700
    this.npcBears.forEach((entry, id) => {
      if (entry.bear.state !== 'idle') return
      const dx = entry.bear.x - this.myBear!.x
      const dy = entry.bear.y - this.myBear!.y
      if (Math.hypot(dx, dy) > NEAR) return
      if (Math.random() > chance) return
      this.time.delayedCall(delayMin + Math.random() * (delayMax - delayMin), () => {
        const e = this.npcBears.get(id)
        if (!e || e.bear.state !== 'idle') return
        // Face the player when replying
        e.bear.facing = Math.abs(dx) > Math.abs(dy)
          ? (dx >= 0 ? 'left' : 'right')   // dx is npc-player; if positive, npc is right of player → face left
          : (dy >= 0 ? 'up' : 'down')
        e.bear.playIdle()
        const def = verb === 'wave' ? { dur: 1500 } : { dur: 3000 }
        e.bear.applyEmote(verb, def.dur, prefersReducedMotion())
      })
    })
  }

  /** V23.16 — bird flock startle. Spawns 4-6 small birds that fly outward
   *  from (x, y) and disappear off-screen. Each bird is a tiny 2-tone
   *  Container with a flapping wing tween. Plays a brief synth chirp
   *  burst (lazy import to avoid pulling Web Audio when not needed). */
  private startleGroveBirds(centerX: number, centerY: number) {
    const count = 4 + Math.floor(Math.random() * 3)  // 4-6 birds
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9  // mostly upward, fan ±81°
      const speed = 120 + Math.random() * 80
      const targetX = centerX + Math.cos(angle) * speed * 4
      const targetY = centerY + Math.sin(angle) * speed * 4
      const bird = this.add.container(centerX + (Math.random() - 0.5) * 16, centerY + (Math.random() - 0.5) * 8).setDepth(990)
      const wing = this.add.rectangle(0, 0, 5, 1, 0x3a2820)
      const body = this.add.rectangle(0, 0, 1, 2, 0x3a2820)
      bird.add([wing, body])
      this.tweens.add({
        targets: wing, scaleX: { from: 1, to: 0.4 },
        duration: 90, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
      this.tweens.add({
        targets: bird, x: targetX, y: targetY,
        duration: 1400 + Math.random() * 400, ease: 'Sine.out',
        onComplete: () => bird.destroy()
      })
    }
    // Brief chirp burst (re-uses the V23.4 birdChirp shape but bypasses
    // the rate-limited ambient_sfx scheduler since this is a one-shot
    // user-triggered burst).
    {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return
      try {
        const ctx = new Ctor()
        if (ctx.state === 'suspended') void ctx.resume()
        const master = ctx.createGain()
        master.gain.value = 0.18
        master.connect(ctx.destination)
        const t = ctx.currentTime
        for (let i = 0; i < count; i++) {
          const start = t + i * 0.06
          const osc = ctx.createOscillator()
          const env = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(2400 + Math.random() * 800, start)
          osc.frequency.exponentialRampToValueAtTime(3600 + Math.random() * 600, start + 0.07)
          env.gain.setValueAtTime(0, start)
          env.gain.linearRampToValueAtTime(0.12, start + 0.005)
          env.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
          osc.connect(env); env.connect(master)
          osc.start(start); osc.stop(start + 0.13)
        }
        setTimeout(() => { try { ctx.close() } catch {} }, 2000)
      } catch {}
    }
  }

  /** V23.14 — winter breath puff. Spawns 3 tiny white pixels at the bear's
   *  mouth that drift up + fade. Conditions checked at fire time:
   *  current season is 'winter', current phase is dawn/dusk/night (cool
   *  hours), and the player has been idle (no movement) for ≥ 3s. */
  private tryBreathPuff() {
    if (!this.myBear) return
    // V23.17-review I4 — sentinel -1 means "never moved yet" — don't fire
    // breath on a freshly loaded scene before the player has stood still.
    if (this.lastBearMoveAt < 0) return
    if (this.time.now - this.lastBearMoveAt < 3000) return  // still moving
    const season = getCurrentSeason()?.id
    if (season !== 'winter') return
    const phase = getCurrentPhase()
    if (phase === 'day') return  // sun's out, no visible breath
    // Bear sprite is 32×48 with origin (0.5, 1) — mouth ~ y - 14, x +/- 4 by facing
    const mouthOffsetX = this.myBear.facing === 'left' ? -4 : this.myBear.facing === 'right' ? 4 : 0
    const mouthOffsetY = -18
    const mx = this.myBear.x + mouthOffsetX
    const my = this.myBear.y + mouthOffsetY
    ensurePixelTexture(this)
    const puff = this.add.particles(mx, my, PIXEL_TEX_KEY, {
      x: { min: -1, max: 1 }, y: 0,
      lifespan: 1200, quantity: 3, frequency: -1,
      speedX: { min: this.myBear.facing === 'left' ? -16 : this.myBear.facing === 'right' ? 4 : -6,
                max: this.myBear.facing === 'left' ? -4 : this.myBear.facing === 'right' ? 16 : 6 },
      speedY: { min: -12, max: -5 },
      scale: { start: 1.4, end: 2.6 },
      tint: 0xf8f8ff, alpha: { start: 0.7, end: 0 }
    }).setDepth(6)
    // V23.17-review C1 — explode() with no args emits at the emitter's
    // own world position. Passing (mx, my) again double-positions to
    // (2·mx, 2·my). Same bug class as V23.11-review C3 (fish splash).
    puff.explode(3)
    this.time.delayedCall(1300, () => { try { puff.destroy() } catch {} })
  }

  /** V23.13 — small ❤ that floats up + fades, anchored to scene world coords.
   *  Used by the NPC notice path (V15.3) when player has high heart with
   *  the NPC. One per spawnNpc → one per room visit per NPC. */
  private spawnHeartParticle(x: number, y: number) {
    const heart = this.add.container(x, y).setDepth(7)
    // Two-pixel ❤ shape (3 wide, 3 tall) via small rects.
    const g = this.add.graphics()
    g.fillStyle(0xff4060, 1)
    // Top: two lobes
    g.fillRect(-2, -2, 2, 2)
    g.fillRect( 1, -2, 2, 2)
    // Middle: full row
    g.fillRect(-2,  0, 5, 2)
    // Bottom: point
    g.fillRect(-1,  2, 3, 1)
    g.fillRect( 0,  3, 1, 1)
    heart.add(g)
    heart.setAlpha(0)
    this.tweens.add({
      targets: heart, alpha: { from: 0, to: 1 }, y: y - 4,
      duration: 240, ease: 'Sine.out',
      onComplete: () => {
        this.tweens.add({
          targets: heart, alpha: 0, y: heart.y - 18,
          duration: 1100, ease: 'Sine.in',
          onComplete: () => heart.destroy()
        })
      }
    })
  }

  // V15.0 — ambient action cycle: idle NPCs occasionally change facing,
  // wave briefly, or sit down for a moment. Skips NPCs that are already
  // in a deliberate pose (sit/sleep/dance) so we don't fight scheduled
  // bracket state, and skips during reduced-motion (only does the cheap
  // facing-change variant).
  private tickNpcAmbient(entry: { bear: Bear; def: NpcDef; ambientNextAt: number }, id: string, now: number) {
    if (now < entry.ambientNextAt) return
    const reschedule = (minMs = 8000, maxMs = 15000) => {
      entry.ambientNextAt = now + minMs + Math.random() * (maxMs - minMs)
    }
    // Only act on idle, grounded NPCs — never disturb a sit/sleep/dance pose
    // (scheduled brackets put NPCs into those states deliberately) or a
    // walking NPC (V15.1 wandering owns that).
    if (entry.bear.state !== 'idle' || entry.bear.target) { reschedule(); return }
    const reduced = prefersReducedMotion()
    const r = Math.random()
    if (r < 0.6 || reduced) {
      // Look another direction (cheap, animation-free)
      const dirs = ['up', 'down', 'left', 'right'] as const
      const next = dirs[Math.floor(Math.random() * dirs.length)]
      if (next !== entry.bear.facing) {
        entry.bear.facing = next
        entry.bear.playIdle()
      }
    } else if (r < 0.85) {
      // Brief wave
      entry.bear.applyEmote('wave', 1500, reduced)
    } else {
      // Brief sit-down — applyEmote('sit') toggles, so a second call stands
      // them back up. V15.6-review C2 — re-fetch from npcBears in the
      // callback so we don't poke a destroyed sprite if the NPC's schedule
      // bracket changed and despawned/respawned this NPC in the interim.
      const originalBear = entry.bear
      entry.bear.applyEmote('sit', 0, reduced)
      this.time.delayedCall(3500 + Math.random() * 2500, () => {
        const e = this.npcBears.get(id)
        if (!e || e.bear !== originalBear) return  // despawned or respawned with fresh sprite
        if (e.bear.state === 'sit') e.bear.applyEmote('sit', 0, reduced)
      })
    }
    reschedule()
  }

  // V15.5 — pick two co-present idle NPCs and run a paired exchange. Skips
  // when fewer than 2 idle NPCs are present (sit/sleep/dance shouldn't be
  // interrupted), and skips when the player is currently in dialog so we
  // don't talk over the latest player-triggered bubble.
  private maybeRunNpcSmalltalk() {
    const idle: string[] = []
    this.npcBears.forEach((entry, id) => {
      if (entry.bear.state === 'idle' && !entry.bear.target) idle.push(id)
    })
    if (idle.length < 2) return
    const exchange = pickExchange(idle)
    if (!exchange) return
    const pair = pickPairFromPresent(idle, exchange)
    if (!pair) return
    const [idA, idB] = pair
    const entryA = this.npcBears.get(idA)
    const entryB = this.npcBears.get(idB)
    if (!entryA || !entryB) return
    const sA = this.bearScreenPos(entryA.bear)
    showBubble('npc_' + idA, exchange.a, sA.x, sA.y)
    // Brief pause then B replies. Use scene timer so it dies on scene restart.
    this.time.delayedCall(2400 + Math.random() * 600, () => {
      const e = this.npcBears.get(idB)
      if (!e) return
      const sB = this.bearScreenPos(e.bear)
      showBubble('npc_' + idB, exchange.b, sB.x, sB.y)
    })
  }

  // V15.2 — unprompted "thought" bubbles from idle NPCs. Low rate (~45-90s
  // between attempts) and skipped when the NPC is currently in dialog with
  // the player so we don't stomp the latest line. Always-on (no
  // reduced-motion gate) because it's static text — the ambient *humming*
  // is exactly the kind of life-signal users complain is missing.
  private tickNpcBubble(entry: { bear: Bear; bubbleNextAt: number }, id: string, now: number) {
    if (now < entry.bubbleNextAt) return
    const reschedule = (minMs = 45000, maxMs = 90000) => {
      entry.bubbleNextAt = now + minMs + Math.random() * (maxMs - minMs)
    }
    // V15.6-review C1 — three guards the original comment promised but
    // didn't implement: skip non-idle (sit/sleep/dance), skip walking,
    // skip if a higher-priority bubble (player dialog or V15.3 notice) is
    // already on screen for this NPC. Without these, an ambient *humming*
    // can stomp a just-clicked dialog line or float above a sleeping NPC.
    if (entry.bear.state !== 'idle' || entry.bear.target) { reschedule(); return }
    if (hasActiveBubble('npc_' + id)) { reschedule(); return }
    const screen = this.bearScreenPos(entry.bear)
    const line = pickAmbientLine(id)
    showBubble('npc_' + id, line, screen.x, screen.y)
    reschedule()
  }

  // V15.1 — short wandering walks within ~60px of the spawn point so the
  // NPC moves around its station rather than glueing to one pixel. Skips
  // non-idle / already-walking NPCs and respects the room's collision
  // rects (same push-out logic the player-click walkTo uses).
  private tickNpcWander(entry: { bear: Bear; def: NpcDef; wanderNextAt: number; homeX: number; homeY: number }, now: number) {
    if (now < entry.wanderNextAt) return
    const reschedule = (minMs = 8000, maxMs = 16000) => {
      entry.wanderNextAt = now + minMs + Math.random() * (maxMs - minMs)
    }
    if (entry.bear.state !== 'idle' || entry.bear.target) { reschedule(); return }
    if (prefersReducedMotion()) { reschedule(); return }
    const RADIUS = 60
    let tx = entry.homeX + (Math.random() - 0.5) * RADIUS * 2
    let ty = entry.homeY + (Math.random() - 0.5) * RADIUS * 2
    tx = Math.max(20, Math.min(this.mapInfo.widthPx - 20, tx))
    ty = Math.max(20, Math.min(this.mapInfo.heightPx - 12, ty))
    for (const r of this.mapInfo.collisionRects) {
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
    entry.bear.walkTo(tx, ty)
    reschedule()
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
    // V10.5 — capture pixels from the live WebGL framebuffer BEFORE adding
    // the flash overlay. Snapshot is async-deferred to the next render, so
    // we defer the flash add until the snapshot callback fires.
    let snapshotPending = true
    try {
      const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer
      renderer.snapshot((image) => {
        snapshotPending = false
        if (image instanceof HTMLImageElement) {
          // V10.7-review I4 fix: downscale to 240×160 before storing so we
          // stay well under the localStorage 5MB budget across 25 photos.
          const c = document.createElement('canvas')
          c.width = 240; c.height = 160
          const ctx = c.getContext('2d')!
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(image, 0, 0, c.width, c.height)
          // V14.6 — group photo: list peers within 120px of bear when shutter fired.
          // V14.8-review C1 — read the raw `displayName` field on Bear (not
          // nameLabel.text, which includes marriage prefixes / empty for
          // anonymous peers). Peers without a name are omitted entirely so
          // the album '👥 N' badge matches the named members list.
          const NEAR = 120
          const nearby: string[] = []
          if (this.myBear) {
            for (const [, p] of this.peers) {
              const d = Math.hypot(p.bear.x - this.myBear.x, p.bear.y - this.myBear.y)
              if (d <= NEAR) {
                const name = p.bear.displayName
                if (typeof name === 'string' && name.length > 0) nearby.push(name)
              }
            }
          }
          savePhoto({
            roomLabel, dataUrl: c.toDataURL('image/png'),
            width: c.width, height: c.height,
            members: nearby.length > 0 ? nearby : undefined
          })
        }
        this.addCameraFlash()
      })
    } catch { snapshotPending = false }
    if (!snapshotPending) this.addCameraFlash()
    consumeEnergy(ENERGY_COST.tool_use)
    showToast('📷 Memory captured', 1600)
    awardXp('memory_making', 3)  // V9.0
  }

  // V10.8c — instantiate a peer's pet sprite (lazy-loads the atlas).
  private spawnPeerPet(sessionId: string, species: 'kitten'|'puppy'|'bunny', name: string, x: number, y: number, region: Region) {
    if (this.peerPets.has(sessionId)) return
    ensurePetAtlasLoaded(this, species, region).then(() => {
      // The peer might have left or the scene might have been torn down.
      if (!this.peers.has(sessionId) || !this.scene.isActive()) return
      const ps = new PetSprite(this, x, y, region, { species, name })
      this.peerPets.set(sessionId, ps)
    })
  }

  // V10.5 helper — white camera-shutter flash overlay
  private addCameraFlash() {
    const flash = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.85)
      .setOrigin(0).setDepth(1500).setScrollFactor(0)
    this.tweens.add({
      targets: flash, alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    })
  }

  // V7.7 — Sequential cutscene runner.
  private async runCutscene(def: CutsceneDef) {
    markFired(def.id)
    // V10.4: count cutscenes seen for the achievement album
    try {
      const raw = JSON.parse(localStorage.getItem('lounge_cutscenes_v1') || '{}') as Record<string, number>
      recordAchievement({ type: 'cutscene_played', total: Object.keys(raw).length })
    } catch {}
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

  // V21.0 — apply current random event state to UI + scene. Banner reflects
  // the active event; sprite only spawns when we're in the event's room.
  private applyRandomEventState() {
    const active = tickRandomEvents()
    const banner = document.getElementById('lounge-random-event-banner')
    const iconEl = document.getElementById('lounge-random-event-icon')
    const titleEl = document.getElementById('lounge-random-event-title')
    const metaEl = document.getElementById('lounge-random-event-meta')
    if (banner && iconEl && titleEl && metaEl) {
      if (!active) {
        banner.hidden = true
      } else {
        banner.hidden = false
        // V22.4-review I4 — icon name lives on the event def itself; this
        // call site was a duplicated source-of-truth before.
        iconEl.setAttribute('data-icon', active.def.icon)
        iconEl.innerHTML = ''
        delete iconEl.dataset.iconRendered
        void import('../icons').then(m => m.hydrateIcons(banner))
        titleEl.textContent = active.def.title
        let targetRoom: RoomId = active.def.room
        if (targetRoom === ('room_home_self' as RoomId)) {
          targetRoom = homeRoomForVisitor(getIdentity().visitor_id) as RoomId
        }
        const inRoom = this.currentRoomId === targetRoom
        const minutesLeft = Math.max(0, Math.ceil((active.expiresAt - Date.now()) / 60_000))
        metaEl.textContent = inRoom
          ? `Click the sparkle · ${minutesLeft}m left`
          : `In ${targetRoom.replace('room_', '')} · ${minutesLeft}m left`
      }
    }
    // Spawn / despawn the in-room interactable
    this.refreshRandomEventSprite(active)
  }

  private refreshRandomEventSprite(active: ActiveEvent | null) {
    // Resolve event room (handle 'room_home_self' alias)
    let targetRoom: RoomId | null = null
    if (active) {
      targetRoom = active.def.room
      if (targetRoom === ('room_home_self' as RoomId)) {
        targetRoom = homeRoomForVisitor(getIdentity().visitor_id) as RoomId
      }
    }
    const shouldShow = !!active && this.currentRoomId === targetRoom
    if (!shouldShow) {
      this.randomEventSprite?.destroy()
      this.randomEventSprite = undefined
      return
    }
    if (this.randomEventSprite) return  // already showing
    // Build a small pulsing sparkle container in a fixed safe spot per-room.
    // Center-ish, slightly up so it doesn't overlap room furniture too often.
    const x = Math.floor(this.mapInfo.widthPx * 0.55)
    const y = Math.floor(this.mapInfo.heightPx * 0.55)
    const container = this.add.container(x, y).setDepth(8)
    const ring = this.add.graphics()
    ring.fillStyle(0xffd166, 1)
    ring.fillCircle(0, 0, 6)
    ring.lineStyle(2, 0xfff8e0, 1)
    ring.strokeCircle(0, 0, 9)
    container.add(ring)
    const label = this.add.text(0, -22, `${active!.def.emoji} ${active!.def.title}`, {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '9px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
      resolution: 2
    }).setOrigin(0.5, 1)
    container.add(label)
    // Pulse tween
    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: ring, scale: { from: 1, to: 1.3 },
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut'
      })
    }
    // V21.4-review I3 — make BOTH the ring AND the label clickable. Users
    // instinctively tap the emoji+title text; a ring-only hitbox felt
    // unresponsive.
    ring.setInteractive(new Phaser.Geom.Circle(0, 0, 16), Phaser.Geom.Circle.Contains)
    ring.on('pointerdown', () => this.attendRandomEvent())
    label.setInteractive({ useHandCursor: true })
    label.on('pointerdown', () => this.attendRandomEvent())
    this.randomEventSprite = container
  }

  private attendRandomEvent() {
    const active = getActiveEvent()
    if (!active) {
      // V21.4-review I2 — sparkle may still be on screen between expiry
      // and the next 30s tick. Despawn now + give the user feedback so
      // tap-tap-tap doesn't feel broken.
      this.refreshRandomEventSprite(null)
      showToast('Just missed it — next event coming soon.', 2200)
      return
    }
    const def = attendEvent(active.def.id)
    if (!def) return
    // Reward — small shells bump + toast + record achievement
    void import('../shells').then(s => s.addShells(def.reward_shells))
    showToast(`${def.emoji} ${def.title} attended — +${def.reward_shells} 🐚`, 2800)
    recordAchievement({ type: 'random_event_attended', event_id: def.id })
    // Refresh UI
    this.randomEventSprite?.destroy(); this.randomEventSprite = undefined
    this.applyRandomEventState()
  }

  // V19.5-review C3 — per-NPC click debounce so a double-click can't fire
  // consumeStoryStep twice; the second call returns null but the second
  // pickDialog overwrites the emotional finale line with a generic one.
  private npcClickDebounce = new Map<string, number>()
  private async handleNpcClick(id: string) {
    const entry = this.npcBears.get(id)
    if (!entry) return
    const lastClick = this.npcClickDebounce.get(id) ?? 0
    const now = this.time.now
    if (now - lastClick < 700) return
    this.npcClickDebounce.set(id, now)

    // V3.0-B — AI companion (觉) routes to chat overlay, NOT the canned
    // dialog bubble. Companion NPC defs set ai_companion: true in npcs.json.
    if (entry.def.ai_companion) {
      const [{ openCompanionChat }, { getCurrentPhase }] = await Promise.all([
        import('../companion_ui'),
        import('../atmosphere'),
      ])
      const phaseMap: Record<string, string> = { dawn: '清晨', day: '白天', dusk: '傍晚', night: '深夜' }
      const phase = getCurrentPhase?.() ?? 'day'
      void openCompanionChat({
        time_phase: phaseMap[phase] ?? '白天',
        // weather omitted — backend defaults to '晴'. V3.0-B-MEM could
        // wire real weather (lounge doesn't expose it cleanly yet).
        current_room: 'library',
        language: navigator.language?.startsWith('zh') ? '中文' : '英文',
      })
      return
    }
    // V7.0 → V10.1 — heart is now read from per-NPC heart points (npc_hearts),
    // not from this.friendships (which only holds player↔player relationships).
    // Each click is also worth +1 heart-point (daily-capped per NPC).
    addNpcTalkHeart(id)
    let npcHeart = getNpcHeartLevel(id)
    recordAchievement({ type: 'npc_met', npcId: id })
    recordAchievement({ type: 'npc_heart', level: npcHeart })

    // V10.8a — "Give to NPC" path: if the player has anything in their
    // pebble inventory and hasn't already gifted this NPC today, surface a
    // wooden modal to hand over the most-recent item for +5 hearts.
    // Daily-cap key prevents farming.
    try {
      const giftDailyKey = 'lounge_npc_gift_daily_v1'
      const today = new Date().toISOString().slice(0, 10)
      const raw = JSON.parse(localStorage.getItem(giftDailyKey) || '{}') as { day: string; given: string[] }
      const state = (raw.day === today) ? raw : { day: today, given: [] as string[] }
      const items = Array.from(this.inventory)
      if (items.length > 0 && !state.given.includes(id)) {
        const itemId = items[items.length - 1]
        const itemName = getAllPebbles().find(p => p.id === itemId)?.name ?? itemId
        const { showConfirm } = await import('../modal_ui')
        const accept = await showConfirm({
          title: `🎁 Give "${itemName}" to ${entry.def.name}?`,
          message: 'They\'ll love it. +5 hearts.',
          primaryLabel: 'Give',
          secondaryLabel: 'Keep',
        })
        if (accept) {
          this.inventory.delete(itemId)
          refreshInventoryPanel()
          state.given.push(id)
          localStorage.setItem(giftDailyKey, JSON.stringify(state))
          npcHeart = addNpcGiftHeart(id)
          recordAchievement({ type: 'npc_heart', level: npcHeart })
          showToast(`💗 ${entry.def.name} loved it — heart ${npcHeart}/10`, 2400)
        }
      }
    } catch {}
    const ctx = buildDialogContext({
      heart: npcHeart,
      event: getActiveFestivalId() ?? undefined,
      isFirstMeeting: !this.npcDialogMemory.has(id)
    })
    // V19.2 — story step takes precedence over normal dialog when eligible.
    // Each click advances at most one story step; on the final step, the
    // story-complete reward fires (cosmetic unlock + achievement).
    const storyLine = consumeStoryStep(id, npcHeart, (story) => {
      // Reward: grant + auto-equip the cosmetic, record achievement, toast.
      void import('../cosmetics').then(c => {
        c.addOwnedCosmetic(story.reward_cosmetic)
        c.equipCosmetic(story.reward_cosmetic)
        void import('../net').then(net => net.sendProfile({
          equipped_cosmetics: c.getEquippedCosmetics(),
          owned_cosmetics: c.getOwnedCosmetics()
        }))
        this.myBear?.setCosmetics(c.getEquippedCosmetics())
      })
      recordAchievement({ type: 'story_complete', story_id: story.id })
      showToast(`📖 ${story.title} — complete!`, 3200)
    })
    const line = storyLine ?? pickDialog(entry.def, this.npcDialogMemory, ctx)
    const screen = this.bearScreenPos(entry.bear)
    showBubble('npc_' + id, line, screen.x, screen.y)
    // V10.3 — at heart 10 + holding a marriage pebble + not yet married,
    // surface a propose prompt via wooden modal.
    if (npcHeart >= 10 && getMarriagePebbleCount() > 0 && !getMarriage()) {
      const { showConfirm } = await import('../modal_ui')
      const accept = await showConfirm({
        title: `💍 Propose to ${entry.def.name}?`,
        message: 'Use a marriage pebble. There\'s no undo.',
        primaryLabel: 'Propose',
        secondaryLabel: 'Not yet',
      })
      if (accept && consumeMarriagePebble()) {
        setMarriage(id)
        showToast(`💍 You and ${entry.def.name} are partners.`, 5000)
        this.runWeddingCutscene(entry.def.name, screen.x, screen.y)
        recordAchievement({ type: 'marriage' })
      }
    }
    // V7.4 — auto-give quests this NPC has, if friendship prereq met and not yet accepted
    for (const q of QUESTS) {
      if (q.giver_npc !== id) continue
      if (npcHeart < (q.prereq_heart ?? 0)) continue
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
    // V9.0 → V10.1 fix — high-heart NPC interaction feeds companionship XP.
    // Earlier code referenced `friendship?.level` which was a stale leftover
    // from the player↔player friendship lookup (undeclared identifier =
    // ReferenceError every click). NPC hearts live in npc_hearts now.
    if (npcHeart >= 2) awardXp('companionship', 2)
  }

  private tryInteract() {
    if (this.nearbyInteractable) {
      this.activateInteractable(this.nearbyInteractable)
    } else if (this.currentSitInteractable && this.myBear?.state === 'sit') {
      sendAct('sit', undefined, this.currentRoomId)
      this.applyAct(undefined, 'sit')
      this.currentSitInteractable = null
    } else if (this.nearbyDoorPortal) {
      // Door portal: pressing E / Enter near a door teleports through it,
      // matching the visible "↵ click" hint on the floating door label.
      this.enterPortal(this.nearbyDoorPortal)
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
    // V13.2 → V13.8-review C1 fix: arcade cabinet launches the matching
    // mini-game directly via the new openGame() entry point. Earlier
    // impl matched tile text and silently dropped the Cook cabinet.
    if (it.kind === 'minigame' && it.gameId) {
      void import('../minigames_ui').then(m => m.openGame(it.gameId!))
      return
    }
    // V13.3 → V13.8-review C2 fix: daily cap per spot. Without it the
    // player could hold E and farm rare materials indefinitely.
    if (it.kind === 'gather_spot' && it.material) {
      const today = new Date().toISOString().slice(0, 10)
      const key = `lounge_gather_${it.name}_day`
      try {
        if (localStorage.getItem(key) === today) {
          showToast('🌱 Already harvested today.', 1600)
          return
        }
        localStorage.setItem(key, today)
      } catch {}
      void import('../resources').then(r => {
        if (typeof (r as any).addMaterial === 'function') {
          (r as any).addMaterial(it.material as any, 1)
        }
      })
      showToast(`🌱 +1 ${it.material!.replace('_', ' ')}`, 1800)
      return
    }
    // V13.7 — summer pool: +5 max-energy buff for 24h (separate key from bath)
    if (it.kind === 'seasonal_pool') {
      try {
        localStorage.setItem('lounge_pool_buff_until', String(Date.now() + 86400_000))
        showToast('🏊 Pool buff: +5 max energy until tomorrow', 2400)
      } catch {}
      return
    }
    // V13.7 — autumn pumpkin: +1 pumpkin material per click (daily-capped)
    if (it.kind === 'seasonal_pumpkin') {
      const today = new Date().toISOString().slice(0, 10)
      try {
        const last = localStorage.getItem('lounge_pumpkin_day') || ''
        if (last === today) { showToast('🎃 Already harvested today.', 1800); return }
        localStorage.setItem('lounge_pumpkin_day', today)
        void import('../resources').then(r => {
          if (typeof (r as any).addMaterial === 'function') (r as any).addMaterial('pumpkin' as any, 1)
        })
        showToast('🎃 +1 pumpkin', 1800)
      } catch {}
      return
    }
    if (it.kind !== 'sit') return
    if (!this.myBear) return
    if (this.currentSitInteractable === it && this.myBear.state === 'sit') {
      sendAct('sit', undefined, this.currentRoomId)
      this.applyAct(undefined, 'sit')
      this.currentSitInteractable = null
      // V13.1 — bath buff: standing up from tub grants +10 max-energy
      // for the rest of the UTC day (stored in localStorage as a flag
      // read by energy.getEnergyMax).
      if (it.bathBuff) {
        try {
          localStorage.setItem('lounge_bath_buff_until', String(Date.now() + 86400_000))
          showToast('♨️ Bath buff: +10 max energy until tomorrow', 2400)
        } catch {}
      }
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
    const left  = (this.cursors?.left.isDown  ?? false) || (this.wasd?.A.isDown ?? false) || touchInput.left
    const right = (this.cursors?.right.isDown ?? false) || (this.wasd?.D.isDown ?? false) || touchInput.right
    const up    = (this.cursors?.up.isDown    ?? false) || (this.wasd?.W.isDown ?? false) || touchInput.up
    const down  = (this.cursors?.down.isDown  ?? false) || (this.wasd?.S.isDown ?? false) || touchInput.down
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

  // V10.3 — tiny in-place celebration after proposing. Hearts + glow tween.
  private runWeddingCutscene(partnerName: string, screenX: number, screenY: number) {
    // Burst hearts above both bears
    for (let i = 0; i < 8; i++) {
      const txt = this.add.text(this.myBear.x + (Math.random() - 0.5) * 20, this.myBear.y - 30, '💖', {
        fontSize: '14px', resolution: 2
      }).setOrigin(0.5, 1).setDepth(20)
      this.tweens.add({
        targets: txt,
        y: this.myBear.y - 60 - Math.random() * 20,
        alpha: 0,
        duration: 1500 + Math.random() * 400,
        ease: 'Sine.easeOut',
        onComplete: () => txt.destroy()
      })
    }
    showBubble('wedding', `💖 ${partnerName} ♥ you`, screenX, screenY - 20)
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
    // V17.3 — bubble-style emotes pop a glyph above the bear. We still call
    // applyEmote('wave',...) for `cheer`/`point` so they get a tiny anim
    // pulse; `think`/`laugh` are quieter (no sprite swap).
    const BUBBLE_VERBS: Record<string, string> = {
      think: '💭', laugh: '😂', cheer: '🎉', point: '👉'
    }
    const glyph = BUBBLE_VERBS[verb]
    if (glyph) {
      const sb = this.bearScreenPos(target)
      showBubble(peerId ?? '__me__', glyph, sb.x, sb.y)
      if (verb === 'cheer' || verb === 'point') {
        target.applyEmote('wave', def.durationMs, prefersReducedMotion())
      }
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
      // V9-fix: label now lives at the bear's screen position; minimap.ts
      // flips it below the bear if screenY < 80 (avoids top-UI overlap).
      showDoorLabel(`→ ${roomLabel}`, screen.x, screen.y - 12)
      // Each frame re-bind the click handler to fire enterPortal on the
      // currently-nearby portal (so walking past one portal to another
      // updates the click target).
      const portal = this.nearbyDoorPortal
      setDoorLabelClickHandler(() => this.enterPortal(portal))
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
        this.enterPortal(p)
        return
      }
    }
  }

  // V9-fix: shared portal-transition. Called by checkPortals (player walked
  // INTO the rect) and by the door label click handler (player clicks the
  // floating "→ Lobby" hint without walking in).
  private enterPortal(p: Portal) {
    if (this.transitioning) return
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
      if (this.npcSmalltalkTimer) { this.npcSmalltalkTimer.remove(false); this.npcSmalltalkTimer = undefined }
      this.seasonalEmitter?.destroy(); this.seasonalEmitter = undefined
      this.holidayEmitter?.destroy(); this.holidayEmitter = undefined
      this.seasonOverlay?.destroy(); this.seasonOverlay = undefined
      hideDoorLabel()
      sendRoomChange(targetRoom)
      this.scene.restart({ roomId: targetRoom, spawnPoint: targetSpawn })
    }
    if (fade) {
      this.cameras.main.fadeOut(220, 248, 240, 220)
      this.cameras.main.once('camerafadeoutcomplete', doRestart)
    } else {
      doRestart()
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
      // V11.1 — touch action button is one shot per tap; consume here so
      // the keyboard path is reused (tryInteract handles all the context).
      if (consumeActionTap()) this.tryInteract()
      const prevX = this.myBear.x, prevY = this.myBear.y
      const usedKeyboard = this.applyKeyboard(dtMs)
      if (!usedKeyboard) {
        if (!this.myBear.target && this.myBear.state === 'walk') {
          this.myBear.state = 'idle'
          this.myBear.playIdle()
        }
        this.myBear.update(dtMs, false)
      }
      // V10.2 — pet follows player. Update after player so the offset is
      // computed from the just-moved position.
      this.petSprite?.update(this.myBear.x, this.myBear.y, this.myBear.facing)
      // V23.9 — drop footprints when walking on sand / snow
      if (this.footprintTracker?.isActive()) {
        this.footprintTracker.onMove(this.myBear.x, this.myBear.y, this.myBear.facing)
      }
      // V23.12 — ambient pet proximity reactions
      if (this.ambientPetSprites.length > 0) {
        tickAmbientPetProximity(this, this.ambientPetSprites, this.myBear.x, this.myBear.y, this.time.now)
      }
      // V23.14 — track last movement timestamp for the breath-puff idle
      // gate. V23.17-review I5 — diff position instead of state to catch
      // keyboard-driven walks where state/target flicker between frames.
      const bdx = this.myBear.x - (this._lastBearPosX ?? this.myBear.x)
      const bdy = this.myBear.y - (this._lastBearPosY ?? this.myBear.y)
      if (bdx * bdx + bdy * bdy > 0.04) {  // moved more than ~0.2px
        this.lastBearMoveAt = this.time.now
      } else if (this.lastBearMoveAt < 0) {
        // First idle moment after spawn — anchor the timer here so
        // breath can start firing after the player stays still 3s.
        this.lastBearMoveAt = this.time.now
      }
      this._lastBearPosX = this.myBear.x
      this._lastBearPosY = this.myBear.y
      // V10.8c — peers' pets follow their owners
      this.peerPets.forEach((pet, sessionId) => {
        const peer = this.peers.get(sessionId)
        if (peer) pet.update(peer.bear.x, peer.bear.y, peer.bear.facing)
      })
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
    // V15.6-review C3 — Phaser scene clock pauses on background tabs;
    // performance.now() doesn't, which would burst-fire all NPC ticks at
    // resume time.
    const now = this.time.now
    this.npcBears.forEach((entry, id) => {
      entry.bear.update(dtMs, true)
      this.tickNpcAmbient(entry, id, now)
      this.tickNpcWander(entry, now)
      this.tickNpcBubble(entry, id, now)
    })
    // V23.0 — transit NPCs walk through periodically
    this.transitNpcs?.tick(dtMs)
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
