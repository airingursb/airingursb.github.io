// Lobby returning-pill — passive social presence cue.
//
// When the player enters the lobby AND has visited another room in the
// last 24h (but not within the last 90s, to avoid bouncing-around noise),
// show a small bottom-center pill like:
//
//   ↩︎ 上次去了 Library · 23 分钟前
//
// Auto-dismisses after 6s or on click. One pill per scene boot, never on
// the very first lobby entry of a brand-new visitor (no prior visits to
// reference, and the onboarding nudge already speaks for that case).

import Phaser from 'phaser'
import type { RoomId } from './config'
import { MAP_ROOMS } from './minimap'
import { crispText } from './gallery_text'
import { getLastOtherRoomVisit, formatAgoZh } from './visit_log'

const SHOW_AFTER_MS = 1200
const HOLD_MS = 6000
const TOO_RECENT_MS = 90 * 1000        // skip if last room visit was <90s ago (just bouncing)
const TOO_OLD_MS = 24 * 60 * 60 * 1000  // skip if last room visit was >24h ago (stale)

export function setupLobbyReturningPill(scene: Phaser.Scene, roomId: RoomId): void {
  if (roomId !== 'room_lobby') return
  const last = getLastOtherRoomVisit(roomId)
  if (!last) return
  const dt = Date.now() - last.at
  if (dt < TOO_RECENT_MS || dt > TOO_OLD_MS) return
  const roomLabel = MAP_ROOMS.find((r) => r.id === last.roomId)?.label
  if (!roomLabel) return  // unknown room, don't render a half-baked pill

  const intro = scene.time.delayedCall(SHOW_AFTER_MS, () => render(scene, roomLabel, last.at))
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => intro.remove(false))
}

function render(scene: Phaser.Scene, roomLabel: string, visitedAt: number): void {
  const camW = scene.cameras.main.width
  const camH = scene.cameras.main.height
  const ago = formatAgoZh(visitedAt)

  const pill = scene.add.container(camW / 2, camH - 30).setScrollFactor(0).setDepth(940)
  const text = `↩︎ 上次去了 ${roomLabel} · ${ago}`
  const measured = crispText(scene, 0, 0, text, {
    fontSize: '10px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)
  const w = Math.max(220, measured.width + 28)
  const bg = scene.add.rectangle(0, 0, w, 28, 0x1a1f2a, 0.92)
    .setStrokeStyle(1, 0xc8a058, 0.75)
  pill.add([bg, measured])
  pill.setSize(w, 28)
  pill.setInteractive({ useHandCursor: true })
  pill.setAlpha(0)

  const fadeIn = scene.tweens.add({
    targets: pill, alpha: { from: 0, to: 1 },
    duration: 320, ease: 'Sine.easeOut',
  })

  let dismissed = false
  function dismiss(): void {
    if (dismissed) return
    dismissed = true
    fadeIn.stop()
    autoTimer.remove(false)
    scene.tweens.add({
      targets: pill, alpha: 0,
      duration: 280, ease: 'Sine.easeIn',
      onComplete: () => { try { pill.destroy() } catch { /* ignore */ } },
    })
  }
  pill.on('pointerdown', dismiss)
  const autoTimer = scene.time.delayedCall(HOLD_MS, dismiss)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, dismiss)
}
