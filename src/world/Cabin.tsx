// Detailed log cabin — Airing's home + Chat hub.
//
// Now with Sub-A recommendations: log end-grain caps, chinking strips
// between logs, porch furniture (rocking chair + firewood pile +
// doormat + hanging flower basket), animated chimney smoke.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getZone } from './zones'

const LOG_LIGHT  = '#9E7A52'
const LOG_DARK   = '#6E4F31'
const LOG_END    = '#5A3D1F'
const CHINKING   = '#D4C4A8'
const STONE      = '#8E8579'
const STONE_DK   = '#6B6358'
const PLANK      = '#7A5B3C'
const SHINGLE_PALETTE = ['#5C3A22', '#4A2F1C', '#6E4A2E', '#3A2516', '#8B5E3C']
const SHINGLE_MOSS = '#7A9268'
const WINDOW     = '#FFE4A8'
const IRON       = '#2A2018'
const ROCKER     = '#5D452B'
const FLOWER_RED = '#E25A4C'
const FLOWER_YEL = '#FCD757'
const BASKET     = '#9E7A52'
const SMOKE      = '#E8E0D0'

const CABIN_W = 3.6
const CABIN_D = 3.0
const WALL_H  = 1.9
const LOG_R   = 0.13
const LOG_SEG = 7

function Log({ length, color = LOG_LIGHT }: { length: number; color?: string }) {
  return (
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[LOG_R, LOG_R, length, 8]} />
      <meshStandardMaterial color={color} roughness={0.92} flatShading />
    </mesh>
  )
}

function StoneBlock({ size }: { size: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
    </mesh>
  )
}

function ChimneySmoke({ origin }: { origin: [number, number, number] }) {
  const refs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    refs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const phase = (t * 0.3 + i * 0.6) % 3
      m.position.y = origin[1] + phase * 1.3
      m.position.x = origin[0] + Math.sin(t * 0.7 + i) * 0.15 + phase * 0.05
      m.position.z = origin[2] + Math.cos(t * 0.5 + i * 0.7) * 0.1
      const scale = 0.2 + phase * 0.4
      m.scale.setScalar(scale)
      ;(m.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 - phase * 0.2)
    })
  })
  return (
    <group>
      {refs.map((r, i) => (
        <mesh key={i} ref={r}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshStandardMaterial color={SMOKE} transparent opacity={0.5} roughness={1.0} />
        </mesh>
      ))}
    </group>
  )
}

