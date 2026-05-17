#!/usr/bin/env node
// V7.5 — Bake 3 new rooms: Kitchen (off Lobby), Workshop (off Library), Rooftop (above Lobby).
// All three use indoor_lobby_v1 tileset. Each is a small interior with a unique theme.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function makeRoom({ outFile, name, w, h, plan }) {
  const W = w, H = h
  const idx = (x, y) => y * W + x
  const size = W * H

  const floor = new Array(size).fill(1)        // wood floor base
  const fb    = new Array(size).fill(0)
  const fa    = new Array(size).fill(0)

  // Wall perimeter (tile 2)
  for (let x = 0; x < W; x++) { floor[idx(x, 0)] = 2; floor[idx(x, H - 1)] = 2 }
  for (let y = 0; y < H; y++) { floor[idx(0, y)] = 2; floor[idx(W - 1, y)] = 2 }

  // Sprinkle floor variants (uses v1 tile IDs 7/8/9)
  function hash(x, y) {
    let h = x * 73856093 ^ y * 19349663
    h = (h ^ (h >>> 13)) * 1274126177
    return (h ^ (h >>> 16)) >>> 0
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (floor[idx(x, y)] !== 1) continue
      const r = hash(x, y) % 100
      if (r < 6) floor[idx(x, y)] = 7
      else if (r < 12) floor[idx(x, y)] = 8
      else if (r < 18) floor[idx(x, y)] = 9
    }
  }

  // Apply plan: floor swaps + fb + fa cells
  for (const [layer, x, y, t] of plan.cells ?? []) {
    if (layer === 'floor') floor[idx(x, y)] = t
    else if (layer === 'fb') fb[idx(x, y)] = t
    else if (layer === 'fa') fa[idx(x, y)] = t
  }

  const map = {
    compressionlevel: -1, width: W, height: H,
    infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
    tileheight: 16, tilewidth: 16,
    tiledversion: '1.10.2', type: 'map', version: '1.10',
    nextlayerid: 8, nextobjectid: 100,
    tilesets: [{
      columns: 8, firstgid: 1,
      image: '../tilesets/indoor_lobby_v1/tiles.png',
      imageheight: 80, imagewidth: 128,
      margin: 0, name: 'indoor_lobby_v1', spacing: 0,
      tilecount: 40, tileheight: 16, tilewidth: 16
    }],
    layers: [
      { id: 1, name: 'floor',           type: 'tilelayer', width: W, height: H, data: floor, opacity: 1, visible: true, x: 0, y: 0 },
      { id: 2, name: 'furniture_below', type: 'tilelayer', width: W, height: H, data: fb,    opacity: 1, visible: true, x: 0, y: 0 },
      { id: 3, name: 'furniture_above', type: 'tilelayer', width: W, height: H, data: fa,    opacity: 1, visible: true, x: 0, y: 0 },
      { id: 4, name: 'collision', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: plan.collision ?? [] },
      { id: 5, name: 'spawn_points', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: plan.spawns ?? [] },
      { id: 6, name: 'portals', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: plan.portals ?? [] },
      { id: 7, name: 'interactables', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: plan.interactables ?? [] }
    ]
  }
  const path = join(ROOT, 'public', 'lounge', 'assets', 'rooms', outFile)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(map, null, 2) + '\n')
  console.log(`OK ${outFile} — ${W}×${H} (${name})`)
}

