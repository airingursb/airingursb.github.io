// Grand-entry camera pan for the museum. On a fresh arrival from the lobby,
// stop the player-follow, pan the camera from the south pavilion entry up
// to the centerpiece for a 1.5s "wow" reveal, then resume normal follow.
// Skips on subsequent restarts in the same session so it doesn't get annoying.

import Phaser from 'phaser'
import type { RoomId } from './config'

declare global {
  // eslint-disable-next-line no-var
  var __galleryEntered: boolean | undefined
}

const CENTERPIECE_X = 640
const CENTERPIECE_Y = 480

export function maybePlayGalleryIntro(
  scene: Phaser.Scene,
  roomId: RoomId,
  bearSprite: Phaser.GameObjects.Sprite | undefined
): void {
  if (roomId !== 'room_gallery') return
  if (typeof window !== 'undefined' && window.__galleryEntered) return
  // NB: flag set ONLY in success path below — if bearSprite is missing OR
  // we never reach startFollow, we should retry on a later visit.
  if (!bearSprite) return

  const cam = scene.cameras.main
  cam.stopFollow()
  let resumed = false
  const shutdown = Phaser.Scenes.Events.SHUTDOWN
  const cleanup = () => scene.events.off(shutdown, resumeFollow)
  const resumeFollow = () => {
    if (resumed) return
    resumed = true
    cleanup()
    cam.startFollow(bearSprite, true, 0.10, 0.10)
    if (typeof window !== 'undefined') window.__galleryEntered = true
  }

  scene.time.delayedCall(450, () => {
    cam.pan(CENTERPIECE_X, CENTERPIECE_Y, 1400, 'Sine.easeInOut', false,
      (_c: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress >= 1) {
          scene.time.delayedCall(700, resumeFollow)
        }
      })
  })
  // Belt-and-suspenders: regardless of callback firing, resume follow after
  // the full intro budget elapses. Prevents a stuck camera if `pan`'s
  // progress callback misses or the scene swaps out mid-pan.
  scene.time.delayedCall(450 + 1400 + 700 + 100, resumeFollow)
  // If the scene shuts down mid-intro, restore follow so the next room's
  // camera setup isn't fighting our stale stopFollow state. resumeFollow
  // unregisters itself on success so the listener doesn't leak per-entry.
  scene.events.once(shutdown, resumeFollow)
}

/** Reset the once-per-session guard (for QA / dev tooling). */
export function resetGalleryIntro(): void {
  if (typeof window !== 'undefined') window.__galleryEntered = false
}
