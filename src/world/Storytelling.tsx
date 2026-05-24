// Storytelling props — fallen logs, stumps, woodpiles, signposts, cairns.
// These small touches sell the "someone lives here" feel.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getGust } from './wind'

const LOG_LIGHT  = '#9E7A52'
const LOG_DARK   = '#6E4F31'
const LOG_END    = '#5A3D1F'
const MOSS       = '#7A9268'
const STONE      = '#A89A82'
const STONE_DK   = '#7A6F60'
const PLANK      = '#7A5B3C'
const PAPER      = '#F4EAD5'
const INK        = '#3A2516'

function FallenLog({ position, rotation, length = 2.0 }: { position: [number, number, number]; rotation: number; length?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main log */}
      <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.2, length, 10]} />
        <meshStandardMaterial color={LOG_LIGHT} roughness={0.94} flatShading />
      </mesh>
      {/* End grain caps */}
      {[-length / 2, length / 2].map((ex, i) => (
        <mesh key={`ec${i}`} position={[ex, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 12]} />
          <meshStandardMaterial color={LOG_END} flatShading />
        </mesh>
      ))}
      {/* Moss strip on top */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[length * 0.8, 0.04, 0.16]} />
        <meshStandardMaterial color={MOSS} roughness={0.96} />
      </mesh>
      {/* Mushroom clumps at rotting end */}
      <group position={[length / 2 - 0.1, 0.05, 0.15]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.16, 6]} />
          <meshStandardMaterial color="#E8DAB0" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <sphereGeometry args={[0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#E29A4A" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}

function TreeStump({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stump */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.4, 12]} />
        <meshStandardMaterial color={LOG_LIGHT} roughness={0.95} flatShading />
      </mesh>
      {/* Top end-grain with concentric rings */}
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 16]} />
        <meshStandardMaterial color={LOG_END} flatShading />
      </mesh>
      {[0.06, 0.12, 0.18, 0.24].map((r, i) => (
        <mesh key={`ring${i}`} position={[0, 0.415, 0]}>
          <torusGeometry args={[r, 0.008, 4, 16]} />
          <meshStandardMaterial color={LOG_DARK} />
        </mesh>
      ))}
      {/* Roots peeking */}
      <mesh position={[0.3, 0.05, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.06, 0.04, 0.3, 6]} />
        <meshStandardMaterial color={LOG_DARK} roughness={0.95} />
      </mesh>
      <mesh position={[-0.28, 0.05, 0.1]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.06, 0.04, 0.3, 6]} />
        <meshStandardMaterial color={LOG_DARK} roughness={0.95} />
      </mesh>
    </group>
  )
}

function StoneCairn({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stack of 4 stones, biggest at bottom */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.04, 0.5, 0]} castShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={STONE_DK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-0.03, 0.78, 0.03]} castShadow>
        <dodecahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.02, 1.0, 0]} castShadow>
        <dodecahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={STONE_DK} roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

function Signpost({ position, rotation, label }: { position: [number, number, number]; rotation: number; label: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 1.4, 6]} />
        <meshStandardMaterial color={LOG_DARK} roughness={0.92} flatShading />
      </mesh>
      {/* Arrow-shaped sign */}
      <mesh position={[0.3, 1.1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.2, 0.04]} />
        <meshStandardMaterial color={PLANK} roughness={0.88} />
      </mesh>
      {/* Arrow point — small triangle on right */}
      <mesh position={[0.62, 1.1, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.14, 0.14, 0.04]} />
        <meshStandardMaterial color={PLANK} roughness={0.88} />
      </mesh>
      {/* Text suggestion — small dark lines on sign */}
      <mesh position={[0.2, 1.1, 0.025]}>
        <boxGeometry args={[0.4, 0.04, 0.005]} />
        <meshStandardMaterial color={INK} />
      </mesh>
    </group>
  )
}

