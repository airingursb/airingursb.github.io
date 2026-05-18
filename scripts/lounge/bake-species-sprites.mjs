#!/usr/bin/env node
// E5-P1a — Generic species sprite baker. Outputs one atlas per region per species.
// Existing bear + cat bakers stay as-is. This script adds fox / capybara / bird.

import { createCanvas } from 'canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ─── Pixel templates (13×15) ─────────────────────────────────────────
// Color slot legend: 0 transparent · 1 outline · 2 body · 3 belly · 4 eye · 6 cheek/marking

// Fox: triangular ears with white-tipped tail-collar
const FOX_FRAME = [
  [0,1,1,0,0,0,0,0,0,0,1,1,0],   // pointy ear bases
  [0,1,5,1,0,0,0,0,0,1,5,1,0],   // ear inside lighter (color slot 5 = ear_inside)
  [1,2,2,1,0,0,0,0,0,1,2,2,1],
  [1,2,2,2,1,1,1,1,1,2,2,2,1],
  [1,2,2,4,2,2,2,2,2,4,2,2,1],   // eyes
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,3,1,7,1,3,2,2,2,1],   // muzzle: white snout (3) + dark nose (7)
  [1,2,2,2,3,3,3,3,3,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,2,2,2,2,1,1,0,0],
  [0,0,1,3,3,3,3,3,3,3,1,0,0],   // white chest
  [0,0,1,3,3,3,3,3,3,3,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,1,0,1,2,1,0,0,0],
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]

// Capybara: round body, tiny ears, blunt snout
const CAPY_FRAME = [
  [0,0,0,0,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,2,2,1,2,2,1,0,0,0],   // tiny round ears at top
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [1,2,2,4,2,2,2,2,2,4,2,2,1],   // wide-set eyes
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,7,2,2,2,2,2,1],   // blunt nose
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],   // wider lower jaw than other species
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,3,3,3,3,3,2,2,1,0],
  [0,1,2,3,3,3,3,3,3,3,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,1,0,0,0,1,2,1,0,0],
  [0,0,1,1,0,0,0,0,0,1,1,0,0]
]

// Bird: beak instead of snout, eye highlights, wing markers
const BIRD_FRAME = [
  [0,0,0,0,1,1,1,1,1,0,0,0,0],   // small round head top
  [0,0,0,1,2,2,2,2,2,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,4,2,2,2,4,2,2,1,0],   // big eyes
  [0,1,2,2,2,2,7,2,2,2,2,1,0],
  [1,2,2,2,2,6,6,6,2,2,2,2,1],   // beak (color 6 = beak)
  [1,2,2,2,2,2,6,2,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,5,2,2,2,2,2,5,2,1,0],   // wings (color 5 = wing_mark)
  [0,0,1,2,2,3,3,3,2,2,1,0,0],
  [0,0,1,2,3,3,3,3,3,2,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,2,1,0,1,2,1,0,0,0],   // feet
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]

// ─── Animation transforms ──────────────────────────────────────────────
function makeIdleUp(frame) {
  return frame.map((row, i) => {
    if (i === 4 || i === 5 || i === 6) {
      return row.map(v => (v === 4 || v === 6 || v === 7) ? 2 : v)
    }
    return row
  })
}
function makeIdleLeft(frame) {
  return frame.map((row, i) => {
    if (i === 4) return row.map((v, x) => (v === 4 && x > 6) ? 2 : v)
    return row
  })
}
function makeIdleRight(frame) {
  return frame.map((row, i) => {
    if (i === 4) return row.map((v, x) => (v === 4 && x < 6) ? 2 : v)
    return row
  })
}
function applyLegShift(frame, leftShift) {
  return frame.map((row, i) => {
    if (i === 13) return leftShift ? [0,0,0,1,2,1,0,0,1,2,1,0,0] : [0,0,1,2,1,0,0,1,2,1,0,0,0]
    if (i === 14) return leftShift ? [0,0,0,1,1,0,0,0,0,1,1,0,0] : [0,0,1,1,0,0,0,0,1,1,0,0,0]
    return row
  })
}
function makeWave(frame) {
  return frame.map((row, i) => {
    if (i === 2) {
      const copy = [...row]
      copy[12] = 1; copy[11] = 2
      return copy
    }
    return row
  })
}
function makeSit(frame) {
  return frame.map((row, i) => {
    if (i === 13) return [0,0,0,1,1,1,1,1,1,1,0,0,0]
    if (i === 14) return [0,0,0,0,0,0,0,0,0,0,0,0,0]
    return row
  })
}

