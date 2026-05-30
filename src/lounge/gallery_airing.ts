// SHU-737 — drops the gallery curator (Airing) into the rotunda as a
// clickable AI-chat NPC. Display name + voice are "Airing" — the blog
// author / curator. Under the hood this routes to npc_jue (whose SOUL
// was rewritten to be Airing — see services/blog-api/lib/npc-souls.js).
// Guest visitors get 2 msgs/day, logged-in users 30/day — capped server-side.

import Phaser from 'phaser'
import { crispText } from './gallery_text'
import type { RoomId } from './config'
import { Bear } from './bear'

const AIRING_X = 760
const AIRING_Y = 600       // east of centerpiece, in the rotunda
const NPC_ID = 'npc_jue'
const NPC_NAME = 'Airing'

let airingBear: Bear | null = null
let signEls: Phaser.GameObjects.GameObject[] = []
let approachTimer: Phaser.Time.TimerEvent | null = null
let eKey: Phaser.Input.Keyboard.Key | null = null
let eKeyHandler: (() => void) | null = null
let lastHintAt = 0
let lastChatAt = 0
let crispNameLabel: Phaser.GameObjects.Text | null = null

export function setupGalleryAiring(
  scene: Phaser.Scene,
  roomId: RoomId,
  getBearPos?: () => { x: number; y: number } | null,
): void {
  teardownGalleryAiring()
  if (roomId !== 'room_gallery') return

  // Airing's gallery presence is always the classic brown bear avatar
  // (matches the user's own bear identity; locked to species 'bear' so
  // we don't accidentally race-condition into showing as a panda).
  airingBear = new Bear(scene, AIRING_X, AIRING_Y, 'asia', 'bear')
  airingBear.sprite.setDepth(4.4)
  airingBear.facing = 'down'
  // Skip Bear's built-in nameLabel (renders blurry at fontSize 9px under
  // pixelArt:true). Use a crispText replacement that follows the sprite.
  airingBear.setDisplayName(null)
  crispNameLabel = crispText(scene, AIRING_X, AIRING_Y - 52, `✦ ${NPC_NAME}`, {
    fontSize: '9px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    stroke: '#000000', strokeThickness: 2,
  }).setOrigin(0.5, 1).setDepth(6)

  // Brass stanchion sign — "Airing · 策展人"
  const post = scene.add.rectangle(AIRING_X, AIRING_Y - 36, 1, 14, 0xc8a058, 0.85).setDepth(4.95)
  const plate = scene.add.rectangle(AIRING_X, AIRING_Y - 46, 64, 11, 0x1a1f2a)
    .setStrokeStyle(1, 0xc8a058, 0.95).setDepth(5.0)
  const label = crispText(scene, AIRING_X, AIRING_Y - 46, `${NPC_NAME} · 策展人`, {
    fontSize: '8px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5).setDepth(5.05)
  signEls.push(post, plate, label)

  // Click → open companion chat overlay
  airingBear.sprite.setInteractive({ useHandCursor: true })
  airingBear.sprite.on('pointerdown', () => {
    void openAiringChat(scene)
  })

  // Proximity hint — "点 Airing 聊聊 ✦" when player approaches (30s cooldown)
  if (getBearPos) {
    approachTimer = scene.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        const pos = getBearPos()
        if (!pos) return
        const dist = Math.hypot(pos.x - AIRING_X, pos.y - AIRING_Y)
        if (dist > 56) return
        const now = scene.time.now
        if (now - lastHintAt < 30_000) return
        if (now - lastChatAt < 8_000) return
        lastHintAt = now
        showFloatingHint(scene, AIRING_X, AIRING_Y - 60, `点 ${NPC_NAME} 聊聊 ✦`)
      },
    })
  }

  // E-key shortcut: when bear is within range and presses E, also opens chat.
  // RoomScene's E-key handler triggers interactables by proximity; Airing
  // isn't in the interactables list, so we wire a dedicated key listener.
  eKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null
  eKeyHandler = () => {
    if (!getBearPos) return
    const pos = getBearPos()
    if (!pos) return
    if (Math.hypot(pos.x - AIRING_X, pos.y - AIRING_Y) <= 48) {
      void openAiringChat(scene)
    }
  }
  if (eKey && eKeyHandler) eKey.on('down', eKeyHandler)
}

async function openAiringChat(scene: Phaser.Scene) {
  lastChatAt = scene.time.now
  try {
    const [{ openCompanionChat }, { getCurrentPhase }] = await Promise.all([
      import('./companion_ui'),
      import('./atmosphere'),
    ])
    const phaseMap: Record<string, string> = { dawn: '清晨', day: '白天', dusk: '傍晚', night: '深夜' }
    const phase = getCurrentPhase?.() ?? 'day'
    void openCompanionChat({
      npc_id: NPC_ID,
      npc_name: NPC_NAME,
      npc_where: '美术馆 · 策展人',
      time_phase: phaseMap[phase] ?? '白天',
      current_room: '美术馆',
      language: navigator.language?.startsWith('zh') ? '中文' : '英文',
    })
  } catch (err) {
    console.warn('[gallery-airing] failed to open chat:', err)
  }
}

function showFloatingHint(scene: Phaser.Scene, x: number, y: number, text: string) {
  const hint = crispText(scene, x, y, text, {
    fontSize: '9px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    backgroundColor: 'rgba(20, 14, 8, 0.85)',
    padding: { left: 5, right: 5, top: 2, bottom: 2 },
    resolution: 2,
  }).setOrigin(0.5).setDepth(50)
  scene.tweens.add({
    targets: hint,
    y: y - 12, alpha: 0,
    duration: 2200, ease: 'Sine.easeOut',
    onComplete: () => hint.destroy(),
  })
}

export function teardownGalleryAiring(): void {
  if (approachTimer) { approachTimer.remove(false); approachTimer = null }
  if (eKey && eKeyHandler) eKey.off('down', eKeyHandler)
  eKey = null
  eKeyHandler = null
  for (const obj of signEls) obj.destroy()
  signEls = []
  if (crispNameLabel) { crispNameLabel.destroy(); crispNameLabel = null }
  if (airingBear) {
    airingBear.destroy()
    airingBear = null
  }
  lastHintAt = 0
  lastChatAt = 0
}