function WoodPile({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <group key={`${row}-${col}`}>
            <mesh
              position={[-0.3 + col * 0.2, 0.1 + row * 0.18, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.08, 0.08, 0.18, 10]} />
              <meshStandardMaterial color={(row + col) % 2 ? LOG_LIGHT : LOG_DARK} roughness={0.92} />
            </mesh>
            <mesh
              position={[-0.3 + col * 0.2 + 0.09, 0.1 + row * 0.18, 0]}
            >
              <cylinderGeometry args={[0.08, 0.08, 0.02, 10]} />
              <meshStandardMaterial color={LOG_END} flatShading />
            </mesh>
          </group>
        ))
      )}
    </group>
  )
}

// V2 wave 3: paper lanterns sway on gust + each lantern has its own
// slight independent phase offset (lighter paper → more reactive).
function PaperLanternString() {
  const positions: [number, number, number, string][] = [
    [-0.8, 1.7, 0, '#E25A4C'],
    [-0.4, 1.6, 0, '#FCD757'],
    [ 0.0, 1.55, 0, '#F2A8C8'],
    [ 0.4, 1.6, 0, '#E25A4C'],
    [ 0.8, 1.7, 0, '#FCD757'],
  ]
  const refs = useRef<Array<THREE.Group | null>>([])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const gust = getGust(t)
    refs.current.forEach((g, i) => {
      if (!g) return
      g.rotation.z = Math.sin(t * 1.0 + i * 0.7) * (0.04 + gust * 0.20)
    })
  })
  return (
    <group position={[-4.0, 0, -12.0]}>
      {/* Rope */}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 2.4, 4]} />
        <meshStandardMaterial color="#A48B6E" roughness={0.9} />
      </mesh>
      {positions.map(([x, y, z, color], i) => (
        <group key={`pl${i}`} ref={(el) => { refs.current[i] = el }} position={[x, y, z]}>
          <mesh castShadow>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.85} emissive={color} emissiveIntensity={0.15} />
          </mesh>
          {/* Top cap */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.06, 0.02, 0.06]} />
            <meshStandardMaterial color="#3A2818" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function Storytelling() {
  return (
    <group>
      {/* Fallen logs scattered in forest */}
      <FallenLog position={[-9.0, 0, -7.0]} rotation={0.4} length={2.4} />
      <FallenLog position={[12.0, 0, -8.0]} rotation={-0.7} length={2.0} />
      <FallenLog position={[-12.0, 0, 8.0]} rotation={1.1} length={2.2} />
      <FallenLog position={[8.0, 0, 12.0]} rotation={2.0} length={1.8} />

      {/* Tree stumps */}
      <TreeStump position={[3.5, 0, -3.0]} />
      <TreeStump position={[-2.5, 0, 7.5]} />
      <TreeStump position={[10.0, 0, 4.0]} />

      {/* Stone cairns */}
      <StoneCairn position={[-7.0, 0, -3.0]} />
      <StoneCairn position={[7.5, 0, 8.5]} />
      <StoneCairn position={[15.0, 0, -1.0]} />

      {/* Signposts at actual path forks — Sub-A wave-3 bonus fix:
          previously clustered tight around cabin (±2.4) → read as
          fence, not wayfinding. Spread to path-junction positions
          near where the path branches toward each zone. */}
      <Signpost position={[-1.5, 0, -3.5]} rotation={-Math.PI / 4} label="reading" />
      <Signpost position={[ 4.5, 0, -0.5]} rotation={Math.PI / 2} label="music" />
      <Signpost position={[-3.5, 0,  1.8]} rotation={Math.PI} label="comics" />
      <Signpost position={[ 3.8, 0,  6.5]} rotation={Math.PI / 4} label="blog" />

      {/* Woodpile near cabin */}
      <WoodPile position={[-2.5, 0, -1.2]} />

      {/* Paper lanterns string at hammock spot */}
      <PaperLanternString />
    </group>
  )
}
