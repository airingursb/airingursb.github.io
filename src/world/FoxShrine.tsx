// Inari fox shrine — three small torii leading to a moss-covered fox
// statue with offering bowl + lit-candle stub. Tucked along the path
// between cabin (chat zone) and hammock (reading zone) so it becomes
// a hidden discovery rather than a destination on the main map.
//
// V2 scene polish C2: the existing single torii at the island edge
// felt orphaned ("torii to nowhere"). This 3-torii tunnel + shrine
// gives the path a narrative beat: passers-by stumble on a tiny
// pilgrimage site. Pure Ghibli wabi-sabi.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGust } from './wind'

const VERMILLION = '#C84A35'
const TORII_BLK  = '#1F1812'
const STONE_FOX  = '#E8E0D2'   // pale moss-stained limestone
const MOSS       = '#5A7A4C'
const OFFERING   = '#F4D9A0'
const CANDLE     = '#FFE8B0'

// Position along the existing chat ↔ reading path (cabin -2,-1 → hammock -4,-12).
// The mid-point is around (-3, -6.5); a small clearing to the WEST of the
// path gives the shrine a slight off-path "tucked away" feel.
const POS: [number, number, number] = [-4.6, 0, -6.5]

function MiniTorii({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      {/* Two vermillion posts */}
      {[-0.32, 0.32].map((px, i) => (
        <mesh key={`p${i}`} position={[px, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.9, 10]} />
          <meshStandardMaterial color={VERMILLION} roughness={0.78} />
        </mesh>
      ))}
      {/* Nuki (lower beam) */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.78, 0.05, 0.08]} />
        <meshStandardMaterial color={VERMILLION} roughness={0.78} />
      </mesh>
      {/* Kasagi (top beam, black, with overhang) */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.95, 0.07, 0.10]} />
        <meshStandardMaterial color={TORII_BLK} roughness={0.6} />
      </mesh>
      {/* Shimaki — slim cap on top of kasagi */}
      <mesh position={[0, 1.00, 0]} castShadow>
        <boxGeometry args={[0.88, 0.035, 0.08]} />
        <meshStandardMaterial color={TORII_BLK} roughness={0.6} />
      </mesh>
    </group>
  )
}

