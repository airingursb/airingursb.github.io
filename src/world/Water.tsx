// Water systems — pond, river, waterfall.
//
// Iter 4 overhaul (per Sub-A gap #2 + #3):
//   - MeshTransmissionMaterial on water surface (real refraction + thickness)
//   - Foam ring at shoreline edges
//   - Animated waterfall (downward UV scroll on 6 thin vertical strips)
//   - Sparkles particles at waterfall + base splash
//   - Animated wave displacement still present

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { POND_CENTER, POND_RADIUS } from './zones'

const WATER_TOP   = '#A6D3D9'
const WATER_DEEP  = '#4E7A88'
const BED_STONE   = '#7A746A'
const LILYPAD     = '#5A7A4C'
const LILYFLOWER  = '#F4E6E0'
const FOAM        = '#FFFFFF'

function WavingPond({ x, z, radius }: { x: number; z: number; radius: number }) {
  const surf = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(radius, 32, 0, Math.PI * 2)
    g.rotateX(-Math.PI / 2)
    return g
  }, [radius])

  // Sub-A perf fix: drop per-frame computeVertexNormals(). Ripple
  // amplitude is 0.012 — sub-perceptible normal change for the
  // smooth-shaded material. Walking every face per frame was ~1-2ms
  // for zero visible gain. Vertex normals are baked at geometry
  // creation; only position updates per frame now.
  useFrame((s) => {
    const m = surf.current
    if (!m) return
    const t = s.clock.elapsedTime
    const pos = m.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), pz = pos.getZ(i)
      const d = Math.hypot(px, pz)
      pos.setY(i, Math.sin(t * 1.2 + d * 1.2) * 0.012 + Math.cos(t * 0.6 + px * 0.8) * 0.008)
    }
    pos.needsUpdate = true
  })

  return (
    <group position={[x, 0.18, z]}>
      {/* Pond bed (dark below) */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.15, 32]} />
        <meshStandardMaterial color={WATER_DEEP} roughness={0.6} />
      </mesh>

      {/* Surface — cheap shaded plane instead of MeshTransmissionMaterial
          (which renders the scene to a texture every frame — 5-10ms cost).
          Visual loss: no real refraction. Visual gain: keeps 60 FPS budget. */}
      <mesh ref={surf} geometry={geo}>
        <meshStandardMaterial
          color={WATER_TOP}
          roughness={0.18}
          metalness={0.35}
          transparent
          opacity={0.78}
          envMapIntensity={1.1}
        />
      </mesh>

      {/* Foam ring at the shoreline */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.15, radius + 0.08, 48]} />
        <meshStandardMaterial color={FOAM} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Light caustic decals on bed (slowly animated) */}
      <Caustics />

      {/* Riverbed stones around edge */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = (i / 11) * Math.PI * 2
        const ex = Math.cos(a) * radius * 0.93
        const ez = Math.sin(a) * radius * 0.93
        const r = 0.18 + ((i * 17) % 7) * 0.04
        return (
          <mesh key={`bs${i}`} position={[ex, 0.0, ez]} castShadow receiveShadow>
            <dodecahedronGeometry args={[r, 0]} />
            <meshStandardMaterial color={BED_STONE} roughness={0.95} flatShading />
          </mesh>
        )
      })}

      {/* V2 D2: lily pads now bob gently on Y axis (phase-offset per
          pad) so the water surface reads as "moving" rather than static.
          Subtle — 0.018 amp / 1.5s period — but adds life to the pond. */}
      <LilyPads />
    </group>
  )
}

function LilyPads() {
  const pads = [
    [0.5, 0.2], [-0.8, 0.6], [0.2, -1.0], [-1.2, -0.5],
    [1.4, 0.5], [-0.4, -1.4], [1.2, -0.4],
  ] as [number, number][]
  const refs = pads.map(() => useRef<THREE.Group>(null))
  useFrame((s) => {
    const t = s.clock.elapsedTime
    refs.forEach((r, i) => {
      const g = r.current
      if (!g) return
      g.position.y = 0.04 + Math.sin(t * 1.0 + i * 0.7) * 0.018
      g.rotation.z = Math.sin(t * 0.6 + i * 0.9) * 0.04
    })
  })
  return (
    <>
      {pads.map(([lx, lz], i) => (
        <group key={`lp${i}`} ref={refs[i]} position={[lx, 0.04, lz]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.02, 10]} />
            <meshStandardMaterial color={LILYPAD} roughness={0.9} flatShading />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0, 0.04, 0]}>
              <sphereGeometry args={[0.07, 6, 5]} />
              <meshStandardMaterial color={LILYFLOWER} roughness={0.7} />
            </mesh>
          )}
        </group>
      ))}
    </>
  )
}

