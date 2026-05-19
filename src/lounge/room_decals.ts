// V23.25 — Per-room overlay decals that give each indoor room a visual
// fingerprint. The 5 indoor rooms share the indoor_lobby_v1 tileset (so
// walls and floor base look identical) and furniture density is low —
// the room felt interchangeable. These decals layer themed sprites on
// top of the tilemap to differentiate at a glance.
//
// Outdoor rooms already have wildlife/weather/seasonal layers (V23.6-23.10);
// lobby is already busy with NPCs + central furniture. Both skipped here.

import Phaser from 'phaser'

export type RoomDecalsDispose = () => void

export function spawnRoomDecals(
  scene: Phaser.Scene,
  roomId: string,
  mapWidthPx: number,
  mapHeightPx: number,
  reducedMotion: boolean
): RoomDecalsDispose {
  const objects: Array<{ destroy: () => void }> = []
  const dispose = () => { for (const o of objects) { try { o.destroy() } catch {} } }

  // V23.27 — Per-room wainscot/accent band along the top of the floor (just
  // below the brick wall). A thin horizontal strip with room-specific color
  // adds an architectural "trim" detail that further distinguishes rooms.
  // Walls are 2 tiles (32px) tall; the band sits right at the wall-floor
  // transition. Skipped for rooftop (open sky, no real wall to trim).
  type WainscotStyle = { primary: number; accent: number }
  const WAINSCOT: Record<string, WainscotStyle> = {
    room_library:  { primary: 0x8a5a2a, accent: 0xc8a060 },  // warm wood + brass
    room_kitchen:  { primary: 0xe8e8e0, accent: 0xb8c0c8 },  // white tile + grout
    room_workshop: { primary: 0x4a4a4a, accent: 0x6a6a6a },  // dark slate
  }
  const ws = WAINSCOT[roomId]
  if (ws) {
    // Top wall is 1 tile (16px) tall; band sits flush at wall-floor seam.
    // 32px-wide left/right margins keep the band from poking into the
    // side-wall columns (which are also bricks).
    const bandY = 17
    const bandW = mapWidthPx - 32
    const band = scene.add.rectangle(
      mapWidthPx / 2, bandY,
      bandW, 3,
      ws.primary, 0.55
    ).setDepth(1.5)
    const accent = scene.add.rectangle(
      mapWidthPx / 2, bandY + 2,
      bandW, 1,
      ws.accent, 0.7
    ).setDepth(1.5)
    objects.push(band, accent)
  }

  // V23.26 — Per-room floor tint. All indoor rooms share indoor_lobby_v1's
  // wood plank floor, so on the data layer they look identical. A subtle
  // full-floor color wash differentiates each room's "atmosphere" at a
  // glance. Kept at depth 1 (above floor tilemap depth 0, below decals at
  // depth 2+, below all furniture/sprites at depth 3+). Alpha is kept very
  // low so the underlying texture remains readable.
  const FLOOR_TINTS: Record<string, number> = {
    room_library:  0xc8a060,   // warm amber — reading-lamp atmosphere
    room_kitchen:  0xe8f0c8,   // cool cream — clean, food-prep feel
    room_workshop: 0xa0b0c0,   // cool slate — tool/metal feel
    room_rooftop:  0xffb890,   // pink-orange — open sky / sunset
  }
  const tintColor = FLOOR_TINTS[roomId]
  if (tintColor !== undefined) {
    const tint = scene.add.rectangle(
      mapWidthPx / 2, mapHeightPx / 2,
      mapWidthPx, mapHeightPx,
      tintColor, 0.10
    ).setDepth(1).setBlendMode(Phaser.BlendModes.MULTIPLY)
    objects.push(tint)
  }

  if (roomId === 'room_library') {
    // ─── Library: scattered books on the floor + paper scraps ──────
    // A few small "book" rectangles in corners suggest readers leave
    // material out. Colors picked from the warm library palette.
    const bookSpots: Array<[number, number, number]> = [
      [mapWidthPx * 0.18, mapHeightPx * 0.78, 0xb46a3a],  // brown leather
      [mapWidthPx * 0.22, mapHeightPx * 0.82, 0x4a6a8a],  // blue cloth
      [mapWidthPx * 0.78, mapHeightPx * 0.80, 0x6a4a3a],  // dark wood
      [mapWidthPx * 0.82, mapHeightPx * 0.76, 0x8a6a3a],  // tan
      [mapWidthPx * 0.50, mapHeightPx * 0.88, 0x7a3a3a],  // wine
    ]
    for (const [bx, by, tint] of bookSpots) {
      const book = scene.add.container(bx, by).setDepth(2)
      const cover = scene.add.rectangle(0, 0, 8, 5, tint, 0.85)
      const spine = scene.add.rectangle(-3.5, 0, 1, 5, 0x000000, 0.35)
      book.add([cover, spine])
      book.setAngle(Math.random() * 40 - 20)
      objects.push(book)
    }
    // Small paper scrap with a slight rotation
    const paper = scene.add.rectangle(mapWidthPx * 0.65, mapHeightPx * 0.85, 5, 6, 0xf0e6c8, 0.7)
      .setDepth(2).setAngle(15)
    objects.push(paper)
    // Floating dust motes catching the reading-lamp light — only when
    // motion is on. Sparse, slow, brief lifespan.
    if (!reducedMotion) {
      ensurePixelTexture(scene)
      const motes = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: mapWidthPx * 0.35, max: mapWidthPx * 0.65 },
        y: { min: mapHeightPx * 0.35, max: mapHeightPx * 0.6 },
        lifespan: 4500, quantity: 1, frequency: 1400,
        speedX: { min: -3, max: 3 }, speedY: { min: -2, max: 1 },
        scale: { start: 1, end: 1 },
        tint: 0xfff3c0,
        alpha: { start: 0.55, end: 0 }
      }).setDepth(50)
      objects.push(motes)
    }
  }

  if (roomId === 'room_kitchen') {
    // ─── Kitchen: hanging utensil silhouettes + steam puff above stove ──
    // Three small utensil shapes hanging on the upper wall (just below
    // the brick-floor transition line).
    const wallY = mapHeightPx * 0.28
    const utensils: Array<[number, number, 'pan' | 'ladle' | 'pot']> = [
      [mapWidthPx * 0.35, wallY, 'pan'],
      [mapWidthPx * 0.50, wallY, 'ladle'],
      [mapWidthPx * 0.65, wallY, 'pot'],
    ]
    for (const [ux, uy, kind] of utensils) {
      const c = scene.add.container(ux, uy).setDepth(2)
      // Thin hook line
      c.add(scene.add.rectangle(0, -3, 1, 3, 0x6a5a4a, 0.7))
      if (kind === 'pan') {
        c.add(scene.add.rectangle(0, 1, 9, 3, 0x2a2a2a, 0.85))
        c.add(scene.add.rectangle(5.5, 1, 5, 1, 0x2a2a2a, 0.85))   // handle
      } else if (kind === 'ladle') {
        c.add(scene.add.rectangle(0, 0, 1, 6, 0x6a5a4a, 0.8))      // shaft
        c.add(scene.add.ellipse(0, 4, 4, 3, 0x6a6a6a, 0.85))       // bowl
      } else { // pot
        c.add(scene.add.rectangle(0, 1, 7, 5, 0x2a2a2a, 0.85))
        c.add(scene.add.rectangle(0, -1.5, 9, 1, 0x4a4a4a, 0.85))  // rim
      }
      objects.push(c)
    }
    // Steam puff above the stove area — slow rising fade
    if (!reducedMotion) {
      ensurePixelTexture(scene)
      const steam = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: mapWidthPx * 0.55, max: mapWidthPx * 0.62 },
        y: { min: mapHeightPx * 0.50, max: mapHeightPx * 0.52 },
        lifespan: 2800, quantity: 1, frequency: 1100,
        speedY: { min: -14, max: -8 }, speedX: { min: -2, max: 2 },
        scale: { start: 1.6, end: 3.5 },
        tint: 0xe8eef2,
        alpha: { start: 0.45, end: 0 }
      }).setDepth(50)
      objects.push(steam)
    }
  }

  if (roomId === 'room_workshop') {
    // ─── Workshop: anvil silhouette + sawdust patches + cog on wall ──
    // Anvil shape (T-form) in the lower-left workspace area
    const anvil = scene.add.container(mapWidthPx * 0.25, mapHeightPx * 0.72).setDepth(2)
    anvil.add(scene.add.rectangle(0, 4, 14, 4, 0x2a2a2a, 0.9))     // base
    anvil.add(scene.add.rectangle(0, 0, 6, 3, 0x2a2a2a, 0.9))      // neck
    anvil.add(scene.add.rectangle(0, -3, 16, 2, 0x2a2a2a, 0.9))    // top
    objects.push(anvil)
    // Sawdust patches — small cream-colored irregular dots
    const dustSpots = [
      [mapWidthPx * 0.30, mapHeightPx * 0.78],
      [mapWidthPx * 0.32, mapHeightPx * 0.82],
      [mapWidthPx * 0.28, mapHeightPx * 0.86],
      [mapWidthPx * 0.70, mapHeightPx * 0.80],
      [mapWidthPx * 0.72, mapHeightPx * 0.84],
    ]
    for (const [dx, dy] of dustSpots) {
      const dust = scene.add.ellipse(dx, dy, 6 + Math.random() * 3, 3, 0xd8c098, 0.45).setDepth(2)
      dust.setAngle(Math.random() * 180)
      objects.push(dust)
    }
    // Cog/gear silhouette hung on the upper wall
    const cog = scene.add.container(mapWidthPx * 0.75, mapHeightPx * 0.28).setDepth(2)
    const ring = scene.add.circle(0, 0, 4, 0x6a5a4a, 0.8)
    cog.add(ring)
    // four teeth as small rects
    for (let i = 0; i < 4; i++) {
      const t = scene.add.rectangle(0, 0, 2, 9, 0x6a5a4a, 0.8)
      t.setAngle(i * 45)
      cog.add(t)
    }
    cog.add(scene.add.circle(0, 0, 1.5, 0x000000, 0.6))  // bolt center
    objects.push(cog)
    // Faint spark particles near the anvil — periodic
    if (!reducedMotion) {
      ensurePixelTexture(scene)
      const sparks = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: mapWidthPx * 0.23, max: mapWidthPx * 0.27 },
        y: { min: mapHeightPx * 0.68, max: mapHeightPx * 0.71 },
        lifespan: 600, quantity: 1, frequency: 3200,
        speedY: { min: -28, max: -18 }, speedX: { min: -8, max: 8 },
        scale: { start: 1, end: 0.6 },
        tint: 0xffc848,
        alpha: { start: 0.95, end: 0 }
      }).setDepth(50)
      objects.push(sparks)
    }
  }

  if (roomId === 'room_rooftop') {
    // ─── Rooftop: weather vane + flue cap + small antenna silhouette ──
    // Weather vane: vertical pole with a rotating arrow on top
    const vane = scene.add.container(mapWidthPx * 0.20, mapHeightPx * 0.30).setDepth(3)
    vane.add(scene.add.rectangle(0, 0, 1, 14, 0x3a3a3a, 0.85))     // pole
    const arrow = scene.add.container(0, -8)
    arrow.add(scene.add.rectangle(0, 0, 10, 1.5, 0x3a3a3a, 0.85))  // arrow shaft
    arrow.add(scene.add.triangle(5, 0, 0, -2, 0, 2, 3, 0, 0x3a3a3a, 0.85))
    vane.add(arrow)
    objects.push(vane)
    if (!reducedMotion) {
      // Slow back-and-forth rotation, like wind shifting
      const tween = scene.tweens.add({
        targets: arrow, angle: { from: -20, to: 20 },
        duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.inOut'
      })
      objects.push({ destroy: () => tween.remove() })
    } else {
      arrow.setAngle(8)
    }
    // Flue cap (short pipe sticking up from the roof)
    const flue = scene.add.container(mapWidthPx * 0.55, mapHeightPx * 0.40).setDepth(3)
    flue.add(scene.add.rectangle(0, 0, 5, 7, 0x4a3a2a, 0.85))     // pipe body
    flue.add(scene.add.rectangle(0, -4, 8, 1.5, 0x6a5a4a, 0.85))  // cap rim
    objects.push(flue)
    // Antenna — thin vertical + cross
    const ant = scene.add.container(mapWidthPx * 0.82, mapHeightPx * 0.25).setDepth(3)
    ant.add(scene.add.rectangle(0, 0, 1, 16, 0x2a2a2a, 0.8))
    ant.add(scene.add.rectangle(0, -3, 8, 1, 0x2a2a2a, 0.8))
    ant.add(scene.add.rectangle(0, 0,  6, 1, 0x2a2a2a, 0.8))
    objects.push(ant)
    // Light puff of smoke from the flue
    if (!reducedMotion) {
      ensurePixelTexture(scene)
      const smoke = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: mapWidthPx * 0.54, max: mapWidthPx * 0.56 },
        y: { min: mapHeightPx * 0.36, max: mapHeightPx * 0.37 },
        lifespan: 3200, quantity: 1, frequency: 1600,
        speedY: { min: -10, max: -6 }, speedX: { min: -3, max: 3 },
        scale: { start: 1.4, end: 3 },
        tint: 0xc8c8c8,
        alpha: { start: 0.35, end: 0 }
      }).setDepth(50)
      objects.push(smoke)
    }
  }

  return dispose
}

// ─── Shared pixel texture (matches the one in time_decor.ts) ────────
const PIXEL_TEX_KEY = 'lounge_pixel'
function ensurePixelTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(PIXEL_TEX_KEY)) return
  const g = scene.add.graphics()
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2)
  g.generateTexture(PIXEL_TEX_KEY, 2, 2)
  g.destroy()
}