// ─── Palettes per species per region ─────────────────────────────────────
// Each species gets 6 region tints. Slots used:
//   1 outline · 2 body · 3 belly · 4 eye · 5 ear_inside/wing_mark · 6 cheek/beak · 7 nose
const FOX_PALETTES = {
  asia:    { outline: '#7a3010', body: '#e07030', belly: '#f8e8d0', ear_inside: '#f0a070', cheek: '#f8c8a0', nose: '#1a1a1a' },
  americas:{ outline: '#5a2010', body: '#c85020', belly: '#f0d8c0', ear_inside: '#e89060', cheek: '#f0b890', nose: '#1a1a1a' },
  europe:  { outline: '#7a4030', body: '#d06848', belly: '#f8e0d0', ear_inside: '#e89868', cheek: '#f0c098', nose: '#1a1a1a' },
  oceania: { outline: '#7a5030', body: '#c08858', belly: '#f0e0c8', ear_inside: '#d8b088', cheek: '#e8c8a8', nose: '#1a1a1a' },
  africa:  { outline: '#7a4020', body: '#c87050', belly: '#f0d8c0', ear_inside: '#e09870', cheek: '#f0c0a0', nose: '#1a1a1a' },
  unknown: { outline: '#5a3a3a', body: '#a08070', belly: '#d8c8b8', ear_inside: '#c0a090', cheek: '#d8b8a0', nose: '#1a1a1a' }
}

const CAPY_PALETTES = {
  asia:    { outline: '#5a3a1a', body: '#a06840', belly: '#c89868', ear_inside: '#a06840', cheek: '#c89868', nose: '#3a1a0a' },
  americas:{ outline: '#7a4a2a', body: '#b8784e', belly: '#d8a878', ear_inside: '#b8784e', cheek: '#d8a878', nose: '#3a1a0a' },
  europe:  { outline: '#5a4030', body: '#9a7050', belly: '#c89878', ear_inside: '#9a7050', cheek: '#c89878', nose: '#3a1a0a' },
  oceania: { outline: '#6a3a2a', body: '#a87858', belly: '#d0a880', ear_inside: '#a87858', cheek: '#d0a880', nose: '#3a1a0a' },
  africa:  { outline: '#7a5020', body: '#c88848', belly: '#e8b878', ear_inside: '#c88848', cheek: '#e8b878', nose: '#3a1a0a' },
  unknown: { outline: '#4a3a2a', body: '#8a7058', belly: '#b0907a', ear_inside: '#8a7058', cheek: '#b0907a', nose: '#3a1a0a' }
}

const BIRD_PALETTES = {
  asia:    { outline: '#1a3a5a', body: '#3070b0', belly: '#a0c0e0', ear_inside: '#1a3a5a', cheek: '#ffa040', nose: '#ff8030' },
  americas:{ outline: '#5a1a1a', body: '#c04040', belly: '#f0a080', ear_inside: '#5a1a1a', cheek: '#ffc060', nose: '#ff8030' },
  europe:  { outline: '#3a3a3a', body: '#707070', belly: '#c8c8c8', ear_inside: '#3a3a3a', cheek: '#ffd040', nose: '#e88020' },
  oceania: { outline: '#1a5a3a', body: '#308050', belly: '#a0d8b0', ear_inside: '#1a5a3a', cheek: '#ffc060', nose: '#e88020' },
  africa:  { outline: '#5a4a1a', body: '#c8a040', belly: '#f0d880', ear_inside: '#5a4a1a', cheek: '#ff6040', nose: '#e84020' },
  unknown: { outline: '#3a3a3a', body: '#808080', belly: '#c0c0c0', ear_inside: '#3a3a3a', cheek: '#a0a0a0', nose: '#606060' }
}

// V16.1 — Four additional species: panda, hamster, penguin, frog.
// Each follows the same 13×15 layout so makeIdle{Up,Left,Right}, applyLegShift,
// makeWave, makeSit handle direction + walk + emote derivation for free.

