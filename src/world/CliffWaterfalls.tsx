// v24 — fix degenerate pond UVs + flow direction + noise amplitude.
// v22/v23 pond had all uv=(0.5,0) → shader saw no UV variation → static blob.
// v24: radial UVs (uv.x = 0 center, 1 rim) for pond/basin; stream gets a
// center-spine vertex per segment so unified semantic (uv.x = rim/bank dist).
// Shader foam now uses vUv.x directly (foam where uv.x→1). Flow direction
// reversed so water visually flows downstream. Rim noise softened.

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Layout constants ──────────────────────────────────────────────
const POND_CENTER: [number, number]  = [9, -8]
const POND_RADIUS                    = 2.6   // v24: larger pond — was 2.0, looked cramped
const CLIFF_EDGE: [number, number]   = [15, -12.5]   // SE rim, gap between perimeter trees
const BASIN_RADIUS                   = 1.0
const STREAM_HALFWIDTH               = 0.5
const WATER_Y                        = 0.82
const WATERFALL_TOP_Y                = WATER_Y - 0.04
const FALL_HEIGHT                    = 7
const FALL_WIDTH                     = 1.0

// Axis pond→cliff
const _dx = CLIFF_EDGE[0] - POND_CENTER[0]
const _dz = CLIFF_EDGE[1] - POND_CENTER[1]
const _len = Math.hypot(_dx, _dz)
const AXIS_X = _dx / _len
const AXIS_Z = _dz / _len
const PERP_X = -AXIS_Z
const PERP_Z = AXIS_X
const AXIS_ANGLE_Y = Math.atan2(AXIS_X, AXIS_Z)

// Basin center INWARD from cliff so basin's cliff-side rim == CLIFF_EDGE
const BASIN_CENTER: [number, number] = [
  CLIFF_EDGE[0] - AXIS_X * BASIN_RADIUS,
  CLIFF_EDGE[1] - AXIS_Z * BASIN_RADIUS,
]

// ─── Procedural noise textures for BotW shader ─────────────────────
function makeCloudNoise(seed: number, w = 128, h = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  let rng = seed
  const rnd = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff }
  const ph = [rnd()*6.28, rnd()*6.28, rnd()*6.28, rnd()*6.28]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x/w, v = y/h
      let n = 0
      n += Math.sin(u*6.28*2.1 + ph[0]) * Math.cos(v*6.28*0.8 + ph[1]) * 0.5
      n += Math.sin(u*6.28*4.3 + ph[2]) * Math.cos(v*6.28*1.7 + ph[3]) * 0.28
      n += Math.sin(u*6.28*8.7 - ph[1]) * Math.cos(v*6.28*3.1 - ph[0]) * 0.16
      const g = Math.max(0, Math.min(255, Math.round((n*0.5+0.5)*255)))
      const i = (y*w + x) * 4
      img.data[i] = g; img.data[i+1] = g; img.data[i+2] = g; img.data[i+3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter
  return t
}

function makeDisplGuide(seed: number, w = 128, h = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  let rng = seed
  const rnd = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff }
  const px = rnd()*6.28, py = rnd()*6.28
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x/w, v = y/h
      const r = Math.sin(u*6.28*1.3 + px) * Math.cos(v*6.28*0.6 + py) * 0.5
              + Math.sin(u*6.28*3.1 - py) * Math.cos(v*6.28*1.5 + px) * 0.2
      const g = Math.cos(u*6.28*1.7 + px) * Math.sin(v*6.28*0.9 - py) * 0.5
      const rb = Math.max(0, Math.min(255, Math.round((r*0.5+0.5)*255)))
      const gb = Math.max(0, Math.min(255, Math.round((g*0.5+0.5)*255)))
      const i = (y*w + x) * 4
      img.data[i] = rb; img.data[i+1] = gb; img.data[i+2] = 128; img.data[i+3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter
  return t
}

