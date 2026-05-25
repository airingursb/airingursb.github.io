// V2 scene polish B3 (softened): canopy dapple light — warm motes
// drifting in the air near the cabin where sun would filter through
// pine boughs. Sub-A's original suggestion was literal godrays via
// stretched cones, flagged as Med risk ("done badly looks like
// floating ghost bars"). Switched to atmospheric Sparkles which give
// the FEEL of dappled sunlight without trying to render hard shafts.
//
// Conditional on theme=day (dusk has its own warm light from lanterns
// igniting, and dappled-sun motes don't read at low sun angles).

import { Sparkles } from '@react-three/drei'
import { useTimeOfDay } from './time-of-day'

type Theme = 'day' | 'dusk'

// 3 dapple zones near cabin + forest edges where canopy gaps exist.
const ZONES: Array<{ pos: [number, number, number]; scale: [number, number, number] }> = [
  // Above cabin clearing
  { pos: [-2.5, 2.4, -0.5], scale: [3.2, 1.8, 3.2] },
  // Above stepping-stones path near cabin
  { pos: [ 1.5, 2.0,  1.8], scale: [3.0, 1.6, 3.0] },
  // Near fox shrine clearing (gives the tucked-away spot some glow)
  { pos: [-4.6, 2.2, -6.5], scale: [2.4, 1.6, 2.4] },
]

export default function CanopyDapple({ theme: _theme }: { theme?: Theme } = {}) {
  // F-deep: dapples are a DAY-ONLY phenomenon. Render nothing at dawn
  // (low sun, no overhead canopy gaps), dusk (lantern warmth takes
  // over), or night. Opacity fades in over first 0.15 of day-blend
  // and out over last 0.15 for smooth boundaries.
  const tod = useTimeOfDay()
  if (tod.phase !== 'day') return null
  let opacity = 0.55
  if (tod.blend < 0.15)      opacity = 0.55 * (tod.blend / 0.15)
  else if (tod.blend > 0.85) opacity = 0.55 * (1 - (tod.blend - 0.85) / 0.15)
  return (
    <group>
      {ZONES.map((z, i) => (
        <Sparkles
          key={i}
          count={18}
          scale={z.scale}
          position={z.pos}
          size={8}
          speed={0.22}
          color="#FFEFC8"
          opacity={opacity}
        />
      ))}
    </group>
  )
}
