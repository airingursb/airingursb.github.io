// Cliff waterfalls v7 — SPRITE BILLBOARD approach.
//
// 6 previous attempts all failed because I kept trying to solve a
// fundamentally 2D problem with 3D geometry:
//   v1-v3: solid shapes (cylinder/tube)        → "snot / column"
//   v4:    particle stream                      → "scattered sparkles"
//   v5:    trapezoid plane with streak texture  → "brick pillar"
//   v6:    bezier shape + noise + sparkles      → "particle emitter"
//
// Industry convention for stylized waterfalls (Tunic, Ori, etc):
// **Sprite billboard + hand-painted alpha texture**. The sprite always
// faces the camera so the rectangular geometry is never seen. The
// texture's alpha mask defines the apparent shape. NO 3D plane edges,
// NO procedural noise patterns, NO sparkle particles.
//
// v7 painted texture (per fall, unique seed):
//   1. Soft radial gradient base — tapered "wisp" shape via alpha
//   2. 5-8 hand-placed vertical brush strokes — flowing strands
//   3. Gaussian blur over everything for "painted" softness
//   4. NO hard edges, NO bright dots
//   5. NO multi-layer compounding
//
// UV scroll = subtle flow hint. Sprite scale matches each fall's
// dimensions. Source rocks anchor the sprite to the cliff rim.

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
  default:   { color: '#FFFFFF', glowColor: '#D0E8F4', frozen: false, opacity: 0.65, blending: 'additive' },
  lny:       { color: '#FFE0BC', glowColor: '#FFB888', frozen: false, opacity: 0.70, blending: 'additive' },
  midautumn: { color: '#F4F8FF', glowColor: '#E8EFF8', frozen: false, opacity: 0.68, blending: 'additive' },
  winter:    { color: '#F8FBFF', glowColor: '#D8E4EC', frozen: true,  opacity: 0.85, blending: 'normal' },
  birthday:  { color: '#FFD0E4', glowColor: '#FFA8C8', frozen: false, opacity: 0.65, blending: 'additive' },
}

interface FallConfig {
  pos: [number, number]
  rotY: number
  // Sprite world dimensions (width × height)
  width: number
  height: number
  // Center-Y offset for the sprite (sprite is centered on its position,
  // so we offset it DOWN by half-height to align top with cliff rim)
  seed: number
  mistCount: number
}

const FALLS: FallConfig[] = [
  // HERO — main wisp, anchored on rim, hangs down past the cliff
  { pos: [-7, -18], rotY: 0, width: 3.4, height: 14, seed: 1337, mistCount: 40 },
  // Small satellite
  { pos: [-13, -15], rotY: 0, width: 1.6, height: 9, seed: 4242, mistCount: 18 },
]

// PAINTED canvas texture — hand-crafted look using radial gradients +
// brush strokes + blur. NO procedural pixel noise (which produced the
// banding "brick" effect in v5/v6). NO sparkle dots in the texture.
//
// Layers, painted top-to-bottom like a digital artist:
//   1. Linear vertical alpha gradient (fade in top, fade out bottom)
//   2. Radial side-fade (parabolic from center to sides)
//   3. 6-10 thin vertical brush strokes — subtle flow texture
//   4. Soft horizontal banding (very faint — ripple suggestion)
//   5. Gaussian blur to soften everything
function makeWaterTexture(seed: number, w = 256, h = 768): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  // Clear (transparent base)
  ctx.clearRect(0, 0, w, h)

  // Deterministic random from seed for reproducibility
  let rng = seed
  function rand(): number {
    rng = (rng * 9301 + 49297) % 233280
    return rng / 233280
  }

  // ── Layer 1: soft white wisp body via radial gradient ──────────
  // We paint with radial gradients centered along the vertical axis
  // at multiple Y positions to build up an organic "smoke wisp" shape.
  for (let yPos = 0; yPos < h; yPos += 32) {
    const yFrac = yPos / h
    const radius = w * (0.18 + 0.28 * Math.sin(yFrac * Math.PI))  // wider in middle
    const cx = w / 2 + (rand() - 0.5) * w * 0.08   // slight wobble
    const cy = yPos
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    // Brightness varies — denser at top, dispersing toward bottom
    const baseAlpha = 0.35 * (1 - yFrac * 0.5) * (1 - Math.pow(yFrac - 0.4, 2) * 0.8)
    grd.addColorStop(0,   `rgba(255, 255, 255, ${Math.max(0, baseAlpha).toFixed(3)})`)
    grd.addColorStop(0.5, `rgba(255, 255, 255, ${Math.max(0, baseAlpha * 0.5).toFixed(3)})`)
    grd.addColorStop(1,   'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)
  }

  // ── Layer 2: vertical brush strokes — 5-8 strands of flowing water ──
  const strokeCount = 5 + Math.floor(rand() * 4)
  for (let i = 0; i < strokeCount; i++) {
    const cx = w * (0.30 + rand() * 0.40)   // strokes cluster around center 30-70%
    const strokeWidth = 8 + rand() * 18      // varied stroke width
    const strokeAlpha = 0.25 + rand() * 0.35
    // Each stroke is a thin vertical brush — gradient along its width
    const grd = ctx.createLinearGradient(cx - strokeWidth, 0, cx + strokeWidth, 0)
    grd.addColorStop(0,   'rgba(255, 255, 255, 0)')
    grd.addColorStop(0.5, `rgba(255, 255, 255, ${strokeAlpha.toFixed(3)})`)
    grd.addColorStop(1,   'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grd
    // Stroke extends most of the canvas height
    const strokeTop = h * (0.05 + rand() * 0.10)
    const strokeBottom = h * (0.85 + rand() * 0.10)
    ctx.fillRect(cx - strokeWidth, strokeTop, strokeWidth * 2, strokeBottom - strokeTop)
  }

  // ── Layer 3: soft side mask (parabolic fade) — destination-in ──
  ctx.globalCompositeOperation = 'destination-in'
  // Create a horizontal alpha mask: opaque center, fades to 0 at sides
  const sideGrd = ctx.createLinearGradient(0, 0, w, 0)
  sideGrd.addColorStop(0,    'rgba(0, 0, 0, 0)')
  sideGrd.addColorStop(0.20, 'rgba(0, 0, 0, 0.85)')
  sideGrd.addColorStop(0.50, 'rgba(0, 0, 0, 1.0)')
  sideGrd.addColorStop(0.80, 'rgba(0, 0, 0, 0.85)')
  sideGrd.addColorStop(1,    'rgba(0, 0, 0, 0)')
  ctx.fillStyle = sideGrd
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  // ── Layer 4: top + bottom fade for "dissolves into source/mist" ──
  ctx.globalCompositeOperation = 'destination-in'
  const vertGrd = ctx.createLinearGradient(0, 0, 0, h)
  vertGrd.addColorStop(0,    'rgba(0, 0, 0, 0.3)')
  vertGrd.addColorStop(0.12, 'rgba(0, 0, 0, 1.0)')
  vertGrd.addColorStop(0.80, 'rgba(0, 0, 0, 1.0)')
  vertGrd.addColorStop(1,    'rgba(0, 0, 0, 0.2)')
  ctx.fillStyle = vertGrd
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1.2)
  tex.needsUpdate = true
  return tex
}