const SURFACE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SURFACE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uNoise;
  uniform sampler2D uDispl;
  uniform float uTime;
  uniform vec2  uFlowDir;
  uniform float uScrollSpeed;
  uniform float uDisplAmount;
  uniform float uBands;
  uniform vec3  uColorTopLight;
  uniform vec3  uColorTopDark;
  uniform vec3  uColorBottomLight;
  uniform vec3  uColorBottomDark;
  uniform vec3  uFoamColor;
  uniform float uFoamWidth;
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    vec2 nUv = vUv * vec2(2.0, 3.0) + uFlowDir * uTime * uScrollSpeed;
    vec2 dUv = vUv * vec2(1.4, 1.6) + uFlowDir * uTime * uScrollSpeed * 0.7;
    vec2 displ = (texture2D(uDispl, dUv).rg * 2.0 - 1.0) * uDisplAmount;
    float n = texture2D(uNoise, nUv + displ).r;
    n = floor(n * uBands + 0.5) / uBands;
    vec3 darkCol  = mix(uColorBottomDark,  uColorTopDark,  vUv.y);
    vec3 lightCol = mix(uColorBottomLight, uColorTopLight, vUv.y);
    vec3 col = mix(darkCol, lightCol, n);
    // Unified foam: vUv.x = distance from water-body interior (0 = center/spine,
    // 1 = rim/bank). Works for pond/basin (radial) and stream (perpendicular).
    float foamMask = smoothstep(1.0 - uFoamWidth - 0.06, 1.0 - uFoamWidth + 0.06, vUv.x + displ.y * 4.0);
    col = mix(col, uFoamColor, foamMask);
    gl_FragColor = vec4(col, uAlpha);
  }
