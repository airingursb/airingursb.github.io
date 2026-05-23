// SHU-733 · Stylized stone lantern with warm emissive flame inside.
// Simple stack of primitives — gets replaced with proper Heap Plaza
// StoneLantern in Phase 1, but this is enough to test composition.

type Props = { position: [number, number, number] }

export default function StoneLantern({ position }: Props) {
  return (
    <group position={position}>
      {/* base stone */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.3, 8]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      {/* pillar */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      {/* lamp box (emissive interior) */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.35, 0.3, 0.35]} />
        <meshStandardMaterial
          color="#3d2810"
          emissive="#ffb060"
          emissiveIntensity={2.5}
          roughness={0.8}
        />
      </mesh>
      <pointLight position={[0, 0.95, 0]} intensity={0.6} distance={3.5} color="#ffb060" />
      {/* roof */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <coneGeometry args={[0.35, 0.2, 4]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
    </group>
  )
}
