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

/** V23.12 — per-pet runtime state for proximity reactions. Stored on
 *  the sprite container's data manager so RoomScene's tick can read +
 *  mutate without leaking module-level state. */
type PetRuntimeState = {
  kind: AmbientPetKind
  homeX: number
  homeY: number
  alert: boolean         // currently in "noticed player" pose
  lastReactionAt: number // ms timestamp of last small twitch
  /** Optional alert-indicator child (a thought-mark / open-eye dot). */
  alertMark?: Phaser.GameObjects.Container
}

const PET_ALERT_RADIUS = 44       // px — start reacting
const PET_ALERT_EXIT_RADIUS = 64  // hysteresis — calm down past this

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
    // V23.6 — click reaction. Each species has a distinct gesture:
    //   cat → quick stretch (scale-x up briefly)
    //   dog → tail wag (rotate small angle yoyo a few times)
    //   bunny → hop (jump y up then back)
    sprite.setInteractive(new Phaser.Geom.Rectangle(-12, -10, 24, 20), Phaser.Geom.Rectangle.Contains)
    sprite.input!.cursor = 'pointer'
    let reacting = false
    sprite.on('pointerdown', () => {
      if (reacting) return
      reacting = true
      reactToClick(scene, sprite, p.kind, p.x, p.y, () => { reacting = false })
    })
    // V23.12 — stash runtime state so the scene's per-frame proximity
    // tick (tickAmbientPetProximity below) can react without piercing
    // module boundaries.
    sprite.setData('petState', {
      kind: p.kind, homeX: p.x, homeY: p.y, alert: false, lastReactionAt: 0
    } as PetRuntimeState)
    sprites.push(sprite)
  }
  return sprites
}

/** V23.12 — called each frame from RoomScene. Walks every ambient pet
 *  sprite and toggles its alert pose based on distance to the player.
 *  Uses hysteresis (different enter / exit radii) so a player hovering
 *  near the threshold doesn't flicker the pet's pose every frame. */
export function tickAmbientPetProximity(
  scene: Phaser.Scene,
  sprites: Phaser.GameObjects.Container[],
  playerX: number,
  playerY: number,
  now: number
) {
  for (const sprite of sprites) {
    const state = sprite.getData('petState') as PetRuntimeState | undefined
    if (!state) continue
    const dist = Math.hypot(playerX - state.homeX, playerY - state.homeY)
    if (!state.alert && dist < PET_ALERT_RADIUS) {
      state.alert = true
      onPetAlertEnter(scene, sprite, state, now)
    } else if (state.alert && dist > PET_ALERT_EXIT_RADIUS) {
      state.alert = false
      onPetAlertExit(scene, sprite, state)
    } else if (state.alert && now - state.lastReactionAt > 8000) {
      // While alert, do a tiny twitch every ~8s so it doesn't freeze in pose
      state.lastReactionAt = now
      onPetAlertTwitch(scene, sprite, state)
    }
  }
}

function onPetAlertEnter(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Container,
  state: PetRuntimeState,
  now: number
) {
  state.lastReactionAt = now
  // Spawn a small "!" alert mark above the pet
  const mark = scene.add.container(0, -12)
  const dot = scene.add.rectangle(0, 0, 1, 3, 0xffd166)
  const dotBase = scene.add.rectangle(0, 2.5, 1, 1, 0xffd166)
  mark.add([dot, dotBase])
  mark.setAlpha(0)
  sprite.add(mark)
  state.alertMark = mark
  scene.tweens.add({
    targets: mark, alpha: { from: 0, to: 1 }, y: -14,
    duration: 220, ease: 'Sine.out'
  })
  // Body reaction: cat lifts head (y-scale 1.1), dog tilts angle, bunny y-up
  if (state.kind === 'sleeping_cat') {
    scene.tweens.add({
      targets: sprite, scaleY: 1.08,
      duration: 180, ease: 'Sine.out'
    })
  } else if (state.kind === 'sitting_dog') {
    scene.tweens.add({
      targets: sprite, angle: 5,
      duration: 200, yoyo: true, ease: 'Sine.inOut'
    })
  } else if (state.kind === 'curled_bunny') {
    scene.tweens.add({
      targets: sprite, y: state.homeY - 2,
      duration: 220, ease: 'Sine.out'
    })
  }
}

function onPetAlertExit(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Container,
  state: PetRuntimeState
) {
  // Fade + destroy alert mark
  if (state.alertMark) {
    const mark = state.alertMark
    scene.tweens.add({
      targets: mark, alpha: 0,
      duration: 200, onComplete: () => { try { mark.destroy() } catch {} }
    })
    state.alertMark = undefined
  }
  // Revert pose
  if (state.kind === 'sleeping_cat') {
    scene.tweens.add({ targets: sprite, scaleY: 1, duration: 220, ease: 'Sine.in' })
  } else if (state.kind === 'curled_bunny') {
    scene.tweens.add({ targets: sprite, y: state.homeY, duration: 240, ease: 'Sine.in' })
  }
  // Dog already reverts via the alert-enter yoyo, no exit work needed.
}

function onPetAlertTwitch(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Container,
  state: PetRuntimeState
) {
  // Tiny secondary twitch — bunny does a small extra hop, dog wags once,
  // cat scales slightly more then back.
  if (state.kind === 'curled_bunny') {
    scene.tweens.add({
      targets: sprite, y: state.homeY - 4,
      duration: 140, yoyo: true, ease: 'Sine.inOut'
    })
  } else if (state.kind === 'sitting_dog') {
    scene.tweens.add({
      targets: sprite, angle: { from: -3, to: 3 },
      duration: 90, yoyo: true, repeat: 3, ease: 'Sine.inOut',
      onComplete: () => sprite.setAngle(0)
    })
  } else if (state.kind === 'sleeping_cat') {
    scene.tweens.add({
      targets: sprite, scaleY: { from: 1.08, to: 1.15 },
      duration: 180, yoyo: true, ease: 'Sine.inOut'
    })
  }
}

function reactToClick(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Container,
  kind: AmbientPetKind,
  homeX: number,
  homeY: number,
  done: () => void
) {
  if (kind === 'sleeping_cat') {
    // Stretch: brief x-scale up + slight x-translate
    scene.tweens.add({
      targets: sprite, scaleX: 1.25, x: homeX - 2,
      duration: 220, yoyo: true, repeat: 0, ease: 'Sine.inOut',
      onComplete: done
    })
  } else if (kind === 'sitting_dog') {
    // Tail wag: rotate the whole sprite slightly L/R 3 times
    scene.tweens.add({
      targets: sprite, angle: 6,
      duration: 110, yoyo: true, repeat: 5, ease: 'Sine.inOut',
      onComplete: () => { sprite.setAngle(0); done() }
    })
  } else if (kind === 'curled_bunny') {
    // Hop: arc up 6px then back; two hops
    scene.tweens.add({
      targets: sprite, y: homeY - 6,
      duration: 180, yoyo: true, repeat: 1, ease: 'Sine.inOut',
      onComplete: () => { sprite.setY(homeY); done() }
    })
  } else {
    done()
  }
}
