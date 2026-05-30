// One-shot 30-second nudge for brand-new visitors landing in the lobby.
// Shows a floating crisp text hint + a pulsing arrow above the gallery
// door (the one new users miss the most). Sets a localStorage flag so
// this only runs ONCE per browser, ever.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { crispText } from './gallery_text'

const FLAG = 'lounge_onboarded_v1'
// Lobby gallery door coords (lobby.tmj has the carved gap at x=144..160, y=0..16)
const ARROW_X = 152
const ARROW_Y = 26          // just below the door, pointing up at it
const SHOW_AFTER_MS = 1600   // let camera fade-in settle before the hint appears
const HOLD_MS = 30_000       // 30 seconds total, then quietly dismiss
// External hook so RoomScene.applyKeyboard / click handler can dismiss
// the hint as soon as the user actually moves — feels respectful.
let dismissActive: (() => void) | null = null

export function dismissOnboardingIfActive(): void {
  if (dismissActive) {
    try { dismissActive() } catch {}
  }
}

export function setupLoungeOnboarding(scene: Phaser.Scene, roomId: RoomId): void {
  if (roomId !== 'room_lobby') return
  let already = false
  try { already = localStorage.getItem(FLAG) === '1' } catch {}
  if (already) return
  // Mark as onboarded immediately — even if the user closes the tab during
  // the hint window we don't want to nag them on next visit.
  try { localStorage.setItem(FLAG, '1') } catch {}

  // Defer the actual draw so the scene fade-in / NPC spawn happens first;
  // the hint feels diegetic instead of slamming in at t=0.
  const introTimer = scene.time.delayedCall(SHOW_AFTER_MS, () => render(scene))

  // If teardown fires before the deferred call, cancel it.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => introTimer.remove(false))
}

function render(scene: Phaser.Scene): void {
  const camW = scene.cameras.main.width
  const camH = scene.cameras.main.height

  // ── 1. Bottom-center toast (screen-space, follows camera) ─────────────
  const toast = scene.add.container(camW / 2, camH - 30).setScrollFactor(0).setDepth(950)
  const bg = scene.add.rectangle(0, 0, 380, 40, 0x1a1f2a, 0.92)
    .setStrokeStyle(2, 0xc8a058, 0.85)
  const title = crispText(scene, -170, -8, '👋  欢迎', {
    fontSize: '10px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0, 0.5)
  const body = crispText(scene, -170, 8, 'WASD 或 点地面移动 · 试试走进左上的拱门看作品集', {
    fontSize: '9px', color: '#d8c098',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0, 0.5)
  const xBtn = crispText(scene, 175, 0, '×', {
    fontSize: '14px', color: '#888',
    fontFamily: 'ui-monospace, monospace',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })
  toast.add([bg, title, body, xBtn])
  toast.setAlpha(0)

  // ── 2. World-space pulsing arrow above the gallery door ───────────────
  const arrowLayer = scene.add.container(ARROW_X, ARROW_Y).setDepth(950)
  // Down-pointing chevron at the door's south face. Origin at chevron tip.
  const arrow = scene.add.triangle(0, 0,
    0, 0,        // tip (south)
    -4, -8,      // back-left
    4, -8,       // back-right
    0xc8a058
  ).setStrokeStyle(1, 0x1a1f2a, 1)
  const label = crispText(scene, 0, -18, '作品集', {
    fontSize: '7px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    backgroundColor: 'rgba(20,14,8,0.85)',
    padding: { left: 4, right: 4, top: 1, bottom: 1 },
    resolution: 2,
  }).setOrigin(0.5, 1)
  arrowLayer.add([arrow, label])

  // ── Animations: gentle bob on arrow, fade-in on both ──────────────────
  const fadeIn = scene.tweens.add({
    targets: [toast, arrowLayer], alpha: { from: 0, to: 1 },
    duration: 400, ease: 'Sine.easeOut',
  })
  const arrowBob = scene.tweens.add({
    targets: arrowLayer, y: { from: ARROW_Y, to: ARROW_Y - 6 },
    duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  })

  // ── Dismiss: programmatic + on user input + on auto timeout ───────────
  let dismissed = false
  function dismiss() {
    if (dismissed) return
    dismissed = true
    dismissActive = null
    autoTimer.remove(false)
    arrowBob.stop()
    fadeIn.stop()
    scene.tweens.add({
      targets: [toast, arrowLayer], alpha: 0,
      duration: 350, ease: 'Sine.easeIn',
      onComplete: () => {
        try { toast.destroy() } catch {}
        try { arrowLayer.destroy() } catch {}
      },
    })
  }
  dismissActive = dismiss
  xBtn.on('pointerdown', dismiss)
  const autoTimer = scene.time.delayedCall(HOLD_MS, dismiss)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, dismiss)
}
