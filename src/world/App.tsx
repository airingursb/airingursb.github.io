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
import Scarecrow from './Scarecrow'
import PathEdges from './PathEdges'
import SoilHalos from './SoilHalos'
import Atmospherics from './Atmospherics'
import Avatar from './Avatar'
import HotAirBalloon from './HotAirBalloon'
import DistantIslands from './DistantIslands'
import Campfire from './Campfire'
import Rainbow from './Rainbow'

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
        intensity={2.0}
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
      {/* Rim light — cool cyan from camera-right rear to detach silhouettes */}
      <directionalLight position={[-20, 8, 20]} intensity={0.45} color="#a8d8e8" />

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
      <Scarecrow />
      <Critters />
      <Atmospherics />
      <Avatar />
      <HotAirBalloon />
      <DistantIslands />
      <Campfire />
      <Rainbow />
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
        <DepthOfField focusDistance={0.012} focalLength={0.025} bokehScale={2.5} />
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
