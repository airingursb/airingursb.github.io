// C2 — Brass telescope on the lookout. Click → camera dollies in to
// the eyepiece POV, vignette overlay narrows view; click anywhere or
// press Esc → returns to default. Coordinates with CameraControls
// via the 'world-telescope-toggle' custom event.

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { emit } from './events'

// Position adjacent to the HiddenPath lookout (-10, 0, -8). Telescope
// sits on a low tripod ~0.6m off the ground, pointed roughly south-
// west toward the distant islands.
const POS: [number, number, number] = [-10.0, 0, -7.2]

export default function Telescope() {
  const [hovered, setHovered] = useState(false)
  const scopeRef = useRef<THREE.Group>(null)
  // Subtle idle wobble — brass scope catches highlight as it gently
  // breathes on its mount
  useFrame((s) => {
    if (!scopeRef.current) return
    const t = s.clock.elapsedTime
    scopeRef.current.rotation.x = -0.30 + Math.sin(t * 0.5) * 0.012
    scopeRef.current.rotation.z = Math.sin(t * 0.4 + 1.2) * 0.008
  })
  return (
    <group
      position={POS}
      rotation={[0, -0.6, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = '' }}
      onClick={(e) => {
        e.stopPropagation()
        emit('world-telescope-toggle', undefined)
      }}
    >
      {/* Tripod — 3 legs splaying outward */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, i) => (
        <group key={`leg${i}`} rotation={[0, angle, 0]}>
          <mesh position={[0.16, 0.30, 0]} rotation={[0, 0, 0.30]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.70, 6]} />
            <meshStandardMaterial color="#3A2A20" roughness={0.85} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Apex collar where legs meet — small brass cap */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
        <meshStandardMaterial color="#A07840" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Mount yoke — pivot ring + arm */}
      <mesh position={[0, 0.70, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
        <meshStandardMaterial color="#604838" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* The scope itself — long brass tube, tilted upward.
          Group ref enables subtle idle wobble. Scale 1.5× over first
          pass so the scope reads from default orbit distance (~50u). */}
      <group ref={scopeRef} position={[0, 0.78, 0]} scale={1.45}>
        {/* Main barrel — brass cylinder */}
        <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.6, 16]} />
          <meshStandardMaterial color="#C99850" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Objective end (front, larger flared) */}
        <mesh position={[0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.095, 0.07, 0.08, 16]} />
          <meshStandardMaterial color="#A07840" metalness={0.75} roughness={0.30} />
        </mesh>
        {/* Objective lens (dark front disc with faint emissive 'glint'
            so the scope reads as a glassy lens, not a black hole) */}
        <mesh position={[0.52, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.005, 16]} />
          <meshStandardMaterial color="#1A1612" emissive="#3a4458" emissiveIntensity={0.25} metalness={0.4} roughness={0.4} />
        </mesh>
        {/* Eyepiece (back, smaller) */}
        <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 12]} />
          <meshStandardMaterial color="#604838" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Focusing knob — small dark cylinder atop barrel */}
        <mesh position={[0.05, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.030, 0.030, 0.030, 8]} />
          <meshStandardMaterial color="#3A2A20" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Optional emissive ring around objective when hovered for
            discoverability — makes it pop in dusk/night */}
        {hovered && (
          <mesh position={[0.49, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.10, 0.008, 6, 20]} />
            <meshBasicMaterial color="#FFD08A" />
          </mesh>
        )}
      </group>
      {hovered && (
        <Html
          position={[0, 1.5, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="zone-hover-label">远望镜 · 点击远眺</div>
        </Html>
      )}
    </group>
  )
}