// Panda: dark ears + eye patches + limbs on a near-white body.
// slot 5 = patch (used for ear interiors, eye masks, and limbs).
const PANDA_FRAME = [
  [0,1,1,0,0,0,0,0,0,0,1,1,0],
  [0,1,5,1,0,0,0,0,0,1,5,1,0],
  [1,5,5,1,0,0,0,0,0,1,5,5,1],
  [1,2,2,2,1,1,1,1,1,2,2,2,1],
  [1,2,5,4,5,2,2,2,5,4,5,2,1],   // eye-patches around the eyes
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,2,2,2,7,2,2,2,2,2,1],   // small nose
  [1,2,2,2,3,3,3,3,3,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,5,2,2,2,2,2,5,1,0,0],   // dark fore-paws
  [0,0,1,5,3,3,3,3,3,5,1,0,0],
  [0,0,1,5,3,3,3,3,3,5,1,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,1,5,1,0,1,5,1,0,0,0],   // dark hind paws
  [0,0,0,1,1,0,0,0,1,1,0,0,0]
]
const PANDA_PALETTES = {
  asia:    { outline: '#1a1a1a', body: '#f0f0f0', belly: '#f8f8f8', patch: '#2a2a2a', cheek: '#fbd1d1', nose: '#1a1a1a' },
  americas:{ outline: '#1a1a1a', body: '#ebebe5', belly: '#f5f5ef', patch: '#222222', cheek: '#fbc8c8', nose: '#1a1a1a' },
  europe:  { outline: '#1a1a1a', body: '#eeeae3', belly: '#f6f2eb', patch: '#262626', cheek: '#f8c0c0', nose: '#1a1a1a' },
  oceania: { outline: '#1a1a1a', body: '#f4f0e8', belly: '#fbf7ef', patch: '#262626', cheek: '#fbc8c0', nose: '#1a1a1a' },
  africa:  { outline: '#1a1a1a', body: '#eee5d8', belly: '#f8efdf', patch: '#2a2018', cheek: '#fbb8a0', nose: '#1a1a1a' },
  unknown: { outline: '#2a2a2a', body: '#d0d0d0', belly: '#dcdcdc', patch: '#404040', cheek: '#c8b0b0', nose: '#1a1a1a' }
}

// Hamster: small, plump, big pink cheek pouches (slot 6).
const HAMSTER_FRAME = [
  [0,0,1,1,0,0,0,0,0,1,1,0,0],
  [0,1,2,2,1,0,0,0,1,2,2,1,0],   // tiny ears
  [1,2,2,2,2,1,1,1,2,2,2,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,4,2,2,2,2,2,4,2,2,1],   // eyes
  [1,6,2,2,2,2,2,2,2,2,2,6,1],   // pouched cheeks
  [1,6,2,2,2,2,7,2,2,2,2,6,1],   // nose
  [1,2,2,2,2,1,1,1,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,3,3,3,3,3,3,3,2,1,0],
  [0,1,2,3,3,3,3,3,3,3,2,1,0],
  [0,1,2,3,3,3,3,3,3,3,2,1,0],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,1,0,0,0,1,2,1,0,0],
  [0,0,1,1,0,0,0,0,0,1,1,0,0]
]
const HAMSTER_PALETTES = {
  asia:    { outline: '#6a4818', body: '#e0b070', belly: '#f8dcb0', ear_inside: '#f0c890', cheek: '#ffb8b8', nose: '#1a1a1a' },
  americas:{ outline: '#7a4828', body: '#d09058', belly: '#f0c890', ear_inside: '#e0a878', cheek: '#ff9898', nose: '#1a1a1a' },
  europe:  { outline: '#5a3818', body: '#b08858', belly: '#e0c098', ear_inside: '#c0a078', cheek: '#f8a8b8', nose: '#1a1a1a' },
  oceania: { outline: '#6a5028', body: '#c89868', belly: '#e8c890', ear_inside: '#d8b088', cheek: '#ff9080', nose: '#1a1a1a' },
  africa:  { outline: '#5a3010', body: '#a87040', belly: '#d8a878', ear_inside: '#b88858', cheek: '#ff7060', nose: '#1a1a1a' },
  unknown: { outline: '#4a3020', body: '#907060', belly: '#b09080', ear_inside: '#a08070', cheek: '#c08080', nose: '#1a1a1a' }
}

