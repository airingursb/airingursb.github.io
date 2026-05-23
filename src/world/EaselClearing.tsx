// Comics zone — outdoor easel + palette + stool + coffee mug + sketchbook.
// Per Sub-A: ground the scene with artist accessories.

import { getZone } from './zones'

const WOOD       = '#8E6A45'
const WOOD_DARK  = '#5D452B'
const CANVAS     = '#F4EAD5'
const MUG        = '#E8DAB0'
const COFFEE     = '#4A2F1C'
const PAPER      = '#FAEFC8'

export default function EaselClearing() {
  const z = getZone('comics')
  const [x, zPos] = z.pos

  return (
    <group position={[x, 0, zPos]}>
      {/* === Tripod easel === */}
      <mesh position={[0, 0.65, 0.35]} rotation={[Math.PI * 0.06, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.3, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.88} />
      </mesh>
      <mesh position={[-0.32, 0.65, -0.2]} rotation={[-Math.PI * 0.05, 0, Math.PI * 0.07]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.3, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.88} />
      </mesh>
      <mesh position={[0.32, 0.65, -0.2]} rotation={[-Math.PI * 0.05, 0, -Math.PI * 0.07]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.3, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.55, -0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.64, 6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0.3]} castShadow>
        <boxGeometry args={[0.8, 0.06, 0.08]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
      </mesh>

      {/* Canvas + frame, slightly off-axis (Sub-A: avoid perfect alignment) */}
      <group position={[0, 1.32, 0.27]} rotation={[Math.PI * 0.08, 0.05, 0]}>
        {[
          [0, 0.32, 0.78, 0.05],
          [0, -0.32, 0.78, 0.05],
          [-0.36, 0, 0.05, 0.7],
          [ 0.36, 0, 0.05, 0.7],
        ].map((p, i) => (
          <mesh key={`fr${i}`} position={[p[0], p[1], 0.025]} castShadow>
            <boxGeometry args={[p[2], p[3], 0.05]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.72, 0.62]} />
          <meshStandardMaterial color={CANVAS} roughness={0.75} />
        </mesh>
        {/* Brush strokes */}
        <mesh position={[-0.05, -0.05, 0.01]}>
          <planeGeometry args={[0.22, 0.18]} />
          <meshStandardMaterial color="#C97B5C" opacity={0.7} transparent />
        </mesh>
        <mesh position={[0.1, 0.08, 0.012]}>
          <planeGeometry args={[0.15, 0.1]} />
          <meshStandardMaterial color="#7BA374" opacity={0.7} transparent />
        </mesh>
      </group>

      {/* === Three-leg stool the artist sits on === */}
      <group position={[0.7, 0, -0.4]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
          <meshStandardMaterial color={WOOD} roughness={0.88} />
        </mesh>
        {Array.from({ length: 3 }).map((_, i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <mesh
              key={`sl${i}`}
              position={[Math.cos(a) * 0.13, 0.24, Math.sin(a) * 0.13]}
              rotation={[Math.cos(a) * 0.1, 0, Math.sin(a) * -0.1]}
              castShadow
            >
              <cylinderGeometry args={[0.025, 0.025, 0.48, 6]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
            </mesh>
          )
        })}
        {/* Coffee mug ON the stool */}
        <group position={[0.04, 0.55, 0.05]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.12, 12]} />
            <meshStandardMaterial color={MUG} roughness={0.85} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.012, 6, 12, Math.PI]} />
            <meshStandardMaterial color={MUG} roughness={0.85} />
          </mesh>
          {/* Coffee surface */}
          <mesh position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.01, 12]} />
            <meshStandardMaterial color={COFFEE} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* === Palette on ground === */}
      <group position={[0.65, 0.07, 0.6]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 12]} />
          <meshStandardMaterial color={MUG} roughness={0.85} />
        </mesh>
        {[['#C13E3E', -0.08, 0.04], ['#7BA374', 0.05, -0.06], ['#5878B8', 0.08, 0.05], ['#F4D9A0', -0.05, -0.07]].map(([c, dx, dz], i) => (
          <mesh key={`paint${i}`} position={[dx as number, 0.04, dz as number]}>
            <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
            <meshStandardMaterial color={c as string} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* === Paint pot tipped + brush jar === */}
      <group position={[-0.55, 0.08, 0.7]} rotation={[0, 0, Math.PI / 4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.16, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      </group>
      <group position={[-0.55, 0.08, 0.4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.18, 8]} />
          <meshStandardMaterial color="#3A2516" roughness={0.85} />
        </mesh>
        {[0, 0.04, -0.04].map((dx, i) => (
          <mesh key={`br${i}`} position={[dx, 0.22, 0]} rotation={[0, 0, i === 1 ? 0.15 : -0.05]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
            <meshStandardMaterial color={WOOD} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* === Open sketchbook on grass === */}
      <group position={[-0.45, 0.05, 1.0]} rotation={[0, -0.3, 0]}>
        {/* Back cover */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.4, 0.5, 0.02]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
        {/* Open pages — slightly raised */}
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.48, 0.005]} />
          <meshStandardMaterial color={PAPER} roughness={0.85} />
        </mesh>
        {/* A few sketch lines visible */}
        <mesh position={[0.06, 0.04, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.12, 0.005, 0.002]} />
          <meshStandardMaterial color="#3A2516" />
        </mesh>
        <mesh position={[-0.04, 0.04, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.16, 0.005, 0.002]} />
          <meshStandardMaterial color="#3A2516" />
        </mesh>
      </group>

      {/* === Crumpled paper balls === */}
      {[[0.9, 0.7], [-0.8, -0.3], [1.0, -0.5]].map(([cx, cz], i) => (
        <mesh key={`crm${i}`} position={[cx, 0.06, cz]} castShadow>
          <dodecahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial color={PAPER} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}
