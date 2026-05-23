// Wooden book deck — Blog zone with detailed plank floor + railing.

import { getZone } from './zones'

const WOOD       = '#8E6A45'
const WOOD_DARK  = '#5D452B'
const STONE      = '#8E8579'

export default function Deck() {
  const z = getZone('blog')
  const [x, zPos] = z.pos

  const W = 3.2
  const D = 2.0
  const FLOOR_H = 0.42

  return (
    <group position={[x, 0, zPos]}>
      {/* === Stone foundation blocks at corners + midpoints === */}
      {[
        [-W/2 + 0.2, 0.15, -D/2 + 0.2],
        [ W/2 - 0.2, 0.15, -D/2 + 0.2],
        [-W/2 + 0.2, 0.15,  D/2 - 0.2],
        [ W/2 - 0.2, 0.15,  D/2 - 0.2],
        [ 0,         0.15,  D/2 - 0.2],
        [ 0,         0.15, -D/2 + 0.2],
      ].map((p, i) => (
        <mesh key={`fnd${i}`} position={p as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
          <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* === Plank floor — individual plank strips === */}
      {Array.from({ length: 6 }).map((_, i) => {
        const zStrip = -D/2 + 0.18 + (i + 0.5) * ((D - 0.2) / 6)
        return (
          <mesh key={`plk${i}`} position={[0, FLOOR_H, zStrip]} castShadow receiveShadow>
            <boxGeometry args={[W - 0.2, 0.08, (D - 0.2) / 6 - 0.02]} />
            <meshStandardMaterial color={i % 2 ? WOOD : WOOD_DARK} roughness={0.88} />
          </mesh>
        )
      })}

      {/* === Back wall (north side, leaning surface for bookshelf) === */}
      <mesh position={[0, FLOOR_H + 0.45, -D/2 + 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.2, 0.9, 0.1]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.86} />
      </mesh>

      {/* === Stone steps down to path === */}
      {[
        [0.30, 0.5, 0.16],
        [0.18, 0.7, 0.16],
        [0.06, 0.9, 0.16],
      ].map(([h, sd, sh], i) => (
        <mesh key={`step${i}`} position={[0, h, D/2 + sd]} castShadow receiveShadow>
          <boxGeometry args={[1.4, sh, 0.34]} />
          <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* === Railing on 3 sides (back + 2 sides; front open for steps) === */}
      {/* Corner posts */}
      {[
        [-(W/2 - 0.15), -(D/2 - 0.15)],
        [ (W/2 - 0.15), -(D/2 - 0.15)],
        [-(W/2 - 0.15),  (D/2 - 0.15)],
        [ (W/2 - 0.15),  (D/2 - 0.15)],
      ].map((p, i) => (
        <mesh key={`cp${i}`} position={[p[0], FLOOR_H + 0.45, p[1]]} castShadow>
          <boxGeometry args={[0.14, 0.9, 0.14]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
        </mesh>
      ))}

      {/* Balusters on east + west sides */}
      {(['east', 'west'] as const).map((side) => {
        const sx = side === 'east' ? (W/2 - 0.15) : -(W/2 - 0.15)
        return [-0.5, 0.0, 0.5].map((bz, i) => (
          <mesh key={`bal-${side}-${i}`} position={[sx, FLOOR_H + 0.35, bz]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.7, 6]} />
            <meshStandardMaterial color={WOOD} roughness={0.9} />
          </mesh>
        ))
      })}

      {/* Top rail on east + west sides */}
      {(['east', 'west'] as const).map((side) => {
        const sx = side === 'east' ? (W/2 - 0.15) : -(W/2 - 0.15)
        return (
          <mesh key={`tr-${side}`} position={[sx, FLOOR_H + 0.78, 0]} castShadow>
            <boxGeometry args={[0.1, 0.06, D - 0.2]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
          </mesh>
        )
      })}
    </group>
  )
}
