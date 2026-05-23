// Bright warm daytime sky with drifting clouds.
//
// Uses drei <Sky> for atmospheric Hosek-Wilkie sun-aware gradient,
// plus a few large drei <Cloud> sprites for puffy clouds at horizon.

import { Sky as DreiSky, Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

export default function Sky() {
  return (
    <>
      {/* Atmospheric sky — sun pos must MATCH App.tsx directionalLight pos
          so shadows + sky disc agree (Sub-A iter-3 gap #3). */}
      <DreiSky
        distance={450000}
        sunPosition={[18, 9, 6]}
        mieCoefficient={0.005}
        mieDirectionalG={0.85}
        rayleigh={1.8}
        turbidity={6}
      />

      {/* Puffy clouds — drifting white masses far away */}
      <Clouds material={THREE.MeshBasicMaterial} limit={400}>
        <Cloud
          seed={1}
          segments={32}
          position={[-30, 18, -20]}
          bounds={[10, 4, 6]}
          volume={6}
          color="#ffffff"
          opacity={0.85}
          fade={20}
        />
        <Cloud
          seed={2}
          segments={28}
          position={[28, 22, -18]}
          bounds={[8, 3, 5]}
          volume={5}
          color="#ffffff"
          opacity={0.8}
          fade={20}
        />
        <Cloud
          seed={3}
          segments={26}
          position={[0, 24, 28]}
          bounds={[9, 3, 5]}
          volume={5}
          color="#ffffff"
          opacity={0.78}
          fade={22}
        />
        <Cloud
          seed={4}
          segments={24}
          position={[-22, 20, 22]}
          bounds={[7, 3, 4]}
          volume={4}
          color="#ffffff"
          opacity={0.75}
          fade={22}
        />
        <Cloud
          seed={5}
          segments={22}
          position={[18, 16, 26]}
          bounds={[6, 2.5, 4]}
          volume={4}
          color="#ffffff"
          opacity={0.7}
          fade={22}
        />
      </Clouds>
    </>
  )
}
