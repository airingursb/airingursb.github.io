// Museum-grade framed artworks for room_gallery. Each exhibit interactable
// becomes a layered ornate gold frame holding the Codex-generated Saul Bass
// painting inside. Side-wall frames get a brass picture-light fixture above.
// Centerpiece gets the special B01 grove sakura treatment.
//
// Asset loading is gracefully degraded: if the painting PNG hasn't been
// generated yet, the frame still renders with a placeholder emoji on dark
// matte — so the gallery is shippable at any state of Codex progress.

import Phaser from 'phaser'
import { crispText } from './gallery_text'
import type { RoomId } from './config'
import { paintingKey, getAsset } from './gallery_assets'
import { hasVisited } from './gallery_progress'

type ExhibitMeta = {
  x: number
  y: number
  w: number
  h: number
  emoji?: string
  label?: string
  title?: string
  asset?: string                          // slug like 'A01-chromium-renderer'
  url?: string                            // exhibit url (used as visit id)
  facing?: 'up' | 'down' | 'left' | 'right'
  exhibitType?: string                    // 'immersive' | 'centerpiece' | 'comics' | 'pocket' | 'notes'
}

let layer: Phaser.GameObjects.Container | null = null

const COLORS = {
  shadow:     0x000000,
  goldOuter:  0x6a4818,
  goldFace:   0xc8a058,
  goldRidge:  0xe6c878,
  goldDeep:   0x3a2810,
  matVelvet:  0x14202a,
  matEdge:    0x3a4a5a,
  brassArm:   0x8a6028,
  brassShade: 0xc8a058,
  lampGlow:   0xfff0c0,
  plaque:     0xc8a058,
  plaqueDark: 0x6a4818,
}

export function setupGalleryExhibits(
  scene: Phaser.Scene,
  roomId: RoomId,
  exhibits: ExhibitMeta[]
) {
  teardownGalleryExhibits()
  if (roomId !== 'room_gallery') return
  if (exhibits.length === 0) return

  layer = scene.add.container(0, 0).setDepth(3)

  for (const e of exhibits) {
    if (e.exhibitType === 'centerpiece') {
      drawCenterpiece(scene, layer, e)
    } else {
      drawFrame(scene, layer, e)
    }
  }
}

// ── Regular wall-mounted painting frame
function drawFrame(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  e: ExhibitMeta
) {
  const cx = e.x + e.w / 2
  const cy = e.y + e.h / 2
  // Render frame slightly bigger than the interaction rect for presence
  const fw = Math.max(48, e.w)
  const fh = Math.max(48, e.h)

  // Drop shadow
  layer.add(scene.add.rectangle(cx + 3, cy + 4, fw, fh, COLORS.shadow, 0.55))

  // Frame layers (deep amber → brass → ridge → dark inner)
  layer.add(scene.add.rectangle(cx, cy, fw, fh, COLORS.goldOuter))
  layer.add(scene.add.rectangle(cx, cy, fw - 4, fh - 4, COLORS.goldFace))
  layer.add(scene.add.rectangle(cx, cy, fw - 7, fh - 7, COLORS.goldRidge, 0.55))
  layer.add(scene.add.rectangle(cx, cy, fw - 10, fh - 10, COLORS.goldDeep))

  // Painting area — try to use the Codex PNG; if missing, render a typographic
  // placeholder using the label (NOT emoji — the museum aesthetic is broken
  // by emoji glyphs at this resolution).
  const innerW = fw - 14
  const innerH = fh - 14
  const tex = e.asset ? paintingKey(e.asset) : undefined
  if (tex && scene.textures.exists(tex)) {
    const img = scene.add.image(cx, cy, tex).setOrigin(0.5)
    const tw = img.width || innerW
    const th = img.height || innerH
    const fit = Math.min(innerW / tw, innerH / th)
    img.setScale(fit)
    layer.add(img)
  } else {
    drawTypographicPlaceholder(scene, layer, cx, cy, innerW, innerH, e.label ?? '')
  }

  // Brass museum plaque under the frame — shows the work title.
  drawMuseumPlaque(scene, layer, cx, cy + fh / 2 + 8, fw, e.label, e.url)

  // Picture light fixture above (side-wall frames only)
  if (e.facing === 'left' || e.facing === 'right') {
    drawPictureLight(scene, layer, cx, cy - fh / 2)
  }
}

