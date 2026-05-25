// Bright warm daytime sky with drifting clouds.
//
// Uses drei <Sky> for atmospheric Hosek-Wilkie sun-aware gradient,
// plus a few large drei <Cloud> sprites for puffy clouds at horizon.
//
// F: now reads useTimeOfDay() for 4-phase atmosphere (dawn-pink →
// noon-blue → dusk-amber → night-indigo) instead of 2-state day/dusk.
// Lerps across phase blend so transitions are smooth, not stepped.

import { Sky as DreiSky, Cloud, Clouds, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useTimeOfDay, type TimePhase } from './time-of-day'

// Per-phase sky parameters. Lerped between phases via blend.
const PHASE_PARAMS: Record<TimePhase, {
  sunPos: [number, number, number]
  mieCoefficient: number
  mieDirectionalG: number
  rayleigh: number
  turbidity: number
  cloudColor: string
  cirrusColor: string
}> = {
  dawn:  { sunPos: [10, 2, 18],  mieCoefficient: 0.012, mieDirectionalG: 0.93, rayleigh: 4.0, turbidity: 8,  cloudColor: '#FFD8C8', cirrusColor: '#FFB088' },
  day:   { sunPos: [20, 11, 9],  mieCoefficient: 0.005, mieDirectionalG: 0.85, rayleigh: 1.8, turbidity: 6,  cloudColor: '#ffffff', cirrusColor: '#ffffff' },
  dusk:  { sunPos: [18, 4, 14],  mieCoefficient: 0.010, mieDirectionalG: 0.92, rayleigh: 3.5, turbidity: 10, cloudColor: '#FBD0A8', cirrusColor: '#F8B68A' },
  night: { sunPos: [0, -6, 8],   mieCoefficient: 0.014, mieDirectionalG: 0.95, rayleigh: 0.6, turbidity: 18, cloudColor: '#4A4868', cirrusColor: '#3A3858' },
}

const PHASE_ORDER: TimePhase[] = ['dawn', 'day', 'dusk', 'night']

// Linear interpolation between adjacent phase params.
// Special-case: sunPos.y crossing zero (dusk→night, night→dawn) creates
// a green-flash artifact in the Hosek-Wilkie sky shader because
// horizon-tinting flips sign abruptly. Hold sun above y=0.5 during
// crossing-blends, snapping to night y only when blend ≥ 0.85.
function lerpParams(phase: TimePhase, blend: number) {
  const idx = PHASE_ORDER.indexOf(phase)
  const next = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length]
  const a = PHASE_PARAMS[phase]
  const b = PHASE_PARAMS[next]
  const lerp = (av: number, bv: number) => av + (bv - av) * blend
  const lerpColor = (ac: string, bc: string) =>
    '#' + new THREE.Color(ac).lerp(new THREE.Color(bc), blend).getHexString()
  // Sun-Y crossing protection: cubic-ease that holds high before diving
  const aYAbove = a.sunPos[1] > 0
  const bYBelow = b.sunPos[1] < 0
  const crossing = aYAbove && bYBelow   // dusk → night
  const reverseCrossing = a.sunPos[1] < 0 && b.sunPos[1] > 0  // night → dawn
  let sunY: number
  if (crossing) {
    // Hold at a.sunPos.y until blend 0.85, then dive to b.sunPos.y
    sunY = blend < 0.85 ? a.sunPos[1] : a.sunPos[1] + (b.sunPos[1] - a.sunPos[1]) * ((blend - 0.85) / 0.15)
  } else if (reverseCrossing) {
    // Stay low until blend 0.15, then rise
    sunY = blend < 0.15 ? a.sunPos[1] : a.sunPos[1] + (b.sunPos[1] - a.sunPos[1]) * ((blend - 0.15) / 0.85)
  } else {
    sunY = lerp(a.sunPos[1], b.sunPos[1])
  }
  return {
    sunPos: [lerp(a.sunPos[0], b.sunPos[0]), sunY, lerp(a.sunPos[2], b.sunPos[2])] as [number, number, number],
    mieCoefficient: lerp(a.mieCoefficient, b.mieCoefficient),
    mieDirectionalG: lerp(a.mieDirectionalG, b.mieDirectionalG),
    rayleigh: lerp(a.rayleigh, b.rayleigh),
    turbidity: lerp(a.turbidity, b.turbidity),
    cloudColor: lerpColor(a.cloudColor, b.cloudColor),
    cirrusColor: lerpColor(a.cirrusColor, b.cirrusColor),
  }
}

