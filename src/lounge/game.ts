import Phaser from 'phaser'
import { RoomScene } from './scenes/RoomScene'
import { ROOM_WIDTH, ROOM_HEIGHT, DEFAULT_ROOM } from './config'
import { installProgressSync, pullProgress } from './progress_sync'
import { togglePetPanel as _ensurePetUiInit } from './pet_ui'
import { togglePanel as _ensureAchUiInit } from './achievements_ui'
import { togglePanel as _ensurePhotosUiInit } from './photos_ui'
import { isMobile, isTouchDevice, isNarrowViewport, onViewportChange } from './mobile'
import { initTouchInput } from './touch_input'
import { maybeStartTour } from './onboarding_ui'
import { toggle as _ensureMinigameUiInit } from './minigames_ui'

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
  game.scene.start('Room', { roomId: DEFAULT_ROOM, spawnPoint: 'default' })
  // V10.8d — expose a small test bridge so smoke scripts can drive the V10
  // achievement + mailbox + heart APIs without dynamic-importing TS sources.
  Promise.all([
    import('./achievements'), import('./mailbox'),
    import('./npc_hearts'), import('./pets')
  ]).then(([ach, mail, hearts, pets]) => {
    ;(window as any).__loungeTest = {
      recordAchievement: ach.recordEvent,
      getAchievementUnlocked: ach.getUnlocked,
      setFriendNotifsEnabled: mail.setFriendNotifsEnabled,
      isFriendNotifsEnabled: mail.isFriendNotifsEnabled,
      notifyFriendActivity: mail.notifyFriendActivity,
      mailUnreadCount: mail.unreadCount,
      getNpcHeartLevel: hearts.getNpcHeartLevel,
      getPet: pets.getPet
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
  // Expose for debugging / smoke tests
  ;(window as any).__loungeGame = game
  return game
}
