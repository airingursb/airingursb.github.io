// SHU-737 — drops Mochi (npc_jue) into the gallery rotunda as a clickable
// AI-chat NPC. Same SOUL + memory as her library presence (clicking opens
// the standard companion chat overlay), but visually a gallery visitor.
// Guests can chat 5 msgs/day, logged-in users 30/day — capped server-side.

import Phaser from 'phaser'
import type { RoomId } from './config'
import { Bear } from './bear'

const MOCHI_X = 760
const MOCHI_Y = 600       // east of centerpiece, in the rotunda
const NPC_ID = 'npc_jue'
const NPC_NAME = 'Mochi'

let mochiBear: Bear | null = null
let signEls: Phaser.GameObjects.GameObject[] = []
let approachTimer: Phaser.Time.TimerEvent | null = null
let eKey: Phaser.Input.Keyboard.Key | null = null
let eKeyHandler: (() => void) | null = null
let lastHintAt = 0
let lastChatAt = 0

export function setupGalleryMochi(
  scene: Phaser.Scene,
  roomId: RoomId,
  getBearPos?: () => { x: number; y: number } | null,
): void {
  teardownGalleryMochi()
  if (roomId !== 'room_gallery') return

  // Spawn Mochi as a panda — same species as the library presence
  mochiBear = new Bear(scene, MOCHI_X, MOCHI_Y, 'asia', 'panda')
  mochiBear.sprite.setDepth(4.4)
  mochiBear.facing = 'down'
  mochiBear.setDisplayName(NPC_NAME, { color: '#e6c878', prefix: '✦ ' })
  // The Bear class lazy-loads panda atlas via setSpecies if not preloaded
  void mochiBear.setSpecies('panda')

  // Brass stanchion sign — "Mochi · 巡馆"
  const post = scene.add.rectangle(MOCHI_X, MOCHI_Y - 36, 1, 14, 0xc8a058, 0.85).setDepth(4.95)
  const plate = scene.add.rectangle(MOCHI_X, MOCHI_Y - 46, 56, 11, 0x1a1f2a)
    .setStrokeStyle(1, 0xc8a058, 0.95).setDepth(5.0)
  const label = scene.add.text(MOCHI_X, MOCHI_Y - 46, 'Mochi · 巡馆', {
    fontSize: '8px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5).setDepth(5.05)
  signEls.push(post, plate, label)

  // Click → open companion chat (same overlay as library Mochi)
  mochiBear.sprite.setInteractive({ useHandCursor: true })
  mochiBear.sprite.on('pointerdown', () => {
    void openMochiChat(scene)
  })

  // Proximity hint — "按 E 跟 Mochi 聊聊" when player approaches (30s cooldown)
  if (getBearPos) {
    approachTimer = scene.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        const pos = getBearPos()
        if (!pos) return
        const dist = Math.hypot(pos.x - MOCHI_X, pos.y - MOCHI_Y)
        if (dist > 56) return
        const now = scene.time.now
        if (now - lastHintAt < 30_000) return
        if (now - lastChatAt < 8_000) return
        lastHintAt = now
        showFloatingHint(scene, MOCHI_X, MOCHI_Y - 60, '点 Mochi 聊聊 ✦')
      },
    })
  }

  // E-key shortcut: when bear is within range and presses E, also opens chat.
  // RoomScene's E-key handler triggers interactables by proximity; Mochi is
  // not in the interactables list, so we wire a dedicated key listener.
  eKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null
  eKeyHandler = () => {
    if (!getBearPos) return
    const pos = getBearPos()
    if (!pos) return
    if (Math.hypot(pos.x - MOCHI_X, pos.y - MOCHI_Y) <= 48) {
      void openMochiChat(scene)
    }
  }
  if (eKey && eKeyHandler) eKey.on('down', eKeyHandler)
}

async function openMochiChat(scene: Phaser.Scene) {
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
      npc_where: '美术馆',
      time_phase: phaseMap[phase] ?? '白天',
      current_room: '美术馆',
      language: navigator.language?.startsWith('zh') ? '中文' : '英文',
    })
  } catch (err) {
    console.warn('[gallery-mochi] failed to open chat:', err)
  }
}

function showFloatingHint(scene: Phaser.Scene, x: number, y: number, text: string) {
  const hint = scene.add.text(x, y, text, {
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

export function teardownGalleryMochi(): void {
  if (approachTimer) { approachTimer.remove(false); approachTimer = null }
  if (eKey && eKeyHandler) eKey.off('down', eKeyHandler)
  eKey = null
  eKeyHandler = null
  for (const obj of signEls) obj.destroy()
  signEls = []
  if (mochiBear) {
    mochiBear.destroy()
    mochiBear = null
  }
  lastHintAt = 0
  lastChatAt = 0
}