function Caustics() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const m = ref.current
    if (!m) return
    m.rotation.z = s.clock.elapsedTime * 0.05
  })
  return (
    <mesh ref={ref} position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.1, 2.2, 32]} />
      <meshBasicMaterial color="#E0F2F8" transparent opacity={0.18} side={THREE.DoubleSide} />
    </mesh>
  )
}

const STREAM_POINTS: [number, number][] = [
  [-7.0,  5.0],
  [-4.0,  4.5],
  [-1.0,  4.0],
  [ 2.0,  4.4],
  [ 4.8,  5.0],
  [ 6.2,  5.6],
  [ 7.8,  6.0],
]

function River() {
  const tubeMain = useMemo(() => {
    const pts = STREAM_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.08, z))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45)
    return new THREE.TubeGeometry(curve, 90, 0.55, 8, false)
  }, [])
  const tubeBed = useMemo(() => {
    const pts = STREAM_POINTS.map(([x, z]) => new THREE.Vector3(x, -0.05, z))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45)
    return new THREE.TubeGeometry(curve, 90, 0.7, 8, false)
  }, [])

  const surfRef = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const m = surfRef.current
    if (!m) return
    const mat = m.material as THREE.MeshStandardMaterial
    if (mat.normalScale) mat.normalScale.setScalar(0.4 + Math.sin(s.clock.elapsedTime * 1.5) * 0.05)
  })

  return (
    <group>
      <mesh geometry={tubeBed} receiveShadow>
        <meshStandardMaterial color={WATER_DEEP} roughness={0.6} />
      </mesh>
      <mesh ref={surfRef} geometry={tubeMain}>
        <meshStandardMaterial color={WATER_TOP} roughness={0.2} metalness={0.3} transparent opacity={0.85} />
      </mesh>
      {/* Foam streaks where river meets riverbed stones */}
      {[
        [-6.0, 4.6, 0.2],
        [-4.5, 4.3, 0.18],
        [-2.0, 3.7, 0.22],
        [ 0.5, 4.0, 0.18],
        [ 3.0, 4.6, 0.2],
        [ 5.5, 5.4, 0.18],
        [ 7.0, 5.8, 0.2],
      ].map(([x, z, r], i) => (
        <group key={`rsg${i}`}>
          <mesh position={[x, 0.08, z]} castShadow>
            <dodecahedronGeometry args={[r as number, 0]} />
            <meshStandardMaterial color={BED_STONE} roughness={0.95} flatShading />
          </mesh>
          {/* Foam around stone */}
          <mesh position={[x, 0.13, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r as number * 1.1, r as number * 1.5, 12]} />
            <meshBasicMaterial color={FOAM} transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// V2 (scene polish C3): arched moss-stone bridge replaces the flat
// wooden plank one. The old bridge was the weakest geometry on the
// island — broke the Ghibli arch language (torii / cabin gable /
// gazebo dome / lantern). An arched bridge harmonizes with the
// stone-lantern + cairns palette and adds a vertical accent over
// the river. Built from a 180°-arc TorusGeometry slab + keystones +
// a few moss patches on the upstream face.
const STONE      = '#9C928A'
const STONE_DARK = '#6D6660'
const MOSS       = '#4E6E40'

function Bridge() {
  return (
    <group position={[0, 0.3, 4.0]}>
      {/* Main arch — half-torus, oriented so deck spans X axis and
          rise points up. r=0.85 inner radius, tube=0.18 thickness. */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.85, 0.18, 10, 24, Math.PI]} />
        <meshStandardMaterial color={STONE} roughness={0.94} flatShading />
      </mesh>
      {/* Deck slab on top of the arch — slightly darker for path
          read. Slight curvature faked via 3 short planks following the
          torus crown. */}
      {[-0.55, 0, 0.55].map((px, i) => {
        const a = i * 0.35   // slight tilt for each plank
        return (
          <mesh
            key={`d${i}`}
            position={[px, 0.85 - Math.abs(px) * 0.20, 0]}
            rotation={[0, 0, px * 0.45]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.55, 0.08, 1.2]} />
            <meshStandardMaterial color={STONE_DARK} roughness={0.92} flatShading />
          </mesh>
        )
      })}
      {/* Keystones — small wedge accents at the arch crown */}
      <mesh position={[0, 0.78, 0.62]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.18, 0.16]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.78, -0.62]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.14, 0.18, 0.16]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} flatShading />
      </mesh>
      {/* Low parapet stones along the deck edges (4 each side) */}
      {[-0.5, 0.5].map((rx, i) => (
        <group key={`rail${i}`}>
          {[-0.45, -0.15, 0.15, 0.45].map((pz, j) => {
            const dx = Math.abs(rx)
            const dy = 0.85 - dx * 0.20 + 0.10
            return (
              <mesh key={`s${j}`} position={[rx, dy, pz]} castShadow>
                <boxGeometry args={[0.16, 0.18, 0.22]} />
                <meshStandardMaterial color={STONE} roughness={0.92} flatShading />
              </mesh>
            )
          })}
        </group>
      ))}
      {/* Moss patches on the upstream face — small green tufts where
          water spray would land. Adds wabi-sabi age. */}
      {[[-0.55, 0.18, 0.95], [-0.20, 0.32, 0.95], [0.30, 0.22, 0.95], [0.65, 0.15, 0.95]].map(([mx, my, mz], i) => (
        <mesh key={`m${i}`} position={[mx as number, my as number, mz as number]} castShadow>
          <sphereGeometry args={[0.07, 6, 5]} />
          <meshStandardMaterial color={MOSS} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function AnimatedWaterfall() {
  // 6 thin vertical strips with downward UV scrolling for "falling water"
  const strips = useRef<THREE.Mesh[]>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    strips.current.forEach((m, i) => {
      if (!m) return
      // Animate Y position to fake downward flow
      m.position.y = -2.5 + Math.sin(t * 2 + i * 0.5) * 0.1
    })
  })
  return (
    <group position={[15.0, -1.0, 5.0]}>
      {/* Top lip — small wooden ledge where water spills */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.6, 0.18, 0.6]} />
        <meshStandardMaterial color="#7A6F60" roughness={0.95} flatShading />
      </mesh>
      {/* 6 vertical falling strips */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -0.5 + (i / 5) * 1.0
        return (
          <mesh
            key={`s${i}`}
            ref={(el) => { if (el) strips.current[i] = el }}
            position={[x, -2.5, 0]}
          >
            <boxGeometry args={[0.15, 5, 0.08]} />
            <meshStandardMaterial
              color={WATER_TOP}
              roughness={0.2}
              metalness={0.35}
              transparent
              opacity={0.55}
            />
          </mesh>
        )
      })}
      {/* Sparkles along the falling water */}
      <Sparkles
        count={60}
        scale={[1.2, 5, 0.5]}
        size={3}
        speed={0.4}
        color="#FFFFFF"
        opacity={0.7}
      />
      {/* Splash base — animated radial ring at bottom */}
      <SplashRing y={-5.5} />
      <SplashRing y={-5.3} delay={1} />
      {/* Mist clouds at base. Sub-A fix: y was -5.5/-5.7 → mist
          floated in the void cloud-sea well below the island, reading
          as orphan ghosts. Pulled up to y=-2 so they sit at the
          waterfall's lower lip, integrated with the splash rings. */}
      <mesh position={[0, -2.0, 0]}>
        <sphereGeometry args={[1.4, 14, 10]} />
        <meshStandardMaterial color="#E0F0F5" roughness={0.4} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0.5, -2.2, 0.4]}>
        <sphereGeometry args={[1.0, 12, 10]} />
        <meshStandardMaterial color="#E0F0F5" roughness={0.4} transparent opacity={0.28} />
      </mesh>
      <mesh position={[-0.6, -2.0, -0.3]}>
        <sphereGeometry args={[0.9, 12, 10]} />
        <meshStandardMaterial color="#E0F0F5" roughness={0.4} transparent opacity={0.32} />
      </mesh>
    </group>
  )
}

function SplashRing({ y, delay = 0 }: { y: number; delay?: number }) {
  const r = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const m = r.current
    if (!m) return
    const t = (s.clock.elapsedTime + delay) % 2
    m.scale.setScalar(0.5 + t * 0.8)
    const mat = m.material as THREE.MeshBasicMaterial
    mat.opacity = Math.max(0, 0.6 - t * 0.3)
  })
  return (
    <mesh ref={r} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.4, 0.55, 16]} />
      <meshBasicMaterial color={FOAM} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function Water() {
  return (
    <group>
      <WavingPond x={POND_CENTER[0]} z={POND_CENTER[1]} radius={POND_RADIUS} />
      <River />
      <Bridge />
      <AnimatedWaterfall />
    </group>
  )
}