// ─── Kitchen (20×12) — Mio's actual workspace ─────────────────────────
makeRoom({
  outFile: 'kitchen.tmj', name: 'Kitchen', w: 20, h: 12,
  plan: {
    cells: [
      // 4 windows on top wall (interspersed)
      ['floor', 4, 0, 13], ['floor', 8, 0, 13], ['floor', 12, 0, 13], ['floor', 16, 0, 13],
      // sconce
      ['floor', 2, 0, 14],
      // Door to lobby (bottom-center)
      ['floor', 10, 11, 3],
      // Counter along top wall (cols 2-17 row 2) — table tiles
      ['fb', 2, 2, 4], ['fb', 3, 2, 4], ['fb', 4, 2, 4], ['fb', 5, 2, 4],
      ['fb', 6, 2, 4], ['fb', 7, 2, 4], ['fb', 8, 2, 4], ['fb', 9, 2, 4],
      ['fb', 10, 2, 4], ['fb', 11, 2, 4], ['fb', 12, 2, 4], ['fb', 13, 2, 4],
      ['fb', 14, 2, 4], ['fb', 15, 2, 4], ['fb', 16, 2, 4], ['fb', 17, 2, 4],
      // Stove on left side (use fireplace 23/24 for visual)
      ['fb', 3, 3, 23],
      // Tea/coffee station: vase + sofa as accent
      ['fb', 15, 3, 31],
      // Hanging lanterns (above)
      ['fa', 5, 1, 21], ['fa', 14, 1, 21],
      // Central table for orders
      ['fb', 8, 7, 4], ['fb', 9, 7, 4], ['fb', 10, 7, 4], ['fb', 11, 7, 4],
      ['fb', 8, 8, 5], ['fb', 11, 8, 5],
      // Plants
      ['fb', 2, 8, 6], ['fb', 17, 8, 6]
    ],
    collision: [
      { id: 1, name: 'wall_top_l',    x: 0,   y: 0,   width: 160, height: 16 },
      { id: 2, name: 'wall_top_r',    x: 176, y: 0,   width: 144, height: 16 },
      { id: 3, name: 'wall_bottom_l', x: 0,   y: 176, width: 160, height: 16 },
      { id: 4, name: 'wall_bottom_r', x: 176, y: 176, width: 144, height: 16 },
      { id: 5, name: 'wall_left',     x: 0,   y: 16,  width: 16,  height: 160 },
      { id: 6, name: 'wall_right',    x: 304, y: 16,  width: 16,  height: 160 },
      { id: 7,  name: 'counter',      x: 32,  y: 32,  width: 256, height: 16 },
      { id: 8,  name: 'stove',        x: 48,  y: 48,  width: 16,  height: 16 },
      { id: 9,  name: 'vase',         x: 240, y: 48,  width: 16,  height: 16 },
      { id: 10, name: 'mid_table',    x: 128, y: 112, width: 64,  height: 16 },
      { id: 11, name: 'chair_l',      x: 128, y: 128, width: 16,  height: 16 },
      { id: 12, name: 'chair_r',      x: 176, y: 128, width: 16,  height: 16 },
      { id: 13, name: 'plant_l',      x: 32,  y: 128, width: 16,  height: 16 },
      { id: 14, name: 'plant_r',      x: 272, y: 128, width: 16,  height: 16 }
    ],
    spawns: [
      { id: 20, name: 'default',    x: 160, y: 96,  width: 0, height: 0 },
      { id: 21, name: 'from_lobby', x: 160, y: 168, width: 0, height: 0 }
    ],
    portals: [
      { id: 25, name: 'to_lobby', x: 160, y: 176, width: 16, height: 16,
        properties: [
          { name: 'target_room',  type: 'string', value: 'room_lobby' },
          { name: 'target_spawn', type: 'string', value: 'from_kitchen' }
        ]
      }
    ],
    interactables: []
  }
})

