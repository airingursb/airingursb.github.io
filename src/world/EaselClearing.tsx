// Comics zone — outdoor easel + palette + stool + coffee mug + sketchbook.
// V2 (scene polish A2): the canvas on the easel now shows a procedural
// painting of THE SCENE ITSELF — Ghibli meta moment. "The painter is
// painting the world you're standing in."

import { useMemo } from 'react'
import * as THREE from 'three'
import { getZone } from './zones'

const WOOD       = '#8E6A45'
const WOOD_DARK  = '#5D452B'
const CANVAS     = '#F4EAD5'
const MUG        = '#E8DAB0'
const COFFEE     = '#4A2F1C'
const PAPER      = '#FAEFC8'

// V2 / scene-A2: build a 2D CanvasTexture that represents the island
// in painterly Saul-Bass / Ghibli flat-color style. Deliberately
// abstract — not photoreal — so it reads as "in progress" art, not
// a screenshot. Generated once at mount via useMemo.
function makeEaselPainting(): THREE.CanvasTexture {
  const W = 256, H = 220
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!

  // Sky gradient
  const sky = c.createLinearGradient(0, 0, 0, H * 0.7)
  sky.addColorStop(0,    '#F4E4C8')
  sky.addColorStop(0.55, '#FFD9A8')
  sky.addColorStop(1,    '#F0B888')
  c.fillStyle = sky
  c.fillRect(0, 0, W, H * 0.7)

  // Sun
  c.fillStyle = 'rgba(255, 232, 192, 0.85)'
  c.beginPath(); c.arc(W * 0.72, H * 0.18, 18, 0, Math.PI * 2); c.fill()

  // Distant mountains (soft silhouette)
  c.fillStyle = 'rgba(150, 168, 180, 0.42)'
  c.beginPath()
  c.moveTo(0, H * 0.55)
  c.lineTo(W * 0.15, H * 0.40); c.lineTo(W * 0.32, H * 0.48)
  c.lineTo(W * 0.50, H * 0.36); c.lineTo(W * 0.70, H * 0.46)
  c.lineTo(W * 0.88, H * 0.38); c.lineTo(W, H * 0.50)
  c.lineTo(W, H * 0.70); c.lineTo(0, H * 0.70); c.closePath(); c.fill()

  // Island base — grass disc + soil rim
  const cliffGrad = c.createLinearGradient(0, H * 0.78, 0, H)
  cliffGrad.addColorStop(0, '#B88560')
  cliffGrad.addColorStop(1, '#6B4530')
  c.fillStyle = cliffGrad
  c.beginPath(); c.ellipse(W * 0.5, H * 0.92, W * 0.42, H * 0.08, 0, 0, Math.PI * 2); c.fill()

  c.fillStyle = '#A8C77A'
  c.beginPath(); c.ellipse(W * 0.5, H * 0.78, W * 0.40, H * 0.06, 0, 0, Math.PI * 2); c.fill()

  // 2 cedars (left side)
  function cedar(x: number, y: number, h: number, dark: boolean) {
    c.fillStyle = '#2A1812'
    c.fillRect(x - 1, y, 2, h * 0.25)
    c.fillStyle = dark ? '#385830' : '#4E6E40'
    c.beginPath()
    c.moveTo(x, y - h)
    c.lineTo(x - h * 0.32, y)
    c.lineTo(x + h * 0.32, y)
    c.closePath(); c.fill()
  }
  cedar(W * 0.20, H * 0.78, 64, false)
  cedar(W * 0.28, H * 0.78, 52, true)

  // Cabin (center)
  const cx = W * 0.48, cy = H * 0.72, cw = 50, ch = 28
  // Walls
  c.fillStyle = '#F5E8C8'
  c.fillRect(cx - cw / 2, cy - ch, cw, ch)
  // Roof (irimoya 2-tier)
  c.fillStyle = '#4A566C'
  c.beginPath()
  c.moveTo(cx - cw / 2 - 6, cy - ch)
  c.lineTo(cx + cw / 2 + 6, cy - ch)
  c.lineTo(cx + cw * 0.4, cy - ch - 8)
  c.lineTo(cx - cw * 0.4, cy - ch - 8)
  c.closePath(); c.fill()
  c.fillStyle = '#6E7C94'
  c.beginPath()
  c.moveTo(cx - cw * 0.4, cy - ch - 8)
  c.lineTo(cx + cw * 0.4, cy - ch - 8)
  c.lineTo(cx + cw * 0.3, cy - ch - 14)
  c.lineTo(cx - cw * 0.3, cy - ch - 14)
  c.closePath(); c.fill()
  // Shoji window glow
  c.fillStyle = 'rgba(255, 232, 192, 0.85)'
  c.fillRect(cx - 12, cy - ch + 6, 24, 14)
  c.strokeStyle = 'rgba(58, 37, 22, 0.6)'
  c.lineWidth = 1
  c.beginPath(); c.moveTo(cx - 12, cy - ch + 13); c.lineTo(cx + 12, cy - ch + 13); c.stroke()
  c.beginPath(); c.moveTo(cx, cy - ch + 6); c.lineTo(cx, cy - ch + 20); c.stroke()
  // Chimney + smoke wisp
  c.fillStyle = '#3A2516'
  c.fillRect(cx + cw * 0.25, cy - ch - 16, 4, 6)
  c.strokeStyle = 'rgba(220, 210, 200, 0.55)'
  c.lineWidth = 1.5
  c.beginPath()
  c.moveTo(cx + cw * 0.25 + 2, cy - ch - 16)
  c.quadraticCurveTo(cx + cw * 0.27, cy - ch - 24, cx + cw * 0.23, cy - ch - 32)
  c.stroke()

  // Sakura (right side)
  c.fillStyle = 'rgba(58, 37, 22, 0.6)'
  c.beginPath()
  c.moveTo(W * 0.78, H * 0.78)
  c.quadraticCurveTo(W * 0.76, H * 0.62, W * 0.74, H * 0.55)
  c.stroke()
  c.fillStyle = '#F0AFC3'
  c.beginPath(); c.ellipse(W * 0.76, H * 0.50, 22, 18, 0, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#FFC8D7'
  c.beginPath(); c.ellipse(W * 0.80, H * 0.45, 14, 12, 0, 0, Math.PI * 2); c.fill()

  // Torii (smaller, between cabin + sakura)
  c.fillStyle = '#C84A35'
  c.fillRect(W * 0.66, H * 0.68, 2, 14)
  c.fillRect(W * 0.71, H * 0.68, 2, 14)
  c.fillStyle = '#1F1812'
  c.beginPath()
  c.moveTo(W * 0.65, H * 0.66)
  c.quadraticCurveTo(W * 0.685, H * 0.62, W * 0.74, H * 0.66)
  c.lineTo(W * 0.74, H * 0.675); c.lineTo(W * 0.65, H * 0.675)
  c.closePath(); c.fill()

  // Painter's signature corner — small initial "A" stylized
  c.fillStyle = 'rgba(80, 50, 30, 0.45)'
  c.font = 'italic 12px serif'
  c.fillText('A.', W - 22, H - 10)

  // Subtle painterly texture — sparse soft noise overlay
  c.globalAlpha = 0.04
  for (let i = 0; i < 220; i++) {
    c.fillStyle = i % 2 === 0 ? '#3A2516' : '#FFF8E8'
    c.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  c.globalAlpha = 1

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export default function EaselClearing() {
  const z = getZone('comics')
  const [x, zPos] = z.pos

  // Procedural painting — generated once. Disposed on unmount.
  const paintingTex = useMemo(() => makeEaselPainting(), [])

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
        {/* V2 / A2: painted canvas is a procedural CanvasTexture of
            the scene itself. The two prior abstract color blobs are
            replaced — this is "the painting Airing is working on". */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.72, 0.62]} />
          <meshStandardMaterial
            map={paintingTex}
            color={CANVAS}
            roughness={0.78}
            toneMapped={false}
          />
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
