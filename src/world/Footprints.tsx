// V2 scene polish A4: faint footprint trail from the cabin door,
// fading with distance. Implies recent inhabitant motion.
//
// Sub-A risk: "looks like decals/stickers if too crisp — use soft
// alpha texture." Mitigation: footprints are tiny dark ellipses
// laid FLAT on the ground with very low opacity (0.18→0.05), edge-
// softened via radial-gradient CanvasTexture. They sit just above
// the path so they read as recent shoe impressions in soft soil,
// not stickers.

import { useMemo } from 'react'
import * as THREE from 'three'
import { PATH_POINTS } from './zones'

// Soft-edge alpha mask: dark center fading to transparent at edges,
// shared across all footprint planes. Built once via canvas API.
function makeFootprintMask(): THREE.CanvasTexture {
  const W = 64, H = 32
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!
  // Radial gradient — fully opaque core, fades to transparent rim
  const grad = c.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W / 2)
  grad.addColorStop(0,    'rgba(40, 28, 18, 0.9)')
  grad.addColorStop(0.5,  'rgba(40, 28, 18, 0.55)')
  grad.addColorStop(0.85, 'rgba(40, 28, 18, 0.10)')
  grad.addColorStop(1,    'rgba(40, 28, 18, 0)')
  c.fillStyle = grad
  c.beginPath()
  c.ellipse(W / 2, H / 2, W / 2 - 2, H / 2 - 2, 0, 0, Math.PI * 2)
  c.fill()
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// Cabin door is PATH_POINTS[5] = [0, 0]; index range to walk OUTWARD
// from the cabin. Start at index 6 (first step away from cabin),
// walk forward laying alternating L/R prints along the path.
const CABIN_DOOR_IDX = 5
const PRINT_COUNT = 9       // 9 prints — enough to read, not litter the path
const FOOT_OFFSET = 0.10    // L/R offset from path centerline
const SOIL_Y      = 0.06    // just above grass

export default function Footprints() {
  const mask = useMemo(() => makeFootprintMask(), [])

  // Build a list of [x, y, z, rotY, opacity] for each footprint along
  // the path forward from the cabin door.
  const prints = useMemo(() => {
    const out: Array<{ x: number; z: number; rotY: number; alpha: number }> = []
    let i = CABIN_DOOR_IDX + 1
    let printIdx = 0
    while (printIdx < PRINT_COUNT && i < PATH_POINTS.length) {
      const [px, pz] = PATH_POINTS[i]
      const prev = PATH_POINTS[i - 1]
      // Path heading (yaw) so prints align along travel direction
      const dx = px - prev[0]
      const dz = pz - prev[1]
      const heading = Math.atan2(dz, dx)
      // Lateral offset perpendicular to heading, alternating L/R
      const side = printIdx % 2 === 0 ? 1 : -1
      const lx = px + Math.cos(heading + Math.PI / 2) * FOOT_OFFSET * side
      const lz = pz + Math.sin(heading + Math.PI / 2) * FOOT_OFFSET * side
      // Fade with distance from cabin
      const alpha = Math.max(0.04, 0.32 - printIdx * 0.035)
      out.push({ x: lx, z: lz, rotY: heading, alpha })
      printIdx++
      // Take 2 prints near each path point, then move to next
      if (printIdx % 2 === 0) i++
    }
    return out
  }, [])

  return (
    <group>
      {prints.map((p, i) => (
        <mesh
          key={`fp${i}`}
          position={[p.x, SOIL_Y, p.z]}
          rotation={[-Math.PI / 2, 0, -p.rotY]}
        >
          {/* Footprint plane — wider in heading direction than across */}
          <planeGeometry args={[0.18, 0.10]} />
          <meshBasicMaterial
            map={mask}
            transparent
            opacity={p.alpha}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
