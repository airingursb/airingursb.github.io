// Bright warm daytime sky with drifting clouds.
//
// Uses drei <Sky> for atmospheric Hosek-Wilkie sun-aware gradient,
// plus a few large drei <Cloud> sprites for puffy clouds at horizon.

import { Sky as DreiSky, Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

export default function Sky({ theme = 'day' }: { theme?: 'day' | 'dusk' }) {
  const sunPos: [number, number, number] = theme === 'day' ? [20, 11, 9] : [18, 4, 14]
  // V2 wave 3: clouds tint warm at dusk to catch low-sun light.
  // Day: white. Dusk: peach/cream — same warmth language as the
  // ambient firefly/lantern emissives.
  const cloudColor = theme === 'day' ? '#ffffff' : '#FBD0A8'
  const cirrusColor = theme === 'day' ? '#ffffff' : '#F8B68A'  // higher = catches more sun
  // Dusk: lower sun + more turbidity + more rayleigh = redder horizon
  return (
    <>
      <DreiSky
        distance={450000}
        sunPosition={sunPos}
        mieCoefficient={theme === 'day' ? 0.005 : 0.01}
        mieDirectionalG={theme === 'day' ? 0.85 : 0.92}
        rayleigh={theme === 'day' ? 1.8 : 3.5}
        turbidity={theme === 'day' ? 6 : 10}
      />

      {/* Puffy clouds — drifting masses, theme-tinted */}
      <Clouds material={THREE.MeshBasicMaterial} limit={400}>
        <Cloud seed={1} segments={32} position={[-30, 18, -20]} bounds={[10, 4, 6]} volume={6} color={cloudColor} opacity={0.85} fade={20} />
        <Cloud seed={2} segments={28} position={[ 28, 22, -18]} bounds={[ 8, 3, 5]} volume={5} color={cloudColor} opacity={0.80} fade={20} />
        <Cloud seed={3} segments={26} position={[  0, 24,  28]} bounds={[ 9, 3, 5]} volume={5} color={cloudColor} opacity={0.78} fade={22} />
        <Cloud seed={4} segments={24} position={[-22, 20,  22]} bounds={[ 7, 3, 4]} volume={4} color={cloudColor} opacity={0.75} fade={22} />
        <Cloud seed={5} segments={22} position={[ 18, 16,  26]} bounds={[ 6, 2.5, 4]} volume={4} color={cloudColor} opacity={0.70} fade={22} />
        {/* High cirrus — catches more sun at dusk = warmer tint */}
        <Cloud seed={11} segments={20} position={[-32, 45,   8]} bounds={[22, 1, 5]} volume={3} color={cirrusColor} opacity={0.32} fade={28} />
        <Cloud seed={13} segments={20} position={[  4, 50,  22]} bounds={[20, 1, 4]} volume={3} color={cirrusColor} opacity={0.32} fade={28} />
        <Cloud seed={14} segments={20} position={[-22, 52, -24]} bounds={[22, 1, 5]} volume={3} color={cirrusColor} opacity={0.28} fade={28} />
      </Clouds>
    </>
  )
}