// ─── Workshop (18×12) — crafting tease (mechanics in Era 8) ──────────
makeRoom({
  outFile: 'workshop.tmj', name: 'Workshop', w: 18, h: 12,
  plan: {
    cells: [
      // Windows
      ['floor', 4, 0, 13], ['floor', 13, 0, 13],
      // Door (bottom center)
      ['floor', 9, 11, 3],
      // Workbench along top
      ['fb', 3, 2, 4], ['fb', 4, 2, 4], ['fb', 5, 2, 4], ['fb', 6, 2, 4],
      ['fb', 11, 2, 4], ['fb', 12, 2, 4], ['fb', 13, 2, 4], ['fb', 14, 2, 4],
      // Bookshelves (workshop = tools + manuals)
      ['fb', 1, 3, 18], ['fb', 1, 4, 19],
      ['fb', 16, 3, 18], ['fb', 16, 4, 19],
      // Floor lamp
      ['fb', 5, 4, 22], ['fb', 12, 4, 22],
      // Hanging lanterns above
      ['fa', 5, 1, 21], ['fa', 12, 1, 21],
      // Wall painting + clock
      ['floor', 0, 6, 17],
      ['floor', 17, 6, 20],
      // Central table (in-progress project)
      ['fb', 7, 7, 4], ['fb', 8, 7, 4], ['fb', 9, 7, 4], ['fb', 10, 7, 4],
      ['fb', 7, 8, 5], ['fb', 10, 8, 5]
    ],
    collision: [
      { id: 1, name: 'wall_top',    x: 0,   y: 0,   width: 288, height: 16 },
      { id: 2, name: 'wall_bottom_l', x: 0, y: 176, width: 144, height: 16 },
      { id: 3, name: 'wall_bottom_r', x: 160, y: 176, width: 128, height: 16 },
      { id: 4, name: 'wall_left',   x: 0,   y: 16,  width: 16, height: 160 },
      { id: 5, name: 'wall_right',  x: 272, y: 16,  width: 16, height: 160 },
      { id: 6, name: 'workbench',   x: 48,  y: 32,  width: 64, height: 16 },
      { id: 7, name: 'workbench_r', x: 176, y: 32,  width: 64, height: 16 },
      { id: 8, name: 'shelf_l_top', x: 16,  y: 48,  width: 16, height: 16 },
      { id: 9, name: 'shelf_l_bot', x: 16,  y: 64,  width: 16, height: 16 },
      { id: 10, name: 'shelf_r_top', x: 256, y: 48, width: 16, height: 16 },
      { id: 11, name: 'shelf_r_bot', x: 256, y: 64, width: 16, height: 16 },
      { id: 12, name: 'lamp_l',     x: 80,  y: 64,  width: 16, height: 16 },
      { id: 13, name: 'lamp_r',     x: 192, y: 64,  width: 16, height: 16 },
      { id: 14, name: 'work_table', x: 112, y: 112, width: 64, height: 16 },
      { id: 15, name: 'chair_l',    x: 112, y: 128, width: 16, height: 16 },
      { id: 16, name: 'chair_r',    x: 160, y: 128, width: 16, height: 16 }
    ],
    spawns: [
      { id: 20, name: 'default',      x: 144, y: 96,  width: 0, height: 0 },
      { id: 21, name: 'from_library', x: 144, y: 168, width: 0, height: 0 }
    ],
    portals: [
      { id: 25, name: 'to_library', x: 144, y: 176, width: 16, height: 16,
        properties: [
          { name: 'target_room',  type: 'string', value: 'room_library' },
          { name: 'target_spawn', type: 'string', value: 'from_workshop' }
        ]
      }
    ],
    interactables: []
  }
})

// ─── Rooftop (24×14) — night-time stargazing ────────────────────────
makeRoom({
  outFile: 'rooftop.tmj', name: 'Rooftop', w: 24, h: 14,
  plan: {
    cells: [
      // No windows — open sky above (just dark wall to simulate parapet)
      // Door (bottom center) leading down stairs to Lobby
      ['floor', 12, 13, 3],
      // 4 hanging lanterns spread out (above-layer for glow at night)
      ['fa', 5, 2, 21], ['fa', 11, 2, 21], ['fa', 17, 2, 21], ['fa', 12, 6, 21],
      // Sofa cluster center for stargazing
      ['fb', 8, 7, 25], ['fb', 9, 7, 26], ['fb', 10, 7, 27],
      ['fb', 14, 7, 25], ['fb', 15, 7, 26], ['fb', 16, 7, 27],
      // Big rug between sofas
      ['floor', 11, 8, 30], ['floor', 12, 8, 30], ['floor', 13, 8, 30],
      // Floor lamps at corners
      ['fb', 2,  2, 22], ['fb', 21, 2, 22],
      ['fb', 2, 11, 22], ['fb', 21, 11, 22],
      // Plants
      ['fb', 6, 3, 6], ['fb', 17, 3, 6],
      // Bench at top center (overlooking sky)
      ['fb', 11, 3, 32], ['fb', 12, 3, 32], ['fb', 13, 3, 32]
    ],
    collision: [
      { id: 1, name: 'wall_top',      x: 0,   y: 0,   width: 384, height: 16 },
      { id: 2, name: 'wall_bottom_l', x: 0,   y: 208, width: 192, height: 16 },
      { id: 3, name: 'wall_bottom_r', x: 208, y: 208, width: 176, height: 16 },
      { id: 4, name: 'wall_left',    x: 0,   y: 16,  width: 16, height: 192 },
      { id: 5, name: 'wall_right',   x: 368, y: 16,  width: 16, height: 192 },
      { id: 6, name: 'lamp_tl', x: 32,  y: 32,  width: 16, height: 16 },
      { id: 7, name: 'lamp_tr', x: 336, y: 32,  width: 16, height: 16 },
      { id: 8, name: 'lamp_bl', x: 32,  y: 176, width: 16, height: 16 },
      { id: 9, name: 'lamp_br', x: 336, y: 176, width: 16, height: 16 },
      { id: 10, name: 'plant_l', x: 96, y: 48, width: 16, height: 16 },
      { id: 11, name: 'plant_r', x: 272, y: 48, width: 16, height: 16 },
      { id: 12, name: 'bench',   x: 176, y: 48, width: 48, height: 16 },
      { id: 13, name: 'sofa_l',  x: 128, y: 112, width: 48, height: 16 },
      { id: 14, name: 'sofa_r',  x: 224, y: 112, width: 48, height: 16 }
    ],
    spawns: [
      { id: 20, name: 'default',     x: 192, y: 144, width: 0, height: 0 },
      { id: 21, name: 'from_lobby',  x: 192, y: 200, width: 0, height: 0 }
    ],
    portals: [
      { id: 25, name: 'to_lobby', x: 192, y: 208, width: 16, height: 16,
        properties: [
          { name: 'target_room',  type: 'string', value: 'room_lobby' },
          { name: 'target_spawn', type: 'string', value: 'from_rooftop' }
        ]
      }
    ],
    interactables: [
      { id: 30, name: 'sofa_l_sit', x: 128, y: 112, width: 48, height: 16,
        properties: [
          { name: 'kind', type: 'string', value: 'sit' },
          { name: 'anchor_x', type: 'int', value: 152 },
          { name: 'anchor_y', type: 'int', value: 120 },
          { name: 'facing', type: 'string', value: 'up' }
        ]
      },
      { id: 31, name: 'sofa_r_sit', x: 224, y: 112, width: 48, height: 16,
        properties: [
          { name: 'kind', type: 'string', value: 'sit' },
          { name: 'anchor_x', type: 'int', value: 248 },
          { name: 'anchor_y', type: 'int', value: 120 },
          { name: 'facing', type: 'string', value: 'up' }
        ]
      }
    ]
  }
})