export default function Sky({ theme }: { theme?: 'day' | 'dusk' } = {}) {
  // Legacy theme prop ignored if useTimeOfDay returns a phase — but
  // we still accept the prop signature for back-compat. The hook
  // reads URL/localStorage/real-time internally.
  const tod = useTimeOfDay()
  const p = lerpParams(tod.phase, tod.blend)
  return (
    <>
      <DreiSky
        distance={450000}
        sunPosition={p.sunPos}
        mieCoefficient={p.mieCoefficient}
        mieDirectionalG={p.mieDirectionalG}
        rayleigh={p.rayleigh}
        turbidity={p.turbidity}
      />

      {/* Puffy clouds — drifting masses, phase-tinted. Lambert (not
          Basic) so the directional sun intensity actually affects them —
          clouds dim at night instead of glowing brighter than the dark sky. */}
      <Clouds material={THREE.MeshLambertMaterial} limit={400}>
        <Cloud seed={1} segments={32} position={[-30, 18, -20]} bounds={[10, 4, 6]} volume={6} color={p.cloudColor} opacity={0.85} fade={20} />
        <Cloud seed={2} segments={28} position={[ 28, 22, -18]} bounds={[ 8, 3, 5]} volume={5} color={p.cloudColor} opacity={0.80} fade={20} />
        <Cloud seed={3} segments={26} position={[  0, 24,  28]} bounds={[ 9, 3, 5]} volume={5} color={p.cloudColor} opacity={0.78} fade={22} />
        <Cloud seed={4} segments={24} position={[-22, 20,  22]} bounds={[ 7, 3, 4]} volume={4} color={p.cloudColor} opacity={0.75} fade={22} />
        <Cloud seed={5} segments={22} position={[ 18, 16,  26]} bounds={[ 6, 2.5, 4]} volume={4} color={p.cloudColor} opacity={0.70} fade={22} />
        {/* High cirrus — catches more sun, warmer at dawn/dusk */}
        <Cloud seed={11} segments={20} position={[-32, 45,   8]} bounds={[22, 1, 5]} volume={3} color={p.cirrusColor} opacity={0.32} fade={28} />
        <Cloud seed={13} segments={20} position={[  4, 50,  22]} bounds={[20, 1, 4]} volume={3} color={p.cirrusColor} opacity={0.32} fade={28} />
        <Cloud seed={14} segments={20} position={[-22, 52, -24]} bounds={[22, 1, 5]} volume={3} color={p.cirrusColor} opacity={0.28} fade={28} />
      </Clouds>

      {/* F-deep: stars only show at dusk-late and night. Without them
          the night sky was flat indigo. Render gated by phase to avoid
          a 3000-particle Stars cost during day. R7: count gated by
          QUALITY tier (exposed on window by App.tsx) — 1200 on low-end
          devices, 3000 elsewhere. Stars uses per-vertex shimmer shader. */}
      {(tod.phase === 'night' || (tod.phase === 'dusk' && tod.blend > 0.6)) && (
        <Stars
          radius={300}
          depth={50}
          count={typeof window !== 'undefined' && (window as unknown as { __WORLD_QUALITY?: string }).__WORLD_QUALITY === 'low' ? 1200 : 3000}
          factor={4}
          fade
          speed={0.5}
        />
      )}
    </>
  )
}
