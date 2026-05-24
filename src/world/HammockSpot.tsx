// Reading nook — two pines + hammock + campfire ring + open book.
// Per Sub-A: add lived-in retreat details (campfire ring, book on hammock).

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getGust } from './wind'
import * as THREE from 'three'
import { getZone } from './zones'

const TRUNK_LIGHT = '#7A5E3E'
const TRUNK_DARK  = '#4A361F'
const FOLIAGE_A   = '#5A7A4C'
const FOLIAGE_B   = '#4A6B40'
const HAMMOCK     = '#C97B5C'
const ROPE        = '#A48B6E'
const STONE       = '#8B7F6E'
const CHARCOAL    = '#1F1611'
const ASH         = '#9E9890'
const BOOK_COVER  = '#5E5288'
const BOOK_PAGE   = '#F4EAD5'

function Pine({ scale = 1, position }: { scale?: number; position: [number, number, number] }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.8, 8]} />
        <meshStandardMaterial color={TRUNK_DARK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.02, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.6, 8]} />
        <meshStandardMaterial color={TRUNK_LIGHT} roughness={0.95} flatShading />
      </mesh>
      {[
        [0, 2.3, 1.1, 1.1, FOLIAGE_A],
        [0, 2.7, 0.95, 0.9, FOLIAGE_B],
        [0, 3.05, 0.8, 0.75, FOLIAGE_A],
        [0, 3.4, 0.65, 0.6, FOLIAGE_B],
        [0, 3.7, 0.4, 0.45, FOLIAGE_A],
      ].map(([px, py, pr, ph, color], i) => (
        <mesh key={`can${i}`} position={[px as number, py as number, 0]} castShadow>
          <coneGeometry args={[pr as number, ph as number, 9]} />
          <meshStandardMaterial color={color as string} roughness={0.94} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export default function HammockSpot() {
  const z = getZone('reading')
  const [x, zPos] = z.pos

  const hammockSegments = useMemo(() => {
    const arr: Array<[number, number, number]> = []
    const N = 12
    const span = 2.4
    const drop = 0.45
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1)
      const px = -span / 2 + span * t
      const py = 0.95 - drop * 4 * t * (1 - t)
      const pz = 0
      arr.push([px, py, pz])
    }
    return arr
  }, [])

  // Hammock sway — both rotation and translation
  const hammockRef = useRef<THREE.Group>(null)
  // V2 wave 3: hammock sway responds to gust — calm: ±0.06/±0.08
  // (unchanged). Peak gust: 2.2× → visible whip during wind event.
  useFrame((s) => {
    if (hammockRef.current) {
      const t = s.clock.elapsedTime
      const gust = getGust(t)
      const boost = 1 + gust * 1.2
      hammockRef.current.rotation.z = Math.sin(t * 0.6) * 0.06 * boost
      hammockRef.current.position.x = Math.sin(t * 0.4) * 0.08 * boost
    }
  })

  return (
    <group position={[x, 0, zPos]}>
      <Pine scale={1.05} position={[-1.4, 0, 0]} />
      <Pine scale={1.0}  position={[ 1.4, 0, 0]} />

      {/* Hammock (swings) — V2 A3: book + glasses also live inside this
          group so they sway with the hammock instead of floating apart. */}
      <group ref={hammockRef}>
      {hammockSegments.map(([hx, hy, hz], i) => (
        <mesh key={`h${i}`} position={[hx, hy, hz]} castShadow>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color={HAMMOCK} roughness={0.85} />
        </mesh>
      ))}
      {[-0.7, -0.2, 0.2, 0.7].map((cx, i) => (
        <mesh key={`hw${i}`} position={[cx, 0.95 - 0.4, 0]} castShadow>
          <boxGeometry args={[0.06, 0.04, 0.34]} />
          <meshStandardMaterial color={HAMMOCK} roughness={0.85} />
        </mesh>
      ))}

      {/* Open book face-down on hammock — "she just walked away from this" */}
      <group position={[0.3, 0.72, 0.0]} rotation={[0, 0.3, -0.18]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.22, 0.012, 0.16]} />
          <meshStandardMaterial color={BOOK_COVER} roughness={0.86} />
        </mesh>
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.205, 0.018, 0.148]} />
          <meshStandardMaterial color={BOOK_PAGE} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.012, -0.075]}>
          <boxGeometry args={[0.22, 0.02, 0.012]} />
          <meshStandardMaterial color={BOOK_COVER} roughness={0.86} />
        </mesh>
        {/* Bookmark ribbon hanging out of pages */}
        <mesh position={[0.06, 0.013, 0.045]} rotation={[0, 0.4, 0]}>
          <planeGeometry args={[0.018, 0.12]} />
          <meshStandardMaterial color="#C13E3E" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Reading glasses — folded beside book */}
      <group position={[-0.05, 0.7, 0.04]} rotation={[0, 0.4, -0.18]}>
        <mesh position={[-0.04, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.025, 0.004, 6, 16]} />
          <meshStandardMaterial color="#3A2516" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0.04, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.025, 0.004, 6, 16]} />
          <meshStandardMaterial color="#3A2516" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.018, 4]} />
          <meshStandardMaterial color="#3A2516" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[-0.05, 0.005, -0.02]} rotation={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.06, 4]} />
          <meshStandardMaterial color="#3A2516" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0.05, 0.005, -0.02]} rotation={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.06, 4]} />
          <meshStandardMaterial color="#3A2516" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>
      </group>

      {/* Rope knots at tree attachments */}
      {[-1.2, 1.2].map((rx, i) => (
        <group key={`rope${i}`}>
          <mesh position={[rx, 1.05, 0]} castShadow>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color={ROPE} roughness={0.9} />
          </mesh>
          <mesh position={[rx + (rx > 0 ? -0.05 : 0.05), 1.4, 0]} rotation={[0, 0, rx > 0 ? 0.1 : -0.1]}>
            <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
            <meshStandardMaterial color={ROPE} roughness={0.9} />
          </mesh>
        </group>
      ))}


      {/* === Campfire ring nearby === */}
      <group position={[1.5, 0, -1.4]}>
        {/* 8 stones in a circle */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          const sx = Math.cos(a) * 0.42
          const sz = Math.sin(a) * 0.42
          return (
            <mesh key={`fs${i}`} position={[sx, 0.12, sz]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.12 + (i % 3) * 0.02, 0]} />
              <meshStandardMaterial color={i % 2 ? STONE : '#7A6F60'} roughness={0.95} flatShading />
            </mesh>
          )
        })}
        {/* Charred log cross */}
        <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
          <meshStandardMaterial color={CHARCOAL} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
          <meshStandardMaterial color={CHARCOAL} roughness={0.95} />
        </mesh>
        {/* Ash pile */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 10]} />
          <meshStandardMaterial color={ASH} roughness={0.95} />
        </mesh>
      </group>

      {/* Ground decorations — mushrooms */}
      {[[-0.3, 0.5], [0.4, -0.6], [-0.7, -0.3]].map(([mx, mz], i) => (
        <group key={`mush${i}`} position={[mx, 0.04, mz]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.2, 6]} />
            <meshStandardMaterial color="#E8DAB0" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={i === 1 ? "#E29A4A" : "#C13E3E"} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
