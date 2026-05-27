// Cliff waterfalls v5 — water CURTAIN (trapezoid plane + UV scroll).
//
// Lessons from v1-v4:
//   v1 cylinder: looked like solid column "snot"
//   v2 cylinder + tall spire: looked like ruined building + column
//   v3 TubeGeometry arc: looked like rigid frozen curves
//   v4 particle stream: looked like scattered sparkles, NOT a sheet
//
// v5: Real waterfalls at distance read as a CURTAIN (continuous sheet
// with vertical streaks). The right primitive is a TAPERED PLANE
// (trapezoid: wider at top, narrower at bottom) with an alpha-mapped
// canvas texture that scrolls downward. Multiple overlapping planes
// at slight angles give depth. Particles relegated to mist accents
// at the base only.
//
// Day mode: Normal blending + saturated blue-cyan against bright sky.
// Night/dusk: Additive blending + pure white for glow.

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
  default:   { color: '#FFFFFF', glowColor: '#D0E8F4', frozen: false, opacity: 0.85, blending: 'additive' },
  lny:       { color: '#FFD8B0', glowColor: '#FFB888', frozen: false, opacity: 0.85, blending: 'additive' },
  midautumn: { color: '#F4F8FF', glowColor: '#E8EFF8', frozen: false, opacity: 0.85, blending: 'additive' },
  winter:    { color: '#F8FBFF', glowColor: '#D8E4EC', frozen: true,  opacity: 0.95, blending: 'normal' },
  birthday:  { color: '#FFD0E4', glowColor: '#FFA8C8', frozen: false, opacity: 0.85, blending: 'additive' },
}

interface FallConfig {
  pos: [number, number]
  rotY: number
  height: number       // total vertical fall distance
  topWidth: number     // width at source (top)
  bottomWidth: number  // width at dispersal (bottom) — taper
  layers: number       // overlapping plane count (2-4 for depth)
  mistCount: number
}

// 4 falls on the FAR-NORTH cliff rim. CRITICAL change vs v5a:
// positions moved from radius 22 (OUTSIDE the cliff = "floating in
// air") to radius 18-19 (ON the visible grass rim). The source
// stones now sit on visible island top; the trapezoid plane hangs
// OVER the cliff edge into the void via local Z offset.
//
// Cliff body: top band radius 18-20.5 at y=-2.4. By placing at
// radius 19, sources are clearly on grass. Planes use local Z offset
// (-0.4) to push the curtain outward past radius 19.4, just past the
// rim edge — appears physically attached to the visible cliff lip.
const FALLS: FallConfig[] = [
  // HERO — wide curtain, 3 layers
  { pos: [-7, -18], rotY: -0.4, height: 14, topWidth: 1.8, bottomWidth: 2.4, layers: 3, mistCount: 40 },
  // 3 satellites
  { pos: [-13, -16], rotY: -1.0, height: 10, topWidth: 0.9, bottomWidth: 1.3, layers: 2, mistCount: 18 },
  { pos: [-2, -18.5], rotY: 0.05, height: 11, topWidth: 1.1, bottomWidth: 1.5, layers: 2, mistCount: 22 },
  { pos: [3, -18],   rotY: 0.3,  height: 9, topWidth: 0.7, bottomWidth: 1.0, layers: 2, mistCount: 14 },
]

