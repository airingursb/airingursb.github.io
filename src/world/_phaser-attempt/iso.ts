// Isometric (cabinet) projection math for the diorama.
//
// Sprite tiles are painted as diamonds in 128×128 PNGs. We place them
// in a grid where (gx, gy) → screen coords via the standard iso transform.
//
// Coordinate convention:
//   - +gx goes right-and-down on screen
//   - +gy goes left-and-down on screen
//   - depth = gx + gy (further from top-left = drawn later)

export const TILE_W = 128
export const TILE_H = 64

export function isoToScreen(gx: number, gy: number, originX = 0, originY = 0) {
  return {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2),
  }
}

export function depthFor(gx: number, gy: number) {
  // *10 leaves room for ±9 offset within same tile (so building > tile > shadow)
  return Math.floor((gx + gy) * 10)
}
