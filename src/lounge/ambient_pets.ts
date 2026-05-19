// V23.1 — Ambient pets.
//
// Per-room non-interactive creature decorations: a sleeping cat curled
// on a bench, a dog sitting alert near a doorway. They breathe (subtle
// alpha pulse) so they read as alive but don't pull focus.
//
// Each pet is a small Phaser Graphics container drawn from a pixel
// template (same approach as V22.5 letter sprites + V18.0 cosmetics).
// No atlas, no animation registration, no interaction.

import type Phaser from 'phaser'

export type AmbientPetKind = 'sleeping_cat' | 'sitting_dog' | 'curled_bunny'

export type AmbientPetPlacement = {
  kind: AmbientPetKind
  x: number
  y: number
}

/** One ambient pet placement per room (or none). Sized for the existing
 *  480×320 room maps — coords avoid known interactable hotspots. */
export const AMBIENT_PETS: Record<string, AmbientPetPlacement[]> = {
  room_lobby:    [{ kind: 'sleeping_cat', x: 96,  y: 232 }],
  room_library:  [{ kind: 'sleeping_cat', x: 376, y: 196 }, { kind: 'curled_bunny', x: 64, y: 256 }],
  room_dj_floor: [{ kind: 'sitting_dog',  x: 64,  y: 256 }],
  room_kitchen:  [{ kind: 'sitting_dog',  x: 360, y: 224 }],
  room_grove:    [{ kind: 'curled_bunny', x: 256, y: 240 }],
  room_workshop: [{ kind: 'sleeping_cat', x: 56,  y: 200 }],
  room_balcony:  [{ kind: 'sitting_dog',  x: 304, y: 232 }],
  room_beach:    [{ kind: 'sleeping_cat', x: 416, y: 184 }],
  room_rooftop:  [{ kind: 'curled_bunny', x: 152, y: 232 }]
}

// ─── Pixel templates ────────────────────────────────────────────────────
// Same scale as V22.5 letter sprites: 1.5 game-px per cell so a 14×8
// template renders at ~21×12 px (smaller than a bear, large enough to read).

const PIX = 1.5

type Palette = {
  outline: number
  body: number
  belly: number
  accent: number   // ear inside / paw pads / tongue
}

const CAT_PALETTE: Palette = {
  outline: 0x3a2a1a, body: 0xa07050, belly: 0xd8c0a0, accent: 0xff9090
}
const DOG_PALETTE: Palette = {
  outline: 0x3a2a1a, body: 0xc89860, belly: 0xefd8a8, accent: 0xff9090
}
const BUNNY_PALETTE: Palette = {
  outline: 0x4a3a2a, body: 0xe8e0d0, belly: 0xf8f0e0, accent: 0xff9090
}

// Sleeping cat (curled up, 14×7): tail wraps around body, head tucked.
const SLEEPING_CAT = [
  '..............',
  '....1111......',
  '...122221.....',
  '..12222221111.',
  '.122223322221.',  // small "Z" of dream / nose
  '.1bbbbbbbbb11.',  // belly fluff
  '..11111111.1..'
]

// Sitting dog (12×11): facing forward, ears up, tail behind.
const SITTING_DOG = [
  '............',
  '...11.11....',
  '..1221221...',
  '..1222221...',
  '..12.2.221..',  // eyes + nose
  '..1233321...',  // tongue / mouth
  '..1222221...',
  '..1bbbbb1...',
  '.12bbbbb21..',
  '..1.....1...',
  '.11.....11..'
]

// Curled bunny (12×8): small ball with ears flopped, tail puff.
const CURLED_BUNNY = [
  '............',
  '....1.1.....',
  '...12121....',  // ears
  '..1222221...',
  '.122222221..',
  '.12bbbbbb21.',
  '..11111111..',
  '...3....3...'  // paws
]

function renderPet(
  scene: Phaser.Scene,
  grid: string[],
  palette: Palette
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0)
  const g = scene.add.graphics()
  const W = grid[0].length, H = grid.length
  const offX = -W * PIX / 2, offY = -H * PIX / 2
  for (let py = 0; py < H; py++) {
    const row = grid[py]
    for (let px = 0; px < row.length; px++) {
      const ch = row[px]
      if (ch === '.') continue
      let color: number, alpha = 1
      switch (ch) {
        case '1': color = palette.outline; break
        case '2': color = palette.body; break
        case 'b': color = palette.belly; break
        case '3': color = palette.accent; break
        default: continue
      }
      g.fillStyle(color, alpha)
      g.fillRect(offX + px * PIX, offY + py * PIX, PIX, PIX)
    }
  }
  c.add(g)
  return c
}

/** Spawn all ambient pets configured for the given room. Returns a list
 *  of created sprites + their tween so the caller can clean up on
 *  scene shutdown. */
export function spawnAmbientPets(
  scene: Phaser.Scene,
  roomId: string,
  reducedMotion: boolean
): Phaser.GameObjects.Container[] {
  const placements = AMBIENT_PETS[roomId] ?? []
  const sprites: Phaser.GameObjects.Container[] = []
  for (const p of placements) {
    let grid: string[], palette: Palette
    switch (p.kind) {
      case 'sleeping_cat': grid = SLEEPING_CAT; palette = CAT_PALETTE; break
      case 'sitting_dog':  grid = SITTING_DOG;  palette = DOG_PALETTE; break
      case 'curled_bunny': grid = CURLED_BUNNY; palette = BUNNY_PALETTE; break
    }
    const sprite = renderPet(scene, grid, palette)
    sprite.setPosition(p.x, p.y)
    // Background depth: above floor (1) + decor (2-3), below bears (4-5).
    sprite.setDepth(3)
    // Subtle breathing — slow alpha pulse or 1-px Y bob.
    if (!reducedMotion) {
      scene.tweens.add({
        targets: sprite,
        alpha: { from: 0.95, to: 1 },
        y: p.y - 0.5,
        duration: 2400 + Math.random() * 600,
        yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
    }
    sprites.push(sprite)
  }
  return sprites
}
