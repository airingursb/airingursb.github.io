// Player avatar — Airing panda sprite billboard with proper PBR
// integration. Receives lighting from directional sun, has contact
// shadow disc, locked vertical so doesn't pitch on camera dolly.

import { useTexture, Billboard } from '@react-three/drei'
import * as THREE from 'three'

const AVATAR_URL = '/world/sprites/character/B01-idle-south.png'

export default function Avatar() {
  const tex = useTexture(AVATAR_URL)
  const aspect = 1.0
  const height = 1.4
  const width = height * aspect

  // Position: standing in front of cabin door
  const pos: [number, number, number] = [-2.0, 0.95, 0.5]

  return (
    <group>
      {/* Hand-baked contact shadow disc on ground */}
      <mesh position={[pos[0], 0.62, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.45} roughness={1} />
      </mesh>
      {/* The billboarded sprite — uses standardMaterial so sun affects it,
          slight emissive so it doesn't go fully dark in shadows. lockY so
          it stays upright when the camera tilts. */}
      <Billboard position={pos} follow={true} lockY>
        <mesh castShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            map={tex}
            transparent
            alphaTest={0.5}
            side={THREE.DoubleSide}
            emissive="#ffffff"
            emissiveMap={tex}
            emissiveIntensity={0.25}
            roughness={0.9}
          />
        </mesh>
      </Billboard>
    </group>
  )
}