// ── Centerpiece — the rotunda's hero exhibit (B01 grove sakura)
function drawCenterpiece(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  e: ExhibitMeta
) {
  const cx = e.x + e.w / 2
  const cy = e.y + e.h / 2
  // Centerpiece is bigger than wall paintings — make it stand out.
  const size = Math.max(96, Math.max(e.w, e.h) + 32)

  // Pedestal beneath the centerpiece (rectangular ink-black base)
  const pedW = size + 16, pedH = 12
  const pedY = cy + size / 2 + 6
  layer.add(scene.add.rectangle(cx, pedY + 3, pedW + 2, pedH, COLORS.shadow, 0.6))
  layer.add(scene.add.rectangle(cx, pedY, pedW, pedH, 0x1a1f2a))
  // Brass band on the pedestal top
  layer.add(scene.add.rectangle(cx, pedY - pedH / 2 + 1, pedW - 4, 2, COLORS.plaque, 0.9))

  // The centerpiece artwork itself — ornate frame too
  layer.add(scene.add.rectangle(cx + 4, cy + 5, size + 6, size + 6, COLORS.shadow, 0.55))
  layer.add(scene.add.rectangle(cx, cy, size + 6, size + 6, COLORS.goldOuter))
  layer.add(scene.add.rectangle(cx, cy, size + 2, size + 2, COLORS.goldFace))
  layer.add(scene.add.rectangle(cx, cy, size - 2, size - 2, COLORS.goldRidge, 0.55))
  layer.add(scene.add.rectangle(cx, cy, size - 6, size - 6, COLORS.goldDeep))

  const tex = e.asset ? paintingKey(e.asset) : undefined
  if (tex && scene.textures.exists(tex)) {
    const img = scene.add.image(cx, cy, tex).setOrigin(0.5)
    const inner = size - 12
    const fit = Math.min(inner / (img.width || inner), inner / (img.height || inner))
    img.setScale(fit)
    layer.add(img)
  } else {
    drawTypographicPlaceholder(scene, layer, cx, cy, size - 12, size - 12, e.label ?? '')
  }

  // Wider brass plaque under the centerpiece with the work title
  drawMuseumPlaque(scene, layer, cx, pedY + pedH / 2 + 10, size * 0.85, e.label, e.url, true)
}

// Typographic placeholder for missing Codex art — replaces emoji fallback.
// Renders the label as a stylized monogram on dark velvet, fitting the
// Saul Bass / WPA aesthetic instead of clashing with it.
function drawTypographicPlaceholder(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number, cy: number,
  innerW: number, innerH: number,
  label: string
) {
  // Dark velvet mat
  layer.add(scene.add.rectangle(cx, cy, innerW, innerH, COLORS.matVelvet))
  // Vermilion accent block — Saul Bass signature color, half-height
  layer.add(scene.add.rectangle(cx, cy - innerH * 0.18, innerW * 0.7, innerH * 0.12, 0xd44820, 0.85))
  // Centered monogram in brass
  if (label) {
    // Pick a font size that fits — try the whole label first, downscale if too wide
    const maxChars = Math.max(1, label.length)
    const targetW = innerW * 0.85
    const guessSize = Math.min(innerH * 0.42, targetW / maxChars * 1.5)
    const fontSize = Math.max(8, Math.floor(guessSize))
    layer.add(crispText(scene, cx, cy + innerH * 0.05, label, {
      fontSize: `${fontSize}px`,
      color: '#e6c878',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans SC", ui-monospace, monospace',
      resolution: 2,
      align: 'center',
    }).setOrigin(0.5))
  }
  // Thin gold rule beneath the type
  layer.add(scene.add.rectangle(cx, cy + innerH * 0.32, innerW * 0.55, 1, COLORS.plaque, 0.85))
}

