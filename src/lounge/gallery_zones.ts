// Zone entry banners for the museum. Watches the player's position and,
// when they cross from one zone to another, fades in a brass-on-ink banner
// at the top of the screen naming the zone. Wayfinding + grand-entry feel.

import Phaser from 'phaser'
import { crispText } from './gallery_text'
import type { RoomId } from './config'

type Zone = {
  id: string
  label: string          // shown on the banner
  subtitle: string       // smaller secondary text
  bbox: [number, number, number, number]  // x_min, y_min, x_max, y_max (px)
}

// Kept in sync with scripts/generate-gallery-tmj.py ZONES + room_decals.ts
const ZONES: Zone[] = [
  { id: 'north',   label: '北厅 · NORTH HALL',     subtitle: 'Networks & Protocols',     bbox: [512,   0,  768, 320] },
  { id: 'west',    label: '西翼 · WEST WING',      subtitle: 'Performance & Memory',     bbox: [  0, 320,  384, 704] },
  { id: 'east',    label: '东翼 · EAST WING',      subtitle: 'Web Internals',            bbox: [896, 320, 1280, 704] },
  { id: 'rotunda', label: '中庭 · ROTUNDA',         subtitle: 'Airing · 中央焦点',          bbox: [384, 320,  896, 704] },
  { id: 'south',   label: '南馆 · SOUTH PAVILION', subtitle: '四格漫画 + 通往庭园',       bbox: [384, 704,  896, 960] },
]

let bannerContainer: Phaser.GameObjects.Container | null = null
let lastZoneId: string | null = null
let watchTimer: Phaser.Time.TimerEvent | null = null
let activeTween: Phaser.Tweens.Tween | null = null

const FIRST_VISIT_KEY = 'gallery_first_visit_v1'

function findZone(x: number, y: number): Zone | null {
  for (const z of ZONES) {
    if (x >= z.bbox[0] && x < z.bbox[2] && y >= z.bbox[1] && y < z.bbox[3]) return z
  }
  return null
}

export function setupGalleryZones(
  scene: Phaser.Scene,
  roomId: RoomId,
  getBearPos: () => { x: number; y: number } | null
) {
  teardownGalleryZones()
  if (roomId !== 'room_gallery') return

  // Banner is anchored to the top-center of the camera viewport so it floats
  // regardless of where the player has scrolled.
  bannerContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(900)

  // First-visit welcome — runs once per browser, persists in localStorage.
  // Stacks below the zone banner via a 4s delay so they don't overlap.
  try {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      scene.time.delayedCall(800, () => showWelcomeToast(scene))
      localStorage.setItem(FIRST_VISIT_KEY, String(Date.now()))
    }
  } catch {}

  // Lazy update — check ~6 times per second, not every frame
  watchTimer = scene.time.addEvent({
    delay: 160,
    loop: true,
    callback: () => {
      const pos = getBearPos()
      if (!pos) return
      const z = findZone(pos.x, pos.y)
      if (!z || z.id === lastZoneId) return
      lastZoneId = z.id
      showBanner(scene, z)
    },
  })
}

function showBanner(scene: Phaser.Scene, zone: Zone) {
  if (!bannerContainer) return
  if (activeTween) { activeTween.stop(); activeTween = null }
  bannerContainer.removeAll(true)

  const cw = scene.cameras.main.width
  const bx = cw / 2
  const by = 28

  // Brass-on-ink banner: dark plate + brass border + gold text
  const plate = scene.add.rectangle(bx, by, 220, 38, 0x1a1f2a, 0.92)
    .setStrokeStyle(1, 0xc8a058, 0.85)
  // Inner brass hairline
  const hairline = scene.add.rectangle(bx, by, 210, 28, 0x1a1f2a)
    .setStrokeStyle(1, 0xc8a058, 0.35)
  const label = crispText(scene, bx, by - 6, zone.label, {
    fontSize: '11px', color: '#e6c878',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)
  const subtitle = crispText(scene, bx, by + 8, zone.subtitle, {
    fontSize: '8px', color: '#c8a058',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-monospace, monospace',
    resolution: 2,
  }).setOrigin(0.5)

  bannerContainer.add([plate, hairline, label, subtitle])
  bannerContainer.setAlpha(0)
  bannerContainer.y = -16

  // Slide+fade in, hold, then fade out
  activeTween = scene.tweens.add({
    targets: bannerContainer,
    alpha: 1, y: 0,
    duration: 350, ease: 'Sine.easeOut',
    onComplete: () => {
      scene.time.delayedCall(2200, () => {
        if (!bannerContainer) return
        activeTween = scene.tweens.add({
          targets: bannerContainer,
          alpha: 0, y: -16,
          duration: 500, ease: 'Sine.easeIn',
        })
      })
    },
  })
}

function showWelcomeToast(scene: Phaser.Scene) {
  const cw = scene.cameras.main.width
  const ch = scene.cameras.main.height
  const layer = scene.add.container(cw / 2, ch - 80).setScrollFactor(0).setDepth(901)
  const plate = scene.add.rectangle(0, 0, 360, 56, 0x1a1f2a, 0.95)
    .setStrokeStyle(2, 0xc8a058, 0.9)
  const cjkFont = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-monospace, monospace'
  const title = crispText(scene, 0, -14, '欢迎来到 ursb 美术馆', {
    fontSize: '13px', color: '#e6c878',
    fontFamily: cjkFont,
    resolution: 2,
  }).setOrigin(0.5)
  const subtitle = crispText(scene, 0, 4, '走到任意一幅作品前，按 E 进入', {
    fontSize: '10px', color: '#c8a058',
    fontFamily: cjkFont,
    resolution: 2,
  }).setOrigin(0.5)
  const subtitle2 = crispText(scene, 0, 16, '中庭是 Airing 的 3D 园子，四翼按主题分区', {
    fontSize: '8px', color: '#a8a098',
    fontFamily: cjkFont,
    resolution: 2,
  }).setOrigin(0.5)
  layer.add([plate, title, subtitle, subtitle2])
  layer.setAlpha(0)
  scene.tweens.add({
    targets: layer,
    alpha: 1, y: layer.y - 8,
    duration: 400, ease: 'Sine.easeOut',
    onComplete: () => {
      scene.time.delayedCall(5000, () => {
        scene.tweens.add({
          targets: layer,
          alpha: 0, y: layer.y - 8,
          duration: 600,
          onComplete: () => layer.destroy(),
        })
      })
    },
  })
}

export function teardownGalleryZones() {
  if (watchTimer) { watchTimer.remove(false); watchTimer = null }
  if (activeTween) { activeTween.stop(); activeTween = null }
  if (bannerContainer) { bannerContainer.destroy(); bannerContainer = null }
  lastZoneId = null
}