// ─── Add portals from Lobby and Library to new rooms ──────────────────

const lobbyPath = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'lobby.tmj')
const lobby = JSON.parse(readFileSync(lobbyPath, 'utf8'))
const lobbyPortals = lobby.layers.find(l => l.name === 'portals')
const lobbySpawns = lobby.layers.find(l => l.name === 'spawn_points')
let nextLobbyId = lobby.nextobjectid ?? 100
if (!lobbyPortals.objects.some(o => o.name === 'to_kitchen')) {
  lobbyPortals.objects.push({
    id: nextLobbyId++, name: 'to_kitchen',
    x: 32, y: 0, width: 32, height: 16,
    properties: [
      { name: 'target_room',  type: 'string', value: 'room_kitchen' },
      { name: 'target_spawn', type: 'string', value: 'from_lobby' }
    ]
  })
  lobbySpawns.objects.push({ id: nextLobbyId++, name: 'from_kitchen', x: 48, y: 32, width: 0, height: 0 })
}
if (!lobbyPortals.objects.some(o => o.name === 'to_rooftop')) {
  lobbyPortals.objects.push({
    id: nextLobbyId++, name: 'to_rooftop',
    x: 416, y: 0, width: 32, height: 16,
    properties: [
      { name: 'target_room',  type: 'string', value: 'room_rooftop' },
      { name: 'target_spawn', type: 'string', value: 'from_lobby' }
    ]
  })
  lobbySpawns.objects.push({ id: nextLobbyId++, name: 'from_rooftop', x: 432, y: 32, width: 0, height: 0 })
}
lobby.nextobjectid = nextLobbyId
writeFileSync(lobbyPath, JSON.stringify(lobby, null, 2) + '\n')
console.log('OK lobby.tmj: + to_kitchen + to_rooftop portals')

const libraryPath = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'library.tmj')
const library = JSON.parse(readFileSync(libraryPath, 'utf8'))
const libraryPortals = library.layers.find(l => l.name === 'portals')
const librarySpawns = library.layers.find(l => l.name === 'spawn_points')
let nextLibId = library.nextobjectid ?? 100
if (!libraryPortals.objects.some(o => o.name === 'to_workshop')) {
  libraryPortals.objects.push({
    id: nextLibId++, name: 'to_workshop',
    x: 384, y: 144, width: 16, height: 32,
    properties: [
      { name: 'target_room',  type: 'string', value: 'room_workshop' },
      { name: 'target_spawn', type: 'string', value: 'from_library' }
    ]
  })
  librarySpawns.objects.push({ id: nextLibId++, name: 'from_workshop', x: 368, y: 160, width: 0, height: 0 })
}
library.nextobjectid = nextLibId
writeFileSync(libraryPath, JSON.stringify(library, null, 2) + '\n')
console.log('OK library.tmj: + to_workshop portal')
