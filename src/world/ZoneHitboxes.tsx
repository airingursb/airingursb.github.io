// Invisible click hitboxes over each work-zone in the scene.
// Fires a 'world-zone-click' event with the zone kind so the HTML
// panel (outside the canvas) can open the right view.

import { ZONES, type Interaction } from './zones'
import { type ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'

const HITBOX_HEIGHT = 2.5
const HITBOX_RADIUS_DEFAULT = 1.4

export default function ZoneHitboxes() {
  const [hovered, setHovered] = useState<Interaction | null>(null)

  function open(kind: Interaction) {
    window.dispatchEvent(new CustomEvent('world-zone-click', { detail: { kind } }))
  }

  function setCursor(on: boolean) {
    document.body.style.cursor = on ? 'pointer' : 'auto'
  }

  return (
    <group>
      {ZONES.map((z) => {
        // Cabin is bigger, others around 1.4 radius
        const r = z.kind === 'chat' ? 2.2 : HITBOX_RADIUS_DEFAULT
        const isHover = hovered === z.kind
        return (
          <group key={z.kind} position={[z.pos[0], 0, z.pos[1]]}>
            {/* Invisible cylindrical hitbox */}
            <mesh
              position={[0, HITBOX_HEIGHT / 2, 0]}
              onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); open(z.kind) }}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(z.kind); setCursor(true) }}
              onPointerOut={(e) => { e.stopPropagation(); setHovered(null); setCursor(false) }}
              visible={false}
            >
              <cylinderGeometry args={[r, r, HITBOX_HEIGHT, 12]} />
              <meshBasicMaterial color={0xffffff} transparent opacity={0.0} />
            </mesh>
            {/* Hover ring on ground */}
            {isHover && (
              <mesh position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[r * 0.85, r * 0.95, 32]} />
                <meshBasicMaterial color="#FFE4A8" transparent opacity={0.6} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}
