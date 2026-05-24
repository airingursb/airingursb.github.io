import Phaser from 'phaser'
import { RoomScene } from './scenes/RoomScene'
import { ROOM_WIDTH, ROOM_HEIGHT, DEFAULT_ROOM, isValidRoom, type RoomId } from './config'
import { installProgressSync, pullProgress } from './progress_sync'
import { togglePetPanel as _ensurePetUiInit } from './pet_ui'
import { togglePanel as _ensureAchUiInit } from './achievements_ui'
import { togglePanel as _ensurePhotosUiInit } from './photos_ui'
import { isMobile, isTouchDevice, isNarrowViewport, onViewportChange } from './mobile'
import { initTouchInput } from './touch_input'
import { maybeStartTour } from './onboarding_ui'
import { toggle as _ensureMinigameUiInit } from './minigames_ui'
import { toggle as _ensureBoardUiInit } from './board_ui'
import { setPartyOnEnter } from './party_ui'
import { setTransitOnTeleport, ZONES as _TRANSIT_ZONES } from './transit_ui'

function parseRoomFromURL(): RoomId | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = new URLSearchParams(window.location.search).get('room')
    if (!raw) return null
    const candidate = raw.startsWith('room_') ? raw : `room_${raw}`
    return isValidRoom(candidate) ? (candidate as RoomId) : null
  } catch { return null }
}

export function bootGame(parent: HTMLElement): Phaser.Game {
  // Era 6/7 P0 — install progress sync before any game code reads localStorage,
  // then kick off a pull. installProgressSync also patches setItem so any later
  // writes auto-schedule a push.
  installProgressSync()
  void pullProgress()
  const game = new Phaser.Game({
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
    scene: [RoomScene]
  })
  // Accept `?room=room_gallery` (full id) or `?room=gallery` (short alias)
  // for direct-link entry. Falls back to DEFAULT_ROOM if missing/unknown.
  const initialRoom = parseRoomFromURL() ?? DEFAULT_ROOM
  game.scene.start('Room', { roomId: initialRoom, spawnPoint: 'default' })
  // V10.8d — expose a small test bridge so smoke scripts can drive the V10
  // achievement + mailbox + heart APIs without dynamic-importing TS sources.
  Promise.all([
    import('./achievements'), import('./mailbox'),
    import('./npc_hearts'), import('./pets'), import('./net'),
    import('./group')
  ]).then(([ach, mail, hearts, pets, net, group]) => {
    ;(window as any).__loungeTest = {
      recordAchievement: ach.recordEvent,
      getAchievementUnlocked: ach.getUnlocked,
      setFriendNotifsEnabled: mail.setFriendNotifsEnabled,
      isFriendNotifsEnabled: mail.isFriendNotifsEnabled,
      notifyFriendActivity: mail.notifyFriendActivity,
      mailUnreadCount: mail.unreadCount,
      getNpcHeartLevel: hearts.getNpcHeartLevel,
      getPet: pets.getPet,
      // V12.2 — expose sendLetterDrop for smoke tests
      sendLetterDrop: net.sendLetterDrop,
      requestLettersInRoom: net.requestLettersInRoom,
      // V14.0 — group session API for smoke tests
      sendGroupCreate: net.sendGroupCreate,
      sendGroupJoin: net.sendGroupJoin,
      sendGroupLeave: net.sendGroupLeave,
      sendGroupState: net.sendGroupState,
      sendGroupList: net.sendGroupList,
      getCurrentGroup: group.getCurrentSession,
      getKnownGroups: group.getKnownSessions
    }
  })
  // V10.2 — bind the pet button's click handler on first frame so opening the
  // panel works before the first room scene finishes booting. _ensurePetUiInit
  // is the side effect of importing the module's open-button listener init.
  void _ensurePetUiInit
  void _ensureAchUiInit
  void _ensurePhotosUiInit
  // V11.0 — tag the body with a class so CSS or peer components can
  // adapt before each scene boots. Re-tag on viewport change.
  const applyMobileClass = () => {
    document.body.classList.toggle('is-mobile', isMobile())
    document.body.classList.toggle('is-touch', isTouchDevice())
    document.body.classList.toggle('is-narrow', isNarrowViewport())
    // V11.1 — un-hide the touch overlay element so its CSS display rule kicks in
    const overlay = document.getElementById('lounge-touch-overlay')
    if (overlay) overlay.hidden = false
  }
  applyMobileClass()
  onViewportChange(applyMobileClass)
  // V11.1 — bind D-pad + action button listeners
  initTouchInput()
  // V11.2 — first-visit tour (no-op if already done)
  maybeStartTour()
  // V11.6 — bind mini-game button + overlay
  void _ensureMinigameUiInit
  // V12.1 — bind community board button + overlay
  void _ensureBoardUiInit
  // V12.7 — when the user clicks "Enter party" the panel asks the game
  // to restart into the party room
  setPartyOnEnter((roomId) => {
    const g = (window as any).__loungeGame
    const s = g?.scene?.getScenes?.(true)?.[0] ?? g?.scene?.scenes?.[0]
    if (!s) return
    void import('./net').then(({ sendRoomChange }) => sendRoomChange(roomId as any))
    s.scene.restart({ roomId, spawnPoint: 'default' })
  })
  // V13.5 — transit hub teleport. Same path as party enter, plus the
  // energy cost from the zone definition (skip if zone is current room).
  setTransitOnTeleport((roomId) => {
    const g = (window as any).__loungeGame
    const s = g?.scene?.getScenes?.(true)?.[0] ?? g?.scene?.scenes?.[0]
    if (!s) return
    if (s.currentRoomId === roomId) return    // already here, no-op
    const z = _TRANSIT_ZONES.find(z => z.id === roomId)
    void Promise.all([
      import('./energy'), import('./net'), import('./ui'), import('./seasonal_rules')
    ]).then(([e, net, ui, seas]) => {
      // V13.8-review I5 fix: enforce seasonal portal rules on transit too.
      // Earlier, winter player could 🚇 → Beach despite the balcony→beach
      // portal being filtered out.
      const reason = seas.portalBlockedReason(s.currentRoomId, { name: 'transit', targetRoom: roomId })
      if (reason) { ui.showToast(reason, 2400); return }
      // Local dev: skip the energy gate so iteration isn't blocked by the cap.
      const isLocalDev = typeof window !== 'undefined'
        && /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(window.location.hostname)
      if (!isLocalDev) {
        if (z && z.cost > 0 && e.getEnergy() < z.cost) {
          ui.showToast(`⚡ Not enough energy (need ${z.cost})`, 2000)
          return
        }
        if (z && z.cost > 0) e.consumeEnergy(z.cost)
      }
      net.sendRoomChange(roomId as any)
      s.scene.restart({ roomId, spawnPoint: 'default' })
    })
  })
  // Expose for debugging / smoke tests
  ;(window as any).__loungeGame = game
  return game
}