`

// v22 ORGANIC SHAPES — 3-octave noise on pond/basin rims (weighted to 0
// near chord endpoints to preserve stream stitch), meandering spline
// stream with 8 control points and variable width.

// Multi-octave rim displacement. Returns radius offset for given angle.
// Smooth periodic noise via stacked sin/cos at different frequencies.
function rimNoise(angleRel: number, seed: number = 0): number {
  // angleRel in [0, 1] where 0 = chord start, 0.5 = back of arc, 1 = chord end
  // Lower frequencies than v22/v23 → gentler "lake shoreline" lobes (not amoeba)
  const a = angleRel * Math.PI * 2 + seed
  return (
      Math.sin(a * 2.0) * 0.30
    + Math.cos(a * 5.0 + 1.3) * 0.16
    + Math.sin(a * 9.0 + 2.7) * 0.07
  )
}

// Stream centerline: meandering spline via 8 control points.
// Returns world XZ position + signed perpendicular offset at parameter t.
function streamCenterline(t: number, start: [number, number], end: [number, number]): { x: number; z: number; perpOffset: number } {
  const dx = end[0] - start[0]
  const dz = end[1] - start[1]
  const len = Math.hypot(dx, dz)
  const ax = dx / len, az = dz / len
  const px = -az, pz = ax
  const meanderMain = Math.sin(t * Math.PI * 2.2) * 1.4
  const meanderFine = Math.sin(t * Math.PI * 5.0 + 0.7) * 0.35
  const attenuation = Math.sin(t * Math.PI)
  const perpOffset = (meanderMain + meanderFine) * attenuation
  const axisDist = len * t
  return {
    x: start[0] + ax * axisDist + px * perpOffset,
    z: start[1] + az * axisDist + pz * perpOffset,
    perpOffset,
  }
}

// Base stream width (matches chord at endpoints, wider middle pool).
function streamHalfWidth(t: number): number {
  return STREAM_HALFWIDTH + 0.30 * Math.sin(t * Math.PI)
}

// Bank noise — same multi-octave rimNoise applied independently per bank
// so the design language matches pond/basin. Attenuated to 0 at endpoints
// so chord stitch stays seamless.
function bankNoise(t: number, seed: number): number {
  const attenuation = Math.sin(t * Math.PI)   // 0 at 0/1, 1 at 0.5
  return rimNoise(t * 2.0, seed) * 0.32 * attenuation   // ±~0.24u max
}

// ─── Watershed mesh: pond + stream + basin in ONE BufferGeometry ───
function buildWatershed() {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const POND_RIM_SEGS = 56     // more segments for smoother organic curve
  const STREAM_SEGS = 36
  const BASIN_RIM_SEGS = 40

  // Pond uses an ELLIPSE base (perpendicular to flow axis longer than along axis)
  // — this is the natural shape of a "lake at the head of a stream"
  const POND_RADIUS_ALONG = POND_RADIUS * 0.85   // along the axis (toward stream): shorter
  const POND_RADIUS_PERP  = POND_RADIUS * 1.20   // perpendicular: longer (rounder back)
  // Stream chord width on pond — use ellipse equation to find where the chord
  // touches the rim. At perpDist = STREAM_HALFWIDTH, axisDist = ?
  //   (axisDist / POND_RADIUS_ALONG)² + (STREAM_HALFWIDTH / POND_RADIUS_PERP)² = 1
  //   axisDist = POND_RADIUS_ALONG * sqrt(1 - (STREAM_HALFWIDTH/POND_RADIUS_PERP)²)
  const pondExitAxisDist = POND_RADIUS_ALONG * Math.sqrt(1 - Math.pow(STREAM_HALFWIDTH / POND_RADIUS_PERP, 2))
  // Param angle for chord endpoint on ellipse:
  //   x = a*cos(θ), z = b*sin(θ) where local coords (a = along, b = perp)
  //   z = STREAM_HALFWIDTH → sin(θ) = STREAM_HALFWIDTH / b
  const pondChordParam = Math.asin(STREAM_HALFWIDTH / POND_RADIUS_PERP)

  const pondAxisAngle = Math.atan2(AXIS_Z, AXIS_X)

  // V0: pond center — uv.x = 0 (interior), uv.y = 0.5 (mid color band)
  positions.push(POND_CENTER[0], WATER_Y, POND_CENTER[1])
  uvs.push(0.0, 0.5)
  const POND_CTR = 0

  // Pond rim: parametric angle from +pondChordParam around the back to (2π - pondChordParam)
  // i.e., skip the chord region between (2π - pondChordParam) and (2π + pondChordParam == pondChordParam)
  const POND_RIM_FIRST = positions.length / 3
  const pondSweep = 2 * Math.PI - 2 * pondChordParam
  for (let i = 0; i <= POND_RIM_SEGS; i++) {
    const t = i / POND_RIM_SEGS
    // Parametric angle on ellipse, starting at +chord side, going around the back
    const theta = pondChordParam + t * pondSweep
    // Position on ELLIPSE in local axis coords:
    //   along-axis (a) = POND_RADIUS_ALONG * cos(θ)
    //   perp-axis (b)  = POND_RADIUS_PERP  * sin(θ)
    // Add organic noise displacement, weighted to 0 near chord endpoints
    const distFromChord = Math.min(t, 1 - t)   // 0 at endpoints, 0.5 at middle
    const noiseWeight = Math.min(1, distFromChord * 6)   // smooth ramp 0→1 over first 1/6 of arc
    const noise = rimNoise(t, 1.3) * noiseWeight
    const a_local = (POND_RADIUS_ALONG + noise) * Math.cos(theta)
    const b_local = (POND_RADIUS_PERP  + noise) * Math.sin(theta)
    // Convert local (along, perp) → world XZ
    const wx = POND_CENTER[0] + AXIS_X * a_local + PERP_X * b_local
    const wz = POND_CENTER[1] + AXIS_Z * a_local + PERP_Z * b_local
    positions.push(wx, WATER_Y, wz)
    // uv.x = 1 (rim → foam), uv.y = position around rim for animated noise variation
    uvs.push(1.0, t)
  }
  const POND_RIM_LAST = positions.length / 3 - 1

  // Pond fan
  for (let i = 0; i < POND_RIM_SEGS; i++) {
    indices.push(POND_CTR, POND_RIM_FIRST + i, POND_RIM_FIRST + i + 1)
  }

  // Stream — meandering centerline via streamCenterline(), variable width
  // Endpoints: pond exit chord midpoint → basin entry chord midpoint
  const pondExitMid: [number, number] = [
    POND_CENTER[0] + AXIS_X * pondExitAxisDist,
    POND_CENTER[1] + AXIS_Z * pondExitAxisDist,
  ]
  // Basin: same ellipse treatment
  const BASIN_RADIUS_ALONG = BASIN_RADIUS * 0.90
  const BASIN_RADIUS_PERP  = BASIN_RADIUS * 1.15
  const basinEntryAxisDist = BASIN_RADIUS_ALONG * Math.sqrt(1 - Math.pow(STREAM_HALFWIDTH / BASIN_RADIUS_PERP, 2))
  const basinChordParam = Math.asin(STREAM_HALFWIDTH / BASIN_RADIUS_PERP)
  const basinEntryMid: [number, number] = [
    BASIN_CENTER[0] - AXIS_X * basinEntryAxisDist,
    BASIN_CENTER[1] - AXIS_Z * basinEntryAxisDist,
  ]

  // Stream: 3 vertices per segment (L, C, R) so uv.x semantic is unified
  // with pond/basin (uv.x=0 interior, uv.x=1 rim/bank). Center spine gets
  // uv.x=0 and foam shader only triggers at banks.
  const STREAM_NEW_START = positions.length / 3
  for (let i = 1; i <= STREAM_SEGS; i++) {
    const t = i / STREAM_SEGS
    const c = streamCenterline(t, pondExitMid, basinEntryMid)
    const hwBase = streamHalfWidth(t)
    const dt = 0.01
    const cp = streamCenterline(Math.min(1, t + dt), pondExitMid, basinEntryMid)
    const cm = streamCenterline(Math.max(0, t - dt), pondExitMid, basinEntryMid)
    const tanX = cp.x - cm.x
    const tanZ = cp.z - cm.z
    const tanLen = Math.hypot(tanX, tanZ) || 1
    const localPerpX = -tanZ / tanLen
    const localPerpZ = tanX / tanLen
    const noiseLeft  = bankNoise(t, 4.7)
    const noiseRight = bankNoise(t, 9.1)
    const erosion = c.perpOffset * 0.12
    const hwLeft  = Math.max(0.1, hwBase + noiseLeft  - erosion)
    const hwRight = Math.max(0.1, hwBase + noiseRight + erosion)
    const uvY = 0.1 + t * 0.6
    // Left bank
    positions.push(c.x + localPerpX * hwLeft,  WATER_Y, c.z + localPerpZ * hwLeft)
    uvs.push(1, uvY)
    // Center spine
    positions.push(c.x,                        WATER_Y, c.z)
    uvs.push(0, uvY)
    // Right bank
    positions.push(c.x - localPerpX * hwRight, WATER_Y, c.z - localPerpZ * hwRight)
    uvs.push(1, uvY)
  }

  // Stitch pond → first stream triple (L, C, R)
  // Pond chord: POND_RIM_FIRST = +perp side (left), POND_RIM_LAST = -perp side (right).
  // Add a pond chord midpoint vertex (uv.x=0) for spine continuity — that's POND_CTR
  // itself (it's at pond center but with uv.x=0). Acceptable approximation since
  // pond center is "interior water" and stream spine extends from chord midpoint.
  // Actually use POND_CTR as the L→C bridge since it has uv.x=0.
  const s0L = STREAM_NEW_START + 0
  const s0C = STREAM_NEW_START + 1
  const s0R = STREAM_NEW_START + 2
  indices.push(
    POND_RIM_FIRST, s0C, POND_CTR,        // pond rim left → stream center → pond center
    POND_RIM_FIRST, s0L, s0C,             // pond rim left → stream left → stream center
    POND_RIM_LAST,  POND_CTR, s0C,        // pond rim right → pond center → stream center
    POND_RIM_LAST,  s0C, s0R,             // pond rim right → stream center → stream right
  )
  for (let i = 0; i < STREAM_SEGS - 1; i++) {
    const l0 = STREAM_NEW_START + i * 3
    const c0 = l0 + 1
    const r0 = l0 + 2
    const l1 = l0 + 3
    const c1 = l0 + 4
    const r1 = l0 + 5
    // Left quad: L0 L1 C0 / C0 L1 C1
    indices.push(l0, l1, c0, c0, l1, c1)
    // Right quad: C0 C1 R0 / R0 C1 R1
    indices.push(c0, c1, r0, r0, c1, r1)
  }

  const BASIN_ENTRY_LEFT   = STREAM_NEW_START + (STREAM_SEGS - 1) * 3
  const BASIN_ENTRY_CENTER = BASIN_ENTRY_LEFT + 1
  const BASIN_ENTRY_RIGHT  = BASIN_ENTRY_LEFT + 2

  // Basin rim — organic ellipse, parametric like pond
  // Pond-side chord at angle (π + chord) and (π - chord) (looking from basin
  // center, pond is at "back" = +π direction in local axis frame)
  // We need basin rim to go from (π - basinChordParam) CCW around to
  // (π + basinChordParam), i.e. the cliff side
  const basinSweep = 2 * Math.PI - 2 * basinChordParam

  const BASIN_RIM_NEW_START = positions.length / 3
  for (let i = 1; i < BASIN_RIM_SEGS; i++) {
    const t = i / BASIN_RIM_SEGS
    // Start at angle (π - basinChordParam), going DOWN (decreasing) through 0 (cliff side) to (-π + basinChordParam) = (π + basinChordParam - 2π)
    const theta = (Math.PI - basinChordParam) - t * basinSweep
    const distFromChord = Math.min(t, 1 - t)
    const noiseWeight = Math.min(1, distFromChord * 6)
    const noise = rimNoise(t, 2.9) * noiseWeight
    const a_local = (BASIN_RADIUS_ALONG + noise) * Math.cos(theta)
    const b_local = (BASIN_RADIUS_PERP  + noise) * Math.sin(theta)
    const wx = BASIN_CENTER[0] + AXIS_X * a_local + PERP_X * b_local
    const wz = BASIN_CENTER[1] + AXIS_Z * a_local + PERP_Z * b_local
    positions.push(wx, WATER_Y, wz)
    uvs.push(1.0, t)
  }

  const BASIN_CTR = positions.length / 3
  positions.push(BASIN_CENTER[0], WATER_Y, BASIN_CENTER[1])
  uvs.push(0.0, 0.5)

  // Stitch stream→basin: similar to pond. Stream end has L, C, R triple.
  // Basin: BASIN_CTR (uv.x=0) + rim ring. Stitch via BASIN_ENTRY_CENTER spine.
  // Add a "chord seam" fan: stream-L + basin-rim-first + center, etc.
  // The first basin rim vertex (BASIN_RIM_NEW_START) is at angle (π - chordParam)
  // → +perp side → corresponds to stream LEFT bank side.
  // The last rim vertex (BASIN_RIM_NEW_START + BASIN_RIM_SEGS - 2) is at angle
  // (π + chordParam - small step) → -perp side → corresponds to stream RIGHT.
  // Stitch:
  indices.push(
    BASIN_ENTRY_LEFT,    BASIN_RIM_NEW_START,                       BASIN_ENTRY_CENTER,
    BASIN_ENTRY_CENTER,  BASIN_RIM_NEW_START,                       BASIN_CTR,
    BASIN_ENTRY_CENTER,  BASIN_CTR,                                  BASIN_RIM_NEW_START + BASIN_RIM_SEGS - 2,
    BASIN_ENTRY_CENTER,  BASIN_RIM_NEW_START + BASIN_RIM_SEGS - 2,   BASIN_ENTRY_RIGHT,
  )
  // Basin rim fan (center → rim segments), skipping the stitched chord region.
  for (let i = 0; i < BASIN_RIM_SEGS - 2; i++) {
    indices.push(BASIN_CTR, BASIN_RIM_NEW_START + i, BASIN_RIM_NEW_START + i + 1)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  geo.computeVertexNormals()

  return {
    geometry: geo,
    cliffEdgeWorld: [CLIFF_EDGE[0], WATER_Y, CLIFF_EDGE[1]] as [number, number, number],
  }
}

const _watershed = buildWatershed()

// Build-time invariants
{
  const EPS = 0.001
  const pos = _watershed.geometry.attributes.position.array as Float32Array
  const errs: string[] = []
  // All vertices at WATER_Y
  for (let i = 0; i < pos.length / 3; i++) {
    if (Math.abs(pos[i*3+1] - WATER_Y) > EPS) {
      errs.push(`INV1 vertex ${i} Y=${pos[i*3+1]} != WATER_Y`)
      break
    }
  }
  // Cliff edge world matches CLIFF_EDGE
  const cew = _watershed.cliffEdgeWorld
  if (Math.abs(cew[0] - CLIFF_EDGE[0]) > EPS || Math.abs(cew[2] - CLIFF_EDGE[1]) > EPS) {
    errs.push(`INV2 cliffEdgeWorld != CLIFF_EDGE`)
  }
  if (errs.length === 0) console.log('[watershed v24] all invariants OK')
  else console.error('[watershed v24] INVARIANT FAILURES:', errs)
}

// ─── Waterfall shader ──────────────────────────────────────────────
const FALL_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uNoise;
  uniform sampler2D uDispl;
  uniform float uTime;
  uniform float uAlpha;
  uniform vec3 uColorTop;
  uniform vec3 uColorBot;
  uniform vec3 uFoamColor;
  varying vec2 vUv;
  void main() {
    vec2 nUv = vUv * vec2(1.2, 4.0);
    vec2 dUv = vUv * vec2(1.6, 2.0);
    nUv.y += uTime * 0.62;
    dUv.y += uTime * 0.43;
    vec2 displ = (texture2D(uDispl, dUv).rg * 2.0 - 1.0) * 0.06;
    float n = texture2D(uNoise, nUv + displ).r;
    n = floor(n * 5.0 + 0.5) / 5.0;
    vec3 col = mix(uColorBot, uColorTop, n);
    float topFoam = smoothstep(0.85, 0.95, vUv.y + displ.y * 2.0);
    col = mix(col, uFoamColor, topFoam * 0.7);
    float side = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
    float bottomDissolve = smoothstep(0.0, 0.30, vUv.y);
    gl_FragColor = vec4(col, uAlpha * side * bottomDissolve);
  }
`