export default function Cabin() {
  const z = getZone('chat')
  const [x, zPos] = z.pos

  const logsPerSide = LOG_SEG
  const logSpacing = LOG_R * 2 * 0.95
  const rowYs: number[] = []
  for (let i = 0; i < logsPerSide; i++) {
    rowYs.push(0.32 + LOG_R + i * logSpacing)
  }

  const doorW = 0.95
  const doorH = 1.5

  return (
    <group position={[x, 0, zPos]}>
      {/* === Stone foundation course === */}
      {[
        [-CABIN_W/2 + 0.15, 0.15, -CABIN_D/2 + 0.15, 0.5, 0.3, 0.5],
        [ CABIN_W/2 - 0.15, 0.15, -CABIN_D/2 + 0.15, 0.5, 0.3, 0.5],
        [-CABIN_W/2 + 0.15, 0.15,  CABIN_D/2 - 0.15, 0.5, 0.3, 0.5],
        [ CABIN_W/2 - 0.15, 0.15,  CABIN_D/2 - 0.15, 0.5, 0.3, 0.5],
        [-0.8, 0.15, -CABIN_D/2 + 0.15, 0.6, 0.3, 0.45],
        [ 0.8, 0.15, -CABIN_D/2 + 0.15, 0.6, 0.3, 0.45],
        [-CABIN_W/2 + 0.15, 0.15, 0, 0.45, 0.3, 0.6],
        [ CABIN_W/2 - 0.15, 0.15, 0, 0.45, 0.3, 0.6],
        [-0.8, 0.15,  CABIN_D/2 - 0.15, 0.6, 0.3, 0.45],
        [ 0.8, 0.15,  CABIN_D/2 - 0.15, 0.6, 0.3, 0.45],
      ].map((p, i) => (
        <group key={`f${i}`} position={[p[0] as number, p[1] as number, p[2] as number]}>
          <StoneBlock size={[p[3] as number, p[4] as number, p[5] as number]} />
        </group>
      ))}

      {/* Floor */}
      <mesh position={[0, 0.31, 0]} receiveShadow>
        <boxGeometry args={[CABIN_W - 0.2, 0.04, CABIN_D - 0.2]} />
        <meshStandardMaterial color={PLANK} roughness={0.9} />
      </mesh>

      {/* === Chinking strips between log rows === */}
      {rowYs.slice(0, -1).map((y, i) => {
        const cy = y + logSpacing / 2
        return (
          <group key={`ch${i}`}>
            {/* North wall chinking */}
            <mesh position={[0, cy, -CABIN_D/2 + LOG_R + 0.005]}>
              <boxGeometry args={[CABIN_W - 0.04, 0.04, 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
            {/* South */}
            <mesh position={[0, cy, CABIN_D/2 - LOG_R - 0.005]}>
              <boxGeometry args={[CABIN_W - 0.04, 0.04, 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
            {/* West */}
            <mesh position={[-CABIN_W/2 + LOG_R + 0.005, cy, 0]}>
              <boxGeometry args={[0.04, 0.04, CABIN_D - 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
            {/* East */}
            <mesh position={[CABIN_W/2 - LOG_R - 0.005, cy, 0]}>
              <boxGeometry args={[0.04, 0.04, CABIN_D - 0.04]} />
              <meshStandardMaterial color={CHINKING} roughness={0.95} />
            </mesh>
          </group>
        )
      })}

      {/* === Log end-grain caps at all 4 corners === */}
      {[
        [-CABIN_W/2 + LOG_R, -CABIN_D/2 + LOG_R],
        [ CABIN_W/2 - LOG_R, -CABIN_D/2 + LOG_R],
        [-CABIN_W/2 + LOG_R,  CABIN_D/2 - LOG_R],
        [ CABIN_W/2 - LOG_R,  CABIN_D/2 - LOG_R],
      ].map(([cx, cz], ci) => (
        <group key={`end${ci}`}>
          {rowYs.map((y, i) => (
            <mesh key={`e${ci}-${i}`} position={[cx, y, cz]}>
              <cylinderGeometry args={[LOG_R + 0.005, LOG_R + 0.005, 0.02, 8]} />
              <meshStandardMaterial color={LOG_END} roughness={0.92} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {/* === Stacked logs — back, west, east walls === */}
      {rowYs.map((y, i) => (
        <group key={`bw${i}`} position={[0, y, -CABIN_D/2 + LOG_R]} rotation={[0, 0, Math.PI / 2]}>
          <Log length={CABIN_W} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
        </group>
      ))}
      {rowYs.map((y, i) => (
        <group key={`ww${i}`} position={[-CABIN_W/2 + LOG_R, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Log length={CABIN_D} color={i % 2 ? LOG_DARK : LOG_LIGHT} />
        </group>
      ))}
      {rowYs.map((y, i) => (
        <group key={`ew${i}`} position={[CABIN_W/2 - LOG_R, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Log length={CABIN_D} color={i % 2 ? LOG_DARK : LOG_LIGHT} />
        </group>
      ))}

      {/* === Front wall with door cut-out === */}
      {rowYs.map((y, i) => {
        const aboveDoor = y > 0.32 + doorH
        if (aboveDoor) {
          return (
            <group key={`fw${i}`} position={[0, y, CABIN_D/2 - LOG_R]} rotation={[0, 0, Math.PI / 2]}>
              <Log length={CABIN_W} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
            </group>
          )
        }
        const stripW = (CABIN_W - doorW) / 2 - 0.1
        return (
          <group key={`fw${i}`}>
            <group position={[-CABIN_W/2 + stripW/2 + 0.05, y, CABIN_D/2 - LOG_R]} rotation={[0, 0, Math.PI / 2]}>
              <Log length={stripW} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
            </group>
            <group position={[ CABIN_W/2 - stripW/2 - 0.05, y, CABIN_D/2 - LOG_R]} rotation={[0, 0, Math.PI / 2]}>
              <Log length={stripW} color={i % 2 ? LOG_LIGHT : LOG_DARK} />
            </group>
          </group>
        )
      })}

      {/* === Door === */}
      <group position={[0, 0.32 + doorH/2, CABIN_D/2]}>
        {[-0.3, -0.1, 0.1, 0.3].map((dx, i) => (
          <mesh key={`dp${i}`} position={[dx, 0, 0.01]} castShadow>
            <boxGeometry args={[0.21, doorH, 0.04]} />
            <meshStandardMaterial color={PLANK} roughness={0.88} />
          </mesh>
        ))}
        {[-doorH/2 + 0.2, doorH/2 - 0.2].map((dy, i) => (
          <mesh key={`ds${i}`} position={[0, dy, 0.04]} castShadow>
            <boxGeometry args={[doorW + 0.04, 0.08, 0.025]} />
            <meshStandardMaterial color={IRON} roughness={0.25} metalness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.3, 0, 0.07]} castShadow>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={IRON} roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* Doormat */}
      <mesh position={[0, 0.33, CABIN_D/2 + 0.25]} receiveShadow>
        <boxGeometry args={[0.9, 0.02, 0.5]} />
        <meshStandardMaterial color="#7E5E40" roughness={0.95} />
      </mesh>
      {/* Doormat fringe (small lines) */}
      {[-0.4, -0.27, -0.14, 0, 0.14, 0.27, 0.4].map((dx, i) => (
        <mesh key={`dm${i}`} position={[dx, 0.34, CABIN_D/2 + 0.46]}>
          <boxGeometry args={[0.04, 0.005, 0.06]} />
          <meshStandardMaterial color="#4F3B26" />
        </mesh>
      ))}

      {/* === Window with mullions === */}
      <group position={[CABIN_W/2 + 0.005, 1.05, -0.5]}>
        <mesh>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        {[
          [0, 0.32, 0.7, 0.06],
          [0, -0.32, 0.7, 0.06],
          [-0.32, 0, 0.06, 0.7],
          [ 0.32, 0, 0.06, 0.7],
          [0, 0, 0.7, 0.04],
          [0, 0, 0.04, 0.7],
        ].map((p, i) => (
          <mesh key={`wf${i}`} position={[p[0], p[1], 0.02]}>
            <boxGeometry args={[p[2], p[3], 0.03]} />
            <meshStandardMaterial color={PLANK} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* === Roof — shingles with 5-color palette + mossy overrides === */}
      {(['left', 'right'] as const).map((side) => {
        const sign = side === 'left' ? -1 : 1
        const tilt = sign * Math.PI * 0.32
        const rows = 5
        const cols = 8
        const slabW = CABIN_W * 0.6
        const slabL = CABIN_D + 0.7
        const slabH = WALL_H + 0.32
        return (
          <group
            key={side}
            position={[sign * (CABIN_W / 4 + 0.05), slabH + 0.15, 0]}
            rotation={[0, 0, tilt]}
          >
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[slabW, 0.06, slabL]} />
              <meshStandardMaterial color={SHINGLE_PALETTE[1]} roughness={0.94} />
            </mesh>
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const rx = -slabW / 2 + 0.08 + (slabW - 0.16) * (r / (rows - 1))
                const cz = -slabL / 2 + 0.18 + (slabL - 0.36) * (c / (cols - 1))
                const offset = r % 2 ? (slabL / cols) * 0.5 : 0
                // 5-color rotation + occasional mossy override
                const seed = (r * 31 + c * 7) % 17
                const isMoss = seed === 0 || seed === 7
                const color = isMoss ? SHINGLE_MOSS : SHINGLE_PALETTE[(r + c * 2) % 5]
                // Corner shingles curl up slightly
                const isEave = (c === 0 || c === cols - 1) && r === rows - 1
                const eaveTilt = isEave ? Math.PI * 0.04 : 0
                return (
                  <mesh
                    key={`s${side}-${r}-${c}`}
                    position={[rx, 0.04, cz + offset]}
                    rotation={[eaveTilt, 0, 0]}
                    castShadow
                  >
                    <boxGeometry args={[slabW / rows + 0.02, 0.04, slabL / cols + 0.04]} />
                    <meshStandardMaterial color={color} roughness={0.92} flatShading />
                  </mesh>
                )
              })
            )}
          </group>
        )
      })}

      {/* Ridge cap */}
      <mesh position={[0, WALL_H + 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, CABIN_D + 0.5, 8]} />
        <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
      </mesh>

      {/* Gable triangles */}
      {[CABIN_D / 2 + 0.02, -CABIN_D / 2 - 0.02].map((zz, i) => (
        <mesh key={`gable${i}`} position={[0, WALL_H + 0.45, zz]} castShadow>
          <cylinderGeometry args={[0.01, CABIN_W / 2 + 0.3, 0.9, 3, 1]} />
          <meshStandardMaterial color={LOG_DARK} roughness={0.92} flatShading />
        </mesh>
      ))}

      {/* === Chimney === */}
      <group position={[CABIN_W / 2 - 0.5, 0, -CABIN_D / 4]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={`chs${i}`} position={[0, 0.5 + i * 0.32, 0]} castShadow>
            <boxGeometry args={[0.45 + (i % 2 ? 0.03 : -0.03), 0.28, 0.45 + (i % 2 ? -0.02 : 0.02)]} />
            <meshStandardMaterial color={i % 2 ? STONE : STONE_DK} roughness={0.95} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.5 + 7 * 0.32 + 0.06, 0]} castShadow>
          <boxGeometry args={[0.55, 0.08, 0.55]} />
          <meshStandardMaterial color={STONE_DK} roughness={0.95} />
        </mesh>
        {/* Smoke */}
        <ChimneySmoke origin={[0, 0.5 + 7 * 0.32 + 0.3, 0]} />
      </group>

      {/* === Firewood pile against chimney === */}
      <group position={[CABIN_W / 2 + 0.4, 0, -CABIN_D / 4 + 0.05]}>
        {/* 3×4 stack of small log discs */}
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 3 }).map((_, col) => (
            <mesh
              key={`fw-${row}-${col}`}
              position={[0, 0.12 + row * 0.16, -0.25 + col * 0.18]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.07, 0.07, 0.32, 8]} />
              <meshStandardMaterial color={(row + col) % 2 ? LOG_LIGHT : LOG_DARK} roughness={0.92} />
            </mesh>
          ))
        )}
        {/* End-grain caps on the front-facing logs */}
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 3 }).map((_, col) => (
            <mesh
              key={`fwc-${row}-${col}`}
              position={[0.16, 0.12 + row * 0.16, -0.25 + col * 0.18]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.07, 0.07, 0.02, 8]} />
              <meshStandardMaterial color={LOG_END} flatShading />
            </mesh>
          ))
        )}
      </group>

      {/* === Front porch === */}
      <group position={[0, 0, CABIN_D / 2 + 0.6]}>
        <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
          <boxGeometry args={[CABIN_W - 0.2, 0.08, 1.0]} />
          <meshStandardMaterial color={PLANK} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.12, 0.6]} castShadow>
          <boxGeometry args={[CABIN_W - 0.6, 0.16, 0.3]} />
          <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
        </mesh>
        {[-(CABIN_W / 2 - 0.2), (CABIN_W / 2 - 0.2)].map((px, i) => (
          <mesh key={`pp${i}`} position={[px, 0.95, 0.4]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.3, 8]} />
            <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 1.55, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, CABIN_W - 0.2, 8]} />
          <meshStandardMaterial color={LOG_DARK} roughness={0.9} />
        </mesh>
        {[-1.2, -0.6, 0.6, 1.2].map((bx, i) => (
          <mesh key={`bal${i}`} position={[bx, 0.55, 0.45]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.55, 6]} />
            <meshStandardMaterial color={PLANK} roughness={0.9} />
          </mesh>
        ))}
        {[-1.0, 1.0].map((rx, i) => (
          <mesh key={`tr${i}`} position={[rx, 0.83, 0.45]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.4, 6]} />
            <meshStandardMaterial color={PLANK} roughness={0.9} />
          </mesh>
        ))}

        {/* === Rocking chair === */}
        <group position={[-0.9, 0.35, 0]}>
          {/* Seat */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.45]} />
            <meshStandardMaterial color={ROCKER} roughness={0.88} />
          </mesh>
          {/* Back rest — vertical slats */}
          {[-0.18, -0.06, 0.06, 0.18].map((bx, i) => (
            <mesh key={`bk${i}`} position={[bx, 0.45, -0.18]} castShadow>
              <boxGeometry args={[0.04, 0.46, 0.04]} />
              <meshStandardMaterial color={ROCKER} roughness={0.88} />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[0, 0.68, -0.18]} castShadow>
            <boxGeometry args={[0.5, 0.06, 0.04]} />
            <meshStandardMaterial color={ROCKER} roughness={0.88} />
          </mesh>
          {/* Curved runners (rockers) */}
          {[-0.18, 0.18].map((rx, i) => (
            <mesh key={`rk${i}`} position={[rx, 0.04, 0]} rotation={[0, 0, 0]} castShadow>
              <torusGeometry args={[0.3, 0.025, 4, 12, Math.PI]} />
              <meshStandardMaterial color={ROCKER} roughness={0.88} />
            </mesh>
          ))}
        </group>

        {/* === Hanging flower basket from awning beam === */}
        <group position={[1.0, 1.3, 0.4]}>
          {/* Hanging chain */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
            <meshStandardMaterial color={IRON} roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Basket */}
          <mesh position={[0, -0.05, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.12, 0.16, 10]} />
            <meshStandardMaterial color={BASKET} roughness={0.9} />
          </mesh>
          {/* Flowers + leaves overflowing */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#5A7A4C" roughness={0.94} flatShading />
          </mesh>
          {/* Petals */}
          {[
            [0.08, 0.07, FLOWER_RED],
            [-0.08, 0.06, FLOWER_YEL],
            [0.0, 0.1, FLOWER_RED],
            [0.06, 0.08, FLOWER_YEL],
            [-0.04, 0.09, FLOWER_RED],
          ].map(([px, py, color], i) => (
            <mesh key={`pet${i}`} position={[px as number, py as number, 0]}>
              <sphereGeometry args={[0.04, 6, 5]} />
              <meshStandardMaterial color={color as string} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}
