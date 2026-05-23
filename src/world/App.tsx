// World — Airing's Forest Cabin Island (iteration 4 · daytime + polish).
//
// Adds: cloud sea void treatment, transmission-material water + animated
// waterfall, critters (cat/ducks/deer/birds/butterflies/fireflies),
// weathervane focal silhouette, contact shadows, autumn maple + cherry
// blossom color accents, raised camera target.

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, SMAA, ToneMapping, BrightnessContrast, SSAO, DepthOfField, Vignette } from '@react-three/postprocessing'
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
import PathEdges from './PathEdges'
import SoilHalos from './SoilHalos'
import Atmospherics from './Atmospherics'
import Avatar from './Avatar'
import DistantIslands from './DistantIslands'
import Campfire from './Campfire'
import CloudShadows from './CloudShadows'
// Sub-A iter-10: Rainbow + HotAirBalloon + Scarecrow cut to protect cabin
// as the visual hero. (Files left on disk for easy re-enable.)

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
      {/* Warm afternoon haze — matches sun palette, no overcast blue */}
      <fog attach="fog" args={['#F4E4C8', 55, 140]} />

      <Sky />
      <Void />

      {/* === Lighting === */}
      {/* Hemisphere: warm sky + earthy ground bounce (no cool blue) */}
      <hemisphereLight args={['#FFD9A8', '#5A3A28', 0.55]} />
      <ambientLight intensity={0.35} color="#FFE4C0" />
      {/* Warm afternoon sun — elev ~28°, golden but not full sunset */}
      <directionalLight
        position={[20, 11, 9]}
        intensity={2.2}
        color="#FFD09A"
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
      {/* Fill light — soft warm peach instead of cool blue (lighting cohesion) */}
      <directionalLight position={[-14, 12, -10]} intensity={0.4} color="#FAD6B0" />
      {/* Rim light — warm peach from camera-right rear */}
      <directionalLight position={[-20, 8, 20]} intensity={0.35} color="#F4D9A0" />

      {/* === The diorama === */}
      <Island />
      <ForestPath />
      <PathEdges />
      <Water />
      <Forest />
      <GroundCover />
      <SoilHalos />
      <Cabin />
      <Weathervane />
      <Gazebo />
      <Deck />
      <HammockSpot />
      <EaselClearing />
      <Storytelling />
      <Domestic />
      <Critters />
      <Atmospherics />
      <Avatar />
      <DistantIslands />
      <Campfire />
      <CloudShadows />
      <Lanterns />
      <ContactShadowsLayer />

      {/* === Camera — slow rotation, raised target so cabin roof + gazebo are centered === */}
      <OrbitControls
        target={[0, 5, 0]}
        enablePan={false}
        enableZoom={true}
        minDistance={22}
        maxDistance={50}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.44}
        autoRotate
        autoRotateSpeed={0.1}
      />

      <EffectComposer multisampling={0}>
        {/* DepthOfField — diorama-style miniature feel:
            keeps the cabin focal area sharp while softening distant cliffs */}
        {/* Subtle miniature DoF — focal plane on cabin, gentle blur on edges */}
        <DepthOfField focusDistance={0.04} focalLength={0.08} bokehScale={1.5} />
        {/* SSAO — crevice darkening at every junction */}
        <SSAO
          samples={20}
          radius={0.15}
          intensity={26}
          luminanceInfluence={0.6}
          color={0x000000}
          worldDistanceThreshold={0.5}
          worldDistanceFalloff={0.3}
          worldProximityThreshold={3}
          worldProximityFalloff={0.5}
        />
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.6} mipmapBlur />
        <BrightnessContrast brightness={0.02} contrast={0.08} />
        <Vignette eskil={false} offset={0.18} darkness={0.35} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