interface MistData {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
  sizeMul: number
}

function CliffFall({ config, style }: { config: FallConfig; style: SeasonStyle }) {
  const spriteRef = useRef<THREE.Sprite>(null)
  const spriteMatRef = useRef<THREE.SpriteMaterial>(null)
  const mistRef = useRef<THREE.InstancedMesh>(null)
  const mistMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Per-fall texture (unique via seed → no two identical wisps)
  const tex = useMemo(() => makeWaterTexture(config.seed), [config.seed])
  useEffect(() => () => tex.dispose(), [tex])

  // Mist particles at base
  const mistData = useMemo<MistData[]>(() => Array.from({ length: config.mistCount }, () => ({
    x: (Math.random() - 0.5) * config.width * 0.8,
    y: -config.height + (Math.random() - 0.5) * 0.5,
    z: (Math.random() - 0.5) * 0.4,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.08 - Math.random() * 0.20,
    vz: (Math.random() - 0.5) * 0.3,
    life: Math.random() * 2.5,
    sizeMul: 0.7 + Math.random() * 0.7,
  })), [config.mistCount, config.width, config.height])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    // Subtle UV scroll for flow hint
    if (!style.frozen) {
      tex.offset.y -= dt * 0.45
    }
    // Recolor
    if (spriteMatRef.current) spriteMatRef.current.color.set(style.color)
    if (mistMatRef.current) mistMatRef.current.color.set(style.color)
    if (glowMatRef.current) {
      glowMatRef.current.color.set(style.glowColor)
      glowMatRef.current.opacity = style.frozen
        ? 0.10
        : 0.22 + Math.sin(t * 1.3) * 0.05
    }
    // Mist particles
    if (mistRef.current) {
      const wind = style.frozen ? 0 : getGust(t)
      for (let i = 0; i < config.mistCount; i++) {
        const p = mistData[i]
        if (!style.frozen) {
          p.life += dt
          p.x += (p.vx + wind * 0.4) * dt
          p.y += p.vy * dt
          p.z += p.vz * dt
          if (p.life > 2.5 || p.y < -config.height - 3) {
            p.x = (Math.random() - 0.5) * config.width * 0.7
            p.y = -config.height + (Math.random() - 0.5) * 0.3
            p.z = (Math.random() - 0.5) * 0.5
            p.vx = (Math.random() - 0.5) * 0.4
            p.vy = -0.06 - Math.random() * 0.20
            p.vz = (Math.random() - 0.5) * 0.4
            p.life = 0
            p.sizeMul = 0.7 + Math.random() * 0.7
          }
        }
        const ageFrac = style.frozen ? 0.5 : Math.min(1, p.life / 2.5)
        const sc = config.width * 0.08 * p.sizeMul * (0.5 + ageFrac * 0.8)
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
        <dodecahedronGeometry args={[Math.max(0.15, config.width * 0.08), 0]} />
        <meshStandardMaterial color="#1F1812" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-config.width * 0.12, 0.04, 0.08]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.10, config.width * 0.05), 0]} />
        <meshStandardMaterial color="#2A2018" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[config.width * 0.10, 0.05, 0.05]} castShadow>
        <dodecahedronGeometry args={[Math.max(0.08, config.width * 0.04), 0]} />
        <meshStandardMaterial color="#1A140E" roughness={0.95} flatShading />
      </mesh>
      {/* SPRITE — always faces camera. Centered on its position, so
          we offset DOWN by half-height to put TOP at cliff rim.
          Slight Z offset puts it past the rim into open air. */}
      <sprite
        ref={spriteRef as any}
        position={[0, -config.height / 2, -0.4]}
        scale={[config.width, config.height, 1]}
      >
        <spriteMaterial
          ref={spriteMatRef as any}
          map={tex}
          color={style.color}
          transparent
          opacity={style.opacity}
          depthWrite={false}
          blending={style.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending}
          fog={true}
        />
      </sprite>
      {/* Mist particles at base */}
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
          opacity={0.45}
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
        <circleGeometry args={[config.width * 0.8, 18]} />
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
  if (tod.phase === 'day' && !style.frozen) {
    style = {
      ...style,
      color: '#6FA8D0',
      opacity: 0.75,
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
