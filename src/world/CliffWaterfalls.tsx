// Cliff waterfall v8 — full water system (source pond → stream → lip
// foam → falling curtain → cloud-sea mist).
//
// v1-v7 all failed because they only made the FALLING part of the
// waterfall. Without a visible source the eye perceives "water
// magically spawning from cliff edge" which reads as wrong/uncanny.
//
// v8 composition (single hero, no satellites):
//   1. MOUNTAIN POND      ─ small dark blue pool on island top, 3u
//                            inland from the cliff edge. Visible
//                            source of the water. Wavy surface +
//                            edge stones.
//   2. SPILLWAY STREAM    ─ narrow channel from pond to cliff edge.
//                            UV-scrolled downstream so water visibly
//                            flows toward the lip.
//   3. CLIFF LIP FOAM     ─ bright white cap where stream goes over
//                            the edge. Indicates "this is where the
//                            water goes off the cliff".
//   4. FALLING CURTAIN    ─ sprite billboard with painted alpha texture.
//                            UV scrolled DOWNWARD (v7 bug: was scrolled
//                            up, making water appear to fly upward).
//   5. BASE MIST + GLOW   ─ particles + additive disc where the fall
//                            dissolves into the cloud sea below.

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSeason, type Season } from './seasonal'
import { useTimeOfDay } from './time-of-day'
import { TERRAIN_BUMPS } from './zones'

interface SeasonStyle {
  waterColor: string       // pond + stream surface color
  fallColor: string        // falling curtain color
  glowColor: string        // base glow + foam color
  frozen: boolean
  fallOpacity: number
  blending: 'additive' | 'normal'
}

// v11 BotW palette: fallColor is the LIGHT band peak (bright sky-cyan).
// Dark stops derived in-shader by multiplying. Foam = near white.
const SEASON_STYLE: Record<Season, SeasonStyle> = {
  default:   { waterColor: '#88C0DC', fallColor: '#C8E8F2', glowColor: '#FFFFFF', frozen: false, fallOpacity: 0.92, blending: 'normal' },
  lny:       { waterColor: '#C8907A', fallColor: '#F2D4B4', glowColor: '#FFE8D0', frozen: false, fallOpacity: 0.90, blending: 'normal' },
  midautumn: { waterColor: '#A0BCDC', fallColor: '#D8E8F4', glowColor: '#F4F8FF', frozen: false, fallOpacity: 0.92, blending: 'normal' },
  winter:    { waterColor: '#D0E0E8', fallColor: '#EEF4F8', glowColor: '#FFFFFF', frozen: true,  fallOpacity: 0.95, blending: 'normal' },
  birthday:  { waterColor: '#D88FAA', fallColor: '#F0C8D8', glowColor: '#FFE4EE', frozen: false, fallOpacity: 0.90, blending: 'normal' },
}

// Single hero waterfall positioning.
//
// Layout (looking down from above, +Z toward camera):
//
//     +x →
//   ──────────────────────
//   │  island grass      │
//   │                    │
//   │   ●  pond center   │   ← POND_CENTER (-3, +13)
//   │   │                │      pond radius 2.0 (bigger — was 1.4
//   │   │  stream  ↓     │       which was invisible)
//   │   ▼                │
//   ├───●─ cliff lip ───┤   ← CLIFF_LIP (-3, +18)  south rim
//   │                    │
//   ▼ (+Z outward)       │      Waterfall hangs into cloud sea
//   (void / cloud sea)
//
// CRITICAL v8m: moved to NORTH-CENTRAL rim.
//
// Camera (34, 26, 30) → origin sightline projection analysis:
//   • SOUTH rim (z=+20): cliff at bottom of frame, waterfall falls
//     off-screen (NDC y=-1.37)
//   • WEST rim (x=-18.5): waterfall is on FAR SIDE of island from
//     camera; sightline dips below grass surface before reaching the
//     falling water → grass occludes everything below cliff
//   • NORTH rim (z=-20): cliff at RIGHT side of frame (because camera
//     is at +X +Z, north-rim X=-1, Z=-20 projects to +0.48 NDC right,
//     -0.12 NDC just below center). Falling water from y=1.3 → y=-3.7
//     fully visible in mid-right of frame.
//
// NORTH rim tree gap analysis (TREE_POSITIONS):
//   (-4, -18) and (2, -18.5) bracket angle 4.66; rim r≈19.8 there.
//   Placing CLIFF_LIP at (-1, -19.8) gives ~3.4u clearance both sides.
//
// Layout (top-down view, camera at +X +Y +Z looking at origin):
//
//   north (-Z, far from camera)   ← CLIFF
//                  │              ↓
//                  ●  pond        ● waterfall hangs here
//                  │
//   west ─────────┼──────────  east
//                  │
//                  │
//             south (+Z, near camera)
//
const POND_CENTER: [number, number] = [-1, -9]   // [x, z]
const POND_RADIUS = 3.2
const CLIFF_LIP: [number, number] = [-1, -19.8]   // north rim (rim r≈19.8 at angle 4.66)

// v16 TERRAIN-DRIVEN ELEVATION. zones.ts now has bumps at:
//   [-1, -9, 4.8, 0.90]   pond hilltop → grass at center = 0.75+0.90 = 1.65
//   [-1, -14, 4.0, 0.45]  mid-stream    → grass at center = ~1.20
//   [-1, -18.5, 3.0, 0.10] basin support → grass at center = 0.85
//
// Water Ys are calibrated to sit JUST above terrain at their centers:
//   POND water 1.70   (terrain 1.65, water 5cm above)
//   BASIN water 0.90  (terrain 0.85, water 5cm above)
// Stream Y is sampled from terrain per segment (water always follows hill).
const GRASS_BASE_Y         = 0.75    // grass top (no bumps) — extrude 0.6 + bevel 0.15
const WATER_Y              = 1.70    // POND water surface (hilltop)
const BED_Y                = 1.64    // POND bed
const BASIN_WATER_Y        = 0.90    // BASIN water (山脚)
const BASIN_BED_Y          = 0.84
const CLIFF_LIP_Y          = BASIN_WATER_Y - 0.04   // foam ref = basin level
const FALL_HEIGHT          = 14
const FALL_WIDTH           = 1.50
const BASIN_RADIUS         = 1.45
const BASIN_INWARD         = 1.80
const SPILLWAY_NOTCH_WIDTH = 1.40
const SPILLWAY_LENGTH      = BASIN_INWARD - BASIN_RADIUS + 0.10

// Outward unit direction = from island origin out to cliff lip
const _outLen = Math.hypot(CLIFF_LIP[0], CLIFF_LIP[1]) || 1
const OUT_X = CLIFF_LIP[0] / _outLen
const OUT_Z = CLIFF_LIP[1] / _outLen
// Y rotation so a unit-Z forward becomes the OUT direction
const OUT_ANGLE_Y = Math.atan2(OUT_X, OUT_Z)

// Terrain height sampler — matches Island.tsx grass bump formula.
// Used to position stream water so it always sits ON the terrain,
// not floating above it. Returns world Y of grass surface.
function terrainHeight(x: number, z: number): number {
  let lift = 0
  for (const [bx, bz, br, bh] of TERRAIN_BUMPS) {
    const d = Math.hypot(x - bx, z - bz)
    if (d < br) {
      const t = 1 - d / br
      lift += bh * (t * t * (3 - 2 * t))
    }
  }
  return GRASS_BASE_Y + lift
}

