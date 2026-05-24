// Crisp text helper for room_gallery. The Phaser game runs in `pixelArt: true`
// mode which applies NEAREST scaling to ALL textures — that's right for the
// bear sprites and tilemaps but turns rendered text into chunky soup, even
// at `resolution: 2`. This helper:
//   1. bumps resolution to 4× so the bitmap rasterizes large enough
//   2. forces LINEAR filtering on the resulting texture so the upscale stays
//      smooth even when the camera zooms
// Use everywhere in gallery_*.ts in place of scene.add.text().

import Phaser from 'phaser'

export function crispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, { resolution: 4, ...style })
  // After first render the texture exists; switch to LINEAR.
  const source = (t.texture as Phaser.Textures.Texture).source?.[0]
  if (source) {
    source.setFilter(Phaser.Textures.FilterMode.LINEAR)
  }
  return t
}
