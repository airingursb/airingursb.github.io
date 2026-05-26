// Invisible click hitboxes over each work-zone in the scene.
// Fires a 'world-zone-click' event with the zone kind so the HTML
// panel (outside the canvas) can open the right view.
//
// B1 (direction): hover shows a small floating label over the zone
// with the kind + Chinese subtitle. Uses drei Html so labels stay
// camera-facing + properly z-sorted.

import { ZONES, type Interaction } from './zones'
import { type ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import { Html } from '@react-three/drei'
import { emit } from './events'
import { trackWorld } from './umami'

const HITBOX_HEIGHT = 2.5
const HITBOX_RADIUS_DEFAULT = 1.4

export default function ZoneHitboxes() {
  const [hovered, setHovered] = useState<Interaction | null>(null)

  function open(kind: Interaction) {
    emit('world-zone-click', { kind })
    trackWorld('world-zone-click', { kind })
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
            {/* Hover label — drei Html keeps it camera-facing + properly
                z-sorted. center+transform so the floating tooltip sits
                above the zone. pointer-events:none so it doesn't block
                the hitbox underneath. */}
            {isHover && (
              <Html
                position={[0, 2.4, 0]}
                center
                distanceFactor={10}
                style={{ pointerEvents: 'none' }}
              >
                <div className="zone-hover-label">{z.label}</div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}
