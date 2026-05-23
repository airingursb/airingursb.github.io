// Layout of the diorama: tile grid + scattered objects (buildings + decorations).
//
// Grid is 14×10. Buildings live in 5 fixed corners (one per work category);
// decorations fill empty space for atmosphere.

export const GRID_W = 14
export const GRID_H = 10

/** Type of interaction the building exposes. Maps to a work category. */
export type Interaction = 'blog' | 'comics' | 'music' | 'reading' | 'chat'

interface ObjectSpec {
  gx: number
  gy: number
  sprite: string
  /** Vertical offset so tall sprites sit on the back-half of the tile. */
  yOffset: number
  interactable?: Interaction
  /** Label shown when player is nearby. */
  label?: string
}

// Per-MVP everything sits on grass. Future: stone paths between buildings.
export const TILES: string[][] = Array.from({ length: GRID_H }, () =>
  Array.from({ length: GRID_W }, () => 'grass'),
)

export const OBJECTS: ObjectSpec[] = [
  // === Buildings — 5 corners + south center ===
  { gx: 2,  gy: 1, sprite: 'record',    yOffset: 24, interactable: 'music',   label: 'Music · 最近在听' },
  { gx: 11, gy: 1, sprite: 'chair',     yOffset: 24, interactable: 'reading', label: 'Reading · 读书' },
  { gx: 2,  gy: 8, sprite: 'easel',     yOffset: 24, interactable: 'comics',  label: 'Comics · 四格漫画' },
  { gx: 11, gy: 8, sprite: 'bookshelf', yOffset: 24, interactable: 'blog',    label: 'Blog · 文章' },
  { gx: 6.5, gy: 8.5, sprite: 'fire',   yOffset: 12, interactable: 'chat',    label: 'Chat · 跟 Mochi 聊天' },

  // === Decorations — corners + scattered fillers ===
  // top row
  { gx: 0,  gy: 0, sprite: 'pine',     yOffset: 14 },
  { gx: 5,  gy: 0, sprite: 'bush',     yOffset: 8  },
  { gx: 9,  gy: 0, sprite: 'lavender', yOffset: 10 },
  { gx: 13, gy: 0, sprite: 'pine',     yOffset: 14 },

  // mid-upper
  { gx: 4,  gy: 2, sprite: 'lamp',     yOffset: 16 },
  { gx: 8,  gy: 2, sprite: 'rocks',    yOffset: 8  },
  { gx: 6,  gy: 3, sprite: 'bush',     yOffset: 8  },
  { gx: 9,  gy: 3, sprite: 'lavender', yOffset: 10 },

  // mid-lower
  { gx: 4,  gy: 5, sprite: 'lavender', yOffset: 10 },
  { gx: 9,  gy: 5, sprite: 'lamp',     yOffset: 16 },
  { gx: 7,  gy: 6, sprite: 'rocks',    yOffset: 8  },
  { gx: 3,  gy: 6, sprite: 'bush',     yOffset: 8  },
  { gx: 10, gy: 6, sprite: 'bush',     yOffset: 8  },

  // bottom row
  { gx: 0,  gy: 9, sprite: 'pine',     yOffset: 14 },
  { gx: 4,  gy: 9, sprite: 'bush',     yOffset: 8  },
  { gx: 9,  gy: 9, sprite: 'lavender', yOffset: 10 },
  { gx: 13, gy: 9, sprite: 'pine',     yOffset: 14 },
]
