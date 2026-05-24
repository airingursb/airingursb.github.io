// Shared building blocks for the work-zone display components.
// Each zone (Blog/Comics/Music/Reading) has its own bespoke wooden
// structure but they share these atomic parts:
//   - SpritePlane — hand-painted C-series illustration plane
//   - HangingBannerPlane — E-series wooden zone banner plane
//   - ParchmentPlane — canvas-texture parchment list plane

import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { makeCanvasTexture, drawListPanel, type ListRow } from './canvasTexture'

export const WOOD         = '#9E7A52'
export const WOOD_LIGHT   = '#B89870'
export const WOOD_CREAM   = '#D4B68B'
export const WOOD_DARK    = '#5D452B'
export const WOOD_DARKER  = '#3A2516'
export const WOOD_WALNUT  = '#4A2D1A'
export const STONE        = '#8E8579'
export const STONE_DK     = '#6B6358'
export const ROPE         = '#A48B6E'
export const COPPER_PATINA = '#4A8B6E'

export interface DisplayContent {
  title: string
  subtitle: string
  rows: ListRow[]
  accent?: string
  emptyMessage?: string
}

export function SpritePlane({
  url,
  width,
  height,
  emissive = 0.22,
}: {
  url: string
  width: number
  height?: number
  emissive?: number
}) {
  const tex = useTexture(url)
  return (
    <mesh>
      <planeGeometry args={[width, height ?? width]} />
      <meshStandardMaterial
        map={tex}
        transparent
        alphaTest={0.04}
        emissive="#FFFFFF"
        emissiveMap={tex}
        emissiveIntensity={emissive}
        roughness={0.9}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export function HangingBannerPlane({
  url,
  width,
  height,
}: {
  url: string
  width: number
  height?: number
}) {
  const tex = useTexture(url)
  return (
    <mesh>
      <planeGeometry args={[width, height ?? width / 2]} />
      <meshStandardMaterial
        map={tex}
        transparent
        alphaTest={0.04}
        emissive="#FFFFFF"
        emissiveMap={tex}
        emissiveIntensity={0.22}
        roughness={0.9}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export function ParchmentPlane({
  content,
  width,
  height,
  texW = 512,
  texH = 320,
}: {
  content: DisplayContent
  width: number
  height: number
  texW?: number
  texH?: number
}) {
  const tex = useMemo(
    () =>
      makeCanvasTexture(texW, texH, (ctx, w, h) => {
        drawListPanel(ctx, w, h, content)
      }),
    [content, texW, texH],
  )
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={tex} roughness={0.92} side={DoubleSide} />
    </mesh>
  )
}