// Convert local-space (after stream group rotation by OUT_ANGLE_Y +
// translation by POND_CENTER) to world XZ. Used to sample terrain
// underneath spline points.
function streamLocalToWorld(localX: number, localZ: number): [number, number] {
  const a = OUT_ANGLE_Y
  const wx = POND_CENTER[0] + Math.cos(a) * localX + Math.sin(a) * localZ
  const wz = POND_CENTER[1] - Math.sin(a) * localX + Math.cos(a) * localZ
  return [wx, wz]
}

// ─── POND (water source on island top) ─────────────────────────────
//
// Composition (concentric, top-down):
//   1. organic rim shape          — soil/mud band visible at outer edge
//   2. deep-water bed             — almost-black slate
//   3. main water surface         — large, organic rim
//   4. shallow shoreline ring     — lighter cyan band just inside rim
//      (sells "shallow at edges, deep in middle" depth)
//   5. ripple rings × 2           — expanding+fading concentric circles
//      that animate over time
//   6. 3 lily pads w/ blossom     — flat dark-green discs with pink dot
//   7. 4 reed tufts at rim        — vertical thin green cylinders
//   8. 8 edge stones (was 6)      — larger, varied sizes
function MountainPond({ style }: { style: SeasonStyle }) {
  const surfaceRef = useRef<THREE.Mesh>(null)
  // v12: surface now uses custom BotW ShaderMaterial (banded noise +
  // displacement + radial foam ring) instead of MeshBasicMaterial.
  const surfaceMatRef = useRef<THREE.ShaderMaterial>(null)
  const shallowMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const highlightMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const ripple1Ref = useRef<THREE.Mesh>(null)
  const ripple1MatRef = useRef<THREE.MeshBasicMaterial>(null)
  const ripple2Ref = useRef<THREE.Mesh>(null)
  const ripple2MatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Shader textures — generated once per component (small, ~64KB each)
  const noiseTex = useMemo(() => makeCloudNoise(7733), [])
  const displTex = useMemo(() => makeDisplacementGuide(8844), [])
  useEffect(() => () => { noiseTex.dispose(); displTex.dispose() }, [noiseTex, displTex])

  // 4-color stops derived from waterColor for pond shader. Helper refs
  // so we don't allocate Colors per frame.
  const _pondTopLight = useMemo(() => new THREE.Color(), [])
  const _pondTopDark  = useMemo(() => new THREE.Color(), [])
  const _pondBotLight = useMemo(() => new THREE.Color(), [])
  const _pondBotDark  = useMemo(() => new THREE.Color(), [])
  const pondUniforms = useMemo(() => ({
    uNoise:            { value: noiseTex },
    uDispl:            { value: displTex },
    uTime:             { value: 0 },
    uNoiseTile:        { value: new THREE.Vector2(2.2, 2.2) },  // square tiling for radial
    uDisplTile:        { value: new THREE.Vector2(1.6, 1.6) },
    uFlowDir:          { value: new THREE.Vector2(0, 0) },       // 0 = use default drift
    uScrollSpeed:      { value: 0.18 },                          // slow gentle drift
    uDisplAmount:      { value: 0.035 },
    uBands:            { value: 5.0 },
    uColorTopLight:    { value: new THREE.Color('#D8ECF4') },
    uColorTopDark:     { value: new THREE.Color('#5A8FB0') },
    uColorBottomLight: { value: new THREE.Color('#A8D0DE') },
    uColorBottomDark:  { value: new THREE.Color('#2A5878') },
    uFoamColor:        { value: new THREE.Color('#FFFFFF') },
    uFoamWidth:        { value: 0.12 },                          // shore foam ring width
    uAlpha:            { value: 0.82 },
    uIsPond:           { value: 1.0 },
  }), [noiseTex, displTex])

  // Organic outer rim — same generator used for main water surface.
  // Concentric layers reuse the same shape at smaller scales so the
  // pond reads as a single organic body, not stacked circles.
  const baseGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(POND_RADIUS, 48)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getY(i)
      const r = Math.hypot(x, z)
      if (r > 0.01) {
        const angle = Math.atan2(z, x)
        // 3 octaves of jitter — more organic, less polygonal
        const j = Math.sin(angle * 3) * 0.14
                + Math.cos(angle * 7) * 0.09
                + Math.sin(angle * 11) * 0.05
        const newR = r + j
        pos.setX(i, Math.cos(angle) * newR)
        pos.setY(i, Math.sin(angle) * newR)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => baseGeo.dispose(), [baseGeo])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (surfaceRef.current && !style.frozen) {
      surfaceRef.current.position.y = WATER_Y + Math.sin(t * 1.4) * 0.008
    }
    if (highlightMatRef.current && !style.frozen) {
      highlightMatRef.current.opacity = 0.09 + Math.sin(t * 0.9) * 0.04
    }
    // Drive BotW shader uniforms via matRef (closure mutation doesn't
    // propagate to GPU — same bug pattern as v11d waterfall fix)
    const pm = surfaceMatRef.current
    if (pm) {
      if (!style.frozen) pm.uniforms.uTime.value = t
      _pondTopLight.set(style.waterColor).multiplyScalar(1.30)
      _pondTopLight.r = Math.min(1, _pondTopLight.r)
      _pondTopLight.g = Math.min(1, _pondTopLight.g)
      _pondTopLight.b = Math.min(1, _pondTopLight.b)
      _pondTopDark.set(style.waterColor)
      _pondBotLight.set(style.waterColor).multiplyScalar(1.10)
      _pondBotLight.r = Math.min(1, _pondBotLight.r)
      _pondBotLight.g = Math.min(1, _pondBotLight.g)
      _pondBotLight.b = Math.min(1, _pondBotLight.b)
      _pondBotDark.set(style.waterColor).multiplyScalar(0.45)
      pm.uniforms.uColorTopLight.value.copy(_pondTopLight)
      pm.uniforms.uColorTopDark.value.copy(_pondTopDark)
      pm.uniforms.uColorBottomLight.value.copy(_pondBotLight)
      pm.uniforms.uColorBottomDark.value.copy(_pondBotDark)
    }
    if (shallowMatRef.current) shallowMatRef.current.color.set(style.waterColor)
    // Ripple rings: scale expands 0.4 → 1.0 over 3s loop, opacity fades
    if (!style.frozen && ripple1Ref.current && ripple1MatRef.current) {
      const p1 = (t % 3.0) / 3.0
      const s1 = 0.4 + p1 * 0.55
      ripple1Ref.current.scale.set(s1, s1, s1)
      ripple1MatRef.current.opacity = (1 - p1) * 0.28
    }
    if (!style.frozen && ripple2Ref.current && ripple2MatRef.current) {
      const p2 = ((t + 1.6) % 3.0) / 3.0
      const s2 = 0.4 + p2 * 0.55
      ripple2Ref.current.scale.set(s2, s2, s2)
      ripple2MatRef.current.opacity = (1 - p2) * 0.22
    }
  })

  // Lily pad positions (manually placed, not too central — leave middle
  // open for clear water reflection).
  const lilies: Array<{ x: number; z: number; sz: number; rot: number; bx: number; bz: number }> = [
    { x:  POND_RADIUS * 0.55, z:  POND_RADIUS * 0.10, sz: 0.45, rot: 0.4, bx: 0.10, bz: -0.05 },
    { x: -POND_RADIUS * 0.45, z:  POND_RADIUS * 0.50, sz: 0.38, rot: 1.3, bx: -0.04, bz: 0.10 },
    { x: -POND_RADIUS * 0.20, z: -POND_RADIUS * 0.55, sz: 0.32, rot: 2.1, bx: 0.06, bz: 0.04 },
  ]
  // Reed tufts at rim — 4 small clusters
  const reeds: Array<{ ang: number; r: number; h: number; bend: number }> = [
    { ang: 0.5,  r: 1.04, h: 0.55, bend:  0.12 },
    { ang: 2.1,  r: 1.02, h: 0.42, bend: -0.08 },
    { ang: 3.7,  r: 1.06, h: 0.50, bend:  0.15 },
    { ang: 5.3,  r: 1.03, h: 0.38, bend: -0.10 },
  ]

  return (
    <group position={[POND_CENTER[0], 0, POND_CENTER[1]]}>
      {/* v17: removed dirt cone frustum — looked like a planter. The
          new HillMesh (rendered as a sibling) provides the actual
          grass-colored hill that supports the pond visually. */}
      {/* 2. Deep-water bed (very dark slate) */}
      <mesh position={[0, BED_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[POND_RADIUS * 0.95, 32]} />
        <meshStandardMaterial color="#0A0E12" roughness={0.95} />
      </mesh>
      {/* 3. Main water surface — v12 BotW ShaderMaterial.
          Banded noise + displacement-warped UVs + 4-stop palette +
          radial shore-foam ring (uIsPond=1.0). Same recipe as the
          falling waterfall, adapted for horizontal water. */}
      <mesh
        ref={surfaceRef}
        geometry={baseGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, WATER_Y, 0]}
        receiveShadow
      >
        <shaderMaterial
          ref={surfaceMatRef}
          uniforms={pondUniforms}
          vertexShader={BOTW_SURFACE_VERT}
          fragmentShader={BOTW_SURFACE_FRAG}
          transparent
          depthWrite={false}
        />
      </mesh>
      {/* 4. Shallow shoreline ring — lighter band fakes depth gradient */}
      <mesh position={[0, WATER_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <ringGeometry args={[POND_RADIUS * 0.78, POND_RADIUS * 0.96, 36]} />
        <meshBasicMaterial
          ref={shallowMatRef}
          color={style.waterColor}
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* 5a. Ripple ring 1 (offset from center for organic feel) */}
      <mesh
        ref={ripple1Ref}
        position={[POND_RADIUS * 0.15, WATER_Y + 0.02, -POND_RADIUS * 0.10]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[0.8, 0.92, 28]} />
        <meshBasicMaterial
          ref={ripple1MatRef}
          color="#FFFFFF"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* 5b. Ripple ring 2 (different center + offset phase) */}
      <mesh
        ref={ripple2Ref}
        position={[-POND_RADIUS * 0.20, WATER_Y + 0.02, POND_RADIUS * 0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[0.7, 0.82, 28]} />
        <meshBasicMaterial
          ref={ripple2MatRef}
          color="#FFFFFF"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* 6. Specular highlight — small subtle shimmer */}
      <mesh position={[POND_RADIUS * 0.30, WATER_Y + 0.03, -POND_RADIUS * 0.25]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <circleGeometry args={[POND_RADIUS * 0.20, 18]} />
        <meshBasicMaterial
          ref={highlightMatRef}
          color="#FFFFFF"
          transparent
          opacity={0.10}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* 7. Lily pads + tiny pink blossoms */}
      {lilies.map((l, i) => (
        <group key={`lily${i}`} position={[l.x, WATER_Y + 0.04, l.z]}>
          {/* Pad — flat green disc with notch (using ringGeometry trick:
              a small slice would show notch but a disc is simpler here) */}
          <mesh rotation={[-Math.PI / 2, 0, l.rot]}>
            <circleGeometry args={[l.sz, 14]} />
            <meshStandardMaterial color="#2E5C3A" roughness={0.92} side={THREE.DoubleSide} />
          </mesh>
          {/* Blossom — tiny pink sphere */}
          <mesh position={[l.bx, 0.03, l.bz]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshBasicMaterial color="#F6BACC" />
          </mesh>
        </group>
      ))}
      {/* 8. Reed tufts at rim — small bundles of thin grass blades */}
      {reeds.map((r, i) => (
        <group
          key={`reed${i}`}
          position={[
            Math.cos(r.ang) * POND_RADIUS * r.r,
            BED_Y,
            Math.sin(r.ang) * POND_RADIUS * r.r,
          ]}
        >
          {/* 3 thin blades per tuft, slightly different lean */}
          {[0, 1, 2].map((b) => (
            <mesh
              key={b}
              position={[
                (b - 1) * 0.06,
                r.h / 2,
                Math.sin(b) * 0.05,
              ]}
              rotation={[
                r.bend + (b - 1) * 0.05,
                b * 0.7,
                r.bend * 0.4,
              ]}
            >
              <cylinderGeometry args={[0.012, 0.018, r.h, 4]} />
              <meshStandardMaterial color="#4A7050" roughness={0.95} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* 9. Edge stones — 8 around the rim, varied sizes and irregular
            spacing. Now bigger so they read clearly at distance. */}
      {[
        { ang:  0.05, r: 1.02, sz: 0.30 },
        { ang:  0.85, r: 1.08, sz: 0.22 },
        { ang:  1.50, r: 1.04, sz: 0.34 },
        { ang:  2.30, r: 1.06, sz: 0.18 },
        { ang:  3.10, r: 1.05, sz: 0.27 },
        { ang:  3.85, r: 1.09, sz: 0.21 },
        { ang:  4.70, r: 1.03, sz: 0.32 },
        { ang:  5.55, r: 1.07, sz: 0.24 },
      ].map((s, i) => (
        <mesh
          key={`pst${i}`}
          position={[
            Math.cos(s.ang) * POND_RADIUS * s.r,
            BED_Y + s.sz * 0.45,
            Math.sin(s.ang) * POND_RADIUS * s.r,
          ]}
          rotation={[s.ang * 0.3, s.ang * 0.7, s.ang * 0.2]}
          castShadow
        >
          <dodecahedronGeometry args={[s.sz, 0]} />
          <meshStandardMaterial color="#4A3A2C" roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ─── SPILLWAY STREAM (water flows from pond to cliff edge) ──────────
// v12: surface uses BotW ShaderMaterial (same recipe as pond + waterfall).
// uFlowDir=(0,1) → straight downstream UV scroll along stream long axis.
// uIsPond=0 → side-bank foam (not radial ring).
function Stream({ style }: { style: SeasonStyle }) {
  const streamMatRef = useRef<THREE.ShaderMaterial>(null)

  const noiseTex = useMemo(() => makeCloudNoise(5566), [])
  const displTex = useMemo(() => makeDisplacementGuide(6677), [])
  useEffect(() => () => { noiseTex.dispose(); displTex.dispose() }, [noiseTex, displTex])

  const _topLight = useMemo(() => new THREE.Color(), [])
  const _topDark  = useMemo(() => new THREE.Color(), [])
  const _botLight = useMemo(() => new THREE.Color(), [])
  const _botDark  = useMemo(() => new THREE.Color(), [])

  const streamUniforms = useMemo(() => ({
    uNoise:            { value: noiseTex },
    uDispl:            { value: displTex },
    uTime:             { value: 0 },
    uNoiseTile:        { value: new THREE.Vector2(0.6, 3.5) },   // wide+tall: streaks along flow
    uDisplTile:        { value: new THREE.Vector2(0.8, 1.4) },
    uFlowDir:          { value: new THREE.Vector2(0, 1) },        // downstream = +V in shader UV
    uScrollSpeed:      { value: 0.85 },                            // faster than pond
    uDisplAmount:      { value: 0.040 },
    uBands:            { value: 5.0 },
    uColorTopLight:    { value: new THREE.Color('#D8ECF4') },
    uColorTopDark:     { value: new THREE.Color('#5A8FB0') },
    uColorBottomLight: { value: new THREE.Color('#A8D0DE') },
    uColorBottomDark:  { value: new THREE.Color('#2A5878') },
    uFoamColor:        { value: new THREE.Color('#FFFFFF') },
    uFoamWidth:        { value: 0.18 },                            // bank foam width
    uAlpha:            { value: 0.88 },
    uIsPond:           { value: 0.0 },                             // 0 → side foam
  }), [noiseTex, displTex])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    const sm = streamMatRef.current
    if (!sm) return
    if (!style.frozen) sm.uniforms.uTime.value = t
    _topLight.set(style.waterColor).multiplyScalar(1.30)
    _topLight.r = Math.min(1, _topLight.r); _topLight.g = Math.min(1, _topLight.g); _topLight.b = Math.min(1, _topLight.b)
    _topDark.set(style.waterColor)
    _botLight.set(style.waterColor).multiplyScalar(1.10)
    _botLight.r = Math.min(1, _botLight.r); _botLight.g = Math.min(1, _botLight.g); _botLight.b = Math.min(1, _botLight.b)
    _botDark.set(style.waterColor).multiplyScalar(0.45)
    sm.uniforms.uColorTopLight.value.copy(_topLight)
    sm.uniforms.uColorTopDark.value.copy(_topDark)
    sm.uniforms.uColorBottomLight.value.copy(_botLight)
    sm.uniforms.uColorBottomDark.value.copy(_botDark)
  })

  // v13 MEANDERING STREAM — CatmullRomCurve3 spline + ribbon mesh.
  // Real streams don't go straight — they S-curve based on terrain,
  // erosion, path of least resistance. Old version was a literal
  // rectangle (planeGeometry) which the user correctly called out as
  // having "no physics sense".
  //
  // LOCAL coords: forward = +Z (toward cliff), perpendicular = ±X.
  // Group is rotated by OUT_ANGLE_Y so this aligns to world cliff dir.
  const pondToCliffDist = Math.hypot(
    CLIFF_LIP[0] - POND_CENTER[0],
    CLIFF_LIP[1] - POND_CENTER[1],
  )
  const localStartZ = POND_RADIUS * 0.85
  // v14: stream ends INSIDE the basin (not at cliff edge). Basin
  // center is at z = pondToCliffDist - BASIN_INWARD. Spline END at
  // basin center → stream visually merges into basin.
  const localEndZ = pondToCliffDist - BASIN_INWARD
  const streamLength = localEndZ - localStartZ

  // Spline control points (local space). S-curve: bend right, bend left,
  // bend right again, straighten as it enters the basin (so the inflow
  // is perpendicular to the basin rim, no sharp angle).
  const splineCurve = useMemo(() => {
    const z0 = localStartZ
    const zN = localEndZ
    const span = zN - z0
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.00, 0, z0),                  // exit pond, straight
      new THREE.Vector3( 1.20, 0, z0 + span * 0.22),    // bend right
      new THREE.Vector3(-0.95, 0, z0 + span * 0.48),    // bend left
      new THREE.Vector3( 0.65, 0, z0 + span * 0.74),    // bend right (gentler)
      new THREE.Vector3( 0.00, 0, zN),                  // straighten into basin
    ], false, 'catmullrom', 0.5)
  }, [localStartZ, localEndZ])

  // Build a ribbon mesh by sampling the spline and extruding perpendicular
  // to the tangent at each sample point. Width varies along path:
  // narrow at exits (pond/cliff), wider in middle (sells "natural pool").
  // Returns {bedGeo, waterGeo} — same XY shape, different Y offsets.
  const { bedGeo, waterGeo } = useMemo(() => {
    const SEGS = 48
    const bedHalfW = 0.42        // bed slightly wider than water (banks)
    const waterHalfWMax = 0.36   // peak water half-width
    const waterHalfWMin = 0.22   // narrowest at start/end
    // v15: yFn(t) returns Y per segment so stream SLOPES DOWNHILL —
    // water surface descends from POND height (WATER_Y=2.0) at t=0
    // to BASIN height (BASIN_WATER_Y=1.0) at t=1. Same for bed Y.
    function buildRibbon(yFn: (t: number) => number, halfWidthFn: (t: number) => number) {
      const positions = new Float32Array((SEGS + 1) * 2 * 3)
      const uvs       = new Float32Array((SEGS + 1) * 2 * 2)
      const indices   = new Uint16Array(SEGS * 6)
      const _tan = new THREE.Vector3()
      for (let i = 0; i <= SEGS; i++) {
        const t = i / SEGS
        const p = splineCurve.getPoint(t)
        splineCurve.getTangent(t, _tan).normalize()
        // Perpendicular in XZ plane: (tangent.z, 0, -tangent.x)
        const px = _tan.z
        const pz = -_tan.x
        const hw = halfWidthFn(t)
        const y = yFn(t)
        // left vertex (index 2i), right vertex (index 2i+1)
        const li = i * 2 * 3
        const ri = li + 3
        positions[li    ] = p.x - px * hw
        positions[li + 1] = y
        positions[li + 2] = p.z - pz * hw
        positions[ri    ] = p.x + px * hw
        positions[ri + 1] = y
        positions[ri + 2] = p.z + pz * hw
        // UV: U=0..1 across width (for side-bank foam shader), V=0..1 along length
        const ui = i * 2 * 2
        uvs[ui    ] = 0
        uvs[ui + 1] = t
        uvs[ui + 2] = 1
        uvs[ui + 3] = t
        if (i < SEGS) {
          const a = i * 2
          const b = a + 1
          const c = a + 2
          const d = a + 3
          const idx = i * 6
          indices[idx    ] = a; indices[idx + 1] = c; indices[idx + 2] = b
          indices[idx + 3] = b; indices[idx + 4] = c; indices[idx + 5] = d
        }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
      g.setIndex(new THREE.BufferAttribute(indices, 1))
      g.computeVertexNormals()
      return g
    }
    const waterHw = (t: number) => {
      // Wider in middle (sinusoidal); slightly narrows at very ends
      const mid = Math.sin(t * Math.PI)        // 0 → 1 → 0
      return waterHalfWMin + (waterHalfWMax - waterHalfWMin) * mid
    }
    const bedHw = (t: number) => waterHw(t) + (bedHalfW - waterHalfWMax) * 0.6 + 0.04
    // v16: water Y sampled from ACTUAL TERRAIN per segment — water always
    // sits 5cm above grass, never floating. The hill bumps in zones.ts
    // create the slope; stream automatically follows.
    const waterYFn = (t: number) => {
      const p = splineCurve.getPoint(t)
      const [wx, wz] = streamLocalToWorld(p.x, p.z)
      return terrainHeight(wx, wz) + 0.05
    }
    const bedYFn = (t: number) => {
      const p = splineCurve.getPoint(t)
      const [wx, wz] = streamLocalToWorld(p.x, p.z)
      return terrainHeight(wx, wz) - 0.01   // bed just under water surface
    }
    return {
      bedGeo: buildRibbon(bedYFn, bedHw),
      waterGeo: buildRibbon(waterYFn, waterHw),
    }
  }, [splineCurve])

  useEffect(() => () => { bedGeo.dispose(); waterGeo.dispose() }, [bedGeo, waterGeo])

  // Sample 6 stone positions along the spline (alternating banks)
  const stonePositions = useMemo(() => {
    const arr: Array<{ x: number; y: number; z: number; sz: number; rot: number }> = []
    const _tan = new THREE.Vector3()
    const samples = [
      { t: 0.05, side: -1, sz: 0.13 },
      { t: 0.18, side: +1, sz: 0.16 },
      { t: 0.36, side: -1, sz: 0.12 },
      { t: 0.55, side: +1, sz: 0.15 },
      { t: 0.72, side: -1, sz: 0.13 },
      { t: 0.88, side: +1, sz: 0.11 },
    ]
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      const p = splineCurve.getPoint(s.t)
      splineCurve.getTangent(s.t, _tan).normalize()
      const px = _tan.z
      const pz = -_tan.x
      const off = 0.42 + s.sz * 0.5
      // v16: stones sit on actual terrain at their world position
      const stoneLocalX = p.x + px * off * s.side
      const stoneLocalZ = p.z + pz * off * s.side
      const [stoneWx, stoneWz] = streamLocalToWorld(stoneLocalX, stoneLocalZ)
      const terrainHere = terrainHeight(stoneWx, stoneWz)
      arr.push({
        x: stoneLocalX,
        y: terrainHere + s.sz * 0.40,
        z: stoneLocalZ,
        sz: s.sz,
        rot: i * 0.7,
      })
    }
    return arr
  }, [splineCurve])

  return (
    <group position={[POND_CENTER[0], 0, POND_CENTER[1]]} rotation={[0, OUT_ANGLE_Y, 0]}>
      {/* Stream bed — dark slate ribbon follows the spline */}
      <mesh geometry={bedGeo} receiveShadow>
        <meshStandardMaterial color="#1A1410" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Stream water surface — v13 ribbon following the meandering
          spline. Same BotW ShaderMaterial; UV.y still 0→1 along flow,
          so uFlowDir=(0,1) animates downstream along the curve. */}
      <mesh geometry={waterGeo} receiveShadow>
        <shaderMaterial
          ref={streamMatRef}
          uniforms={streamUniforms}
          vertexShader={BOTW_SURFACE_VERT}
          fragmentShader={BOTW_SURFACE_FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Edge stones — placed along the spline path, alternating banks */}
      {stonePositions.map((s, i) => (
        <mesh
          key={`sst${i}`}
          position={[s.x, s.y, s.z]}
          rotation={[0, s.rot, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[s.sz, 0]} />
          <meshStandardMaterial color="#3A3028" roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ─── SPILLWAY BASIN (small pool at cliff edge) ─────────────────────
// v14: Real waterfalls don't transition from stream → falling water
// abruptly. Water always gathers in a small basin/pool at the cliff
// edge first, then OVERFLOWS as a waterfall. This component replaces
// the v10 LIP NOTCH (a flat rectangle plane) with that proper basin.
//
// Stream extends INTO this basin (spline end inside basin radius);
// basin's OUTER edge meets the cliff lip exactly → waterfall starts
// where basin overflows.
//
//   layout (top-down):
//
//             |==== stream spline end (INSIDE basin)
//       _____v____
//      /          \    ●  shoulder boulder
//     |   BASIN    |
//      \__________/    ●  shoulder boulder
//          |
//          v overflow → waterfall hangs from here
//        cliff edge
//
function CliffLipFoam({ style }: { style: SeasonStyle }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const noiseTex = useMemo(() => makeCloudNoise(9988), [])
  const displTex = useMemo(() => makeDisplacementGuide(8877), [])
  useEffect(() => () => { noiseTex.dispose(); displTex.dispose() }, [noiseTex, displTex])

  const _tl = useMemo(() => new THREE.Color(), [])
  const _td = useMemo(() => new THREE.Color(), [])
  const _bl = useMemo(() => new THREE.Color(), [])
  const _bd = useMemo(() => new THREE.Color(), [])

  const basinUniforms = useMemo(() => ({
    uNoise:            { value: noiseTex },
    uDispl:            { value: displTex },
    uTime:             { value: 0 },
    uNoiseTile:        { value: new THREE.Vector2(2.6, 2.6) },
    uDisplTile:        { value: new THREE.Vector2(1.8, 1.8) },
    uFlowDir:          { value: new THREE.Vector2(0.20, -0.40) }, // drift toward spillway
    uScrollSpeed:      { value: 0.32 },
    uDisplAmount:      { value: 0.045 },
    uBands:            { value: 5.0 },
    uColorTopLight:    { value: new THREE.Color('#D8ECF4') },
    uColorTopDark:     { value: new THREE.Color('#5A8FB0') },
    uColorBottomLight: { value: new THREE.Color('#A8D0DE') },
    uColorBottomDark:  { value: new THREE.Color('#2A5878') },
    uFoamColor:        { value: new THREE.Color('#FFFFFF') },
    uFoamWidth:        { value: 0.20 },                          // bigger rim foam (small basin)
    uAlpha:            { value: 0.88 },
    uIsPond:           { value: 1.0 },                           // radial foam
  }), [noiseTex, displTex])

  // Organic basin shape — jittered circle, slightly elongated outward
  // (oval rather than perfect circle) so it reads as natural erosion
  const basinGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(BASIN_RADIUS, 28)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getY(i)
      const r = Math.hypot(x, z)
      if (r > 0.01) {
        const angle = Math.atan2(z, x)
        const j = Math.sin(angle * 3) * 0.10 + Math.cos(angle * 5) * 0.06
        // Stretch slightly outward (positive Z is outward in local coords)
        const stretchY = 1.0 + 0.10 * Math.max(0, Math.sin(angle))
        const newR = (r + j)
        pos.setX(i, Math.cos(angle) * newR)
        pos.setY(i, Math.sin(angle) * newR * stretchY)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => basinGeo.dispose(), [basinGeo])

  useFrame((s) => {
    const m = matRef.current
    if (!m) return
    const t = s.clock.elapsedTime
    if (!style.frozen) m.uniforms.uTime.value = t
    _tl.set(style.waterColor).multiplyScalar(1.30)
    _tl.r = Math.min(1, _tl.r); _tl.g = Math.min(1, _tl.g); _tl.b = Math.min(1, _tl.b)
    _td.set(style.waterColor)
    _bl.set(style.waterColor).multiplyScalar(1.10)
    _bl.r = Math.min(1, _bl.r); _bl.g = Math.min(1, _bl.g); _bl.b = Math.min(1, _bl.b)
    _bd.set(style.waterColor).multiplyScalar(0.45)
    m.uniforms.uColorTopLight.value.copy(_tl)
    m.uniforms.uColorTopDark.value.copy(_td)
    m.uniforms.uColorBottomLight.value.copy(_bl)
    m.uniforms.uColorBottomDark.value.copy(_bd)
  })

  // Group position: at CLIFF_LIP, but basin geometry is offset INWARD
  // so its outer edge meets the cliff exactly (basin doesn't float
  // off into the void).
  // v16: terrain at basin world (-1, -18.5 hill, -19 actual basin)
  // has small bump giving grass = ~0.84. Basin water at 0.90.
  // Dirt frustum bridges basin rim → terrain (small gap, ~0.10u).
  const basinTerrain = terrainHeight(CLIFF_LIP[0] - OUT_X * BASIN_INWARD, CLIFF_LIP[1] - OUT_Z * BASIN_INWARD)
  const basinRimDrop = BASIN_WATER_Y - basinTerrain   // typically ~0.06
  return (
    <group
      position={[CLIFF_LIP[0], CLIFF_LIP_Y, CLIFF_LIP[1]]}
      rotation={[0, OUT_ANGLE_Y, 0]}
    >
      {/* v17: removed basin dirt frustum — looks like a planter. The
          new HillMesh sibling provides the actual visible hill geometry. */}
      {/* Basin bed — dark slate, slightly recessed.
          v15: uses BASIN_BED_Y (1u below pond) for terrain notch feel */}
      <mesh
        position={[0, BASIN_BED_Y - CLIFF_LIP_Y, -BASIN_INWARD]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[BASIN_RADIUS * 0.92, 24]} />
        <meshStandardMaterial color="#0A0E12" roughness={0.95} />
      </mesh>
      {/* Basin water surface — BotW shader (same recipe as main pond)
          at BASIN_WATER_Y = 1.0 (山脚 elevation, below pond) */}
      <mesh
        geometry={basinGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, BASIN_WATER_Y - CLIFF_LIP_Y, -BASIN_INWARD]}
        receiveShadow
      >
        <shaderMaterial
          ref={matRef}
          uniforms={basinUniforms}
          vertexShader={BOTW_SURFACE_VERT}
          fragmentShader={BOTW_SURFACE_FRAG}
          transparent
          depthWrite={false}
        />
      </mesh>
      {/* SPILLWAY CHANNEL — narrow water plane bridging basin outer
          edge → cliff lip. This IS the "low point in the basin wall"
          where overflow happens. v15: matches BASIN_WATER_Y; geometry
          aligns with the narrow waterfall (FALL_WIDTH). */}
      <mesh
        position={[0, BASIN_WATER_Y - CLIFF_LIP_Y, -(SPILLWAY_LENGTH / 2)]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[SPILLWAY_NOTCH_WIDTH, SPILLWAY_LENGTH + 0.10]} />
        <shaderMaterial
          uniforms={basinUniforms}
          vertexShader={BOTW_SURFACE_VERT}
          fragmentShader={BOTW_SURFACE_FRAG}
          transparent
          depthWrite={false}
        />
      </mesh>
      {/* SHOULDER BOULDERS — flank the spillway notch. Narrower placement
          now since spillway is only 1.4u wide (not full FALL_WIDTH=5). */}
      <mesh
        position={[-SPILLWAY_NOTCH_WIDTH * 0.65, 0.32, -SPILLWAY_LENGTH * 0.3]}
        rotation={[0.15, 0.45, 0.08]}
        castShadow
      >
        <dodecahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial color="#473A2E" roughness={0.95} flatShading />
      </mesh>
      <mesh
        position={[ SPILLWAY_NOTCH_WIDTH * 0.68, 0.28, -SPILLWAY_LENGTH * 0.3]}
        rotation={[-0.12, -0.55, -0.10]}
        castShadow
      >
        <dodecahedronGeometry args={[0.40, 1]} />
        <meshStandardMaterial color="#3E3328" roughness={0.95} flatShading />
      </mesh>
      {/* 2 small rocks at the cliff lip — silhouette punctuation */}
      <mesh position={[-SPILLWAY_NOTCH_WIDTH * 0.42, 0.10, 0.04]} rotation={[0.4, 0.3, 0]} castShadow>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#564636" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[ SPILLWAY_NOTCH_WIDTH * 0.45, 0.09, 0.06]} rotation={[-0.3, -0.4, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color="#4A3D30" roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

// ─── FALLING WATERFALL — v11 BotW shader-faithful ─────────────────────
//
// Replaces v10's MeshBasicMaterial + canvas-painted textures with an
// actual custom GLSL ShaderMaterial implementing the documented BotW
// recipe from Harry Alisavakis' shader breakdown:
//
//   1. NOISE TEXTURE (cloud, vertically stretched) → UV.y scrolls down
//   2. DISPLACEMENT GUIDE TEXTURE → also scrolls; its xy channels
//      offset the noise UV → wavy organic SIDES (instead of straight
//      rectangle edges)
//   3. QUANTIZE noise: `round(n * BANDS) / BANDS` → 5 discrete colour
//      bands. This is the SIGNATURE BotW painted-cel look — without
//      banding it looks like a smooth blurry photo, not stylised art
//   4. FOUR HDR COLOURS interpolated:
//        col = lerp(
//          lerp(bottomDark, topDark, uv.y),
//          lerp(bottomLight, topLight, uv.y),
//          bandedNoise
//        )
//   5. BOTTOM FOAM via `step(threshold, uv.y + disp.y)` → white foam
//      band whose edge is jaggy because displacement warps the cutoff
//   6. BOTTOM ALPHA DISSOLVE so water fades into void (floating island)
//   7. NO additive blending, NO base glow, NO splash — additive turned
//      it into a lightsaber column.

// Tapered + CURVED waterfall geometry.
// Top row sits AT the cliff edge (z=0). Middle row bowed slightly
// outward (z=+0.6), bottom row well outside (z=+2.2) — so the falling
// water naturally curves away from the cliff face as it descends.
// This matches real water (gravity + initial horizontal momentum) AND
// clears the stone band cylinder (outer radius 20.5 at y=-1.4) without
// needing to push the whole group outward (which previously left a
// visible 2.5u gap between cliff edge and waterfall start — the "floating
// waterfall" bug user reported).
function makeWaterfallGeo(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const wTop = FALL_WIDTH / 2
  const wMid = (FALL_WIDTH * 0.85) / 2
  const wBot = (FALL_WIDTH * 0.72) / 2
  const h0 = 0
  const h1 = -FALL_HEIGHT * 0.5
  const h2 = -FALL_HEIGHT
  // Z curve: outward bow — looks like water arcs out as gravity pulls
  const z0 = 0.0    // anchored at cliff lip
  const z1 = 0.6    // gentle outward bow at mid
  const z2 = 2.2    // well clear of stone band at bottom
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
  const indices = new Uint16Array([
    0, 2, 1,   1, 2, 3,
    2, 4, 3,   3, 4, 5,
  ])
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.setIndex(new THREE.BufferAttribute(indices, 1))
  g.computeVertexNormals()
  return g
}

// Procedural cloud noise canvas — fBm-ish via stacked sin/cos at
// multiple frequencies. Stretched VERTICALLY (tall, narrow texture)
// so when sampled on a wide waterfall plane the noise reads as
// vertical streaks, not isotropic blobs.
function makeCloudNoise(seed: number, w = 128, h = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  let rng = seed
  const rnd = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff }
  // Pre-generate per-octave phase offsets so noise is stable
  const phases = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w
      const v = y / h
      // Multi-octave fBm — y stretched so features are tall/streaky
      let n = 0
      n += Math.sin(u * 6.28 * 2.1 + phases[0]) * Math.cos(v * 6.28 * 0.8 + phases[1]) * 0.5
      n += Math.sin(u * 6.28 * 4.3 + phases[2]) * Math.cos(v * 6.28 * 1.7 + phases[3]) * 0.28
      n += Math.sin(u * 6.28 * 8.7 - phases[1]) * Math.cos(v * 6.28 * 3.1 - phases[0]) * 0.16
      n += Math.sin(u * 6.28 * 17.0 + phases[3]) * Math.cos(v * 6.28 * 5.8 + phases[2]) * 0.08
      const g = Math.max(0, Math.min(255, Math.round((n * 0.5 + 0.5) * 255)))
      const i = (y * w + x) * 4
      img.data[i] = g
      img.data[i + 1] = g
      img.data[i + 2] = g
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

// Displacement-guide canvas — softer, lower-frequency noise. Encodes
// 2D offset in R (x) and G (y); blue/alpha unused. Drives the wavy
// SIDE edges and the jaggy bottom-foam threshold.
function makeDisplacementGuide(seed: number, w = 128, h = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  let rng = seed
  const rnd = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff }
  const px = rnd() * 6.28, py = rnd() * 6.28
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w
      const v = y / h
      const r = Math.sin(u * 6.28 * 1.3 + px) * Math.cos(v * 6.28 * 0.6 + py) * 0.5
              + Math.sin(u * 6.28 * 3.1 - py) * Math.cos(v * 6.28 * 1.5 + px) * 0.2
      const g = Math.cos(u * 6.28 * 1.7 + px) * Math.sin(v * 6.28 * 0.9 - py) * 0.5
              + Math.cos(u * 6.28 * 4.0 + py) * Math.sin(v * 6.28 * 2.1 + px) * 0.2
      const rByte = Math.max(0, Math.min(255, Math.round((r * 0.5 + 0.5) * 255)))
      const gByte = Math.max(0, Math.min(255, Math.round((g * 0.5 + 0.5) * 255)))
      const i = (y * w + x) * 4
      img.data[i] = rByte
      img.data[i + 1] = gByte
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

// ─── BotW horizontal water surface shader (pond + stream) ────────────
// Same recipe as the falling waterfall, adapted for horizontal water:
//   • UV scrolls along uFlowDir (Vector2) — pond uses radial outward
//     by sampling at length(uv)-based radial coord; stream uses (0,1)
//     for straight downstream flow
//   • 5-band quantized cloud noise → painterly cel-shaded look
//   • 4-stop HDR palette → bottomDark→topDark→bottomLight→topLight
//   • Shore foam: foamMask = step(1.0 - foamWidth, distFromCenter)
//     for pond (foam ring at rim); foam at left/right banks for stream
const BOTW_SURFACE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BOTW_SURFACE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uNoise;
  uniform sampler2D uDispl;
  uniform float uTime;
  uniform vec2  uNoiseTile;
  uniform vec2  uDisplTile;
  uniform vec2  uFlowDir;          // (0,1) downstream for stream; (0,0) radial for pond
  uniform float uScrollSpeed;
  uniform float uDisplAmount;
  uniform float uBands;
  uniform vec3  uColorTopLight;
  uniform vec3  uColorTopDark;
  uniform vec3  uColorBottomLight;
  uniform vec3  uColorBottomDark;
  uniform vec3  uFoamColor;
  uniform float uFoamWidth;        // distance from edge where foam appears (0..1)
  uniform float uAlpha;
  uniform float uIsPond;           // 1.0 = radial foam (pond), 0.0 = side bank foam (stream)
  varying vec2 vUv;

  void main() {
    // Scroll UVs in flow direction. For pond, flow vector is (0,0) but
    // we still want gentle radial drift — accomplished by both layers
    // scrolling at slightly different speeds in arbitrary directions.
    vec2 flow = uFlowDir;
    if (length(flow) < 0.001) flow = vec2(0.13, 0.27);   // pond gentle drift
    vec2 nUv = vUv * uNoiseTile + flow * uTime * uScrollSpeed;
    vec2 dUv = vUv * uDisplTile + flow * uTime * uScrollSpeed * 0.6;

    vec2 displ = (texture2D(uDispl, dUv).rg * 2.0 - 1.0) * uDisplAmount;
    float noise = texture2D(uNoise, nUv + displ).r;
    noise = floor(noise * uBands + 0.5) / uBands;

    vec3 darkCol  = mix(uColorBottomDark,  uColorTopDark,  vUv.y);
    vec3 lightCol = mix(uColorBottomLight, uColorTopLight, vUv.y);
    vec3 col = mix(darkCol, lightCol, noise);

    // Shore foam — different for pond vs stream
    float foamMask;
    if (uIsPond > 0.5) {
      // Pond: foam ring at outer rim. Distance from UV center (0.5).
      // Geometry is a circle so UV in unit square wrapping circle —
      // dist = length(vUv - 0.5) * 2.0 → 0 at center, 1 at rim corners.
      float d = length(vUv - 0.5) * 2.0;
      foamMask = smoothstep(1.0 - uFoamWidth - 0.05, 1.0 - uFoamWidth + 0.05,
                             d + displ.y * 6.0);
    } else {
      // Stream: foam at left/right banks (uv.x near 0 or 1).
      // Add displ warp so foam edge isn't a straight line.
      float dx = abs(vUv.x - 0.5) * 2.0;
      foamMask = smoothstep(1.0 - uFoamWidth - 0.06, 1.0 - uFoamWidth + 0.06,
                             dx + displ.y * 4.0);
    }
    col = mix(col, uFoamColor, foamMask);

    gl_FragColor = vec4(col, uAlpha);
  }
`

// BotW waterfall fragment shader — direct port of Halisavakis recipe.
const BOTW_WATER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BOTW_WATER_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uNoise;
  uniform sampler2D uDispl;
  uniform float uTime;
  uniform vec2  uNoiseTile;       // (xTiles, yTiles) — y bigger for streaks
  uniform vec2  uDisplTile;
  uniform float uScrollSpeed;     // BotW: ~0.2 (uTime/5)
  uniform float uDisplAmount;     // BotW: ~0.05
  uniform float uBands;           // BotW: 5.0 (round(n*5)/5)
  uniform vec3  uColorTopLight;
  uniform vec3  uColorTopDark;
  uniform vec3  uColorBottomLight;
  uniform vec3  uColorBottomDark;
  uniform vec3  uFoamColor;
  uniform float uFoamThreshold;   // bottom foam height (UV.y, 0..1)
  uniform float uAlpha;           // overall opacity

  varying vec2 vUv;

  void main() {
    // v11d direction fix: nUv.y += time (was minus).
    // When we ADD t*speed to nUv.y, we sample HIGHER y in texture as
    // time advances. A feature that was at texture v=0.5 now must be
    // read with vUv.y = 0.5 - t*speed (lower geometry y) to land in
    // the same texture spot — so the feature appears to slide DOWN
    // the geometry. With minus, features slid UP (water flying up).
    vec2 nUv = vUv * uNoiseTile;
    vec2 dUv = vUv * uDisplTile;
    nUv.y += uTime * uScrollSpeed;
    dUv.y += uTime * uScrollSpeed * 0.7;   // slower second layer

    // Sample displacement guide — convert R/G channels from [0,1] to
    // [-uDisplAmount, +uDisplAmount]. Used to (a) WARP noise UV so
    // sides are wavy not straight, (b) WARP foam threshold cutoff
    vec2 displ = (texture2D(uDispl, dUv).rg * 2.0 - 1.0) * uDisplAmount;

    // Sample noise with WARPED UV
    float noise = texture2D(uNoise, nUv + displ).r;

    // QUANTIZE — the BotW painted-cel signature. Without this it
    // reads as a smooth photo. With it, 5 discrete bands.
    noise = floor(noise * uBands + 0.5) / uBands;

    // 4-color HDR gradient: vertical interpolation (top vs bottom)
    // crossed with the noise-driven mix (light vs dark band)
    vec3 darkCol  = mix(uColorBottomDark,  uColorTopDark,  vUv.y);
    vec3 lightCol = mix(uColorBottomLight, uColorTopLight, vUv.y);
    vec3 col = mix(darkCol, lightCol, noise);

    // Bottom foam — white band whose edge is jaggy (warped by displ.y)
    float foamMask = 1.0 - step(uFoamThreshold, vUv.y + displ.y * 4.0);
    col = mix(col, uFoamColor, foamMask);

    // Side fade — soft alpha at left/right edges so the waterfall
    // doesn't read as a hard rectangle. Plus bottom dissolves into
    // nothing (the island is floating).
    float sideMask = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
    float vertMask = smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.18, 1.0 - vUv.y);
    // Bottom dissolve: extra fade in lower 30%
    float bottomFade = smoothstep(0.0, 0.30, vUv.y);

    float a = uAlpha * sideMask * vertMask * bottomFade;

    gl_FragColor = vec4(col, a);
  }
`

// Convert hex string → THREE.Color RGB array for shader uniform
function hex3(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

function FallingCurtain({ style }: { style: SeasonStyle }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const sprayMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const geo = useMemo(() => makeWaterfallGeo(), [])
  const noiseTex = useMemo(() => makeCloudNoise(1337), [])
  const displTex = useMemo(() => makeDisplacementGuide(2424), [])
  useEffect(() => () => { geo.dispose(); noiseTex.dispose(); displTex.dispose() }, [geo, noiseTex, displTex])

  // 4-stop HDR palette — Halisavakis recipe. Bright top-LIGHT (peak
  // foam band) at near-white; medium top-DARK; deeper bottom-DARK so
  // the cell-shaded bands are visibly different. fallColor drives the
  // mid-tone; light/dark stops derived in useFrame to follow seasons.
  const uniforms = useMemo(() => ({
    uNoise:            { value: noiseTex },
    uDispl:            { value: displTex },
    uTime:             { value: 0 },
    uNoiseTile:        { value: new THREE.Vector2(1.2, 4.0) },  // y-stretched vertical streaks
    uDisplTile:        { value: new THREE.Vector2(1.6, 2.0) },
    uScrollSpeed:      { value: 0.62 },
    uDisplAmount:      { value: 0.055 },
    uBands:            { value: 5.0 },
    uColorTopLight:    { value: hex3('#F4FAFD') },
    uColorTopDark:     { value: hex3('#7AB4D6') },
    uColorBottomLight: { value: hex3('#CCE5F0') },
    uColorBottomDark:  { value: hex3('#3A7CA4') },
    uFoamColor:        { value: hex3('#FFFFFF') },
    uFoamThreshold:    { value: 0.20 },
    uAlpha:            { value: 0.92 },
  }), [noiseTex, displTex])

  const _topLight = useMemo(() => new THREE.Color(), [])
  const _topDark = useMemo(() => new THREE.Color(), [])
  const _bottomLight = useMemo(() => new THREE.Color(), [])
  const _bottomDark = useMemo(() => new THREE.Color(), [])

  useFrame((s) => {
    // Critical: write through matRef.current.uniforms — NOT the
    // closure-captured `uniforms` object. R3F may keep the same
    // reference, but going through the live material is the only
    // pattern guaranteed to push updates to the GPU each frame.
    // Previous bug: water appeared completely STATIC because uTime
    // updates weren't reaching the shader.
    const m = matRef.current
    if (!m) return
    const t = s.clock.elapsedTime
    if (!style.frozen) m.uniforms.uTime.value = t
    // 4-stop derivation from fallColor + glowColor:
    //   topLight = glowColor (brightest, peak foam band)
    //   topDark  = fallColor (mid tone, mid band)
    //   botLight = fallColor brightened 1.18 (clamped)
    //   botDark  = fallColor darkened 0.50 (deepest band)
    _topLight.set(style.glowColor)
    _topDark.set(style.fallColor)
    _bottomLight.set(style.fallColor).multiplyScalar(1.18)
    _bottomLight.r = Math.min(1, _bottomLight.r)
    _bottomLight.g = Math.min(1, _bottomLight.g)
    _bottomLight.b = Math.min(1, _bottomLight.b)
    _bottomDark.set(style.fallColor).multiplyScalar(0.50)
    m.uniforms.uColorTopLight.value.copy(_topLight)
    m.uniforms.uColorTopDark.value.copy(_topDark)
    m.uniforms.uColorBottomLight.value.copy(_bottomLight)
    m.uniforms.uColorBottomDark.value.copy(_bottomDark)
    m.uniforms.uFoamColor.value.set(style.glowColor)
    m.uniforms.uAlpha.value = style.fallOpacity
    if (sprayMatRef.current) {
      sprayMatRef.current.color.set(style.glowColor)
      sprayMatRef.current.opacity = style.frozen ? 0.0 : 0.45 + Math.sin(t * 3.1) * 0.10
    }
  })

  // v11e fix: TOP of waterfall now anchored AT cliff lip (no +OUT * 2.5
  // push that caused the "floating waterfall" gap). The bowed geometry
  // (z=0 at top → z=2.2 at bottom) naturally curves outward as it falls,
  // clearing the stone band (outer radius 20.5) without leaving a gap
  // between the cliff edge and the water start.
  return (
    <group
      position={[CLIFF_LIP[0], CLIFF_LIP_Y, CLIFF_LIP[1]]}
      rotation={[0, OUT_ANGLE_Y, 0]}
    >
      {/* Main BotW waterfall plane — custom ShaderMaterial doing all
          the work: banded quantized noise + displacement-warped UVs +
          4-color HDR gradient + bottom foam threshold + alpha
          dissolve. Geometry curves outward as water falls. */}
      <mesh geometry={geo} renderOrder={2}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={BOTW_WATER_VERT}
          fragmentShader={BOTW_WATER_FRAG}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* TOP SPRAY — thin horizontal mist line right at the cliff
          lip, suggesting spray as water bends over the edge.
          Pulses gently. NO splash, NO base catch. */}
      <mesh position={[0, -0.02, 0.04]} rotation={[Math.PI / 2, 0, 0]} renderOrder={4}>
        <planeGeometry args={[FALL_WIDTH * 1.10, 0.32]} />
        <meshBasicMaterial
          ref={sprayMatRef}
          color={style.glowColor}
          transparent
          opacity={0.38}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ─── ROOT COMPONENT ────────────────────────────────────────────────
// v17 HILL MESH — actual subdivided geometry that lifts grass under
// pond + stream + basin. Solves the bug where TERRAIN_BUMPS in zones.ts
// only affected ExtrudeGeometry RIM vertices (top face has no interior
// triangulation vertices, so interior bumps were no-ops).
//
// We render a separate plane mesh covering the water-system area,
// displaced per-vertex using the same bump formula as terrainHeight().
// This ensures the visible grass-colored hill EXACTLY matches the Y
// values that the water meshes are positioned at.
function HillMesh() {
  const geo = useMemo(() => {
    const HILL_SIZE_X = 18
    const HILL_SIZE_Z = 24
    const SUBDIV = 64
    const HILL_CENTER_X = -1
    const HILL_CENTER_Z = -14
    const g = new THREE.PlaneGeometry(HILL_SIZE_X, HILL_SIZE_Z, SUBDIV, SUBDIV)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      // Convert local plane coords to world coords for terrain sampling
      const wx = pos.getX(i) + HILL_CENTER_X
      const wz = pos.getZ(i) + HILL_CENTER_Z
      // Use the same bump formula as terrainHeight() — but offset from
      // grass base (we sit 0.01 above grass to avoid z-fight at edges)
      const lift = terrainHeight(wx, wz) - GRASS_BASE_Y
      pos.setY(i, lift + 0.01)
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    g.translate(HILL_CENTER_X, 0, HILL_CENTER_Z)
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} position={[0, GRASS_BASE_Y, 0]} receiveShadow castShadow>
      <meshStandardMaterial
        color="#7FB36A"   // matches GRASS_MID from Island.tsx
        roughness={0.95}
        flatShading
      />
    </mesh>
  )
}

export default function CliffWaterfalls() {
  const season = useSeason()
  const tod = useTimeOfDay()
  let style = SEASON_STYLE[season]
  // Day-mode: deeper saturated blue (against bright sky)
  if (tod.phase === 'day' && !style.frozen) {
    style = {
      ...style,
      fallColor: '#6FA8D0',
      fallOpacity: 0.82,
      blending: 'normal',
    }
  }
  return (
    <group>
      <HillMesh />
      <MountainPond style={style} />
      <Stream style={style} />
      <CliffLipFoam style={style} />
      <FallingCurtain style={style} />
    </group>
  )
}