// Water curtain texture — vertical streaks with alpha falloff at
// top + bottom + sides. Scrolls downward via material.map.offset.y
// for "flow" feel. Pure white; material color tints it.
function makeCurtainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  // Clear
  ctx.clearRect(0, 0, 64, 256)
  // Vertical brightness gradient — fade at top + bottom for soft edges
  // (helps the curtain "dissolve" into source/mist instead of hard cut)
  const grd = ctx.createLinearGradient(0, 0, 0, 256)
  grd.addColorStop(0,    'rgba(255, 255, 255, 0.50)')
  grd.addColorStop(0.15, 'rgba(255, 255, 255, 0.85)')
  grd.addColorStop(0.85, 'rgba(255, 255, 255, 0.85)')
  grd.addColorStop(1,    'rgba(255, 255, 255, 0.40)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 64, 256)
  // Vertical streaks — varying width + brightness for organic flow
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * 64 + (Math.random() - 0.5) * 2
    const w = 0.6 + Math.random() * 1.8
    const a = 0.35 + Math.random() * 0.50
    ctx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(2)})`
    ctx.fillRect(x, 0, w, 256)
  }
  // 200 sparkle dots for shimmer
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 64
    const y = Math.random() * 256
    const r = 0.3 + Math.random() * 1.2
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Soft side-edge falloff via radial gradient overlay (darkens edges)
  ctx.globalCompositeOperation = 'destination-in'
  const sideGrd = ctx.createLinearGradient(0, 0, 64, 0)
  sideGrd.addColorStop(0,    'rgba(0, 0, 0, 0.4)')
  sideGrd.addColorStop(0.2,  'rgba(0, 0, 0, 1.0)')
  sideGrd.addColorStop(0.8,  'rgba(0, 0, 0, 1.0)')
  sideGrd.addColorStop(1,    'rgba(0, 0, 0, 0.4)')
  ctx.fillStyle = sideGrd
  ctx.fillRect(0, 0, 64, 256)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 2)
  tex.needsUpdate = true
  tex.premultiplyAlpha = false
  return tex
}

let sharedTexture: THREE.CanvasTexture | null = null
function getCurtainTexture(): THREE.CanvasTexture {
  if (typeof window === 'undefined') {
    return new THREE.CanvasTexture(document.createElement('canvas'))
  }
  if (!sharedTexture) sharedTexture = makeCurtainTexture()
  return sharedTexture
}

// Build trapezoid geometry — wider at top tapering (or widening) to
// bottom. Generated as a Shape so UV maps are auto-computed.
function buildCurtainGeo(topWidth: number, bottomWidth: number, height: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-topWidth / 2, 0)
  shape.lineTo( topWidth / 2, 0)
  shape.lineTo( bottomWidth / 2, -height)
  shape.lineTo(-bottomWidth / 2, -height)
  shape.lineTo(-topWidth / 2, 0)
  return new THREE.ShapeGeometry(shape)
}

interface MistData {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
  sizeMul: number
}

function CliffFall({ config, style }: { config: FallConfig; style: SeasonStyle }) {
  const groupRef = useRef<THREE.Group>(null)
  const layerMatsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const mistRef = useRef<THREE.InstancedMesh>(null)
  const mistMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Per-layer texture clone — independent UV scroll rate gives "layered
  // depth" effect (each layer scrolls at slightly different speed)
  const layerTexes = useMemo(() => {
    const base = getCurtainTexture()
    return Array.from({ length: config.layers }, () => {
      const t = base.clone()
      t.needsUpdate = true
      t.offset.y = Math.random()
      return t
    })
  }, [config.layers])
  useEffect(() => () => layerTexes.forEach(t => t.dispose()), [layerTexes])

  // Per-layer geometry — slight width variance per layer for depth
  const layerGeos = useMemo(() => {
    return Array.from({ length: config.layers }, (_, i) => {
      const variance = 0.85 + (i / config.layers) * 0.3   // 0.85-1.15
      return buildCurtainGeo(
        config.topWidth * variance,
        config.bottomWidth * variance,
        config.height,
      )
    })
  }, [config.layers, config.topWidth, config.bottomWidth, config.height])
  useEffect(() => () => layerGeos.forEach(g => g.dispose()), [layerGeos])

  // Mist particle data — fine dispersion at base
  const mistData = useMemo<MistData[]>(() => Array.from({ length: config.mistCount }, () => ({
    x: (Math.random() - 0.5) * config.bottomWidth,
    y: -config.height + (Math.random() - 0.5) * 0.5,
    z: (Math.random() - 0.5) * 0.3,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -0.15 - Math.random() * 0.30,
    vz: (Math.random() - 0.5) * 0.3,
    life: Math.random() * 2.5,
    sizeMul: 0.8 + Math.random() * 0.8,
  })), [config.mistCount, config.bottomWidth, config.height])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime

    // Scroll each layer's texture at slightly different speed for depth
    if (!style.frozen) {
      for (let i = 0; i < layerTexes.length; i++) {
        layerTexes[i].offset.y -= dt * (2.2 + i * 0.3)
      }
    }

    // Update layer materials on season change
    for (const mat of layerMatsRef.current) {
      if (mat) {
        mat.color.set(style.color)
      }
    }

    if (glowMatRef.current) {
      glowMatRef.current.opacity = style.frozen
        ? 0.10
        : 0.22 + Math.sin(t * 1.3) * 0.05
      glowMatRef.current.color.set(style.glowColor)
    }
    if (mistMatRef.current) mistMatRef.current.color.set(style.color)

    // Mist particles
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
            p.x = (Math.random() - 0.5) * config.bottomWidth * 0.8
            p.y = -config.height + (Math.random() - 0.5) * 0.3
            p.z = (Math.random() - 0.5) * 0.4
            p.vx = (Math.random() - 0.5) * 0.5
            p.vy = -0.10 - Math.random() * 0.30
            p.vz = (Math.random() - 0.5) * 0.4
            p.life = 0
            p.sizeMul = 0.8 + Math.random() * 0.8
          }
        }
        const ageFrac = style.frozen ? 0.5 : Math.min(1, p.life / 2.5)
        const sc = config.bottomWidth * 0.10 * p.sizeMul * (0.6 + ageFrac * 0.8)
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(sc)
        dummy.updateMatrix()
        mistRef.current.setMatrixAt(i, dummy.matrix)
      }
      mistRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group
      ref={groupRef}
      position={[config.pos[0], 0, config.pos[1]]}
      rotation={[0, config.rotY, 0]}
    >
      {/* Source — 2 small dark wet rocks */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.15, config.topWidth * 0.10), 0]} />
        <meshStandardMaterial color="#1F1812" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-config.topWidth * 0.20, 0.04, 0.08]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.10, config.topWidth * 0.07), 0]} />
        <meshStandardMaterial color="#2A2018" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[config.topWidth * 0.18, 0.05, 0.05]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.08, config.topWidth * 0.06), 0]} />
        <meshStandardMaterial color="#1A140E" roughness={0.95} flatShading />
      </mesh>
      {/* Water curtains — overlapping trapezoid planes at slight
          rotations. Local Z offset (-0.4) pushes the curtain OUTWARD
          past the cliff rim so it appears physically hanging from the
          cliff edge (not floating in mid-air, which was v5a's bug).
          Slight per-layer Z stagger gives parallax depth. */}
      {layerGeos.map((geo, i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[0, -0.05, -0.4 - i * 0.08]}
          rotation={[0, (i - (config.layers - 1) / 2) * 0.10, 0]}
        >
          <meshBasicMaterial
            ref={(el) => { if (el) layerMatsRef.current[i] = el }}
            color={style.color}
            map={layerTexes[i]}
            transparent
            opacity={style.opacity * (i === 0 ? 1.0 : 0.65)}
            depthWrite={false}
            side={THREE.DoubleSide}
            alphaTest={0.01}
            blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {/* Mist particles at base for "dissolves into clouds" feel */}
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
          opacity={0.55}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </instancedMesh>
      {/* Base glow disc */}
      <mesh
        position={[0, -config.height - 0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={3}
      >
        <circleGeometry args={[config.bottomWidth * 1.2, 18]} />
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

export default function CliffWaterfalls() {
  const season = useSeason()
  const tod = useTimeOfDay()
  let style = SEASON_STYLE[season]
  // Day-mode: additive white invisible against bright sky → switch to
  // NORMAL alpha blending + saturated blue-cyan for visibility
  if (tod.phase === 'day' && !style.frozen) {
    style = {
      ...style,
      color: '#6FA8D0',       // saturated blue — readable on pale sky
      opacity: 0.78,
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
