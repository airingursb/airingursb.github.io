// Wooden display board — the hero "portfolio" object for each work zone.
// Top half: hand-painted C-series sprite (bookshelf/easel/record-player/
// armchair/campfire). Bottom half: parchment list of recent entries
// rendered to a canvas texture. Mounted on a stone-base wood post with
// a gabled shingle roof so it reads as a forest notice board.

import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { makeCanvasTexture, drawListPanel, type ListRow } from './canvasTexture'

export interface WorkDisplayProps {
  position: [number, number]
  rotation?: number
  spriteUrl: string
  title: string
  subtitle: string
  rows: ListRow[]
  accent?: string
  emptyMessage?: string
}

const WOOD       = '#9E7A52'
const WOOD_DARK  = '#5D452B'
const WOOD_DARKER = '#3A2516'
const STONE      = '#8E8579'
const STONE_DK   = '#6B6358'
const SHINGLE    = '#4A2F1C'
const SHINGLE_2  = '#3A2516'

export default function WorkDisplay({
  position,
  rotation = 0,
  spriteUrl,
  title,
  subtitle,
  rows,
  accent,
  emptyMessage,
}: WorkDisplayProps) {
  const sprite = useTexture(spriteUrl)

  const listTex = useMemo(
    () =>
      makeCanvasTexture(512, 320, (ctx, w, h) => {
        drawListPanel(ctx, w, h, { title, subtitle, rows, accent, emptyMessage })
      }),
    [title, subtitle, rows, accent, emptyMessage],
  )

  // Board geometry — moderate scale, taller than wide
  const W = 2.0
  const H = 2.6
  const SPRITE = 1.15
  const POST_H = 1.1
  const BOARD_Y = 0.3 + POST_H + H / 2  // = 2.7

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {/* Stone base — wider front-back than left-right for stability look */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.7, 0.3, 8]} />
        <meshStandardMaterial color={STONE_DK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.06, 8]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>

      {/* Wood post (planted in stone base) */}
      <mesh position={[0, 0.3 + POST_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.17, POST_H, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>

      {/* === Main board === */}
      <group position={[0, BOARD_Y, 0]}>
        {/* Outer dark wood frame (slightly larger than inner) */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[W + 0.18, H + 0.18, 0.08]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
        </mesh>

        {/* Inner lighter board surface */}
        <mesh position={[0, 0, 0.043]}>
          <boxGeometry args={[W - 0.04, H - 0.04, 0.02]} />
          <meshStandardMaterial color={WOOD} roughness={0.92} />
        </mesh>

        {/* Sprite hero (upper section) — slight emissive so readable in shade */}
        <mesh position={[0, H / 2 - SPRITE / 2 - 0.16, 0.058]}>
          <planeGeometry args={[SPRITE, SPRITE]} />
          <meshStandardMaterial
            map={sprite}
            transparent
            alphaTest={0.04}
            emissive="#FFFFFF"
            emissiveMap={sprite}
            emissiveIntensity={0.22}
            roughness={0.9}
            depthWrite={false}
          />
        </mesh>

        {/* List parchment (lower section) */}
        <mesh position={[0, -H / 2 + 0.65 + 0.06, 0.058]}>
          <planeGeometry args={[W - 0.2, 1.25]} />
          <meshStandardMaterial map={listTex} roughness={0.92} />
        </mesh>

        {/* Decorative corner nails (4 corners) */}
        {(
          [
            [-W / 2 + 0.08, H / 2 - 0.08],
            [W / 2 - 0.08, H / 2 - 0.08],
            [-W / 2 + 0.08, -H / 2 + 0.08],
            [W / 2 - 0.08, -H / 2 + 0.08],
          ] as Array<[number, number]>
        ).map(([nx, ny], i) => (
          <mesh key={`n${i}`} position={[nx, ny, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
            <meshStandardMaterial color="#3A2516" metalness={0.4} roughness={0.45} />
          </mesh>
        ))}

        {/* Gabled shingle roof — 2 slanted planks meeting at top */}
        <group position={[0, H / 2 + 0.16, 0]}>
          <mesh rotation={[0, 0, Math.PI / 7]} position={[-(W + 0.4) / 4, 0.05, 0]} castShadow>
            <boxGeometry args={[(W + 0.4) / 2 + 0.05, 0.08, 0.5]} />
            <meshStandardMaterial color={SHINGLE} roughness={0.95} flatShading />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 7]} position={[(W + 0.4) / 4, 0.05, 0]} castShadow>
            <boxGeometry args={[(W + 0.4) / 2 + 0.05, 0.08, 0.5]} />
            <meshStandardMaterial color={SHINGLE_2} roughness={0.95} flatShading />
          </mesh>
          {/* Roof ridge cap */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.06, 0.52]} />
            <meshStandardMaterial color={WOOD_DARKER} roughness={0.95} />
          </mesh>
        </group>

        {/* Bottom shelf-bar (small wood ledge under board, supports list visually) */}
        <mesh position={[0, -H / 2 - 0.05, 0.04]} castShadow>
          <boxGeometry args={[W + 0.35, 0.1, 0.18]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.88} />
        </mesh>
      </group>
    </group>
  )
}
