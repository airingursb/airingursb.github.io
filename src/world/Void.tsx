// Void treatment — cloud sea below the floating island so the camera
// doesn't look into bare sky-fog when it pans down. Per Sub-A gap #1.

import { useMemo } from 'react'
import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'
import { useTimeOfDay, type TimePhase } from './time-of-day'

// Phase-aware ocean color. Was hardcoded #8FB4D9 (pale blue) — at night
// + pinkish fog that made a bright pink lower-hemisphere band visible in
// the camera, breaking the night sky continuity. Match each phase's mood
// so the plane fades cleanly into the fog horizon instead of standing out.
const OCEAN_COLORS: Record<TimePhase, string> = {
  dawn:  '#A8B6CC',   // pale cool-blue with hint of dawn
  day:   '#8FB4D9',   // original — pale daytime blue
  dusk:  '#7A88A8',   // muted purple-blue
  night: '#1E2540',   // deep navy, matches NightSkydome horizon
}

export default function Void() {
  const tod = useTimeOfDay()
  const order: TimePhase[] = ['dawn', 'day', 'dusk', 'night']
  const idx = order.indexOf(tod.phase)
  const a = OCEAN_COLORS[tod.phase]
  const b = OCEAN_COLORS[order[(idx + 1) % order.length]]
  const heldBlend = tod.blend < 0.75 ? 0 : (tod.blend - 0.75) / 0.25
  const oceanColor = useMemo(
    () => '#' + new THREE.Color(a).lerp(new THREE.Color(b), heldBlend).getHexString(),
    [a, b, heldBlend],
  )
  // Hide the giant ocean plane during night/late-dusk. With MeshStandardMaterial
  // it gets re-lit by hemiSky → appears noticeably brighter than the NightSkydome
  // above it, producing a sharp "horizon seam" across the lower frame. NightSkydome
  // (a full inverted sphere) already covers the lower hemisphere with the right
  // dark color, so the plane is redundant at night.
  const hidePlane = tod.phase === 'night' || (tod.phase === 'dusk' && tod.blend > 0.7)
  return (
    <group>
      {/* Ocean plane — visible during the day, hidden at night to avoid
          the horizon-seam against the dark sky. */}
      {!hidePlane && (
        <mesh position={[0, -22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[600, 600, 1, 1]} />
          <meshBasicMaterial
            color={oceanColor}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Layered cloud sea — close + far layers, varied bounds, broader Y range.
          Same night-gate as the plane: bright white #ffffff puffs against the
          dark NightSkydome would re-create the horizon-seam problem. */}
      {!hidePlane && (
      <Clouds material={THREE.MeshBasicMaterial} limit={800}>
        {/* Near layer y=-18 to -22 */}
        <Cloud seed={101} segments={32} position={[-10, -18,   8]} bounds={[10, 3, 8]} volume={6} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={102} segments={32} position={[ 14, -20, -10]} bounds={[12, 3, 7]} volume={7} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={103} segments={32} position={[ 22, -19,   4]} bounds={[8, 3, 6]} volume={5} color="#ffffff" opacity={0.65} fade={22} />
        <Cloud seed={104} segments={32} position={[-18, -21, -10]} bounds={[10, 3, 7]} volume={6} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={105} segments={32} position={[  4, -22,  16]} bounds={[7, 3, 6]} volume={4} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={106} segments={32} position={[-22, -22,   4]} bounds={[8, 3, 6]} volume={5} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={107} segments={32} position={[ 26, -21,  -4]} bounds={[9, 3, 6]} volume={6} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={108} segments={28} position={[  0, -19,   0]} bounds={[14, 3, 14]} volume={8} color="#ffffff" opacity={0.55} fade={24} />
        {/* Far layer y=-30 to -38 — darker shadow tint */}
        <Cloud seed={201} segments={28} position={[-16, -32,  20]} bounds={[12, 3, 10]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={202} segments={28} position={[ 22, -36, -14]} bounds={[10, 3, 8]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={203} segments={28} position={[-26, -34, -18]} bounds={[12, 3, 10]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={204} segments={28} position={[ 30, -38,  16]} bounds={[10, 3, 8]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={205} segments={28} position={[  6, -36,  30]} bounds={[14, 3, 12]} volume={8} color="#B8C8DC" opacity={0.65} fade={28} />
      </Clouds>
      )}

      {/* Far horizon wrapped with extra cloud belt — no hard ring */}
      {!hidePlane && (
      <Clouds material={THREE.MeshBasicMaterial} limit={400}>
        <Cloud seed={301} segments={24} position={[ 60, -8,   0]} bounds={[8, 4, 12]} volume={5} color="#D7E9F5" opacity={0.5} fade={36} />
        <Cloud seed={302} segments={24} position={[-60, -8,   0]} bounds={[8, 4, 12]} volume={5} color="#D7E9F5" opacity={0.5} fade={36} />
        <Cloud seed={303} segments={24} position={[  0, -8,  60]} bounds={[12, 4, 8]} volume={5} color="#D7E9F5" opacity={0.5} fade={36} />
        <Cloud seed={304} segments={24} position={[  0, -8, -60]} bounds={[12, 4, 8]} volume={5} color="#D7E9F5" opacity={0.5} fade={36} />
        <Cloud seed={305} segments={22} position={[ 42, -6,  42]} bounds={[10, 4, 8]} volume={5} color="#E0EBF5" opacity={0.42} fade={32} />
        <Cloud seed={306} segments={22} position={[-42, -6,  42]} bounds={[10, 4, 8]} volume={5} color="#E0EBF5" opacity={0.42} fade={32} />
        <Cloud seed={307} segments={22} position={[ 42, -6, -42]} bounds={[10, 4, 8]} volume={5} color="#E0EBF5" opacity={0.42} fade={32} />
        <Cloud seed={308} segments={22} position={[-42, -6, -42]} bounds={[10, 4, 8]} volume={5} color="#E0EBF5" opacity={0.42} fade={32} />
      </Clouds>
      )}
    </group>
  )
}
