// World — Airing's Forest Cabin Island (iteration 4 · daytime + polish).
//
// Adds: cloud sea void treatment, transmission-material water + animated
// waterfall, critters (cat/ducks/deer/birds/butterflies/fireflies),
// weathervane focal silhouette, contact shadows, autumn maple + cherry
// blossom color accents, raised camera target.

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, SMAA, ToneMapping, BrightnessContrast } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping } from 'three'
import Island from './Island'
import Cabin from './Cabin'
import Gazebo from './Gazebo'
import Deck from './Deck'
import HammockSpot from './HammockSpot'
import EaselClearing from './EaselClearing'
import ForestPath from './ForestPath'
import Forest from './Forest'
import Lanterns from './Lanterns'
import Sky from './Sky'
import Water from './Water'
import GroundCover from './GroundCover'
import Storytelling from './Storytelling'
import Void from './Void'
import Critters from './Critters'
import Weathervane from './Weathervane'
import ContactShadowsLayer from './ContactShadowsLayer'
import Domestic from './Domestic'
import Scarecrow from './Scarecrow'

export default function App() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [34, 26, 30], fov: 26 }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <fog attach="fog" args={['#D7E9F5', 50, 130]} />

      <Sky />
      <Void />

      {/* === Lighting === */}
      <hemisphereLight args={['#cfe6ff', '#8a7d5e', 0.7]} />
      <ambientLight intensity={0.45} color="#fff6e0" />
      <directionalLight
        position={[18, 9, 6]}
        intensity={1.4}
        color="#FFD9A0"
        castShadow
        shadow-mapSize={[3072, 3072]}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-14, 12, -10]} intensity={0.32} color="#b0d5e8" />

      {/* === The diorama === */}
      <Island />
      <ForestPath />
      <Water />
      <Forest />
      <GroundCover />
      <Cabin />
      <Weathervane />
      <Gazebo />
      <Deck />
      <HammockSpot />
      <EaselClearing />
      <Storytelling />
      <Domestic />
      <Scarecrow />
      <Critters />
      <Lanterns />
      <ContactShadowsLayer />

      {/* === Camera — slow rotation, raised target so cabin roof + gazebo are centered === */}
      <OrbitControls
        target={[0, 3.5, 0]}
        enablePan={false}
        enableZoom={true}
        minDistance={22}
        maxDistance={70}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.44}
        autoRotate
        autoRotateSpeed={0.1}
      />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.4} luminanceThreshold={0.85} luminanceSmoothing={0.4} mipmapBlur />
        <BrightnessContrast brightness={0.02} contrast={0.06} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
