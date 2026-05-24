// V2 scene polish A4: faint footprint trail from the cabin door,
// fading with distance. Implies recent inhabitant motion.
//
// Sub-A risk: "looks like decals/stickers if too crisp — use soft
// alpha texture." Mitigation: footprints are tiny dark ellipses
// laid FLAT on the ground with very low opacity (0.18→0.05), edge-
// softened via radial-gradient CanvasTexture. They sit just above
// the path so they read as recent shoe impressions in soft soil,
// not stickers.

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { PATH_POINTS, getZone } from './zones'

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

// V2 wave 3 fix (Sub-A): cabin door is at world ~(-2, -1) + CABIN_D/2
// forward = (-2, 0.5). PATH_POINTS coords are LOCAL? Or world? Checked
// zones.ts — they're world coords (no offset applied at consumers). The
// closest PATH_POINTS to cabin door is index 5 = (0, 0) which is ~2.2
// units from real cabin door. Previous "[0,0] is cabin door" was a
// wrong comment. Fix: anchor footprints in CABIN_DOOR world coords
// and step outward toward PATH_POINTS, lerping into the path.
const CABIN_DOOR_WORLD: [number, number] = [-2.0, 0.5]   // cabin chat-zone + CABIN_D/2
const PRINT_COUNT = 12
const FOOT_OFFSET = 0.10
const SOIL_Y      = 0.06

// Build forward direction from cabin toward first useful path point.
// We blend cabin-door start into the PATH_POINTS interpolation so
// prints originate AT the door (not from a random path index).
function buildForwardTrail(startWorld: [number, number]): Array<{ x: number; z: number; rotY: number; alpha: number }> {
  const out: Array<{ x: number; z: number; rotY: number; alpha: number }> = []
  // Walk path INDICES that are roughly east/southeast from cabin door
  // (the chat→gazebo branch). Start from path[6]=(1.5,0.8) onward.
  const pathStartIdx = 6
  const heading0 = Math.atan2(PATH_POINTS[pathStartIdx][1] - startWorld[1],
                              PATH_POINTS[pathStartIdx][0] - startWorld[0])

  for (let i = 0; i < PRINT_COUNT; i++) {
    // Interpolation: first 4 prints walk from cabin door toward path[6];
    // remaining prints follow path[6] → path[10].
    let x: number, z: number, h: number
    if (i < 4) {
      const u = (i + 1) / 5   // 0.2..0.8
      x = startWorld[0] + (PATH_POINTS[pathStartIdx][0] - startWorld[0]) * u
      z = startWorld[1] + (PATH_POINTS[pathStartIdx][1] - startWorld[1]) * u
      h = heading0
    } else {
      const j = i - 4
      const segA = PATH_POINTS[pathStartIdx + Math.floor(j / 2)]
      const segB = PATH_POINTS[Math.min(PATH_POINTS.length - 1, pathStartIdx + Math.floor(j / 2) + 1)]
      const u = (j % 2 === 0) ? 0.25 : 0.75
      x = segA[0] + (segB[0] - segA[0]) * u
      z = segA[1] + (segB[1] - segA[1]) * u
      h = Math.atan2(segB[1] - segA[1], segB[0] - segA[0])
    }
    // L/R offset perpendicular to heading
    const side = i % 2 === 0 ? 1 : -1
    x += Math.cos(h + Math.PI / 2) * FOOT_OFFSET * side
    z += Math.sin(h + Math.PI / 2) * FOOT_OFFSET * side
    const alpha = Math.max(0.04, 0.34 - i * 0.025)
    out.push({ x, z, rotY: h, alpha })
  }
  return out
}

export default function Footprints() {
  const mask = useMemo(() => makeFootprintMask(), [])
  // Sub-A leak fix: dispose CanvasTexture on unmount
  useEffect(() => () => mask.dispose(), [mask])

  // Forward trail FROM cabin door (Sub-A bug fix: was rendering ~3.5
  // units away from cabin because comment misidentified PATH_POINTS[5]
  // as cabin door — it isn't; the actual door is at world (-2, 0.5))
  const forwardPrints = useMemo(() => buildForwardTrail(CABIN_DOOR_WORLD), [])

  // Also build a SHORTER trail going from the cabin door toward the
  // hammock-zone direction (chat → reading branch via path indices
  // 0..4). Lower alpha — implies an older path.
  const backwardPrints = useMemo(() => {
    const out: Array<{ x: number; z: number; rotY: number; alpha: number }> = []
    // Direction from cabin door toward PATH_POINTS[4] = (-0.4, -2.0)
    const target = PATH_POINTS[4]
    const heading = Math.atan2(target[1] - CABIN_DOOR_WORLD[1],
                               target[0] - CABIN_DOOR_WORLD[0])
    for (let i = 0; i < 6; i++) {
      const u = (i + 1) / 7
      const x = CABIN_DOOR_WORLD[0] + (target[0] - CABIN_DOOR_WORLD[0]) * u
      const z = CABIN_DOOR_WORLD[1] + (target[1] - CABIN_DOOR_WORLD[1]) * u
      const side = i % 2 === 0 ? 1 : -1
      const lx = x + Math.cos(heading + Math.PI / 2) * FOOT_OFFSET * side
      const lz = z + Math.sin(heading + Math.PI / 2) * FOOT_OFFSET * side
      out.push({ x: lx, z: lz, rotY: heading, alpha: Math.max(0.02, 0.18 - i * 0.025) })
    }
    return out
  }, [])

  const allPrints = [...forwardPrints, ...backwardPrints]

  return (
    <group>
      {allPrints.map((p, i) => (
        <mesh
          key={`fp${i}`}
          position={[p.x, SOIL_Y, p.z]}
          rotation={[-Math.PI / 2, 0, -p.rotY]}
        >
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
