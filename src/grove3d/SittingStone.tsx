// SHU-733 · Flat-top stone for the user + Airing to sit on.
// Will have pulsing glow ring on top once Glow primitive is ported.

type Props = { position: [number, number, number] }

export default function SittingStone({ position }: Props) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.95, 0.5, 8]} />
        <meshStandardMaterial color="#6a6a68" roughness={0.95} />
      </mesh>
      {/* TODO Phase 6: pulsing glow ring on top */}
    </group>
  )
}
