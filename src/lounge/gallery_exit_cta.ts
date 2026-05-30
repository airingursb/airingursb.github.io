// Gallery exit CTA — when the player has visited ≥5 exhibits, a brass
// plaque slides up near the south arch (the exit path) inviting them to
// follow / subscribe. Aim is to convert browsing → engagement before they
// close the page. Shows at most once per browser day (per localStorage).

import Phaser from 'phaser'
import type { RoomId } from './config'
import { crispText } from './gallery_text'
import { getVisitedCount } from './gallery_progress'
import { trackEvent } from './umami'

const FLAG_KEY = 'gallery_exit_cta_shown_day'  // value = YYYY-MM-DD it last fired
const MIN_VISITS = 5
const CHECK_DELAY_MS = 2000   // give the room a beat to render before polling
const SHOW_DURATION_MS = 14_000

let panel: Phaser.GameObjects.Container | null = null
let scheduledTimer: Phaser.Time.TimerEvent | null = null

function utcDay(): string { return new Date().toISOString().slice(0, 10) }

function alreadyShownToday(): boolean {
  try { return localStorage.getItem(FLAG_KEY) === utcDay() } catch { return false }
}
function markShownToday(): void {
  try { localStorage.setItem(FLAG_KEY, utcDay()) } catch {}
}

export function setupGalleryExitCTA(scene: Phaser.Scene, roomId: RoomId): void {
  teardownGalleryExitCTA()
  if (roomId !== 'room_gallery') return
  if (alreadyShownToday()) return

  // Defer the check so visit-tracking from the entry pan has settled.
  scheduledTimer = scene.time.delayedCall(CHECK_DELAY_MS, () => maybeShow(scene))
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, teardownGalleryExitCTA)
}

function maybeShow(scene: Phaser.Scene): void {
  if (getVisitedCount() < MIN_VISITS) return
  show(scene)
}

function show(scene: Phaser.Scene): void {
  markShownToday()
  const x = 640, y = 760    // just above the south arch
  panel = scene.add.container(x, y).setDepth(940)

  const plate = scene.add.rectangle(0, 0, 360, 92, 0x1a1f2a, 0.96)
    .setStrokeStyle(2, 0xc8a058, 0.95)
  const stripe = scene.add.rectangle(0, -36, 356, 4, 0xd44820, 0.9)
  const visited = getVisitedCount()
  const title = crispText(scene, -160, -20, `谢谢看完 · 已看 ${visited} 件`, {
    fontSize: '11px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0, 0.5)
  const body = crispText(scene, -160, 2, '下周还来吗？订阅每周 / 月刊更新', {
    fontSize: '9px', color: '#d8c098',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0, 0.5)

  // RSS button
  const rssBg = scene.add.rectangle(-100, 28, 90, 22, 0xc97b3c, 1)
    .setStrokeStyle(1, 0x7a4520, 1).setInteractive({ useHandCursor: true })
  const rssLabel = crispText(scene, -100, 28, 'RSS 订阅', {
    fontSize: '10px', color: '#fff',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)

  // Newsletter button
  const nlBg = scene.add.rectangle(0, 28, 90, 22, 0x2a1810, 1)
    .setStrokeStyle(1, 0xc8a058, 1).setInteractive({ useHandCursor: true })
  const nlLabel = crispText(scene, 0, 28, '邮件订阅', {
    fontSize: '10px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)

  // Close button (small × top-right)
  const xBtn = crispText(scene, 168, -32, '×', {
    fontSize: '14px', color: '#888',
    fontFamily: 'ui-monospace, monospace',
  }).setOrigin(0.5).setInteractive({ useHandCursor: true })

  panel.add([plate, stripe, title, body, rssBg, rssLabel, nlBg, nlLabel, xBtn])
  panel.setAlpha(0)
  panel.y += 12

  const fadeIn = scene.tweens.add({
    targets: panel,
    alpha: { from: 0, to: 1 },
    y: { from: panel.y, to: y },
    duration: 450, ease: 'Sine.easeOut',
  })

  function dismiss(): void {
    if (!panel) return
    fadeIn.stop()
    autoTimer.remove(false)
    scene.tweens.add({
      targets: panel, alpha: 0,
      duration: 280,
      onComplete: () => { panel?.destroy(); panel = null },
    })
  }

  rssBg.on('pointerdown', () => {
    trackEvent('nook-gallery-exit-cta-click', { action: 'rss', visited })
    window.open('/blog/feed.xml', '_blank')
    dismiss()
  })
  nlBg.on('pointerdown', () => {
    trackEvent('nook-gallery-exit-cta-click', { action: 'newsletter', visited })
    // Reuse the main-page newsletter modal if it's there; otherwise jump
    // to /blog where the subscribe widget lives.
    window.open('/blog#subscribe', '_blank')
    dismiss()
  })
  xBtn.on('pointerdown', () => {
    trackEvent('nook-gallery-exit-cta-click', { action: 'dismiss', visited })
    dismiss()
  })

  const autoTimer = scene.time.delayedCall(SHOW_DURATION_MS, dismiss)
  trackEvent('nook-gallery-exit-cta-shown', { visited })
}

export function teardownGalleryExitCTA(): void {
  if (scheduledTimer) { scheduledTimer.remove(false); scheduledTimer = null }
  if (panel) { panel.destroy(); panel = null }
}
