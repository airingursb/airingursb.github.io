// SHU-733 · Placeholder sakura — gets replaced by Heap Plaza's RealSakura
// (curved CatmullRom trunk + alpha-cut petals InstancedMesh) in Phase 1.
//
// For now: trunk = cylinder, canopy = pink sphere. Just so the scene reads
// as "has a tree" while Phase 1 ports continue.

type Props = { position: [number, number, number] }

export default function PlaceholderSakura({ position }: Props) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.4, 3, 12]} />
        <meshStandardMaterial color="#3a2418" roughness={0.9} />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 4, 0]} castShadow>
        <sphereGeometry args={[2.2, 16, 12]} />
        <meshStandardMaterial color="#f3b8c8" roughness={0.7} emissive="#3a1822" emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}
