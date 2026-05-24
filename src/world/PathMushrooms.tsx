// V2 wave 3: small red/cream mushrooms scattered along the path —
// classic forest-floor wabi-sabi detail. Hand-placed at offsets from
// PATH_POINTS so they cluster near the path but don't sit on it.

import { PATH_POINTS } from './zones'

// (point-index, lateral offset, scale, cap color)
const MUSHROOMS: Array<{ idx: number; lat: number; scale: number; capColor: string }> = [
  { idx: 1,  lat:  0.6, scale: 1.0, capColor: '#C13E3E' },
  { idx: 3,  lat: -0.7, scale: 0.85, capColor: '#E89A4A' },
  { idx: 7,  lat:  0.5, scale: 0.9, capColor: '#C13E3E' },
  { idx: 10, lat: -0.8, scale: 1.1, capColor: '#A0301E' },
  { idx: 14, lat:  0.7, scale: 0.95, capColor: '#E89A4A' },
  { idx: 17, lat:  0.6, scale: 0.85, capColor: '#C13E3E' },
  { idx: 21, lat: -0.7, scale: 1.0, capColor: '#C13E3E' },
]

function Mushroom({ x, z, scale, capColor }: { x: number; z: number; scale: number; capColor: string }) {
  return (
    <group position={[x, 0.04, z]} scale={scale}>
      {/* Stem */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.16, 6]} />
        <meshStandardMaterial color="#F4EAD5" roughness={0.92} />
      </mesh>
      {/* Cap (dome) */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={capColor} roughness={0.85} />
      </mesh>
      {/* 3 small white spots on cap */}
      {[
        [0.03, 0.20, 0.03],
        [-0.04, 0.21, 0.01],
        [0.02, 0.21, -0.04],
      ].map(([px, py, pz], i) => (
        <mesh key={`sp${i}`} position={[px as number, py as number, pz as number]}>
          <sphereGeometry args={[0.012, 4, 3]} />
          <meshBasicMaterial color="#F4EAD5" />
        </mesh>
      ))}
    </group>
  )
}

export default function PathMushrooms() {
  return (
    <group>
      {MUSHROOMS.map((m, i) => {
        const [px, pz] = PATH_POINTS[m.idx]
        // Direction perpendicular to local path heading for lateral offset
        const prev = PATH_POINTS[Math.max(0, m.idx - 1)]
        const next = PATH_POINTS[Math.min(PATH_POINTS.length - 1, m.idx + 1)]
        const heading = Math.atan2(next[1] - prev[1], next[0] - prev[0])
        const ox = Math.cos(heading + Math.PI / 2) * m.lat
        const oz = Math.sin(heading + Math.PI / 2) * m.lat
        return <Mushroom key={`m${i}`} x={px + ox} z={pz + oz} scale={m.scale} capColor={m.capColor} />
      })}
    </group>
  )
}
