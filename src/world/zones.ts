// Diorama layout — Airing's Forest Cabin Island (DAYTIME, expanded 4×).
//
// Island radius ~22 (was 10). Zones repositioned for more breathing room.
// Each zone now has its own "neighborhood" of dense decoration.
//
// Coordinate convention: XZ plane is the island surface, +X east, +Z south.

export type Interaction = 'blog' | 'comics' | 'music' | 'reading' | 'chat'

export interface ZoneSpec {
  kind: Interaction
  pos: [number, number]
  label: string
}

export const ZONES: ZoneSpec[] = [
  { kind: 'chat',    pos: [-2.0, -1.0], label: 'Chat · 木屋 · 跟 Airing 聊天' },
  { kind: 'reading', pos: [-4.0, -12.0], label: 'Reading · 树间吊床 · 读书' },
  { kind: 'music',   pos: [13.5, -2.5], label: 'Music · 凉亭 · 最近在听' },
  { kind: 'comics',  pos: [-13.0,  3.0], label: 'Comics · 林间画架 · 四格漫画' },
  { kind: 'blog',    pos: [ 5.0, 12.5], label: 'Blog · 木台书架 · 文章' },
]

export function getZone(kind: Interaction) {
  return ZONES.find((z) => z.kind === kind)!
}

/** Winding path connecting all 5 zones — much longer now to traverse the bigger island. */
export const PATH_POINTS: [number, number][] = [
  [-4.0, -11.5], // reading
  [-3.2, -9.5],
  [-2.4, -7.0],
  [-1.4, -4.5],
  [-0.4, -2.0],
  [ 0.0,  0.0],  // cabin door
  [ 1.5,  0.8],
  [ 3.5,  0.4],
  [ 6.0, -0.4],
  [ 9.0, -1.6],
  [12.0, -2.2],
  [13.4, -2.4],  // gazebo
  [10.0,  1.0],
  [ 7.0,  3.0],
  [ 5.5,  6.5],
  [ 5.0, 10.0],
  [ 5.0, 12.4],  // deck
  // branch back through cabin to easel (west)
  [ 2.5,  6.0],
  [ 0.0,  2.5],
  [-1.5,  1.5],
  [-4.0,  2.0],
  [-7.0,  2.6],
  [-10.0, 2.8],
  [-13.0, 3.0],  // easel
]

/** 36 polar control points — much more irregular than before. */
export const ISLAND_RIM: Array<[number, number]> = (() => {
  const pts: Array<[number, number]> = []
  const radii = [
    22.0, 23.5, 22.8, 20.5, 19.0, 20.2, 22.5, 24.0, 23.2,
    21.4, 19.8, 18.5, 19.6, 21.8, 23.5, 24.2, 23.5, 21.6,
    19.5, 18.8, 19.8, 21.5, 23.0, 23.8, 22.8, 20.6, 19.2,
    20.0, 21.8, 23.5, 24.0, 23.0, 21.2, 19.6, 18.8, 20.4,
  ]
  for (let i = 0; i < radii.length; i++) {
    const angle = (i / radii.length) * Math.PI * 2
    pts.push([angle, radii[i]])
  }
  return pts
})()

/** Hill/terrain bumps — bigger, more varied across the larger island. */
export const TERRAIN_BUMPS: Array<[number, number, number, number]> = [
  [-4.0, -12.0, 6.5,  1.4],   // hammock hill (big rise)
  [-13.0, 3.0,  4.5,  0.7],   // easel hillock
  [15.0,  2.0,  5.0,  0.8],   // east bluff
  [ 5.0,  11.5, 4.5,  0.5],   // deck rise
  [ 0.0,  6.0,  4.0, -0.4],   // stream valley dip
  [ 8.0,  6.0,  3.0, -0.25],  // pond dip
  [-7.0, -6.0,  3.5,  0.4],   // gentle NW rise
  [10.0, -8.0,  3.0,  0.3],   // gentle NE rise
]

/** Lanterns scattered along paths — slightly dimmer in daytime but still cozy. */
export const LANTERN_POSITIONS: Array<[number, number]> = [
  [-7.0, -8.0],
  [-3.5, -5.5],
  [-2.0,  3.0],
  [ 3.0,  1.5],
  [ 5.5, -0.5],
  [ 9.5, -1.5],
  [12.0,  1.0],
  [ 4.5,  4.5],
  [ 4.5,  8.5],
  [-6.5,  2.4],
  [-10.0, 2.8],
]

