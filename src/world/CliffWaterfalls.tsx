// Cliff waterfalls v6 — ditch geometric curtain, use ORGANIC NOISE.
//
// History of failed approaches (all read as "block / column / brick"):
//   v1 cylinder           → solid column "snot"
//   v2 cylinder + spire   → "building"
//   v3 TubeGeometry arc   → rigid frozen curve
//   v4 particle stream    → "scattered sparkles, not a sheet"
//   v5 trapezoid layers   → "brick pillars" (user's feedback)
//
// Root cause analysis for v5 failure:
//   1. STRAIGHT vertical streak texture read as brick wall lines
//   2. Hard rectangular plane edges (alpha falloff not soft enough)
//   3. Multiple overlapping layers compounded brightness → additive
//      blowing out to solid white
//   4. 4 IDENTICAL falls clustered = uniform = artificial
//
// v6 approach (Ghibli wispy waterfall):
//   1. ORGANIC BEZIER SHAPE — irregular vertical tear-drop with
//      wavering side edges (not rectangle)
//   2. CLOUDY NOISE TEXTURE — perlin-like blobs, NO vertical streaks
//      that read as "stripes"
//   3. EXTREME alpha falloff at all edges → no plane silhouette
//   4. SINGLE plane per fall (no compounding additive blow-out)
//   5. ONLY 1 HERO + 1 SMALL satellite (visual focus vs scattered)
//   6. Low opacity 0.4 + fine sparkle particles for shimmer

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSeason, type Season } from './seasonal'
import { useTimeOfDay } from './time-of-day'
import { getGust } from './wind'

interface SeasonStyle {
  color: string
  glowColor: string
  frozen: boolean
  opacity: number
  blending: 'additive' | 'normal'
}

const SEASON_STYLE: Record<Season, SeasonStyle> = {
  default:   { color: '#FFFFFF', glowColor: '#D0E8F4', frozen: false, opacity: 0.50, blending: 'additive' },
  lny:       { color: '#FFD8B0', glowColor: '#FFB888', frozen: false, opacity: 0.55, blending: 'additive' },
  midautumn: { color: '#F4F8FF', glowColor: '#E8EFF8', frozen: false, opacity: 0.55, blending: 'additive' },
  winter:    { color: '#F8FBFF', glowColor: '#D8E4EC', frozen: true,  opacity: 0.85, blending: 'normal' },
  birthday:  { color: '#FFD0E4', glowColor: '#FFA8C8', frozen: false, opacity: 0.50, blending: 'additive' },
}

interface FallConfig {
  pos: [number, number]
  rotY: number
  height: number
  topWidth: number
  bottomWidth: number   // wider than top — water spreads
  seed: number          // unique noise seed per fall
  sparkleCount: number
  mistCount: number
}

// JUST 2 falls — 1 hero + 1 small satellite. Less is more for the
// "wispy ethereal" feel. Positioned on the visible grass rim so the
// source rocks anchor on the cliff edge.
const FALLS: FallConfig[] = [
  // HERO — slightly off-center, the main visual
  { pos: [-7, -18], rotY: -0.4, height: 13, topWidth: 1.6, bottomWidth: 2.4, seed: 1337, sparkleCount: 50, mistCount: 36 },
  // Small satellite further west — quieter detail
  { pos: [-14, -15], rotY: -1.0, height: 9, topWidth: 0.7, bottomWidth: 1.1, seed: 4242, sparkleCount: 20, mistCount: 18 },
]

// Smooth pseudo-noise — used to perturb canvas pixels organically.
// Not real Perlin (would need a library) but gives cloud-like soft
// gradients via overlapping sinusoidal waves with random phases.
function noiseAt(x: number, y: number, seed: number): number {
  const s = seed
  return (
    Math.sin(x * 0.04 + s * 0.7) * 0.5 +
    Math.sin(y * 0.03 + s * 1.3) * 0.5 +
    Math.sin((x + y) * 0.06 + s * 2.1) * 0.3 +
    Math.sin((x - y) * 0.05 + s * 3.5) * 0.3
  )
}