function makeFallGeo(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const wTop = FALL_WIDTH / 2
  const wMid = (FALL_WIDTH * 0.85) / 2
  const wBot = (FALL_WIDTH * 0.72) / 2
  const h0 = 0, h1 = -FALL_HEIGHT * 0.5, h2 = -FALL_HEIGHT
  const z0 = 0.0, z1 = 0.4, z2 = 1.4
  const positions = new Float32Array([
    -wTop, h0, z0,   wTop, h0, z0,
    -wMid, h1, z1,   wMid, h1, z1,
    -wBot, h2, z2,   wBot, h2, z2,
  ])
  const uvs = new Float32Array([
    0, 1,   1, 1,
    0, 0.5, 1, 0.5,
    0, 0,   1, 0,
  ])
  const indices = new Uint16Array([0,2,1, 1,2,3, 2,4,3, 3,4,5])
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.setIndex(new THREE.BufferAttribute(indices, 1))
  g.computeVertexNormals()
  return g
}

// ─── React components ──────────────────────────────────────────────

function WatershedWater() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const noiseTex = useMemo(() => makeCloudNoise(1234), [])
  const displTex = useMemo(() => makeDisplGuide(5678), [])
  useEffect(() => () => { noiseTex.dispose(); displTex.dispose() }, [noiseTex, displTex])

  const uniforms = useMemo(() => ({
    uNoise:            { value: noiseTex },
    uDispl:            { value: displTex },
    uTime:             { value: 0 },
    uFlowDir:          { value: new THREE.Vector2(0, -1) },
    uScrollSpeed:      { value: 0.5 },
    uDisplAmount:      { value: 0.045 },
    uBands:            { value: 5.0 },
    uColorTopLight:    { value: new THREE.Color('#D8ECF4') },
    uColorTopDark:     { value: new THREE.Color('#5A8FB0') },
    uColorBottomLight: { value: new THREE.Color('#A8D0DE') },
    uColorBottomDark:  { value: new THREE.Color('#2A5878') },
    uFoamColor:        { value: new THREE.Color('#FFFFFF') },
    uFoamWidth:        { value: 0.16 },
    uAlpha:            { value: 0.88 },
  }), [noiseTex, displTex])

  useFrame((s) => {
    const m = matRef.current
    if (m) m.uniforms.uTime.value = s.clock.elapsedTime
  })

  return (
    <mesh geometry={_watershed.geometry} receiveShadow>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={SURFACE_VERT}
        fragmentShader={SURFACE_FRAG}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function FallingWaterfall() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const geo = useMemo(() => makeFallGeo(), [])
  const noiseTex = useMemo(() => makeCloudNoise(7777), [])
  const displTex = useMemo(() => makeDisplGuide(8888), [])
  useEffect(() => () => { geo.dispose(); noiseTex.dispose(); displTex.dispose() }, [geo, noiseTex, displTex])

  const uniforms = useMemo(() => ({
    uNoise:     { value: noiseTex },
    uDispl:     { value: displTex },
    uTime:      { value: 0 },
    uAlpha:     { value: 0.85 },
    uColorTop:  { value: new THREE.Color('#E8F4FB') },
    uColorBot:  { value: new THREE.Color('#5A8FB0') },
    uFoamColor: { value: new THREE.Color('#FFFFFF') },
  }), [noiseTex, displTex])

  useFrame((s) => {
    const m = matRef.current
    if (m) m.uniforms.uTime.value = s.clock.elapsedTime
  })

  return (
    <group
      position={[_watershed.cliffEdgeWorld[0], WATERFALL_TOP_Y, _watershed.cliffEdgeWorld[2]]}
      rotation={[0, AXIS_ANGLE_Y, 0]}
    >
      <mesh geometry={geo}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={SURFACE_VERT}
          fragmentShader={FALL_FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function Ornaments() {
  // Larger lily pads + pink water lilies — Zelda style.
  // Positions scaled with new POND_RADIUS = 2.6
  const lilies = [
    { x: POND_CENTER[0] + 1.1, z: POND_CENTER[1] + 0.5, sz: 0.42, hasFlower: true  },
    { x: POND_CENTER[0] - 1.0, z: POND_CENTER[1] + 1.1, sz: 0.36, hasFlower: false },
    { x: POND_CENTER[0] + 0.3, z: POND_CENTER[1] - 1.3, sz: 0.40, hasFlower: true  },
    { x: POND_CENTER[0] - 1.4, z: POND_CENTER[1] - 0.6, sz: 0.30, hasFlower: false },
  ]
  // Reed clusters at pond edge — thin tapered green spikes (Zelda cattail look)
  // Placed just inside the rim where no lily pad lives.
  const reedClusters = [
    { cx: POND_CENTER[0] + 1.9, cz: POND_CENTER[1] + 1.0 },
    { cx: POND_CENTER[0] - 1.8, cz: POND_CENTER[1] - 1.3 },
    { cx: POND_CENTER[0] + 0.4, cz: POND_CENTER[1] + 2.0 },
  ]
  // Pebbles around pond rim (4 small stones for grounding)
  const pebbles = [
    { x: POND_CENTER[0] + 2.3, z: POND_CENTER[1] - 0.2, sz: 0.18 },
    { x: POND_CENTER[0] - 0.4, z: POND_CENTER[1] + 2.2, sz: 0.14 },
    { x: POND_CENTER[0] - 2.1, z: POND_CENTER[1] + 0.4, sz: 0.16 },
    { x: POND_CENTER[0] + 1.6, z: POND_CENTER[1] - 2.0, sz: 0.13 },
  ]
  const spilLeftX  = CLIFF_EDGE[0] + PERP_X * (STREAM_HALFWIDTH + 0.20)
  const spilLeftZ  = CLIFF_EDGE[1] + PERP_Z * (STREAM_HALFWIDTH + 0.20)
  const spilRightX = CLIFF_EDGE[0] - PERP_X * (STREAM_HALFWIDTH + 0.20)
  const spilRightZ = CLIFF_EDGE[1] - PERP_Z * (STREAM_HALFWIDTH + 0.20)
  return (
    <>
      {lilies.map((l, i) => (
        <group key={`lily${i}`} position={[l.x, WATER_Y + 0.02, l.z]}>
          <mesh rotation={[-Math.PI / 2, 0, i * 0.7]}>
            <circleGeometry args={[l.sz, 16]} />
            <meshStandardMaterial color="#2E5C3A" roughness={0.92} side={THREE.DoubleSide} />
          </mesh>
          {l.hasFlower && (
            <group position={[0.08, 0.05, -0.06]}>
              <mesh>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshStandardMaterial color="#F6BACC" roughness={0.7} emissive="#F6BACC" emissiveIntensity={0.15} />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <sphereGeometry args={[0.05, 8, 6]} />
                <meshStandardMaterial color="#FFE8D6" roughness={0.6} />
              </mesh>
            </group>
          )}
        </group>
      ))}
      {reedClusters.map((r, ri) => (
        <group key={`reed${ri}`} position={[r.cx, WATER_Y - 0.05, r.cz]}>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + ri * 0.6
            const ox = Math.cos(a) * 0.10
            const oz = Math.sin(a) * 0.10
            const h = 0.55 + (i % 2) * 0.15
            return (
              <group key={i} position={[ox, h / 2, oz]} rotation={[Math.sin(a) * 0.15, 0, Math.cos(a) * 0.12]}>
                <mesh>
                  <cylinderGeometry args={[0.012, 0.02, h, 5]} />
                  <meshStandardMaterial color="#4A7048" roughness={0.95} />
                </mesh>
                {/* dark seed head at top (cattail) */}
                <mesh position={[0, h / 2 + 0.04, 0]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.10, 6]} />
                  <meshStandardMaterial color="#5C3A22" roughness={0.95} />
                </mesh>
              </group>
            )
          })}
        </group>
      ))}
      {pebbles.map((p, i) => (
        <mesh key={`peb${i}`} position={[p.x, WATER_Y + 0.04, p.z]} rotation={[i * 0.3, i * 0.7, i * 0.4]} castShadow>
          <dodecahedronGeometry args={[p.sz, 0]} />
          <meshStandardMaterial color={i % 2 ? '#7A6A5A' : '#6A5A48'} roughness={0.95} flatShading />
        </mesh>
      ))}
      <mesh position={[spilLeftX, WATER_Y + 0.15, spilLeftZ]} rotation={[0.2, 0.5, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color="#473A2E" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[spilRightX, WATER_Y + 0.13, spilRightZ]} rotation={[-0.15, -0.5, -0.1]} castShadow>
        <dodecahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color="#3E3328" roughness={0.95} flatShading />
      </mesh>
    </>
  )
}

export default function CliffWaterfalls() {
  return (
    <group>
      <WatershedWater />
      <FallingWaterfall />
      <Ornaments />
    </group>
  )
}
