// Portal subsystem — extracted from RoomScene.ts for readability + future
// unit-testability. The original methods on RoomScene now delegate to
// these impl functions; PROD behavior is unchanged.
//
// Pattern for future RoomScene splits: define an impl function here that
// takes the scene as its first arg, do the work via duck-typed access
// (we use the structural type below to document what the impl needs).
// Casting via `any` is acceptable in this seam — the boundary between a
// god-class and pure helpers is one of the few places it earns its keep.

import { isHomeRoom, prefersReducedMotion, type RoomId } from '../config'
import { MAP_ROOMS, hideDoorLabel, showDoorLabel, setDoorLabelClickHandler } from '../minimap'
import { stopRoomAudio } from '../audio'
import { stopBoothTrack } from '../booth'
import { hideNowPlaying, hideBoothPicker } from '../ui'
import { sendRoomChange } from '../net'
import { trackEvent } from '../umami'

export type Portal = {
  x: number; y: number; w: number; h: number
  targetRoom: RoomId; targetSpawn: string
}

// Minimum surface RoomScene must expose for these helpers to do their job.
// Kept as a structural type to avoid an import cycle with RoomScene.ts.
type PortalSceneApi = {
  myBear?: { x: number; y: number } | undefined
  portals: Portal[]
  transitioning: boolean
  currentRoomId: RoomId
  atmosphereTimer?: Phaser.Time.TimerEvent
  npcRefreshTimer?: Phaser.Time.TimerEvent
  npcSmalltalkTimer?: Phaser.Time.TimerEvent
  seasonalEmitter?: { destroy: () => void }
  holidayEmitter?: { destroy: () => void }
  seasonOverlay?: { destroy: () => void }
  cameras: Phaser.Cameras.Scene2D.CameraManager
  scene: Phaser.Scenes.ScenePlugin
  // RoomScene private — used to convert a world-bear position to screen px
  bearScreenPos: (b: { x: number; y: number }) => { x: number; y: number }
}

let nearbyDoorPortal: Portal | null = null

/** Module-private — reset when a scene boots so stale state doesn't leak
 *  into the next room. Call from RoomScene.create(). */
export function resetPortalState(): void {
  nearbyDoorPortal = null
}

/** Frame-loop check: did the player walk into a portal rect? */
export function checkPortalCollision(scene: PortalSceneApi): void {
  if (scene.transitioning || !scene.myBear) return
  const b = scene.myBear
  for (const p of scene.portals) {
    if (b.x >= p.x && b.x <= p.x + p.w && b.y >= p.y && b.y <= p.y + p.h) {
      enterPortal(scene, p)
      return
    }
  }
}

/** Frame-loop check: which portal is the player near right now? Updates
 *  the floating "→ Library" door label + (re)binds its click handler. */
export function checkDoorProximity(scene: PortalSceneApi): void {
  if (!scene.myBear) return
  const PROX = 48
  let nearest: Portal | null = null
  let bestD = Infinity
  for (const p of scene.portals) {
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2
    const d = Math.hypot(cx - scene.myBear.x, cy - scene.myBear.y)
    if (d < PROX && d < bestD) { nearest = p; bestD = d }
  }
  if (nearest !== nearbyDoorPortal) {
    nearbyDoorPortal = nearest
    if (!nearest) hideDoorLabel()
  }
  if (nearbyDoorPortal && scene.myBear) {
    const screen = scene.bearScreenPos(scene.myBear)
    const target = nearbyDoorPortal.targetRoom
    let roomLabel = MAP_ROOMS.find((r) => r.id === target)?.label
    if (!roomLabel) {
      if (isHomeRoom(target) || target === ('room_home_self' as RoomId)) roomLabel = 'Home'
      else roomLabel = String(target)
    }
    showDoorLabel(`→ ${roomLabel}`, screen.x, screen.y - 12)
    const portal = nearbyDoorPortal
    setDoorLabelClickHandler(() => enterPortal(scene, portal))
  }
}

/** Shared portal transition. Called by checkPortalCollision (walked-in) AND
 *  by the door-label click handler (clicked the floating hint without
 *  walking in). Handles fade-out + audio cleanup + scene.restart. */
export function enterPortal(scene: PortalSceneApi, p: Portal): void {
  if (scene.transitioning) return
  scene.transitioning = true
  const targetRoom = p.targetRoom
  const targetSpawn = p.targetSpawn
  // Analytics: every door-portal transition (transit/event/snap-back paths
  // bypass this — see those sites for their own track calls).
  trackEvent('nook-room-change', {
    from: scene.currentRoomId, to: targetRoom, via: 'door',
  })
  const fade = !prefersReducedMotion()
  const doRestart = () => {
    stopRoomAudio()
    stopBoothTrack()
    hideNowPlaying()
    hideBoothPicker()
    if (scene.atmosphereTimer) { scene.atmosphereTimer.remove(false); scene.atmosphereTimer = undefined }
    if (scene.npcRefreshTimer) { scene.npcRefreshTimer.remove(false); scene.npcRefreshTimer = undefined }
    if (scene.npcSmalltalkTimer) { scene.npcSmalltalkTimer.remove(false); scene.npcSmalltalkTimer = undefined }
    scene.seasonalEmitter?.destroy(); scene.seasonalEmitter = undefined
    scene.holidayEmitter?.destroy(); scene.holidayEmitter = undefined
    scene.seasonOverlay?.destroy(); scene.seasonOverlay = undefined
    hideDoorLabel()
    sendRoomChange(targetRoom)
    scene.scene.restart({ roomId: targetRoom, spawnPoint: targetSpawn })
  }
  if (fade) {
    scene.cameras.main.fadeOut(220, 248, 240, 220)
    scene.cameras.main.once('camerafadeoutcomplete', doRestart)
  } else {
    doRestart()
  }
}

/** Mostly for tests / debug — current nearby portal (or null). */
export function getNearbyDoorPortal(): Portal | null { return nearbyDoorPortal }