// Generate a single per-fall canvas texture: cloud-noise base with
// extreme edge alpha falloff. No streak lines — pure organic blob.
function makeWaterTexture(seed: number, w = 128, h = 384): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const imgData = ctx.createImageData(w, h)
  const data = imgData.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      // Cloud noise: combine 3 octaves
      const n1 = noiseAt(x, y, seed) * 0.5 + 0.5
      const n2 = noiseAt(x * 2, y * 2, seed * 1.7) * 0.5 + 0.5
      const n3 = noiseAt(x * 4, y * 4, seed * 2.3) * 0.5 + 0.5
      const noiseVal = (n1 * 0.6 + n2 * 0.3 + n3 * 0.1)
      // Side edge alpha: parabolic peak at center, fades to 0 at sides
      const xFrac = x / w
      const sideAlpha = 1 - Math.pow(Math.abs(xFrac - 0.5) * 2, 1.5)
      // Top + bottom alpha: fades at extremes for soft start/end
      const yFrac = y / h
      const topFade = Math.min(1, yFrac * 5)     // first 20% fades in
      const botFade = Math.min(1, (1 - yFrac) * 2.5)  // last 40% fades out
      const vertAlpha = topFade * botFade
      // Combine: noise modulates brightness, edges modulate alpha
      const brightness = 0.65 + noiseVal * 0.35   // 0.65 - 1.0
      const alpha = sideAlpha * vertAlpha * (0.55 + noiseVal * 0.30)
      data[i]     = 255 * brightness   // R
      data[i + 1] = 255 * brightness   // G
      data[i + 2] = 255 * brightness   // B
      data[i + 3] = 255 * alpha
    }
  }
  ctx.putImageData(imgData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1.5)
  tex.needsUpdate = true
  return tex
}

// Build an ORGANIC tear-drop shape via Shape with quadratic bezier
// curves. Wavering sides instead of straight rectangle edges.
function buildOrganicShape(topWidth: number, bottomWidth: number, height: number, seed: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  // Start top-left
  shape.moveTo(-topWidth / 2, 0)
  // Top edge: slight curve
  shape.quadraticCurveTo(0, 0.1, topWidth / 2, 0)
  // Right side: 3 bezier segments with seed-driven jitter
  const j1 = Math.sin(seed) * 0.15
  const j2 = Math.sin(seed * 1.7) * 0.12
  const j3 = Math.sin(seed * 2.3) * 0.18
  shape.bezierCurveTo(
    topWidth / 2 + j1, -height * 0.25,
    bottomWidth / 2 + j2, -height * 0.65,
    bottomWidth / 2, -height,
  )
  // Bottom edge: curved (water dispersed)
  shape.quadraticCurveTo(0, -height - 0.15, -bottomWidth / 2, -height)
  // Left side: mirror with different jitter
  const j4 = Math.sin(seed * 1.3) * 0.18
  const j5 = Math.sin(seed * 2.7) * 0.12
  const j6 = Math.sin(seed * 0.9) * 0.15
  shape.bezierCurveTo(
    -bottomWidth / 2 - j4, -height * 0.65,
    -topWidth / 2 - j5, -height * 0.25,
    -topWidth / 2 + j6, 0,
  )
  return new THREE.ShapeGeometry(shape, 12)
}

interface MistData {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
  sizeMul: number
}

interface SparkleData {
  x: number; y: number; z: number
  vy: number
  life: number
  maxLife: number
  baseX: number       // anchor x within the curtain band
}

