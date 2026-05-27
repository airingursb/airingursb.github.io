// C5 — Guestbook stone. A small standing stone near the hidden path
// lookout, with engraved names of past visitors carved into its face.
// Click to open a small "carve your name" panel; submission persists
// in localStorage and re-renders the texture so the name appears
// engraved immediately.
//
// Storage-only (no backend write) by design — the existing /friends
// page handles the real guestbook. This stone is a private souvenir
// the visitor leaves for themselves on subsequent return visits.

import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { makeCanvasTexture } from './canvasTexture'

const STORAGE_KEY = 'world-guestbook-carved-v1'
const MAX_NAMES = 8   // texture only fits this many before overflowing
const MAX_NAME_LEN = 16

function readCarved(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, MAX_NAMES) : []
  } catch {
    return []
  }
}

function writeCarved(names: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names.slice(0, MAX_NAMES)))
  } catch {}
}

function makeStoneFaceTexture(names: string[]): THREE.CanvasTexture {
  // Stone background + scratched names rendered as light engraved text
  // with offset to fake recessed shadow. Canvas is 256×320 (vertical
  // tablet aspect like a real memorial stone face).
  return makeCanvasTexture(256, 320, (ctx, w, h) => {
    // Mossy gray-green base with mottled noise
    const grd = ctx.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#7E7468')
    grd.addColorStop(0.5, '#665C50')
    grd.addColorStop(1, '#544A40')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)
    // Mottle (stone variance)
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40}, ${70 + Math.random() * 30}, ${50 + Math.random() * 30}, ${0.07 + Math.random() * 0.10})`
      const cx = Math.random() * w
      const cy = Math.random() * h
      const r = 3 + Math.random() * 14
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // Moss patches near bottom
    ctx.fillStyle = 'rgba(80, 110, 65, 0.20)'
    ctx.beginPath()
    ctx.ellipse(w * 0.2, h * 0.92, 30, 12, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(w * 0.72, h * 0.88, 18, 8, -0.2, 0, Math.PI * 2)
    ctx.fill()
    // Title — fixed header at top, abstract calligraphic stroke since
    // detailed glyphs need a font we can't guarantee
    ctx.fillStyle = 'rgba(180, 165, 140, 0.55)'
    ctx.font = 'bold 24px "Songti SC", "Noto Serif SC", "PingFang SC", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.fillText('留名', w / 2, 38)
    // Subtle underline
    ctx.fillStyle = 'rgba(180, 165, 140, 0.35)'
    ctx.fillRect(w * 0.32, 46, w * 0.36, 1.5)
    // Names — engraved by drawing in lighter color slightly offset to
    // mimic a 1px chiseled groove. If no names yet, show a placeholder.
    if (names.length === 0) {
      ctx.fillStyle = 'rgba(160, 150, 130, 0.45)'
      ctx.font = 'italic 16px "Songti SC", Georgia, serif'
      ctx.fillText('（点我留下你的名字）', w / 2, h * 0.5)
    } else {
      ctx.font = 'bold 18px "Songti SC", "Noto Serif SC", "PingFang SC", Georgia, serif'
      ctx.textAlign = 'center'
      const startY = 90
      const lineH = 28
      names.forEach((n, i) => {
        const y = startY + i * lineH
        // Shadow groove (dark, offset down-right) — recesses the engraving
        ctx.fillStyle = 'rgba(20, 18, 14, 0.55)'
        ctx.fillText(n, w / 2 + 1, y + 1)
        // Highlight (lighter, slightly offset up-left) — top edge of groove
        ctx.fillStyle = 'rgba(220, 210, 190, 0.85)'
        ctx.fillText(n, w / 2 - 0.5, y - 0.5)
      })
    }
  })
}

interface PanelProps {
  onSubmit: (name: string) => void
  onClose: () => void
}
function CarvePanel({ onSubmit, onClose }: PanelProps) {
  const [value, setValue] = useState('')
  return (
    <Html
      position={[0, 2.6, 0]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'auto', userSelect: 'none' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(28, 22, 16, 0.94)',
          color: '#E8DEC8',
          padding: '12px 14px',
          borderRadius: 6,
          minWidth: 220,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          fontFamily: '"Songti SC", "Noto Serif SC", Georgia, serif',
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 8, opacity: 0.85 }}>在石上刻下你的名字</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_NAME_LEN))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              onSubmit(value.trim())
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
          placeholder="名字…"
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'rgba(255, 245, 225, 0.10)',
            color: '#FBF0D8',
            border: '1px solid rgba(200, 180, 150, 0.35)',
            borderRadius: 4,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: 'transparent',
              color: '#A89880',
              border: '1px solid rgba(160, 140, 110, 0.4)',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >取消</button>
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => onSubmit(value.trim())}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: value.trim() ? '#A87A4A' : '#5A4830',
              color: '#FBF0D8',
              border: 'none',
              borderRadius: 3,
              cursor: value.trim() ? 'pointer' : 'default',
            }}
          >刻下</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>
          仅记在这块石头上，本地可见。<br />正式留言请到 <a href="/friends" style={{ color: '#E8B860' }}>/friends</a>。
        </div>
      </div>
    </Html>
  )
}

// World position — small clearing south of the hidden-path lookout.
// (HiddenPath ends around southeast quadrant per its source.)
const STONE_POS: [number, number, number] = [-14.5, 0, -7.5]

export default function GuestbookStone() {
  const [names, setNames] = useState<string[]>(readCarved)
  const [panelOpen, setPanelOpen] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  // Re-make texture whenever names change
  const tex = useMemo(() => makeStoneFaceTexture(names), [names])
  useEffect(() => () => tex.dispose(), [tex])
  // Subtle hover-glow shimmer for discoverability — emissive tick
  // when hovered. Stone otherwise reads matte.
  const [hovered, setHovered] = useState(false)
  const faceMatRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((s) => {
    if (!faceMatRef.current) return
    const t = s.clock.elapsedTime
    const baseEm = hovered ? 0.18 : 0
    faceMatRef.current.emissiveIntensity = baseEm + (hovered ? Math.sin(t * 2) * 0.04 : 0)
  })
  return (
    <group ref={groupRef} position={STONE_POS} rotation={[0, 0.5, 0]}>
      {/* Stone base (chunky low pedestal) */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.36, 0.7]} />
        <meshStandardMaterial color="#665C50" roughness={0.96} flatShading />
      </mesh>
      {/* The standing stone tablet — front face shows engraved names */}
      <group
        position={[0, 1.1, 0]}
        onClick={(e) => { e.stopPropagation(); setPanelOpen(true) }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = '' }}
      >
        {/* Slab body — slightly tapered up, like a real tablet stone */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.92, 1.7, 0.18]} />
          <meshStandardMaterial color="#564C42" roughness={0.95} flatShading />
        </mesh>
        {/* Front face — canvas texture w/ names. Tiny offset z so it sits
            on top of the slab face. */}
        <mesh position={[0, 0, 0.092]}>
          <planeGeometry args={[0.86, 1.6]} />
          <meshStandardMaterial
            ref={faceMatRef}
            map={tex}
            roughness={0.92}
            emissive="#FFC57A"
            emissiveIntensity={0}
            emissiveMap={tex}
          />
        </mesh>
        {/* Top cap stone — small flat block sitting on top, like a roof */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[1.04, 0.10, 0.25]} />
          <meshStandardMaterial color="#3E3630" roughness={0.95} flatShading />
        </mesh>
      </group>
      {/* Carve panel (only when open) */}
      {panelOpen && (
        <CarvePanel
          onSubmit={(name) => {
            const next = [name, ...names.filter((n) => n !== name)].slice(0, MAX_NAMES)
            setNames(next)
            writeCarved(next)
            setPanelOpen(false)
          }}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </group>
  )
}
