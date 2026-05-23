// SHU-733/735 · Render a remote peer in the 3D scene.
//
// Smooth-interpolated position (peer state updates arrive at ~10 Hz, we
// lerp visually per-frame for fluid motion). Nameplate billboard above
// head shows displayName + species emoji.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import PlayerAvatar from './PlayerAvatar'

const SPECIES_EMOJI: Record<string, string> = {
  bear: '🐻', cat: '🐱', fox: '🦊', capybara: '🐹', bird: '🐦',
  bunny: '🐰', puppy: '🐶', panda: '🐼', hamster: '🐹',
  penguin: '🐧', frog: '🐸',
}

interface Props {
  species: string
  displayName?: string
  x: number; y: number; z: number; rotY: number
}

export default function PeerAvatar({ species, displayName, x, y, z, rotY }: Props) {
  const root = useRef<THREE.Group>(null)
  const target = useRef(new THREE.Vector3(x, y, z))
  const targetRot = useRef(rotY)

  // Update target whenever props change; root group lerps toward target.
  target.current.set(x, y, z)
  targetRot.current = rotY

  useFrame(() => {
    if (!root.current) return
    root.current.position.lerp(target.current, 0.22)
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, targetRot.current, 0.18)
  })

  const emoji = SPECIES_EMOJI[species] ?? '🐾'
  const label = displayName ? `${emoji} ${displayName}` : emoji

  return (
    <group ref={root}>
      <PlayerAvatar species={species} />
      <Billboard position={[0, 1.4, 0]}>
        <Text
          fontSize={0.16}
          color="#e8edf7"
          outlineWidth={0.012}
          outlineColor="#1a1f2a"
          anchorY="bottom"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  )
}
