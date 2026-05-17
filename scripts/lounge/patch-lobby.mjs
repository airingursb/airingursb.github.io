#!/usr/bin/env node
// One-shot patch: rebuild lobby.tmj from scratch with V2.2 additions.
// - East door (col 29, row 9)
// - West door (col 0, row 9)
// - 1 sit-interactable couch in south-east (separate from table+chairs)
// - 2 portals (east → dj_floor, west → balcony)
// - 2 new spawn points (from_dj_floor, from_balcony)

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'public', 'lounge', 'assets', 'rooms', 'lobby.tmj')

const W = 30, H = 20
const FLOOR = 1, WALL = 2, DOOR = 3, TABLE = 4, CHAIR = 5, PLANT = 6

function floorData() {
  const data = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isBorder = x === 0 || x === W - 1 || y === 0 || y === H - 1
      let tile = isBorder ? WALL : FLOOR
      if ((x === 0 || x === W - 1) && y === 9) tile = DOOR
      data.push(tile)
    }
  }
  return data
}

function fbData() {
  const data = new Array(W * H).fill(0)
  const set = (x, y, t) => { data[y * W + x] = t }
  set(13, 9, TABLE); set(14, 9, TABLE); set(15, 9, TABLE); set(16, 9, TABLE)
  set(13, 10, TABLE); set(14, 10, TABLE); set(15, 10, TABLE); set(16, 10, TABLE)
  set(12, 8, CHAIR); set(17, 8, CHAIR)
  set(12, 11, CHAIR); set(17, 11, CHAIR)
  for (let x = 22; x <= 25; x++) set(x, 17, CHAIR)
  return data
}

function faData() {
  const data = new Array(W * H).fill(0)
  data[0 * W + 28] = PLANT
  return data
}

const map = {
  compressionlevel: -1,
  width: W, height: H,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tileheight: 16, tilewidth: 16,
  tiledversion: '1.10.2',
  type: 'map',
  version: '1.10',
  nextlayerid: 8,
  nextobjectid: 50,
  tilesets: [{
    columns: 6,
    firstgid: 1,
    image: '../tilesets/indoor_lobby_v0/tiles.png',
    imageheight: 16,
    imagewidth: 96,
    margin: 0,
    name: 'indoor_lobby_v0',
    spacing: 0,
    tilecount: 6,
    tileheight: 16,
    tilewidth: 16
  }],
  layers: [
    { id: 1, name: 'floor', type: 'tilelayer', width: W, height: H, data: floorData(),
      opacity: 1, visible: true, x: 0, y: 0 },
    { id: 2, name: 'furniture_below', type: 'tilelayer', width: W, height: H, data: fbData(),
      opacity: 1, visible: true, x: 0, y: 0 },
    { id: 3, name: 'furniture_above', type: 'tilelayer', width: W, height: H, data: faData(),
      opacity: 1, visible: true, x: 0, y: 0 },
    {
      id: 4, name: 'collision', type: 'objectgroup', draworder: 'topdown',
      opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        { id: 1, name: 'wall_top', x: 0, y: 0, width: W * 16, height: 16 },
        { id: 2, name: 'wall_bottom', x: 0, y: (H - 1) * 16, width: W * 16, height: 16 },
        { id: 3, name: 'wall_left_a', x: 0, y: 16, width: 16, height: 9 * 16 },
        { id: 4, name: 'wall_left_b', x: 0, y: 10 * 16, width: 16, height: (H - 11) * 16 },
        { id: 5, name: 'wall_right_a', x: (W - 1) * 16, y: 16, width: 16, height: 9 * 16 },
        { id: 6, name: 'wall_right_b', x: (W - 1) * 16, y: 10 * 16, width: 16, height: (H - 11) * 16 },
        { id: 7, name: 'table', x: 208, y: 144, width: 64, height: 32 },
        { id: 8, name: 'chair_tl', x: 192, y: 128, width: 16, height: 16 },
        { id: 9, name: 'chair_tr', x: 272, y: 128, width: 16, height: 16 },
        { id: 10, name: 'chair_bl', x: 192, y: 176, width: 16, height: 16 },
        { id: 11, name: 'chair_br', x: 272, y: 176, width: 16, height: 16 },
        { id: 12, name: 'plant', x: 448, y: 0, width: 16, height: 16 },
        { id: 13, name: 'couch_sit', x: 352, y: 272, width: 64, height: 16 }
      ]
    },
    {
      id: 5, name: 'spawn_points', type: 'objectgroup', draworder: 'topdown',
      opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        { id: 20, name: 'default', x: 240, y: 296, width: 0, height: 0 },
        { id: 21, name: 'from_dj_floor', x: 448, y: 160, width: 0, height: 0 },
        { id: 22, name: 'from_balcony', x: 32, y: 160, width: 0, height: 0 }
      ]
    },
    {
      id: 6, name: 'portals', type: 'objectgroup', draworder: 'topdown',
      opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        {
          id: 30, name: 'to_dj_floor', x: (W - 1) * 16, y: 144, width: 16, height: 32,
          properties: [
            { name: 'target_room', type: 'string', value: 'room_dj_floor' },
            { name: 'target_spawn', type: 'string', value: 'from_lobby' }
          ]
        },
        {
          id: 31, name: 'to_balcony', x: 0, y: 144, width: 16, height: 32,
          properties: [
            { name: 'target_room', type: 'string', value: 'room_balcony' },
            { name: 'target_spawn', type: 'string', value: 'from_lobby' }
          ]
        }
      ]
    },
    {
      id: 7, name: 'interactables', type: 'objectgroup', draworder: 'topdown',
      opacity: 1, visible: true, x: 0, y: 0,
      objects: [
        {
          id: 40, name: 'couch_sit', x: 352, y: 272, width: 64, height: 16,
          properties: [
            { name: 'kind', type: 'string', value: 'sit' },
            { name: 'anchor_x', type: 'int', value: 384 },
            { name: 'anchor_y', type: 'int', value: 280 },
            { name: 'facing', type: 'string', value: 'down' }
          ]
        }
      ]
    }
  ]
}

writeFileSync(OUT, JSON.stringify(map, null, 2))
console.log('OK lobby.tmj')
