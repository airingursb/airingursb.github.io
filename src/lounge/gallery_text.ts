// Crisp text helper for room_gallery. Phaser's `pixelArt: true` config
// applies NEAREST scaling to ALL textures AND sets `image-rendering:
// pixelated` on the canvas at the CSS level — even high `resolution` text
// gets chunked at display time because the whole canvas is upscaled.
//
// The fix that actually works under pixelArt mode: render the text at a
// MUCH larger fontSize so the source texture has 4× more pixels per
// character, then scale the GameObject down to the visual size we want.
// More pixels in the texture → nearest-neighbor scaling looks smoother.
// We also force LINEAR filter on the text texture and re-assert it on
// every text update (Phaser swaps the texture each setText).

import Phaser from 'phaser'

const UPSCALE = 4   // render at 4× size, scale display down 1/4

export function crispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  // Multiply fontSize by UPSCALE for the actual render, then scale display.
  const baseSize = parseFontSize(style.fontSize)
  const renderSize = baseSize * UPSCALE
  const renderStrokeThickness = (style.strokeThickness ?? 0) * UPSCALE
  const renderPadding = style.padding
    ? (scalePadding(style.padding, UPSCALE) as Phaser.Types.GameObjects.Text.TextPadding)
    : undefined

  const enlargedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    ...style,
    fontSize: `${renderSize}px`,
    strokeThickness: renderStrokeThickness,
    padding: renderPadding,
    resolution: 1,        // we already enlarged; resolution would double-render
  }

  const t = scene.add.text(x, y, text, enlargedStyle)
  t.setScale(1 / UPSCALE)
  applyLinearFilter(t)

  // Phaser swaps the text texture on setText/setStyle/setColor — re-apply
  // LINEAR filter via prototype tap so we don't have to remember.
  const origSetText = t.setText.bind(t)
  t.setText = ((value: string | string[]) => {
    const r = origSetText(value)
    applyLinearFilter(t)
    return r
  }) as typeof t.setText

  return t
}

function applyLinearFilter(t: Phaser.GameObjects.Text) {
  const source = (t.texture as Phaser.Textures.Texture)?.source?.[0]
  if (source) source.setFilter(Phaser.Textures.FilterMode.LINEAR)
}

function parseFontSize(fs: string | number | undefined): number {
  if (typeof fs === 'number') return fs
  if (typeof fs === 'string') {
    const m = /^(\d+(?:\.\d+)?)/.exec(fs)
    if (m) return parseFloat(m[1])
  }
  return 9
}

function scalePadding(
  p: number | Phaser.Types.GameObjects.Text.TextPadding,
  k: number,
): number | Phaser.Types.GameObjects.Text.TextPadding {
  if (typeof p === 'number') return p * k
  const scale = (v: number | undefined) => (v == null ? v : v * k)
  return {
    left: scale(p.left),
    right: scale(p.right),
    top: scale(p.top),
    bottom: scale(p.bottom),
    x: scale(p.x),
    y: scale(p.y),
  }
}