// Penguin: tuxedo silhouette — black body + head, white belly oval,
// orange-yellow beak + feet (both via slot 6).
const PENGUIN_FRAME = [
  [0,0,0,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,4,2,2,2,4,2,2,1,0],   // eyes
  [0,1,2,2,2,2,6,2,2,2,2,1,0],   // beak top
  [0,1,2,2,2,2,6,2,2,2,2,1,0],   // beak bottom
  [1,2,2,2,3,3,3,3,3,2,2,2,1],
  [1,2,2,3,3,3,3,3,3,3,2,2,1],
  [1,2,3,3,3,3,3,3,3,3,3,2,1],   // wide white belly
  [1,2,3,3,3,3,3,3,3,3,3,2,1],
  [1,2,3,3,3,3,3,3,3,3,3,2,1],
  [1,2,2,3,3,3,3,3,3,3,2,2,1],
  [0,1,2,2,3,3,3,3,3,2,2,1,0],
  [0,0,1,6,6,0,0,0,6,6,1,0,0],   // orange feet
  [0,0,1,1,0,0,0,0,0,1,1,0,0]
]
const PENGUIN_PALETTES = {
  asia:    { outline: '#0a0a0a', body: '#1a2438', belly: '#f8f8f0', ear_inside: '#1a2438', cheek: '#ff9020', nose: '#ff9020' },
  americas:{ outline: '#0a0a0a', body: '#202020', belly: '#f8f8f0', ear_inside: '#202020', cheek: '#ffa040', nose: '#ffa040' },
  europe:  { outline: '#0a0a0a', body: '#2a2a32', belly: '#f0f0e8', ear_inside: '#2a2a32', cheek: '#ffb840', nose: '#ffb840' },
  oceania: { outline: '#0a0a0a', body: '#181a28', belly: '#f8f8f0', ear_inside: '#181a28', cheek: '#ff8830', nose: '#ff8830' },
  africa:  { outline: '#1a0a0a', body: '#2a2018', belly: '#f8e8c8', ear_inside: '#2a2018', cheek: '#ff7820', nose: '#ff7820' },
  unknown: { outline: '#2a2a2a', body: '#454545', belly: '#d8d8d0', ear_inside: '#454545', cheek: '#c08040', nose: '#c08040' }
}

// Frog: smooth round body, bulging side-eyes, wide mouth, pale belly.
const FROG_FRAME = [
  [0,0,0,0,1,1,1,1,1,0,0,0,0],
  [0,1,1,1,2,2,2,2,2,1,1,1,0],   // eye-stalks bulging out the sides
  [1,5,2,1,4,2,2,2,4,1,2,5,1],   // big black eyes (slot 4) framed by outline
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,1,2,1,2,2,2,2,2,1,2,1,0],   // upturned mouth corners
  [0,1,2,2,1,1,1,1,1,2,2,1,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,2,3,3,3,3,3,3,3,2,2,1],
  [1,2,3,3,3,3,3,3,3,3,3,2,1],
  [1,2,3,3,3,3,3,3,3,3,3,2,1],
  [1,2,3,3,3,3,3,3,3,3,3,2,1],
  [1,2,2,3,3,3,3,3,3,3,2,2,1],
  [0,1,2,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,2,1,0,0,0,1,2,1,0,0]
]
const FROG_PALETTES = {
  asia:    { outline: '#1a3818', body: '#5aa838', belly: '#e0e8a0', spot: '#3a7820', cheek: '#5aa838', nose: '#1a1a1a' },
  americas:{ outline: '#1a4020', body: '#48a058', belly: '#d0e090', spot: '#2a7028', cheek: '#48a058', nose: '#1a1a1a' },
  europe:  { outline: '#2a3818', body: '#78a050', belly: '#e8e8b0', spot: '#487830', cheek: '#78a050', nose: '#1a1a1a' },
  oceania: { outline: '#1a4830', body: '#40a878', belly: '#c8e8c0', spot: '#287858', cheek: '#40a878', nose: '#1a1a1a' },
  africa:  { outline: '#2a3818', body: '#88a040', belly: '#e8e088', spot: '#587820', cheek: '#88a040', nose: '#1a1a1a' },
  unknown: { outline: '#2a3838', body: '#608070', belly: '#a8b8a0', spot: '#406050', cheek: '#608070', nose: '#1a1a1a' }
}

