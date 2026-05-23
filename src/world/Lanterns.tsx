// Scattered lanterns — slightly dimmer at daytime but still part of the
// scene's charm. Each has a small point light + emissive glow that adds
// warm pools to shadow areas.

import { LANTERN_POSITIONS } from './zones'

const POST_DARK = '#3A2818'
const POST_WARM = '#5D452B'
const GLOW      = '#FFD58F'

function Lantern() {
  return (
    <group>
      {/* Wooden post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1.4, 6]} />
        <meshStandardMaterial color={POST_WARM} roughness={0.92} flatShading />
      </mesh>
      {/* Top bracket */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.18]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.9} />
      </mesh>
      {/* Lantern body */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[0.2, 0.24, 0.2]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.85} />
      </mesh>
      {/* Glow pane */}
      <mesh position={[0, 1.58, 0]}>
        <boxGeometry args={[0.14, 0.16, 0.14]} />
        <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.4} />
      </mesh>
      {/* Roof on top of lantern */}
      <mesh position={[0, 1.74, 0]} castShadow>
        <coneGeometry args={[0.15, 0.12, 4]} />
        <meshStandardMaterial color={POST_DARK} roughness={0.9} />
      </mesh>
      {/* Subtle warm point light — dimmer in daytime */}
      <pointLight color="#FFD58F" intensity={0.45} distance={3.0} decay={2} position={[0, 1.58, 0]} />
    </group>
  )
}

export default function Lanterns() {
  return (
    <group>
      {LANTERN_POSITIONS.map(([x, z], i) => (
        <group key={`l${i}`} position={[x, 0, z]}>
          <Lantern />
        </group>
      ))}
    </group>
  )
}
