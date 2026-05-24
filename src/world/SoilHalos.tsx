// Subtle soil/grass darkening discs at the base of every major structure
// and prop — sells the "this is rooted in the ground" feel per Sub-A
// iter-4 gap #3.

import * as THREE from 'three'
import { useMemo } from 'react'
import { getZone } from './zones'

const SOIL_RING = '#5C3D24'

interface HaloSpec {
  pos: [number, number]
  radius: number
  opacity?: number
}

export default function SoilHalos() {
  // Zones get a wider halo, individual props get smaller ones
  const halos: HaloSpec[] = useMemo(() => {
    const list: HaloSpec[] = []
    const cabin = getZone('chat').pos
    list.push({ pos: cabin, radius: 2.6, opacity: 0.5 })
    const reading = getZone('reading').pos
    list.push({ pos: reading, radius: 1.6, opacity: 0.4 })
    const music = getZone('music').pos
    list.push({ pos: music, radius: 2.0, opacity: 0.45 })
    const comics = getZone('comics').pos
    list.push({ pos: comics, radius: 1.4, opacity: 0.4 })
    const blog = getZone('blog').pos
    list.push({ pos: blog, radius: 2.0, opacity: 0.45 })
    // Scarecrow
    list.push({ pos: [3.5, -6.0], radius: 0.5, opacity: 0.55 })
    // Mailbox
    list.push({ pos: [-2.0, 0.6], radius: 0.4, opacity: 0.55 })
    // Clothesline posts
    list.push({ pos: [3.6 - 1.2, -1.0], radius: 0.35 })
    list.push({ pos: [3.6 + 1.2, -1.0], radius: 0.35 })
    // Bird feeder
    list.push({ pos: [-2.6, -10.0], radius: 0.4, opacity: 0.55 })
    // Pond dock
    list.push({ pos: [7.5, 4.4], radius: 1.0, opacity: 0.4 })
    // Vegetable garden
    list.push({ pos: [-3.4, 1.2], radius: 1.0, opacity: 0.45 })
    return list
  }, [])

  return (
    <group>
      {halos.map((h, i) => (
        <mesh
          key={`halo${i}`}
          /* Sub-A fix: was y=0.612 (12mm above grass top at flat spots,
             floats over terrain bumps). Raised to y=0.66 (still flat on
             unmodified terrain) + polygonOffset to bias z-test toward
             camera so it always wins z-fight against grass below. */
          position={[h.pos[0], 0.66, h.pos[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          {/* Sub-A fix: ringGeometry read as "magic circle"; circleGeometry
              fill reads as "soil stain". */}
          <circleGeometry args={[h.radius, 24]} />
          <meshStandardMaterial
            color={SOIL_RING}
            roughness={0.97}
            transparent
            opacity={(h.opacity ?? 0.4) * 0.7}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
    </group>
  )
}
