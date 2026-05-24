// Canvas-based texture helper for hand-painted parchment lists.
// Used by WorkDisplay to render zone hero panels (titles + recent
// blog / comics / music / reading entries).

import * as THREE from 'three'

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

export function makeCanvasTexture(
  width: number,
  height: number,
  draw: DrawFn,
  dpr = 2,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  draw(ctx, width, height)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

const FONT_SERIF = '"Songti SC", "Noto Serif SC", "PingFang SC", Georgia, serif'
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, monospace'

export function drawParchment(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grd = ctx.createRadialGradient(w / 2, h * 0.4, h * 0.25, w / 2, h * 0.5, h * 0.95)
  grd.addColorStop(0, '#F4E4C8')
  grd.addColorStop(1, '#C9A87A')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, w, h)
  // Noise speckles
  ctx.fillStyle = 'rgba(80, 50, 30, 0.05)'
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 0.3 + Math.random() * 1.2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Tea stains
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(130, 90, 50, ${0.025 + Math.random() * 0.035})`
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 30 + Math.random() * 50
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Corner darkening
  const corners: Array<[number, number]> = [[0, 0], [w, 0], [0, h], [w, h]]
  for (const [cx, cy] of corners) {
    const c = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80)
    c.addColorStop(0, 'rgba(90, 60, 35, 0.25)')
    c.addColorStop(1, 'rgba(90, 60, 35, 0)')
    ctx.fillStyle = c
    ctx.fillRect(cx - 80, cy - 80, 160, 160)
  }
}

export interface ListRow {
  main: string
  sub?: string
}

export interface ListPanelOpts {
  title: string
  subtitle: string
  rows: ListRow[]
  accent?: string
  emptyMessage?: string
}

export function drawListPanel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: ListPanelOpts,
) {
  drawParchment(ctx, w, h)

  const PAD_X = 26
  const accent = opts.accent ?? '#C97B5C'

  ctx.font = `bold 38px ${FONT_SERIF}`
  ctx.fillStyle = '#3A2516'
  ctx.textBaseline = 'top'
  ctx.fillText(opts.title, PAD_X, 14)

  ctx.font = `15px ${FONT_MONO}`
  ctx.fillStyle = '#8C6B47'
  ctx.fillText(opts.subtitle, PAD_X + 2, 64)

  ctx.strokeStyle = accent
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD_X, 92)
  ctx.lineTo(w - PAD_X, 92)
  ctx.stroke()

  const rows = opts.rows
  if (rows.length === 0) {
    ctx.font = `italic 18px ${FONT_SERIF}`
    ctx.fillStyle = '#8C6B47'
    ctx.textBaseline = 'middle'
    ctx.fillText(opts.emptyMessage ?? '（暂无）', PAD_X + 4, h / 2 + 10)
    return
  }

  ctx.textBaseline = 'middle'
  const ROW_TOP = 108
  const ROW_AVAIL = h - ROW_TOP - 14
  const rowH = ROW_AVAIL / Math.max(rows.length, 1)

  rows.forEach((row, i) => {
    const y = ROW_TOP + i * rowH + rowH / 2

    // Bullet circle
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(PAD_X + 6, y, 4.5, 0, Math.PI * 2)
    ctx.fill()

    // Main text
    ctx.font = `22px ${FONT_SERIF}`
    ctx.fillStyle = '#3A2516'
    const main = truncate(ctx, row.main, w - PAD_X - 32)
    ctx.fillText(main, PAD_X + 22, y - (row.sub ? 9 : 0))

    // Sub text
    if (row.sub) {
      ctx.font = `13px ${FONT_MONO}`
      ctx.fillStyle = '#8C6B47'
      ctx.fillText(row.sub, PAD_X + 22, y + 14)
    }
  })
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let truncated = text
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxW) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}
