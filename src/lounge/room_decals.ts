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
    room_gallery:  { primary: 0x1a1f2a, accent: 0xc8a058 },  // dark stone + brass — museum trim
    room_office:   { primary: 0xd8d6d0, accent: 0x6cc8e8 },  // light grey + cyan monitor-glow trim
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
    room_gallery:  0x2a3040,   // cool dark slate — museum hall solemnity
  }
  const tintColor = FLOOR_TINTS[roomId]
  if (tintColor !== undefined) {
    // Gallery wants a much stronger override to escape the warm-wood floor
    // and read as polished dark stone. Other rooms keep the subtle wash.
    const alpha = roomId === 'room_gallery' ? 0.55 : 0.10
    const tint = scene.add.rectangle(
      mapWidthPx / 2, mapHeightPx / 2,
      mapWidthPx, mapHeightPx,
      tintColor, alpha
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

  if (roomId === 'room_gallery') {
    // ─── Gallery (80×60 tile cruciform museum). The underlying tilemap is
    // indoor_2f_v0 (warm brick + wood) which fights the museum aesthetic, so
    // we PAINT OVER it per-zone: opaque travertine marble floor, opaque slate
    // wall faces, brass crown molding, deep burgundy carpets along major
    // axes, warm spotlight pools in front of every painting position.
    //
    // Depth layering (above floor tilemap = 0):
    //   2.0 — opaque marble floor cover per zone (kills warm wood)
    //   2.1 — marble veining lines
    //   2.2 — opaque wall faces (kills brick)
    //   2.3 — brass crown molding + skirting boards
    //   2.5 — carpet runners
    //   2.6 — carpet trim
    //   2.7 — pedestal-style center markers (rotunda)
    //   2.8 — floor spotlight pools
    //   50  — dust motes particles

    const FLOOR_BASE = 0x9e9aa4   // warm grey-violet marble — sells "marble + runner" rather than "sticker on lino" by reducing the gap with the aubergine carpet
    const FLOOR_VEIN = 0x6e6a78   // darker vein, harmonized with new floor
    const WALL_FACE  = 0x6a6478   // muted slate
    const WALL_DARK  = 0x3a3848   // pilaster shadow
    const MOLDING    = 0xc8a058   // brass crown
    const CARPET     = 0x1a1420   // near-black aubergine — solemn velvet
    const CARPET_HI  = 0x2a1f2e   // subtle highlight stripe
    const CARPET_TRIM = 0xd4a058  // gold trim
    const TILE_PX = 16

    // Zone bboxes — kept in sync with scripts/generate-gallery-tmj.py ZONES.
    type Zone = { name: string; x: number; y: number; w: number; h: number }
    const tilesToPx = (c: number, r: number, cw: number, rh: number): Zone => ({
      name: '', x: c * TILE_PX, y: r * TILE_PX, w: cw * TILE_PX, h: rh * TILE_PX,
    })
    const NORTH   = { ...tilesToPx(32,  0, 16, 20), name: 'north'   }
    const ROTUNDA = { ...tilesToPx(24, 20, 32, 24), name: 'rotunda' }
    const EAST    = { ...tilesToPx(56, 20, 24, 24), name: 'east'    }
    const WEST    = { ...tilesToPx( 0, 20, 24, 24), name: 'west'    }
    const SOUTH   = { ...tilesToPx(24, 44, 32, 16), name: 'south'   }
    const ZONES: Zone[] = [NORTH, ROTUNDA, EAST, WEST, SOUTH]

    // ── Opaque marble floor cover, per zone (overlays the warm-wood tilemap)
    for (const z of ZONES) {
      objects.push(scene.add.rectangle(z.x + z.w / 2, z.y + z.h / 2, z.w, z.h, FLOOR_BASE, 1.0).setDepth(2.0))
    }

    // ── Marble veining: scatter subtle diagonal lines per zone
    const veinSeed = (zoneIdx: number) => zoneIdx * 1009 + 7  // deterministic
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i]
      let s = veinSeed(i)
      const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000 }
      const veinCount = Math.max(3, Math.floor((z.w * z.h) / 30000))
      for (let v = 0; v < veinCount; v++) {
        const vx = z.x + rand() * z.w
        const vy = z.y + rand() * z.h
        const vw = 40 + rand() * 80
        const vang = -25 + rand() * 50
        objects.push(scene.add.rectangle(vx, vy, vw, 1, FLOOR_VEIN, 0.30)
          .setOrigin(0, 0.5).setAngle(vang).setDepth(2.1))
      }
    }

    // ── Opaque wall faces along zone perimeters (covers brick tilemap)
    // Helper: paint a wall band on top of every wall segment.
    const wallBand = (x: number, y: number, w: number, h: number) => {
      objects.push(scene.add.rectangle(x + w / 2, y + h / 2, w, h, WALL_FACE, 1.0).setDepth(2.2))
    }
    // Outer building perimeter walls (matching generate-gallery-tmj.py)
    // North Hall
    wallBand(NORTH.x,                    NORTH.y,                    NORTH.w, TILE_PX)              // top
    wallBand(NORTH.x,                    NORTH.y,                    TILE_PX, NORTH.h)              // left
    wallBand(NORTH.x + NORTH.w - TILE_PX, NORTH.y,                   TILE_PX, NORTH.h)              // right
    // West Wing
    wallBand(WEST.x,                     WEST.y,                     WEST.w, TILE_PX)               // top
    wallBand(WEST.x,                     WEST.y,                     TILE_PX, WEST.h)               // left
    wallBand(WEST.x,                     WEST.y + WEST.h - TILE_PX,  WEST.w, TILE_PX)               // bottom
    // East Wing
    wallBand(EAST.x,                     EAST.y,                     EAST.w, TILE_PX)               // top
    wallBand(EAST.x + EAST.w - TILE_PX,  EAST.y,                     TILE_PX, EAST.h)               // right
    wallBand(EAST.x,                     EAST.y + EAST.h - TILE_PX,  EAST.w, TILE_PX)               // bottom
    // South Pavilion (bottom split for lobby portal)
    wallBand(SOUTH.x,                    SOUTH.y,                    TILE_PX, SOUTH.h)              // left
    wallBand(SOUTH.x + SOUTH.w - TILE_PX, SOUTH.y,                   TILE_PX, SOUTH.h)              // right
    const lobbyGapX0 = 608, lobbyGapX1 = 672                                                        // matches tmj
    wallBand(SOUTH.x,            SOUTH.y + SOUTH.h - TILE_PX, lobbyGapX0 - SOUTH.x,            TILE_PX)
    wallBand(lobbyGapX1,         SOUTH.y + SOUTH.h - TILE_PX, SOUTH.x + SOUTH.w - lobbyGapX1, TILE_PX)
    // Rotunda inner walls (with doorways)
    const NDX0 = 608, NDX1 = 672       // north/south doorway x range
    const SDY0 = 480, SDY1 = 544       // side doorway y range
    // Rotunda north wall
    wallBand(ROTUNDA.x,                  ROTUNDA.y,                  NDX0 - ROTUNDA.x,                  TILE_PX)
    wallBand(NDX1,                       ROTUNDA.y,                  ROTUNDA.x + ROTUNDA.w - NDX1,     TILE_PX)
    // Rotunda south wall
    wallBand(ROTUNDA.x,                  ROTUNDA.y + ROTUNDA.h - TILE_PX, NDX0 - ROTUNDA.x,              TILE_PX)
    wallBand(NDX1,                       ROTUNDA.y + ROTUNDA.h - TILE_PX, ROTUNDA.x + ROTUNDA.w - NDX1, TILE_PX)
    // Rotunda west wall
    wallBand(ROTUNDA.x,                  ROTUNDA.y,                  TILE_PX, SDY0 - ROTUNDA.y)
    wallBand(ROTUNDA.x,                  SDY1,                       TILE_PX, ROTUNDA.y + ROTUNDA.h - SDY1)
    // Rotunda east wall
    wallBand(ROTUNDA.x + ROTUNDA.w - TILE_PX, ROTUNDA.y,             TILE_PX, SDY0 - ROTUNDA.y)
    wallBand(ROTUNDA.x + ROTUNDA.w - TILE_PX, SDY1,                  TILE_PX, ROTUNDA.y + ROTUNDA.h - SDY1)

    // ── Brass crown molding along inner edge of each wall
    const moldingBand = (x: number, y: number, w: number, h: number, horizontal: boolean) => {
      if (horizontal) {
        // 1px brass line along the wall's interior edge
        objects.push(scene.add.rectangle(x + w / 2, y + h, w, 1, MOLDING, 0.85).setDepth(2.3))
      } else {
        objects.push(scene.add.rectangle(x + w, y + h / 2, 1, h, MOLDING, 0.85).setDepth(2.3))
      }
    }
    // Just on the most-visible interior edges of each zone (top + side walls)
    for (const z of ZONES) {
      // Top wall interior edge
      moldingBand(z.x, z.y, z.w, TILE_PX, true)
    }

    // ── Carpet runners: narrower so marble dominates and carpet guides
    const carpetVx = 640
    const carpetVw = 48
    // Vertical carpet: from north hall through rotunda through south pavilion
    objects.push(scene.add.rectangle(carpetVx, (NORTH.y + SOUTH.y + SOUTH.h) / 2,
      carpetVw, SOUTH.y + SOUTH.h - NORTH.y, CARPET, 1.0).setDepth(2.5))
    objects.push(scene.add.rectangle(carpetVx, (NORTH.y + SOUTH.y + SOUTH.h) / 2,
      carpetVw - 16, SOUTH.y + SOUTH.h - NORTH.y, CARPET_HI, 0.45).setDepth(2.55))
    objects.push(scene.add.rectangle(carpetVx - carpetVw / 2 + 1.5, (NORTH.y + SOUTH.y + SOUTH.h) / 2,
      1.5, SOUTH.y + SOUTH.h - NORTH.y, CARPET_TRIM, 0.85).setDepth(2.6))
    objects.push(scene.add.rectangle(carpetVx + carpetVw / 2 - 1.5, (NORTH.y + SOUTH.y + SOUTH.h) / 2,
      1.5, SOUTH.y + SOUTH.h - NORTH.y, CARPET_TRIM, 0.85).setDepth(2.6))
    // Horizontal carpet: through transepts
    const carpetHy = 512                  // center row of transept
    const carpetHh = 36
    const transeptLeftX = WEST.x
    const transeptRightX = EAST.x + EAST.w
    objects.push(scene.add.rectangle((transeptLeftX + transeptRightX) / 2, carpetHy,
      transeptRightX - transeptLeftX, carpetHh, CARPET, 1.0).setDepth(2.5))
    objects.push(scene.add.rectangle((transeptLeftX + transeptRightX) / 2, carpetHy,
      transeptRightX - transeptLeftX, carpetHh - 14, CARPET_HI, 0.45).setDepth(2.55))
    objects.push(scene.add.rectangle((transeptLeftX + transeptRightX) / 2, carpetHy - carpetHh / 2 + 1.5,
      transeptRightX - transeptLeftX, 1.5, CARPET_TRIM, 0.85).setDepth(2.6))
    objects.push(scene.add.rectangle((transeptLeftX + transeptRightX) / 2, carpetHy + carpetHh / 2 - 1.5,
      transeptRightX - transeptLeftX, 1.5, CARPET_TRIM, 0.85).setDepth(2.6))

    // ── Floor spotlight pools in front of every painting position
    // (matches the EXHIBITS array in generate-gallery-tmj.py)
    const exhibitAnchors: Array<[number, number, boolean]> = [
      // North Hall
      [560, 144, false], [688, 144, false],
      // West Wing
      [88, 416, false], [296, 416, false],
      [88, 512, false], [296, 512, false],
      [88, 608, false], [296, 608, false],
      // East Wing
      [984, 416, false], [1192, 416, false],
      [984, 512, false], [1192, 512, false],
      [984, 608, false], [1192, 608, false],
      // Rotunda centerpiece (bigger)
      [640, 560, true],
    ]
    for (const [px, py, big] of exhibitAnchors) {
      if (big) {
        // Centerpiece halo — split into two parts so we don't smear the
        // aubergine carpet directly under the painting.
        // Wider outer rings sit at LOW alpha (so they barely show on carpet),
        // a tighter inner core gives the actual highlight.
        const cy = py + 8
        objects.push(scene.add.ellipse(px, cy, 200, 56, 0xfff0c8, 0.10).setDepth(2.8))
        objects.push(scene.add.ellipse(px, cy, 130, 38, 0xfff5d8, 0.20).setDepth(2.83))
        objects.push(scene.add.ellipse(px, cy,  74, 22, 0xfffaef, 0.55).setDepth(2.86))
      } else {
        // Wall paintings — bumped from invisible (0.22/0.36) to actually visible
        objects.push(scene.add.ellipse(px, py - 12, 78, 26, 0xfff0c8, 0.38).setDepth(2.8))
        objects.push(scene.add.ellipse(px, py - 12, 78 * 0.55, 26 * 0.55, 0xfff8e0, 0.55).setDepth(2.85))
      }
    }

    // ── Ambient dust motes throughout the building
    if (!reducedMotion) {
      ensurePixelTexture(scene)
      // One emitter per zone — concentrated where players are
      for (const z of ZONES) {
        const motes = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
          x: { min: z.x + 16, max: z.x + z.w - 16 },
          y: { min: z.y + 16, max: z.y + z.h - 16 },
          lifespan: 5500, quantity: 1, frequency: 1400,
          speedX: { min: -2, max: 2 }, speedY: { min: -1.5, max: 1.5 },
          scale: { start: 1, end: 1 },
          tint: 0xfff3c0,
          alpha: { start: 0.45, end: 0 }
        }).setDepth(50)
        objects.push(motes)
      }
      // Sakura petals drifting through the rotunda — echoes the centerpiece motif
      const petals = scene.add.particles(0, 0, PIXEL_TEX_KEY, {
        x: { min: ROTUNDA.x + 60, max: ROTUNDA.x + ROTUNDA.w - 60 },
        y: { min: ROTUNDA.y + 40, max: ROTUNDA.y + ROTUNDA.h - 80 },
        lifespan: 8000, quantity: 1, frequency: 3200,
        speedX: { min: -8, max: 8 },
        speedY: { min: 6, max: 14 },
        scale: { start: 1.5, end: 1 },
        tint: [0xff9eb4, 0xffb5c8, 0xff7e9e],
        alpha: { start: 0.6, end: 0 },
        rotate: { min: 0, max: 360 },
      }).setDepth(51)
      objects.push(petals)
    }
  }

  // ── Agent Office — cool daylight: window light pools + soft monitor glow ──
  if (roomId === 'room_office') {
    // bright trapezoidal light pools cast from the top windows (cols 4,10,16,…)
    for (let c = 4; c < mapWidthPx / 16 - 4; c += 6) {
      const x = (c + 0.5) * 16
      const pool = scene.add.polygon(0, 0, [x - 10, 32, x + 10, 32, x + 26, 150, x - 26, 150], 0xcfe4ee, 0.10)
        .setOrigin(0, 0).setDepth(1.3)
      objects.push(pool)
    }
    // overall cool tint to lift the flat grey floor toward "bright airy office"
    const tint = scene.add.rectangle(0, 0, mapWidthPx, mapHeightPx, 0xeaf2f6, 0.05).setOrigin(0, 0).setDepth(1.2)
    objects.push(tint)
    // faint cyan glow pools under the workstation monitors (3 rows × 4 cols)
    for (const ry of [156, 218, 280]) for (const cx of [112, 196, 280, 364]) {
      const glow = scene.add.ellipse(cx, ry - 16, 30, 16, 0x6cc8e8, 0.07).setDepth(1.9)
      objects.push(glow)
    }
    // slow dust motes drifting in the daylight (skipped under reduced-motion)
    if (!reducedMotion) {
      ensurePixelTexture(scene)
      const motes = scene.add.particles(0, 0, 'rd_pixel', {
        x: { min: 0, max: mapWidthPx }, y: { min: 40, max: mapHeightPx - 40 },
        lifespan: 9000, speedY: { min: -5, max: -1 }, speedX: { min: -2, max: 2 },
        scale: { min: 0.6, max: 1.4 }, alpha: { start: 0.18, end: 0 }, frequency: 700, tint: 0xffffff,
      }).setDepth(1.6)
      objects.push(motes)
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