function CliffFall({ config, style }: { config: FallConfig; style: SeasonStyle }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const sparkleRef = useRef<THREE.InstancedMesh>(null)
  const sparkleMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const mistRef = useRef<THREE.InstancedMesh>(null)
  const mistMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Texture: unique per fall via seed (no two identical falls)
  const tex = useMemo(() => makeWaterTexture(config.seed), [config.seed])
  useEffect(() => () => tex.dispose(), [tex])

  // Geometry: organic tear-drop with bezier curves
  const geo = useMemo(
    () => buildOrganicShape(config.topWidth, config.bottomWidth, config.height, config.seed),
    [config.topWidth, config.bottomWidth, config.height, config.seed],
  )
  useEffect(() => () => geo.dispose(), [geo])

  // Sparkle particles — tiny bright dots that fall down ALONG the
  // curtain, simulating individual droplet highlights catching light.
  const sparkles = useMemo<SparkleData[]>(() => Array.from({ length: config.sparkleCount }, () => {
    const lifeMax = 1.5 + Math.random() * 1.5
    return {
      x: 0,                                              // set per frame
      y: -Math.random() * config.height,
      z: 0,
      vy: -2.0 - Math.random() * 2.5,                   // fast fall
      life: Math.random() * lifeMax,
      maxLife: lifeMax,
      baseX: (Math.random() - 0.5) * config.topWidth,   // x position within band
    }
  }), [config.sparkleCount, config.height, config.topWidth])

  // Mist particles — small dispersing droplets at the BASE only
  const mistData = useMemo<MistData[]>(() => Array.from({ length: config.mistCount }, () => ({
    x: (Math.random() - 0.5) * config.bottomWidth,
    y: -config.height + (Math.random() - 0.5) * 0.4,
    z: (Math.random() - 0.5) * 0.4,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.10 - Math.random() * 0.25,
    vz: (Math.random() - 0.5) * 0.3,
    life: Math.random() * 2.5,
    sizeMul: 0.7 + Math.random() * 0.8,
  })), [config.mistCount, config.bottomWidth, config.height])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime

    // Subtle UV scroll on the noise texture for flow hint
    if (!style.frozen) {
      tex.offset.y -= dt * 0.6   // slower scroll — noise reads gentler
    }

    // Recolor materials
    if (matRef.current) matRef.current.color.set(style.color)
    if (sparkleMatRef.current) sparkleMatRef.current.color.set(style.color)
    if (mistMatRef.current) mistMatRef.current.color.set(style.color)
    if (glowMatRef.current) {
      glowMatRef.current.color.set(style.glowColor)
      glowMatRef.current.opacity = style.frozen
        ? 0.10
        : 0.20 + Math.sin(t * 1.3) * 0.05
    }

    // Sparkle droplets — animate falling + recycle. Width jitters
    // along baseX so it reads as droplets bouncing left/right within
    // the flow band.
    if (sparkleRef.current) {
      for (let i = 0; i < config.sparkleCount; i++) {
        const p = sparkles[i]
        if (!style.frozen) {
          p.life += dt
          p.y += p.vy * dt
          if (p.life > p.maxLife || p.y < -config.height) {
            p.life = 0
            p.y = -Math.random() * 0.5
            p.vy = -2.0 - Math.random() * 2.5
            p.baseX = (Math.random() - 0.5) * config.topWidth
          }
        }
        // Width follows the curtain taper (top→bottom): linear interp
        const yFrac = -p.y / config.height
        const widthHere = config.topWidth + (config.bottomWidth - config.topWidth) * yFrac
        // Lateral jitter relative to baseX (small)
        const lat = Math.sin(t * 7 + i * 1.7) * 0.08
        const x = p.baseX * (widthHere / config.topWidth) + lat
        const z = -0.45 + Math.cos(t * 5 + i * 2.3) * 0.04
        dummy.position.set(x, p.y, z)
        const ageFade = Math.min(1, p.life * 4) * Math.max(0, 1 - p.life / p.maxLife * 0.3)
        const sc = (0.020 + Math.random() * 0.005) * ageFade
        dummy.scale.setScalar(sc * 5)   // unit sphere geo radius 1 → scale to ~0.10
        dummy.updateMatrix()
        sparkleRef.current.setMatrixAt(i, dummy.matrix)
      }
      sparkleRef.current.instanceMatrix.needsUpdate = true
    }

    // Mist at base
    if (mistRef.current) {
      const wind = style.frozen ? 0 : getGust(t)
      for (let i = 0; i < config.mistCount; i++) {
        const p = mistData[i]
        if (!style.frozen) {
          p.life += dt
          p.x += (p.vx + wind * 0.5) * dt
          p.y += p.vy * dt
          p.z += p.vz * dt
          if (p.life > 2.5 || p.y < -config.height - 3) {
            p.x = (Math.random() - 0.5) * config.bottomWidth * 0.9
            p.y = -config.height + (Math.random() - 0.5) * 0.3
            p.z = (Math.random() - 0.5) * 0.5
            p.vx = (Math.random() - 0.5) * 0.5
            p.vy = -0.08 - Math.random() * 0.25
            p.vz = (Math.random() - 0.5) * 0.5
            p.life = 0
            p.sizeMul = 0.7 + Math.random() * 0.8
          }
        }
        const ageFrac = style.frozen ? 0.5 : Math.min(1, p.life / 2.5)
        const sc = config.bottomWidth * 0.13 * p.sizeMul * (0.6 + ageFrac * 0.8)
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(sc)
        dummy.updateMatrix()
        mistRef.current.setMatrixAt(i, dummy.matrix)
      }
      mistRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group position={[config.pos[0], 0, config.pos[1]]} rotation={[0, config.rotY, 0]}>
      {/* Source — small dark wet rocks anchored on cliff rim */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.16, config.topWidth * 0.10), 0]} />
        <meshStandardMaterial color="#1F1812" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-config.topWidth * 0.22, 0.04, 0.08]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.10, config.topWidth * 0.07), 0]} />
        <meshStandardMaterial color="#2A2018" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[config.topWidth * 0.20, 0.05, 0.05]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.09, config.topWidth * 0.06), 0]} />
        <meshStandardMaterial color="#1A140E" roughness={0.95} flatShading />
      </mesh>
      {/* Organic curtain — single plane with bezier shape + cloud
          noise texture. Edges fade smoothly (no rectangular silhouette).
          Z offset -0.4 so it hangs OUTWARD past the cliff rim. */}
      <mesh geometry={geo} position={[0, -0.05, -0.4]}>
        <meshBasicMaterial
          ref={matRef}
          color={style.color}
          map={tex}
          transparent
          opacity={style.opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          alphaTest={0.01}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </mesh>
      {/* Sparkle droplet highlights — small bright dots streaming down
          along the curtain. Gives water "shimmer" without solid bars. */}
      <instancedMesh
        ref={sparkleRef}
        args={[undefined as any, undefined as any, config.sparkleCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial
          ref={sparkleMatRef}
          color={style.color}
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </instancedMesh>
      {/* Mist particles at base — dispersing dots */}
      <instancedMesh
        ref={mistRef}
        args={[undefined as any, undefined as any, config.mistCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial
          ref={mistMatRef}
          color={style.color}
          transparent
          opacity={0.40}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </instancedMesh>
      {/* Base glow disc */}
      <mesh
        position={[0, -config.height - 0.3, -0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      >
        <circleGeometry args={[config.bottomWidth * 1.4, 18]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color={style.glowColor}
          transparent
          opacity={0.20}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export default function CliffWaterfalls() {
  const season = useSeason()
  const tod = useTimeOfDay()
  let style = SEASON_STYLE[season]
  // Day mode: NormalBlending + saturated blue, additive white blows
  // out invisible against bright sky
  if (tod.phase === 'day' && !style.frozen) {
    style = {
      ...style,
      color: '#6FA8D0',
      opacity: 0.65,
      blending: 'normal',
    }
  }
  return (
    <group>
      {FALLS.map((f, i) => (
        <CliffFall key={i} config={f} style={style} />
      ))}
    </group>
  )
}