/** ~45 trees — scale axis varies for non-uniform canopy height. */
export const TREE_POSITIONS: Array<[number, number, number, 'pine' | 'birch' | 'oak' | 'maple' | 'cherry']> = [
  // Perimeter belt
  [-18.0, -3.0, 1.3, 'pine'],
  [-17.0, -8.0, 1.4, 'pine'],
  [-14.0, -13.0, 1.2, 'maple'],
  [-9.0, -16.0, 1.3, 'pine'],
  [-4.0, -18.0, 1.1, 'birch'],
  [ 2.0, -18.5, 1.2, 'pine'],
  [ 8.0, -17.0, 1.4, 'oak'],
  [13.0, -15.0, 1.2, 'pine'],
  [17.0, -10.0, 1.3, 'pine'],
  [19.0, -4.0, 1.1, 'birch'],
  [20.0,  2.0, 1.4, 'oak'],
  [19.0,  8.0, 1.2, 'pine'],
  [16.0, 13.0, 1.3, 'pine'],
  [11.0, 17.0, 1.2, 'birch'],
  [ 6.0, 19.0, 1.4, 'cherry'],
  [ 0.0, 19.5, 1.2, 'pine'],
  [-6.0, 18.5, 1.3, 'pine'],
  [-11.0, 16.0, 1.1, 'birch'],
  [-15.0, 12.0, 1.4, 'oak'],
  [-18.0,  7.0, 1.3, 'pine'],
  [-19.0,  2.0, 1.2, 'pine'],
  // Interior accents — clusters near zones for density
  [-7.0, -10.5, 0.9, 'oak'],
  [-2.5, -7.5,  0.9, 'birch'],
  [ 3.0, -8.0,  1.0, 'pine'],
  [ 6.5, -5.0,  0.85, 'oak'],
  [11.0, -6.0,  0.9, 'pine'],
  [15.0, -5.0,  0.9, 'birch'],
  [12.0,  5.0,  0.85, 'oak'],
  [ 9.0,  9.0,  0.9, 'birch'],
  [ 8.0,  13.0, 1.0, 'pine'],
  [ 2.0,  15.0, 0.85, 'oak'],
  [-3.5,  14.0, 0.9, 'birch'],
  [-7.0,  10.0, 0.85, 'pine'],
  [-9.5,  6.0,  0.9, 'oak'],
  [-15.0, 6.0,  1.0, 'birch'],
  [-15.5, -2.0, 1.0, 'pine'],
  [-12.0, -5.0, 0.9, 'oak'],
  [-10.0, -2.0, 0.85, 'birch'],
  [-4.0, -3.0, 0.85, 'pine'],
  [ 1.5, -5.0, 0.9, 'oak'],
  [ 7.0,  2.0, 0.8, 'birch'],
  [-3.0,  6.0, 0.85, 'birch'],
  [10.5,  10.0, 0.9, 'pine'],
  [-12.0, -10.0, 1.0, 'birch'],
  [4.0, -12.0, 0.95, 'maple'],   // moved from (13, -10) — was blocking SE waterfall stream corridor
]

/** Bush / rock / lavender / fern / mushroom filler — ~35 items */
export const FILLER_POSITIONS: Array<[number, number, 'bush' | 'rocks' | 'lavender' | 'fern' | 'mushroom' | 'daisy', number]> = [
  // path-side fillers
  [-3.0, -10.0, 'lavender', 0.8],
  [-1.5, -7.0, 'bush',     0.85],
  [-0.8, -3.5, 'mushroom', 0.9],
  [ 1.5,  0.0, 'rocks',    0.85],
  [ 3.0,  2.0, 'fern',     0.9],
  [ 4.0, -0.5, 'lavender', 0.85],
  [ 7.5,  0.5, 'daisy',    0.8],
  [10.5, -1.5, 'bush',     0.9],
  [12.5, -3.5, 'rocks',    0.85],
  [11.0,  2.0, 'fern',     0.9],
  [ 8.0,  4.0, 'lavender', 0.85],
  [ 5.5,  7.0, 'mushroom', 0.85],
  [ 5.5,  10.0, 'daisy',   0.9],
  [ 4.0,  13.0, 'fern',    0.9],
  [ 2.0,  9.0, 'bush',     0.85],
  [-1.0,  5.0, 'lavender', 0.85],
  [-3.0,  8.0, 'rocks',    0.85],
  [-5.5,  4.5, 'daisy',    0.9],
  [-9.0,  4.0, 'bush',     0.9],
  [-11.5, 3.5, 'mushroom', 0.85],
  [-14.0, 5.5, 'fern',     0.9],
  [-15.0, 1.5, 'lavender', 0.85],
  [-12.5, -2.0, 'daisy',   0.85],
  [-9.5, -4.5, 'bush',     0.9],
  [-7.5, -6.5, 'rocks',    0.85],
  [-5.5, -8.5, 'fern',     0.9],
  // perimeter accents
  [-16.0,  0.0, 'rocks',    1.0],
  [16.0,  -1.0, 'bush',     1.1],
  [-9.0,  14.0, 'lavender', 0.9],
  [ 9.0,  15.0, 'rocks',    1.0],
  [-13.0, -8.0, 'bush',     1.0],
  [14.0, -8.0, 'mushroom',  0.95],
  [-2.0,  17.0, 'daisy',    0.9],
  [ 2.0, -16.0, 'fern',     0.95],
]

/** Pond center — small water feature east of cabin */
export const POND_CENTER: [number, number] = [8.0, 6.0]
export const POND_RADIUS = 2.4
