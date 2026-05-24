// Open gazebo — Music zone. Adds table + stools + wind chime + ivy
// climbing on posts per Sub-A's recommendation.

import { getZone } from './zones'
import WindSway from './WindSway'

const STONE_BASE = '#8E8579'
const STONE_DK   = '#6B6358'
const WOOD       = '#8E6A45'
const WOOD_DARK  = '#5D452B'
// Re-skin roof as oxidized copper patina — visually differs from cabin shingle
// Sub-A: was teal-green copper-patina ('#4A8B6E') reading as "asset from
// a different game" next to warm-brown shingled cabin. Desaturated toward
// weathered wood-shake olive that fits the cabin/cairn/lantern palette.
const COPPER_PATINA_A = '#6E7A5C'
const COPPER_PATINA_B = '#5A6650'
const IVY        = '#5A7A4C'
const IVY_DARK   = '#4A6B40'
const CHIME      = '#C8B89A'

export default function Gazebo() {
  const z = getZone('music')
  const [x, zPos] = z.pos

  const BASE_R = 1.6
  const FLOOR_H = 0.18
  const POST_H = 1.9

  return (
    <group position={[x, 0, zPos]}>
      {/* Stone foundation */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[BASE_R + 0.1, BASE_R + 0.2, 0.16, 8, 1]} />
        <meshStandardMaterial color={STONE_DK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[BASE_R, BASE_R, 0.08, 8, 1]} />
        <meshStandardMaterial color={STONE_BASE} roughness={0.95} flatShading />
      </mesh>

      {/* Wooden floor */}
      <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[BASE_R - 0.1, BASE_R - 0.1, FLOOR_H, 8, 1]} />
        <meshStandardMaterial color={WOOD} roughness={0.88} />
      </mesh>
      {[-0.7, -0.35, 0, 0.35, 0.7].map((px, i) => (
        <mesh key={`pseam${i}`} position={[px, 0.37, 0]}>
          <boxGeometry args={[0.02, 0.005, BASE_R * 1.6]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}

      {/* 6 corner posts with ivy on 2 of them */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        const px = Math.cos(a) * (BASE_R - 0.25)
        const pz = Math.sin(a) * (BASE_R - 0.25)
        const hasIvy = i === 1 || i === 4
        return (
          <group key={`p${i}`} position={[px, 0, pz]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.22, 0.18, 0.22]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
            </mesh>
            <mesh position={[0, 0.45 + POST_H / 2, 0]} castShadow>
              <cylinderGeometry args={[0.085, 0.095, POST_H, 8]} />
              <meshStandardMaterial color={WOOD} roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.45 + POST_H + 0.06, 0]} castShadow>
              <boxGeometry args={[0.26, 0.14, 0.26]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
            </mesh>
            {/* Ivy climbing the post */}
            {hasIvy && (
              <group>
                {/* Vine spiraling around */}
                {Array.from({ length: 8 }).map((_, j) => {
                  const ay = 0.5 + j * 0.22
                  const ax = Math.cos(j * 0.7) * 0.09
                  const az = Math.sin(j * 0.7) * 0.09
                  return (
                    <mesh key={`vine${j}`} position={[ax, ay, az]}>
                      <sphereGeometry args={[0.04, 6, 5]} />
                      <meshStandardMaterial color={IVY_DARK} />
                    </mesh>
                  )
                })}
                {/* Leaves on vine */}
                {Array.from({ length: 12 }).map((_, j) => {
                  const ly = 0.6 + j * 0.18
                  const lx = Math.cos(j * 1.1 + 0.5) * 0.16
                  const lz = Math.sin(j * 1.1 + 0.5) * 0.16
                  return (
                    <mesh key={`leaf${j}`} position={[lx, ly, lz]} castShadow>
                      <coneGeometry args={[0.06, 0.14, 4]} />
                      <meshStandardMaterial color={j % 2 ? IVY : IVY_DARK} flatShading />
                    </mesh>
                  )
                })}
              </group>
            )}
          </group>
        )
      })}

      {/* Hex pyramid roof — 4 tiers of stacked shingled rings */}
      {(() => {
        const tiers = 4
        const baseRadius = BASE_R + 0.15
        const tipRadius = 0.05
        const totalH = 1.0
        return Array.from({ length: tiers }).map((_, i) => {
          const t0 = i / tiers
          const t1 = (i + 1) / tiers
          const r0 = baseRadius * (1 - t0) + tipRadius * t0
          const r1 = baseRadius * (1 - t1) + tipRadius * t1
          const y = 0.45 + POST_H + 0.12 + totalH * t0
          const h = totalH / tiers
          return (
            <mesh key={`roof${i}`} position={[0, y + h / 2, 0]} castShadow>
              <cylinderGeometry args={[r1, r0, h, 6, 1]} />
              <meshStandardMaterial color={i % 2 ? COPPER_PATINA_B : COPPER_PATINA_A} roughness={0.85} metalness={0.15} flatShading />
            </mesh>
          )
        })
      })()}

      <mesh position={[0, 0.45 + POST_H + 0.12 + 1.0 + 0.12, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
      </mesh>

      {/* === Center round wooden table === */}
      <group position={[0, 0.4, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.08, 16]} />
          <meshStandardMaterial color={WOOD} roughness={0.88} />
        </mesh>
        {/* Single central pedestal */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 0.42, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
        {/* Base disc */}
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.25, 0.06, 12]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      </group>

      {/* === 2 wooden stools === */}
      {[[-0.85, 0.7], [0.85, -0.65]].map(([sx, sz], i) => (
        <group key={`st${i}`} position={[sx, 0.3, sz]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
            <meshStandardMaterial color={WOOD} roughness={0.88} />
          </mesh>
          {Array.from({ length: 3 }).map((_, j) => {
            const a = (j / 3) * Math.PI * 2
            return (
              <mesh
                key={`sl${j}`}
                position={[Math.cos(a) * 0.15, 0.14, Math.sin(a) * 0.15]}
                rotation={[Math.cos(a) * 0.1, 0, Math.sin(a) * -0.1]}
                castShadow
              >
                <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* === Wind chime hanging from roof corner — sways in breeze === */}
      <WindSway amp={0.18} freq={0.9} phase={2.5}>
      <group position={[0.7, 0.45 + POST_H, 0.5]}>
        {/* Top cross brace */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.18, 0.02, 0.02]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        {/* String */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.1, 4]} />
          <meshStandardMaterial color="#A48B6E" />
        </mesh>
        {/* Chime tubes */}
        {[-0.08, -0.04, 0, 0.04, 0.08].map((cx, i) => {
          const h = 0.28 - Math.abs(i - 2) * 0.05
          return (
            <mesh key={`ch${i}`} position={[cx, -0.2, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, h, 6]} />
              <meshStandardMaterial color={CHIME} roughness={0.15} metalness={0.95} />
            </mesh>
          )
        })}
      </group>
      </WindSway>

      {/* V2 wave 3: tatami mat + zabuton cushion inside the gazebo
          (music zone interior). Someone has been sitting here listening.
          Mat slightly off-center, cushion at one edge. */}
      <group position={[0.3, 0.38, 0]} rotation={[0, 0.25, 0]}>
        {/* Tatami mat — woven texture suggested via 2-tone borders */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.025, 0.95]} />
          <meshStandardMaterial color="#D8C28A" roughness={0.95} flatShading />
        </mesh>
        {/* Dark border strips (the 缘 of tatami) */}
        <mesh position={[0, 0.014, 0.475]}>
          <boxGeometry args={[1.4, 0.005, 0.04]} />
          <meshStandardMaterial color="#3A2818" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.014, -0.475]}>
          <boxGeometry args={[1.4, 0.005, 0.04]} />
          <meshStandardMaterial color="#3A2818" roughness={0.85} />
        </mesh>
        {/* Zabuton cushion — flat purple-cream square */}
        <group position={[-0.4, 0.05, 0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.07, 0.42]} />
            <meshStandardMaterial color="#5E5288" roughness={0.92} />
          </mesh>
          {/* Cushion tassel/button center */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color="#F4EAD5" roughness={0.85} />
          </mesh>
        </group>
        {/* Small tea bowl beside cushion (mirrors rocker cup) */}
        <group position={[0.05, 0.04, 0.1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.055, 0.048, 0.05, 14]} />
            <meshStandardMaterial color="#3A2818" roughness={0.6} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.048, 0.048, 0.003, 14]} />
            <meshStandardMaterial color="#6E4A2A" roughness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
