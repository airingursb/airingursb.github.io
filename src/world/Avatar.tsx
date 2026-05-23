// Player avatar — Airing panda sprite billboard standing on the porch.
//
// Loads the Codex-generated B01-idle-south.png as a Three.js sprite that
// always faces the camera. Stage 4 (movement) will swap directions; for
// now the avatar just stands idle on the cabin porch.

import { useMemo } from 'react'
import { useTexture, Billboard } from '@react-three/drei'

const AVATAR_URL = '/world/sprites/character/B01-idle-south.png'

export default function Avatar() {
  const tex = useTexture(AVATAR_URL)
  // Pixel sprite is 256×256; placed at ~1.4 units tall for human scale
  const aspect = 1.0
  const height = 1.4
  const width = height * aspect

  // Position: standing in front of the cabin on the porch
  return (
    <Billboard position={[-2.0, 0.95, 0.5]} follow={true} lockX={false} lockY={false} lockZ={false}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.5} />
      </mesh>
    </Billboard>
  )
}