const SPECIES_DEFS = [
  { id: 'fox',      frame: FOX_FRAME,     palettes: FOX_PALETTES,     paletteNames: { 5: 'ear_inside', 6: 'cheek', 7: 'nose' } },
  { id: 'capybara', frame: CAPY_FRAME,    palettes: CAPY_PALETTES,    paletteNames: { 5: 'ear_inside', 6: 'cheek', 7: 'nose' } },
  { id: 'bird',     frame: BIRD_FRAME,    palettes: BIRD_PALETTES,    paletteNames: { 5: 'wing_mark', 6: 'beak', 7: 'beak' } },
  // V16.1 additions
  { id: 'panda',    frame: PANDA_FRAME,   palettes: PANDA_PALETTES,   paletteNames: { 5: 'patch',      6: 'cheek', 7: 'nose' } },
  { id: 'hamster',  frame: HAMSTER_FRAME, palettes: HAMSTER_PALETTES, paletteNames: { 5: 'ear_inside', 6: 'cheek', 7: 'nose' } },
  { id: 'penguin',  frame: PENGUIN_FRAME, palettes: PENGUIN_PALETTES, paletteNames: { 5: 'ear_inside', 6: 'cheek', 7: 'nose' } },
  { id: 'frog',     frame: FROG_FRAME,    palettes: FROG_PALETTES,    paletteNames: { 5: 'spot',       6: 'cheek', 7: 'nose' } }
]

// ─── Frame layout ─────────────────────────────────────────────────────
function buildFrameSet(template) {
  const IDLE_DOWN = template
  const IDLE_UP = makeIdleUp(template)
  const IDLE_LEFT = makeIdleLeft(template)
  const IDLE_RIGHT = makeIdleRight(template)
  return [
    ['idle_down',    IDLE_DOWN],          ['idle_up',      IDLE_UP],
    ['idle_left',    IDLE_LEFT],          ['idle_right',   IDLE_RIGHT],
    ['walk_down_0',  applyLegShift(IDLE_DOWN,  true)], ['walk_down_1',  applyLegShift(IDLE_DOWN,  false)],
    ['walk_up_0',    applyLegShift(IDLE_UP,    true)], ['walk_up_1',    applyLegShift(IDLE_UP,    false)],
    ['walk_left_0',  applyLegShift(IDLE_LEFT,  true)], ['walk_left_1',  applyLegShift(IDLE_LEFT,  false)],
    ['walk_right_0', applyLegShift(IDLE_RIGHT, true)], ['walk_right_1', applyLegShift(IDLE_RIGHT, false)],
    ['wave',         makeWave(template)],
    ['sit',          makeSit(template)]
  ]
}

const FRAME_W = 32, FRAME_H = 48, PIXEL = 2

function renderFrame(ctx, pixels, palette, paletteNames, dx, dy) {
  const offX = dx + Math.floor((FRAME_W - 13 * PIXEL) / 2)
  const offY = dy + (FRAME_H - 15 * PIXEL)
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 13; x++) {
      const v = pixels[y][x]
      if (v === 0) continue
      let color
      switch (v) {
        case 1: color = palette.outline; break
        case 2: color = palette.body; break
        case 3: color = palette.belly; break
        case 4: color = '#1a1a1a'; break
        case 5: color = palette[paletteNames[5]] ?? palette.body; break
        case 6: color = palette[paletteNames[6]] ?? palette.cheek; break
        case 7: color = palette[paletteNames[7]] ?? palette.nose; break
        default: color = '#ff00ff'
      }
      ctx.fillStyle = color
      ctx.fillRect(offX + x * PIXEL, offY + y * PIXEL, PIXEL, PIXEL)
    }
  }
}

function buildAtlasJson(frames) {
  const ATLAS_W = FRAME_W * frames.length, ATLAS_H = FRAME_H
  const f = {}
  frames.forEach(([name], i) => {
    f[name] = {
      frame: { x: i * FRAME_W, y: 0, w: FRAME_W, h: FRAME_H },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H }
    }
  })
  return { frames: f, meta: { app: 'lounge-v2-bake', version: '1', image: 'sprite.png', format: 'RGBA8888', size: { w: ATLAS_W, h: ATLAS_H }, scale: '1' } }
}

for (const def of SPECIES_DEFS) {
  const frames = buildFrameSet(def.frame)
  const ATLAS_W = FRAME_W * frames.length, ATLAS_H = FRAME_H
  for (const [region, palette] of Object.entries(def.palettes)) {
    const canvas = createCanvas(ATLAS_W, ATLAS_H)
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    frames.forEach(([_, pixels], i) => renderFrame(ctx, pixels, palette, def.paletteNames, i * FRAME_W, 0))
    const dir = join(ROOT, 'public', 'lounge', 'assets', 'sprites', def.id, region)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'sprite.png'), canvas.toBuffer('image/png'))
    writeFileSync(join(dir, 'sprite.json'), JSON.stringify(buildAtlasJson(frames), null, 2))
    console.log(`OK ${def.id}/${region}`)
  }
}
console.log(`OK ${SPECIES_DEFS.length} species × 6 regions = ${SPECIES_DEFS.length * 6} atlases`)
