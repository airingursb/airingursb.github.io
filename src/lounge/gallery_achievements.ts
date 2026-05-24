// Gallery achievements. Tracks the player's exhibit-visiting progress and
// awards a brass medallion in the rotunda for each completed collection.
// Quiet positive feedback for thorough museum-goers — a medallion appears
// at a column base when a category is finished. Also fires a one-time brass
// toast when the unlock happens mid-session (not just on next room visit).

import Phaser from 'phaser'
import { crispText } from './gallery_text'
import type { RoomId } from './config'
import { hasVisited, getVisitedCount } from './gallery_progress'

const ANNOUNCED_KEY = 'gallery_announced_achievements_v1'

function loadAnnounced(): Set<string> {
  try {
    const raw = localStorage.getItem(ANNOUNCED_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}
function saveAnnounced(set: Set<string>): void {
  try { localStorage.setItem(ANNOUNCED_KEY, JSON.stringify([...set])) } catch {}
}

type Achievement = {
  id: string
  label: string
  requiresAll: string[]      // exhibit URLs that must all be visited
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'web_internals',
    label: 'Web Internals 全通',
    requiresAll: [
      '/immersive/chromium-renderer/', '/immersive/css-engine/',
      '/immersive/react-internals/', '/immersive/webgpu/',
      '/immersive/webassembly/', '/immersive/image-formats/',
    ],
  },
  {
    id: 'performance',
    label: 'Performance 全通',
    requiresAll: [
      '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
      '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
    ],
  },
  {
    id: 'networks',
    label: 'Networks 全通',
    requiresAll: ['/immersive/http3/', '/immersive/tls-handshake/'],
  },
  {
    id: 'curator',
    label: 'Curator · 看过全部 14 篇 immersive',
    requiresAll: [
      '/immersive/chromium-renderer/', '/immersive/css-engine/',
      '/immersive/react-internals/', '/immersive/webgpu/',
      '/immersive/webassembly/', '/immersive/image-formats/',
      '/immersive/gc/', '/immersive/helio/', '/immersive/jank-stutter/',
      '/immersive/llm-inference-life/', '/immersive/quickjs/', '/immersive/v8-fast-js/',
      '/immersive/http3/', '/immersive/tls-handshake/',
    ],
  },
  {
    id: 'easter_egg',
    label: '策展人发现 · 找到馆主签名',
    requiresAll: ['/'],   // about-airing easter egg behind centerpiece links to "/"
  },
]

// Medallion plinths sit at the BASE of each marble column (not on the
// shaft) so they read as trophies on display, not as decorations stuck to
// the wall. 5th slot = secret easter-egg achievement, placed near the
// docent's info desk (south-center) so it's distinct from the column quartet.
const MEDALLION_SLOTS: Array<{ x: number; y: number }> = [
  { x: 464, y: 470 },
  { x: 816, y: 470 },
  { x: 464, y: 660 },
  { x: 816, y: 660 },
  { x: 580, y: 690 },   // easter egg slot — beside info desk
]

let layer: Phaser.GameObjects.Container | null = null

export function setupGalleryAchievements(scene: Phaser.Scene, roomId: RoomId) {
  teardownGalleryAchievements()
  if (roomId !== 'room_gallery') return

  layer = scene.add.container(0, 0).setDepth(3.5)

  // For each completed achievement, render a brass medallion at a slot.
  // Announce any newly-completed (since last room load) via a brass toast.
  const announced = loadAnnounced()
  let slotIdx = 0
  const newlyUnlocked: Achievement[] = []
  for (const ach of ACHIEVEMENTS) {
    if (slotIdx >= MEDALLION_SLOTS.length) break
    const done = ach.requiresAll.every(url => hasVisited(url))
    if (!done) continue
    const slot = MEDALLION_SLOTS[slotIdx++]
    drawMedallion(scene, layer, slot.x, slot.y)
    if (!announced.has(ach.id)) {
      newlyUnlocked.push(ach)
      announced.add(ach.id)
    }
  }
  if (newlyUnlocked.length > 0) {
    saveAnnounced(announced)
    // Stagger toasts 4s apart so they don't overlap
    for (let i = 0; i < newlyUnlocked.length; i++) {
      scene.time.delayedCall(i * 4200, () => showAchievementToast(scene, newlyUnlocked[i]))
    }
  }

  // Visited count footer near info desk. Denominator computed from the
  // exhibits actually present in the scene (avoids the magic number that
  // would drift if exhibits are added/removed).
  const TOTAL_FIXED_EXHIBITS = 14 + 4 + 1 + 1   // immersive + notes + centerpiece + easter egg
  // Comics are dynamic; estimate from current visit list if available, else 5
  const knownComics = 5
  const total = TOTAL_FIXED_EXHIBITS + knownComics
  const visited = getVisitedCount()
  if (visited > 0) {
    const counter = crispText(scene, 640, 700, `${visited} / ${total} 已观`, {
      fontSize: '8px', color: '#c8a058',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
      backgroundColor: 'rgba(20, 14, 8, 0.7)',
      padding: { left: 5, right: 5, top: 2, bottom: 2 },
    }).setOrigin(0.5).setDepth(3.5)
    layer.add(counter)
  }
}

function drawMedallion(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number, cy: number
) {
  // Warm yellow halo glow behind the trophy — sells "this is special"
  const halo = scene.add.circle(cx, cy, 14, 0xffd28a, 0.32)
  // Pedestal at the base of the column (wider, darker)
  const pedestal = scene.add.rectangle(cx, cy + 11, 22, 7, 0x1a1f2a)
    .setStrokeStyle(1, 0xc8a058, 0.9)
  const pedestalTop = scene.add.rectangle(cx, cy + 8, 22, 1.5, 0xc8a058, 0.9)
  // Brass disc — larger (was 5px radius, now 9) for readability
  const disc = scene.add.circle(cx, cy, 9, 0xc8a058)
    .setStrokeStyle(2, 0x6a4818, 1)
  const inner = scene.add.circle(cx, cy, 6, 0xe6c878, 0.95)
  // Deeper-ink star with slight resolution boost for crisper edges
  const star = crispText(scene, cx, cy, '★', {
    fontSize: '12px', color: '#0a0a0a',
    fontFamily: 'ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)
  layer.add([halo, pedestal, pedestalTop, disc, inner, star])
  // Halo + disc both pulse for the "trophy" feel
  scene.tweens.add({
    targets: halo,
    alpha: { from: 0.32, to: 0.55 },
    scale: { from: 1, to: 1.18 },
    yoyo: true, repeat: -1, duration: 1900, ease: 'Sine.easeInOut',
  })
  scene.tweens.add({
    targets: [disc, inner, star],
    scale: { from: 1, to: 1.06 },
    yoyo: true, repeat: -1, duration: 1900, ease: 'Sine.easeInOut',
  })
}

function showAchievementToast(scene: Phaser.Scene, ach: Achievement) {
  const cw = scene.cameras.main.width
  const ch = scene.cameras.main.height
  const c = scene.add.container(cw / 2, ch - 64).setScrollFactor(0).setDepth(905)
  const plate = scene.add.rectangle(0, 0, 320, 44, 0x1a1f2a, 0.95)
    .setStrokeStyle(2, 0xc8a058, 0.95)
  const halo = scene.add.circle(-130, 0, 16, 0xffd28a, 0.45)
  const medal = scene.add.circle(-130, 0, 9, 0xc8a058)
    .setStrokeStyle(2, 0x6a4818, 1)
  const star = crispText(scene, -130, 0, '★', {
    fontSize: '11px', color: '#1a1a1a',
    fontFamily: 'ui-monospace, monospace',
  }).setOrigin(0.5)
  const title = crispText(scene, -100, -8, 'ACHIEVEMENT', {
    fontSize: '8px', color: '#c8a058',
    fontFamily: 'ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0, 0.5)
  const label = crispText(scene, -100, 6, ach.label, {
    fontSize: '11px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0, 0.5)
  c.add([plate, halo, medal, star, title, label])
  c.setAlpha(0)
  c.y += 8
  scene.tweens.add({
    targets: c, alpha: 1, y: c.y - 8,
    duration: 350, ease: 'Sine.easeOut',
    onComplete: () => {
      scene.time.delayedCall(3000, () => {
        scene.tweens.add({
          targets: c, alpha: 0, y: c.y - 8,
          duration: 500,
          onComplete: () => c.destroy(),
        })
      })
    },
  })
  // Halo pulse for celebration
  scene.tweens.add({
    targets: halo,
    scale: { from: 1, to: 1.3 }, alpha: { from: 0.45, to: 0.15 },
    yoyo: true, repeat: 5, duration: 400,
  })
}

export function teardownGalleryAchievements() {
  if (layer) { layer.destroy(); layer = null }
}
