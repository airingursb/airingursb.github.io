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
import { getGust } from './wind'

interface SeasonStyle {
  waterColor: string       // pond + stream surface color
  fallColor: string        // falling curtain color
  glowColor: string        // base glow + foam color
  frozen: boolean
  fallOpacity: number
  blending: 'additive' | 'normal'
}

// waterColor bumped from #3A6878 (too dark to spot on grass) to
// #5A98B8 (bright cyan-blue, contrasts vs green grass at night)
// waterColor bumped from #5A98B8 → #88C0DC: noticeably brighter
// sky-blue, clearly stands out against dark night grass
const SEASON_STYLE: Record<Season, SeasonStyle> = {
  default:   { waterColor: '#88C0DC', fallColor: '#FFFFFF', glowColor: '#D0E8F4', frozen: false, fallOpacity: 0.70, blending: 'additive' },
  lny:       { waterColor: '#C8907A', fallColor: '#FFD8B0', glowColor: '#FFB888', frozen: false, fallOpacity: 0.72, blending: 'additive' },
  midautumn: { waterColor: '#A0BCDC', fallColor: '#F4F8FF', glowColor: '#E8EFF8', frozen: false, fallOpacity: 0.72, blending: 'additive' },
  winter:    { waterColor: '#D0E0E8', fallColor: '#F8FBFF', glowColor: '#D8E4EC', frozen: true,  fallOpacity: 0.88, blending: 'normal' },
  birthday:  { waterColor: '#D88FAA', fallColor: '#FFD0E4', glowColor: '#FFA8C8', frozen: false, fallOpacity: 0.70, blending: 'additive' },
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
const POND_CENTER: [number, number] = [-1, -10]   // [x, z]
const POND_RADIUS = 3.2
const CLIFF_LIP: [number, number] = [-1, -19.8]   // north rim (rim r≈19.8 at angle 4.66)
const FALL_HEIGHT = 7
const FALL_WIDTH = 3.0
const WATER_Y = 1.40        // surface elevation, clear of terrain bumps
const BED_Y = 1.34          // dark slate under water
const CLIFF_LIP_Y = 1.30    // foam cap top

// Outward unit direction = from island origin out to cliff lip
const _outLen = Math.hypot(CLIFF_LIP[0], CLIFF_LIP[1]) || 1
const OUT_X = CLIFF_LIP[0] / _outLen
const OUT_Z = CLIFF_LIP[1] / _outLen
// Y rotation so a unit-Z forward becomes the OUT direction
const OUT_ANGLE_Y = Math.atan2(OUT_X, OUT_Z)

// ─── POND (water source on island top) ─────────────────────────────
function MountainPond({ style }: { style: SeasonStyle }) {
  const surfaceRef = useRef<THREE.Mesh>(null)
  // MeshBasicMaterial (not Standard) so pond keeps its bright color
  // at night — standard material would be near-black under low ambient.
  const surfaceMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const highlightMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Animated water surface — slight Y-displacement for wave feel
  const baseGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(POND_RADIUS, 32)
    // Pre-bake organic edge: jitter rim vertices slightly
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getY(i)
      const r = Math.hypot(x, z)
      if (r > 0.01) {
        const angle = Math.atan2(z, x)
        const jitter = Math.sin(angle * 5) * 0.08 + Math.cos(angle * 7) * 0.06
        const newR = r + jitter
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
      // Specular shimmer — opacity breathes (reduced so cyan water
      // dominates and the pond doesn't read as a white blob)
      highlightMatRef.current.opacity = 0.10 + Math.sin(t * 0.9) * 0.04
    }
    if (surfaceMatRef.current) surfaceMatRef.current.color.set(style.waterColor)
  })

  // Y values (BED_Y/WATER_Y) clear of terrain bumps which reach ~1.0
  // — pond reads as a small lake sitting on top of the meadow.
  return (
    <group position={[POND_CENTER[0], 0, POND_CENTER[1]]}>
      {/* Pond bed — dark slate */}
      <mesh position={[0, BED_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[POND_RADIUS * 0.95, 24]} />
        <meshStandardMaterial color="#0E1418" roughness={0.95} />
      </mesh>
      {/* Water surface — main body. Opacity 0.78 lets the dark bed
          tint through, deepening the color (otherwise the pond reads
          as a flat bright cyan blob instead of as actual water). */}
      <mesh
        ref={surfaceRef}
        geometry={baseGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, WATER_Y, 0]}
        receiveShadow
      >
        <meshBasicMaterial
          ref={surfaceMatRef}
          color={style.waterColor}
          transparent
          opacity={0.78}
        />
      </mesh>
      {/* Specular highlight — small subtle shimmer offset from center */}
      <mesh position={[POND_RADIUS * 0.30, WATER_Y + 0.02, -POND_RADIUS * 0.25]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[POND_RADIUS * 0.28, 18]} />
        <meshBasicMaterial
          ref={highlightMatRef}
          color="#FFFFFF"
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Edge stones — 6 small dodecahedrons around the rim. Slight
          irregular spacing for organic feel. */}
      {[
        { ang:  0.1, r: 1.05, sz: 0.22 },
        { ang:  1.2, r: 1.10, sz: 0.18 },
        { ang:  2.4, r: 1.05, sz: 0.20 },
        { ang:  3.5, r: 1.08, sz: 0.16 },
        { ang:  4.6, r: 1.05, sz: 0.21 },
        { ang:  5.7, r: 1.10, sz: 0.18 },
      ].map((s, i) => (
        <mesh
          key={`pst${i}`}
          position={[
            Math.cos(s.ang) * POND_RADIUS * s.r,
            BED_Y + s.sz * 0.5,    // sit on top of bed
            Math.sin(s.ang) * POND_RADIUS * s.r,
          ]}
          rotation={[0, s.ang * 0.7, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[s.sz, 0]} />
          <meshStandardMaterial color="#3A3028" roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ─── SPILLWAY STREAM (water flows from pond to cliff edge) ──────────
function Stream({ style }: { style: SeasonStyle }) {
  // MeshBasicMaterial for bright self-lit water at night
  const streamMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const flowMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const flowTexRef = useRef<THREE.CanvasTexture | null>(null)

  // Stream texture: narrow vertical stripes that scroll downstream
  // for visible flow indication.
  const flowTex = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(255, 255, 255, 0.0)'
    ctx.fillRect(0, 0, 16, 64)
    // 4 thin streaks
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 4
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 + Math.random() * 0.25).toFixed(2)})`
      ctx.fillRect(x, 0, 1, 64)
    }
    const t = new THREE.CanvasTexture(canvas)
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    flowTexRef.current = t
    return t
  }, [])
  useEffect(() => () => flowTex?.dispose(), [flowTex])

  useFrame((_, dt) => {
    if (flowTex && !style.frozen) {
      // Scroll downstream — toward cliff edge (along +Y in canvas = +Z in world)
      flowTex.offset.y += dt * 1.2
    }
    if (streamMatRef.current) streamMatRef.current.color.set(style.waterColor)
    if (flowMatRef.current) flowMatRef.current.color.set(style.fallColor)
  })

  // Stream runs from POND edge → CLIFF lip along arbitrary direction.
  // We compute everything in LOCAL coords (forward = +Z) then rotate
  // the whole group by OUT_ANGLE_Y so it aligns to actual cliff dir.
  const pondToCliffDist = Math.hypot(
    CLIFF_LIP[0] - POND_CENTER[0],
    CLIFF_LIP[1] - POND_CENTER[1],
  )
  const localStartZ = POND_RADIUS * 0.85
  const localEndZ = pondToCliffDist
  const streamLength = localEndZ - localStartZ
  const localMidZ = (localStartZ + localEndZ) / 2
  const streamWidth = 0.50

  return (
    <group position={[POND_CENTER[0], 0, POND_CENTER[1]]} rotation={[0, OUT_ANGLE_Y, 0]}>
      {/* Stream base — slightly recessed channel */}
      <mesh
        position={[0, BED_Y, localMidZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[streamWidth + 0.15, streamLength]} />
        <meshStandardMaterial color="#1A1410" roughness={0.95} />
      </mesh>
      {/* Stream water surface — matches pond opacity for visual unity */}
      <mesh
        position={[0, WATER_Y, localMidZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[streamWidth, streamLength]} />
        <meshBasicMaterial
          ref={streamMatRef}
          color={style.waterColor}
          transparent
          opacity={0.78}
        />
      </mesh>
      {/* Flow streaks overlay — UV-scrolling stripes. Opacity tuned
          low (0.12) so the streaks subtly indicate motion without
          becoming a white laser that hides the cyan water below */}
      <mesh
        position={[0, WATER_Y + 0.01, localMidZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[streamWidth * 0.75, streamLength]} />
        <meshBasicMaterial
          ref={flowMatRef}
          color={style.fallColor}
          map={flowTex ?? undefined}
          transparent
          opacity={style.frozen ? 0.10 : 0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Edge stones along stream banks (local coords) */}
      {[
        { x: -streamWidth/2 - 0.10, z: localStartZ + 0.10, sz: 0.14 },
        { x:  streamWidth/2 + 0.10, z: localStartZ + 0.35, sz: 0.12 },
        { x: -streamWidth/2 - 0.12, z: localMidZ + 0.20,   sz: 0.11 },
        { x:  streamWidth/2 + 0.12, z: localMidZ - 0.30,   sz: 0.13 },
        { x: -streamWidth/2 - 0.10, z: localEndZ - 0.25,   sz: 0.10 },
        { x:  streamWidth/2 + 0.10, z: localEndZ - 0.10,   sz: 0.12 },
      ].map((s, i) => (
        <mesh
          key={`sst${i}`}
          position={[s.x, BED_Y + s.sz * 0.5, s.z]}
          rotation={[0, i * 0.7, 0]}
          castShadow
        >
          <dodecahedronGeometry args={[s.sz, 0]} />
          <meshStandardMaterial color="#3A3028" roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ─── CLIFF LIP FOAM (white cap where stream spills over the edge) ──
function CliffLipFoam({ style }: { style: SeasonStyle }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => {
    if (!matRef.current) return
    const t = s.clock.elapsedTime
    matRef.current.opacity = style.frozen
      ? 0.55
      : 0.50 + Math.sin(t * 2.5) * 0.10
    matRef.current.color.set(style.fallColor)
  })
  // Group is rotated by OUT_ANGLE_Y so local +Z is the outward
  // direction (away from island center). Lip stones use local X
  // (perpendicular to flow) to frame the spillway.
  return (
    <group
      position={[CLIFF_LIP[0], CLIFF_LIP_Y, CLIFF_LIP[1]]}
      rotation={[0, OUT_ANGLE_Y, 0]}
    >
      {/* Foam cap at cliff lip, nudged slightly outward (+Z local) */}
      <mesh position={[0, 0.05, 0.05]}>
        <sphereGeometry args={[0.55, 14, 10]} />
        <meshBasicMaterial
          ref={matRef}
          color={style.fallColor}
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </mesh>
      {/* Lip stones — 2 small darker stones framing the spillway */}
      <mesh position={[-0.48, 0.10, 0.05]} castShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#2A2018" roughness={0.96} flatShading />
      </mesh>
      <mesh position={[0.48, 0.08, 0.04]} castShadow>
        <dodecahedronGeometry args={[0.20, 0]} />
        <meshStandardMaterial color="#1F1812" roughness={0.96} flatShading />
      </mesh>
    </group>
  )
}

// ─── FALLING WATERFALL (sprite billboard, UV scrolls downward) ─────
// Per-pixel painted texture — soft white wisp via radial gradients +
// brush strokes + alpha masks. NO procedural noise (banding) and NO
// sparkle dots (Christmas-tree look).
function makeFallTexture(seed = 1337, w = 192, h = 640): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)

  let rng = seed
  const rand = () => {
    rng = (rng * 9301 + 49297) % 233280
    return rng / 233280
  }

  // Layer 1: solid sheet of water body — denser/brighter than v7 wisp.
  // A real curtain has substantial alpha in the middle; only the
  // edges are wispy. Reads as a thick water sheet, not a smoke puff.
  for (let yPos = 0; yPos < h; yPos += 20) {
    const yFrac = yPos / h
    const radius = w * (0.32 + 0.18 * Math.sin(yFrac * Math.PI * 1.1))
    const cx = w / 2 + (rand() - 0.5) * w * 0.04
    const grd = ctx.createRadialGradient(cx, yPos, 0, cx, yPos, radius)
    const baseAlpha = 0.55 * (1 - Math.pow(yFrac - 0.40, 2) * 0.5)
    grd.addColorStop(0,   `rgba(255, 255, 255, ${Math.max(0, baseAlpha).toFixed(3)})`)
    grd.addColorStop(0.5, `rgba(255, 255, 255, ${Math.max(0, baseAlpha * 0.65).toFixed(3)})`)
    grd.addColorStop(1,   'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)
  }

  // Layer 2: 8-10 vertical brush strokes — flowing water strands. More
  // strokes + higher alpha gives the "many parallel streams" feel of
  // a real waterfall, vs the v7 sparse wispy strands.
  const strokeCount = 8 + Math.floor(rand() * 3)
  for (let i = 0; i < strokeCount; i++) {
    const cx = w * (0.18 + rand() * 0.64)
    const halfW = 3 + rand() * 8
    const a = 0.28 + rand() * 0.28
    const grd = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0)
    grd.addColorStop(0,   'rgba(255, 255, 255, 0)')
    grd.addColorStop(0.5, `rgba(255, 255, 255, ${a.toFixed(3)})`)
    grd.addColorStop(1,   'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grd
    const top = h * (0.03 + rand() * 0.06)
    const bot = h * (0.88 + rand() * 0.08)
    ctx.fillRect(cx - halfW, top, halfW * 2, bot - top)
  }

  // Layer 3: side alpha mask (parabolic fade)
  ctx.globalCompositeOperation = 'destination-in'
  const sideGrd = ctx.createLinearGradient(0, 0, w, 0)
  sideGrd.addColorStop(0,    'rgba(0, 0, 0, 0)')
  sideGrd.addColorStop(0.18, 'rgba(0, 0, 0, 0.85)')
  sideGrd.addColorStop(0.50, 'rgba(0, 0, 0, 1.0)')
  sideGrd.addColorStop(0.82, 'rgba(0, 0, 0, 0.85)')
  sideGrd.addColorStop(1,    'rgba(0, 0, 0, 0)')
  ctx.fillStyle = sideGrd
  ctx.fillRect(0, 0, w, h)

  // Layer 4: top/bottom alpha mask (soft start/end)
  const vertGrd = ctx.createLinearGradient(0, 0, 0, h)
  vertGrd.addColorStop(0,    'rgba(0, 0, 0, 0.2)')
  vertGrd.addColorStop(0.12, 'rgba(0, 0, 0, 1.0)')
  vertGrd.addColorStop(0.80, 'rgba(0, 0, 0, 1.0)')
  vertGrd.addColorStop(1,    'rgba(0, 0, 0, 0.15)')
  ctx.fillStyle = vertGrd
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1.3)
  tex.needsUpdate = true
  return tex
}

interface MistData {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
  sizeMul: number
}

function FallingCurtain({ style }: { style: SeasonStyle }) {
  const spriteMatRef = useRef<THREE.SpriteMaterial>(null)
  const mistRef = useRef<THREE.InstancedMesh>(null)
  const mistMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const tex = useMemo(() => makeFallTexture(1337), [])
  useEffect(() => () => tex.dispose(), [tex])

  const MIST_COUNT = 36
  const mistData = useMemo<MistData[]>(() => Array.from({ length: MIST_COUNT }, () => ({
    x: (Math.random() - 0.5) * FALL_WIDTH * 0.9,
    y: -FALL_HEIGHT + (Math.random() - 0.5) * 0.5,
    z: (Math.random() - 0.5) * 0.4,
    vx: (Math.random() - 0.5) * 0.30,
    vy: -0.08 - Math.random() * 0.22,
    vz: (Math.random() - 0.5) * 0.30,
    life: Math.random() * 2.5,
    sizeMul: 0.7 + Math.random() * 0.8,
  })), [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    // CRITICAL v8 fix: positive offset shifts texture content DOWN
    // visually (water flows DOWN). v7 used negative which made water
    // appear to flow UPWARD — user said "瀑布像从地上往上飞".
    if (!style.frozen) {
      tex.offset.y += dt * 0.55
    }
    if (spriteMatRef.current) spriteMatRef.current.color.set(style.fallColor)
    if (mistMatRef.current) mistMatRef.current.color.set(style.fallColor)
    if (glowMatRef.current) {
      glowMatRef.current.color.set(style.glowColor)
      glowMatRef.current.opacity = style.frozen
        ? 0.10
        : 0.22 + Math.sin(t * 1.3) * 0.05
    }
    // Mist particles
    if (mistRef.current) {
      const wind = style.frozen ? 0 : getGust(t)
      for (let i = 0; i < MIST_COUNT; i++) {
        const p = mistData[i]
        if (!style.frozen) {
          p.life += dt
          p.x += (p.vx + wind * 0.4) * dt
          p.y += p.vy * dt
          p.z += p.vz * dt
          if (p.life > 2.5 || p.y < -FALL_HEIGHT - 3) {
            p.x = (Math.random() - 0.5) * FALL_WIDTH * 0.8
            p.y = -FALL_HEIGHT + (Math.random() - 0.5) * 0.3
            p.z = (Math.random() - 0.5) * 0.5
            p.vx = (Math.random() - 0.5) * 0.40
            p.vy = -0.06 - Math.random() * 0.20
            p.vz = (Math.random() - 0.5) * 0.40
            p.life = 0
            p.sizeMul = 0.7 + Math.random() * 0.8
          }
        }
        const ageFrac = style.frozen ? 0.5 : Math.min(1, p.life / 2.5)
        const sc = FALL_WIDTH * 0.12 * p.sizeMul * (0.55 + ageFrac * 0.8)
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(sc)
        dummy.updateMatrix()
        mistRef.current.setMatrixAt(i, dummy.matrix)
      }
      mistRef.current.instanceMatrix.needsUpdate = true
    }
  })

  // Sprite billboards face camera. CRITICAL: must push OUTWARD past
  // the visible cliff face — top stone band has outer radius 20.5 at
  // y=-1.4 so the falling water at distance < 20.5 from origin gets
  // OCCLUDED by the stone cylinder. CLIFF_LIP is at distance 18.5
  // (the grass rim), so we push the curtain +2.5 outward → distance
  // 21, safely outside the stone band's outer extent.
  return (
    <group
      position={[
        CLIFF_LIP[0] + OUT_X * 2.5,
        CLIFF_LIP_Y,
        CLIFF_LIP[1] + OUT_Z * 2.5,
      ]}
    >
      {/* Sprite billboard — always faces camera. Centered on its position,
          so Y offset -FALL_HEIGHT/2 puts TOP at cliff lip (y=CLIFF_LIP_Y). */}
      <sprite
        position={[0, -FALL_HEIGHT / 2, 0]}
        scale={[FALL_WIDTH, FALL_HEIGHT, 1]}
      >
        <spriteMaterial
          ref={spriteMatRef as any}
          map={tex}
          color={style.fallColor}
          transparent
          opacity={style.fallOpacity}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </sprite>
      {/* Mist at base */}
      <instancedMesh
        ref={mistRef}
        args={[undefined as any, undefined as any, MIST_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial
          ref={mistMatRef}
          color={style.fallColor}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </instancedMesh>
      {/* Base glow disc */}
      <mesh
        position={[0, -FALL_HEIGHT - 0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      >
        <circleGeometry args={[FALL_WIDTH * 1.2, 18]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color={style.glowColor}
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// ─── ROOT COMPONENT ────────────────────────────────────────────────
export default function CliffWaterfalls() {
  const season = useSeason()
  const tod = useTimeOfDay()
  let style = SEASON_STYLE[season]
  // Day-mode: additive white invisible against bright sky → swap to
  // normal alpha + saturated blue
  if (tod.phase === 'day' && !style.frozen) {
    style = {
      ...style,
      fallColor: '#6FA8D0',
      fallOpacity: 0.78,
      blending: 'normal',
    }
  }
  return (
    <group>
      <MountainPond style={style} />
      <Stream style={style} />
      <CliffLipFoam style={style} />
      <FallingCurtain style={style} />
    </group>
  )
}
