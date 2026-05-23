// SHU-733 Phase 11 · Stone lantern — ported from Heap Plaza JapanGarden.
// Realistic ishidōrō: 3-tier base + tall column + hibukuro (emissive fire
// box with subtle transmission) + kasa pyramid roof + gold finial.
// Roughly 5k tris each. Adds a warm point light.

type Props = { position: [number, number, number] }

export default function StoneLantern({ position }: Props) {
  return (
    <group position={position}>
      {/* 3-tier base */}
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.3, 8]} />
        <meshPhysicalMaterial color="#9b9486" roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.36, 0.4, 0.16, 8]} />
        <meshPhysicalMaterial color="#a8a08e" roughness={0.85} />
      </mesh>
      {/* tall central column */}
      <mesh castShadow position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 0.78, 8]} />
        <meshPhysicalMaterial color="#7a7468" roughness={0.85} />
      </mesh>
      {/* mid-disc */}
      <mesh castShadow position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.1, 8]} />
        <meshPhysicalMaterial color="#7a7468" roughness={0.85} />
      </mesh>
      {/* hibukuro (fire box) */}
      <mesh castShadow position={[0, 1.58, 0]}>
        <boxGeometry args={[0.45, 0.42, 0.45]} />
        <meshPhysicalMaterial
          color="#fdf6dc"
          emissive="#fcb84d"
          emissiveIntensity={2.0}
          roughness={0.4}
          transmission={0.25}
          ior={1.3}
          thickness={0.1}
        />
      </mesh>
      {/* roof (kasa) — pyramid */}
      <mesh castShadow position={[0, 1.94, 0]}>
        <coneGeometry args={[0.5, 0.32, 8]} />
        <meshPhysicalMaterial color="#3c352c" roughness={0.85} />
      </mesh>
      {/* finial */}
      <mesh castShadow position={[0, 2.18, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshPhysicalMaterial color="#fcd34d" metalness={0.95} roughness={0.2} emissive="#fcd34d" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} intensity={0.9} distance={6} color="#fcb84d" />
    </group>
  )
}
