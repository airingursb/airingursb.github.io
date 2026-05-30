// SHU-733 · Airing placeholder — brown capsule + name billboard.
// Gets replaced with stylized bear GLB in Phase 4 (with path AI).

import { Billboard, Text } from '@react-three/drei'

type Props = { position: [number, number, number] }

export default function AiringPlaceholder({ position }: Props) {
  return (
    <group position={position}>
      {/* Body capsule */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
        <meshStandardMaterial color="#6a3c1f" roughness={0.85} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial color="#6a3c1f" roughness={0.85} />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.18, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshStandardMaterial color="#5a2c10" roughness={0.85} />
      </mesh>
      <mesh position={[0.18, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshStandardMaterial color="#5a2c10" roughness={0.85} />
      </mesh>

      {/* Name + status billboard */}
      <Billboard position={[0, 1.95, 0]}>
        <Text
          fontSize={0.18}
          color="#f4ead5"
          outlineWidth={0.012}
          outlineColor="#2a1810"
          anchorY="bottom"
        >
          Airing
        </Text>
      </Billboard>
    </group>
  )
}
