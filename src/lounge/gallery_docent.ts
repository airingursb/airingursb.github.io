// Museum docent NPC for room_gallery. A single static sprite at the rotunda
// info desk. Click → shows a welcoming dialog bubble. Cycles through a few
// canned lines. No movement, no time-of-day logic — keeps the scope tight
// while still giving the museum a "host". When D01-D04 PNGs aren't loaded
// yet, falls back to a styled placeholder silhouette.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { getAsset } from './gallery_assets'
import { showBubble } from './ui'

const DOCENT_X = 640
const DOCENT_Y = 644              // just behind the info desk at (640, 666)
const DOCENT_ID = 'npc_docent'

const WELCOME_LINES = [
  '欢迎光临 · 中庭是 Mochi 的小园子，四面是各专题展厅。',
  '东翼是 Web Internals — Chromium、React、CSS 那一脉。',
  '西翼是 Performance & Memory — GC、jank、V8 那些。',
  '北厅是 Networks — TLS、HTTP/3。南面是漫画馆。',
  '随便看，按 E 可以走进任何一幅作品。',
  '后院通往 Mochi 的 3D 小园子 —— 走过去就行。',
]

const GREET_PROXIMITY = 48      // px range for auto-greeting
const GREET_COOLDOWN_MS = 60_000 // 60s between auto-greetings

let container: Phaser.GameObjects.Container | null = null
let lineIndex = 0
let lastGreetAt = 0
let proximityTimer: Phaser.Time.TimerEvent | null = null

export function setupGalleryDocent(
  scene: Phaser.Scene,
  roomId: RoomId,
  getBearPos?: () => { x: number; y: number } | null,
) {
  teardownGalleryDocent()
  if (roomId !== 'room_gallery') return

  container = scene.add.container(DOCENT_X, DOCENT_Y).setDepth(4.5)

  const d01 = getAsset('D01-docent-down')
  if (d01 && scene.textures.exists(d01.key)) {
    const img = scene.add.image(0, 0, d01.key).setOrigin(0.5, 0.85)
    img.setScale(0.85)
    container.add(img)
  } else {
    // Placeholder silhouette — dignified ink figure with brass accent
    const body = scene.add.rectangle(0, 0, 14, 22, 0x1a1a1a)
    const head = scene.add.circle(0, -12, 5, 0xf0e8c8)
    const bowtie = scene.add.rectangle(0, -6, 4, 1.5, 0xd44820)
    container.add([body, head, bowtie])
  }

  // Brass stanchion sign above the docent — Chinese-only since the bilingual
  // version rendered as broken glyphs at the small font size (the Chinese
  // char fallback didn't match the monospace English). Single-language is
  // cleaner anyway: "馆员" in proper SC characters reads correctly.
  const stanchionPost = scene.add.rectangle(0, -32, 1, 14, 0xc8a058, 0.85)
  const signPlate = scene.add.rectangle(0, -42, 32, 11, 0x1a1a1a)
    .setStrokeStyle(1, 0xc8a058, 0.95)
  const signText = scene.add.text(0, -42, '馆员', {
    fontSize: '9px',
    color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans SC", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)
  container.add([stanchionPost, signPlate, signText])
  // Force the sign labels above the docent sprite's z-order
  signPlate.setDepth(5.0)
  signText.setDepth(5.05)
  stanchionPost.setDepth(4.95)

  const speak = () => {
    const line = WELCOME_LINES[lineIndex % WELCOME_LINES.length]
    lineIndex++
    const cam = scene.cameras.main
    const sx = (DOCENT_X - cam.scrollX) * cam.zoom + cam.x
    const sy = (DOCENT_Y - cam.scrollY) * cam.zoom + cam.y - 30
    showBubble(DOCENT_ID, line, sx, sy)
    lastGreetAt = scene.time.now
  }

  // Click → next greeting line
  container.setSize(28, 36)
  container.setInteractive({ useHandCursor: true })
  container.on('pointerdown', speak)

  // Auto-greet when player walks within proximity (60s cooldown)
  if (getBearPos) {
    proximityTimer = scene.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        const pos = getBearPos()
        if (!pos) return
        const dist = Math.hypot(pos.x - DOCENT_X, pos.y - DOCENT_Y)
        if (dist > GREET_PROXIMITY) return
        if (scene.time.now - lastGreetAt < GREET_COOLDOWN_MS) return
        speak()
      },
    })
  }
}

export function teardownGalleryDocent() {
  if (proximityTimer) { proximityTimer.remove(false); proximityTimer = null }
  if (container) {
    container.destroy()
    container = null
  }
  // Reset the dialog cursor + greeting cooldown so the next gallery visit
  // starts at the welcome line, not mid-cycle.
  lineIndex = 0
  lastGreetAt = 0
}