// Brass museum plaque mounted beneath each frame. Shows the work label and a
// ✓ tick when visited. Wider variant for the centerpiece.
function drawMuseumPlaque(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number, cy: number,
  frameW: number,
  label: string | undefined,
  url: string | undefined,
  wide = false
) {
  const txt = (label ?? '').trim()
  // Plaque sizing: wide variant for centerpiece, otherwise sized to the frame
  const plateW = wide
    ? Math.max(frameW * 0.7, txt.length * 7 + 18)
    : Math.max(frameW * 0.7, txt.length * 6 + 12)
  const plateH = wide ? 12 : 10
  // Mounting screws (tiny brass dots) at each end
  layer.add(scene.add.circle(cx - plateW / 2 + 3, cy, 1.2, COLORS.plaqueDark, 0.9))
  layer.add(scene.add.circle(cx + plateW / 2 - 3, cy, 1.2, COLORS.plaqueDark, 0.9))
  // Plaque body — brass with dark engraved border
  layer.add(scene.add.rectangle(cx, cy, plateW, plateH, COLORS.plaque, 1.0)
    .setStrokeStyle(1, COLORS.plaqueDark, 0.95))
  // Inner bevel — slightly lighter brass strip
  layer.add(scene.add.rectangle(cx, cy - 1, plateW - 4, 1, COLORS.goldRidge, 0.7))
  // Engraved text — dark ink against brass
  if (txt) {
    layer.add(crispText(scene, cx, cy, txt, {
      fontSize: wide ? '8px' : '7px',
      color: '#1a1a1a',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans SC", ui-monospace, monospace',
      resolution: 2,
    }).setOrigin(0.5))
  }
  // ✓ tick on the far right for visited exhibits
  if (url && hasVisited(url)) {
    layer.add(crispText(scene, cx + plateW / 2 - 8, cy, '✓', {
      fontSize: '7px', color: '#0a3a1a',
      fontFamily: 'ui-monospace, monospace',
      resolution: 2,
    }).setOrigin(0.5))
  }
}

function drawPictureLight(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number,
  frameTopY: number
) {
  // Prefer Codex's C07 picture-light PNG when present. Otherwise procedural.
  const c07 = getAsset('C07-picture-light')
  if (c07 && scene.textures.exists(c07.key)) {
    const img = scene.add.image(cx, frameTopY - 8, c07.key).setOrigin(0.5, 0.8)
    layer.add(img)
    // Always paint a soft light cone underneath, on top of the painting
    drawLightCone(scene, layer, cx, frameTopY)
    return
  }
  // Procedural fallback — brass arm + trapezoidal shade + cone
  const coneTopY = frameTopY - 4
  drawLightCone(scene, layer, cx, frameTopY)
  layer.add(scene.add.rectangle(cx, coneTopY - 3, 1.5, 6, COLORS.brassArm))
  layer.add(scene.add.rectangle(cx, coneTopY, 9, 4, COLORS.brassShade)
    .setStrokeStyle(1, COLORS.goldOuter, 0.9))
  layer.add(scene.add.rectangle(cx, coneTopY - 2, 5, 1.5, COLORS.goldRidge, 0.9))
}

function drawLightCone(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  cx: number,
  frameTopY: number
) {
  const coneTopY = frameTopY - 4
  const cone = scene.add.graphics()
  cone.fillStyle(COLORS.lampGlow, 0.22)
  cone.beginPath()
  cone.moveTo(cx - 3, coneTopY)
  cone.lineTo(cx + 3, coneTopY)
  cone.lineTo(cx + 16, coneTopY + 22)
  cone.lineTo(cx - 16, coneTopY + 22)
  cone.closePath()
  cone.fillPath()
  layer.add(cone)
  const cone2 = scene.add.graphics()
  cone2.fillStyle(COLORS.lampGlow, 0.32)
  cone2.beginPath()
  cone2.moveTo(cx - 2, coneTopY)
  cone2.lineTo(cx + 2, coneTopY)
  cone2.lineTo(cx + 10, coneTopY + 16)
  cone2.lineTo(cx - 10, coneTopY + 16)
  cone2.closePath()
  cone2.fillPath()
  layer.add(cone2)
}

export function teardownGalleryExhibits() {
  if (layer) {
    layer.destroy()
    layer = null
  }
}