// V2 wave 3: shimenawa rope strung between the 3 torii (acts as a
// shrine boundary marker). One thick rope spanning the full length.
function ShimenawaString() {
  return (
    <group>
      {/* Rope between torii #1 and #2 (z=-2.2 to z=-1.4) */}
      <mesh position={[0, 0.95, -1.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.8, 5]} />
        <meshStandardMaterial color="#E8DAB0" roughness={0.95} flatShading />
      </mesh>
      {/* Rope between torii #2 and #3 (z=-1.4 to z=-0.6) */}
      <mesh position={[0, 0.95, -1.0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.8, 5]} />
        <meshStandardMaterial color="#E8DAB0" roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

// Two shide (paper streamers) hanging from the rope at a given z.
// Each shide whips slightly with wind + extra on gust.
function ShideRow({ z }: { z: number }) {
  const refs = useRef<Array<THREE.Mesh | null>>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    refs.current.forEach((m, i) => {
      if (!m) return
      const phase = i * 1.3
      m.rotation.z = Math.sin(t * 1.6 + phase) * (0.12 + gust * 0.45)
      m.rotation.x = Math.cos(t * 1.1 + phase) * 0.05 * (1 + gust * 1.2)
    })
  })
  return (
    <group position={[0, 0.92, z]}>
      {[-0.18, 0.18].map((px, i) => (
        <mesh
          key={`shide${i}`}
          ref={(el) => { refs.current[i] = el }}
          position={[px, -0.10, 0]}
        >
          {/* Zigzag-ish shape via plane; rotation gives the whip */}
          <planeGeometry args={[0.05, 0.20]} />
          <meshStandardMaterial color="#F4EAD5" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function FoxStatue() {
  // Stylized seated kitsune — 2 cones (legs + tail) + sphere body +
  // smaller sphere head + 2 cone ears. Moss patches make it look old.
  return (
    <group position={[0, 0, 0]}>
      {/* Pedestal — small stone block */}
      <mesh position={[0, 0.10, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.20, 0.4]} />
        <meshStandardMaterial color="#A89E92" roughness={0.95} flatShading />
      </mesh>
      {/* Pedestal moss patches */}
      {[[-0.18, 0.22, 0.12], [0.20, 0.22, -0.10]].map(([mx, my, mz], i) => (
        <mesh key={`pm${i}`} position={[mx as number, my as number, mz as number]} castShadow>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshStandardMaterial color={MOSS} roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* Fox body — seated form, vertical capsule */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.20, 6, 12]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      {/* Front legs — short cones */}
      <mesh position={[-0.07, 0.26, 0.12]} castShadow>
        <coneGeometry args={[0.045, 0.18, 6]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      <mesh position={[0.07, 0.26, 0.12]} castShadow>
        <coneGeometry args={[0.045, 0.18, 6]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      {/* Tail — large curving cone behind */}
      <mesh position={[0, 0.42, -0.16]} rotation={[0.35, 0, 0]} castShadow>
        <coneGeometry args={[0.08, 0.32, 8]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      {/* Head — small sphere on top */}
      <mesh position={[0, 0.66, 0.04]} castShadow>
        <sphereGeometry args={[0.10, 10, 8]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      {/* Ears — two cones angled up + outward */}
      <mesh position={[-0.06, 0.78, 0.02]} rotation={[0, 0, -0.35]} castShadow>
        <coneGeometry args={[0.035, 0.10, 4]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      <mesh position={[0.06, 0.78, 0.02]} rotation={[0, 0, 0.35]} castShadow>
        <coneGeometry args={[0.035, 0.10, 4]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      {/* Snout — tiny cone forward */}
      <mesh position={[0, 0.62, 0.13]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.03, 0.06, 6]} />
        <meshStandardMaterial color={STONE_FOX} roughness={0.92} flatShading />
      </mesh>
      {/* Body moss patches — sells age */}
      <mesh position={[-0.10, 0.42, 0.08]} castShadow>
        <sphereGeometry args={[0.04, 6, 5]} />
        <meshStandardMaterial color={MOSS} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.09, 0.36, -0.05]} castShadow>
        <sphereGeometry args={[0.035, 6, 5]} />
        <meshStandardMaterial color={MOSS} roughness={0.95} flatShading />
      </mesh>
      {/* Red ribbon tied around neck — classic kitsune offering */}
      <mesh position={[0, 0.56, 0.02]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.10, 0.014, 5, 16]} />
        <meshStandardMaterial color={VERMILLION} roughness={0.8} />
      </mesh>
    </group>
  )
}

function OfferingBowl() {
  // Small wooden bowl with a fresh offering (rice / persimmon) and a
  // lit candle stub beside it. Candle has a flickering point light.
  const flameRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  // V2 wave 3: candle flame also responds to gust — tiny candle leans
  // more dramatically than fire-pit since it's smaller/lighter. On
  // very heavy gust, briefly extinguishes? No — Sub-A would catch that
  // as broken interaction. Just lean + flicker harder.
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    if (flameRef.current) {
      const flicker = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 17) * 0.04 + gust * 0.15
      flameRef.current.scale.set(flicker, flicker, flicker)
      flameRef.current.rotation.z = gust * 0.45   // lean harder than fire pit
    }
    if (lightRef.current) {
      lightRef.current.intensity = (0.35 + Math.sin(t * 9) * 0.08) * (1 + gust * 0.5)
    }
  })
  return (
    <group position={[0.5, 0.22, 0.18]}>
      {/* Bowl */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.06, 0.05, 12]} />
        <meshStandardMaterial color="#5D452B" roughness={0.85} />
      </mesh>
      {/* Offering (rice/orange) */}
      <mesh position={[0, 0.035, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={OFFERING} roughness={0.8} />
      </mesh>

      {/* Candle stub */}
      <group position={[0.16, 0, 0.04]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.06, 8]} />
          <meshStandardMaterial color="#F4EAD5" roughness={0.85} />
        </mesh>
        {/* Wick */}
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.01, 4]} />
          <meshStandardMaterial color="#1A1310" />
        </mesh>
        {/* Flame — tiny cone with emissive */}
        <mesh ref={flameRef} position={[0, 0.06, 0]}>
          <coneGeometry args={[0.015, 0.04, 6]} />
          <meshStandardMaterial
            color={CANDLE}
            emissive={CANDLE}
            emissiveIntensity={2.0}
            transparent
            opacity={0.92}
          />
        </mesh>
        {/* Warm point light at flame */}
        <pointLight ref={lightRef} position={[0, 0.06, 0]} color="#FFD080" intensity={0.35} distance={0.8} decay={2} />
      </group>
    </group>
  )
}

export default function FoxShrine() {
  return (
    <group position={POS}>
      {/* Three mini torii leading toward the fox statue — spaced along
          the south→north shrine axis with diminishing scale for forced
          perspective. The walker approaches from south. */}
      <MiniTorii x={0} z={-2.2} scale={0.85} />
      <MiniTorii x={0} z={-1.4} scale={0.92} />
      <MiniTorii x={0} z={-0.6} scale={1.00} />

      {/* V2 wave 3: shimenawa rope strung between torii beams +
          5 zigzag shide (paper streamers) — "active shrine" beat.
          Each shide is a small white plane that whips with wind. */}
      <ShimenawaString />
      {[-2.2, -1.4, -0.6].map((tz, ti) => (
        // 2 shide per torii, hanging from the rope between adjacent torii
        ti < 2 ? <ShideRow key={`sh${ti}`} z={tz - 0.4} /> : null
      ))}

      {/* The shrine itself — fox on a small stone pedestal, with
          offering bowl + candle in front. */}
      <FoxStatue />
      <OfferingBowl />

      {/* Stone path marker beside the entrance torii */}
      <mesh position={[-0.45, 0.06, -2.2]} rotation={[0.2, 0.3, 0]} castShadow>
        <boxGeometry args={[0.10, 0.20, 0.10]} />
        <meshStandardMaterial color="#7E7770" roughness={0.95} flatShading />
      </mesh>

      {/* Moss patches on the ground around the shrine — age */}
      {[
        [-0.3, 0.04, 0.2],
        [0.4, 0.04, -0.3],
        [-0.5, 0.04, -1.0],
        [0.5, 0.04, -1.5],
      ].map(([mx, my, mz], i) => (
        <mesh key={`gm${i}`} position={[mx as number, my as number, mz as number]} castShadow>
          <sphereGeometry args={[0.08, 6, 5]} />
          <meshStandardMaterial color={MOSS} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}
