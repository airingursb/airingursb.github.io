// World — Airing's Forest Cabin Island.
//
// Final layout (iter 15):
//   - Organic 22-unit-radius floating island with cliff drop + cloud sea
//   - Log cabin (HERO) with smoke + warm window glow + red door + porch
//   - 4 outdoor zones: hammock (north), easel (west), gazebo (east),
//     bookdeck (south), campfire (at hammock)
//   - 45 procedural trees (5 species) + 35 fillers + ground cover
//   - River + pond + waterfall + bridge
//   - Critters: cat / ducks / deer + sparkle birds/butterflies/bees
//   - Domestic: garden / clothesline / mailbox / wreath / feeder / dock
//   - Atmospherics: falling leaves + V-formation birds + dust motes
//   - Lighting: warm afternoon ACES + SSAO + Bloom + subtle DoF
//   - Avatar: panda billboard at cabin porch (idle breathing)
//   - Distant: 2 mini islands with windmill

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { on } from './events'
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
import ZoneHitboxes from './ZoneHitboxes'
import MochiNPC from './MochiNPC'
import ZoneHints from './ZoneHints'
import AmbientFX from './AmbientFX'
// Sub-A iter-10: Rainbow + HotAirBalloon + Scarecrow cut to protect cabin
// as the visual hero. (Files left on disk for easy re-enable.)

// Adaptive quality detection — gates expensive postprocessing on low-end.
function detectQuality(): 'high' | 'medium' | 'low' {
  if (typeof window === 'undefined') return 'medium'
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const cpu = navigator.hardwareConcurrency ?? 4
  const ram = (navigator as any).deviceMemory ?? 4
  const isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  if (reducedMotion || isMobile || cpu <= 4 || ram <= 4) return 'low'
  if (cpu < 8) return 'medium'
  return 'high'
}
const QUALITY = typeof window !== 'undefined' ? detectQuality() : 'medium'

function CameraControls() {
  const ref = useRef<OrbitControlsImpl | null>(null)
  useEffect(() => on('world-reset-camera', () => ref.current?.reset()), [])
  return (
    <OrbitControls
      ref={ref as any}
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
  )
}

// Day/dusk theme — listens for 'world-theme' event from WorldUI and
// swaps directional sun color + ambient warmth. Stage 2: also pulls
// sky sun position lower for redder horizon, but Sky.tsx is currently
// module-static so we just adjust the lights here.
type Theme = 'day' | 'dusk'
function ThemeAwareLights({ theme }: { theme: Theme }) {
  const sun = theme === 'day'
    ? { pos: [20, 11, 9], color: '#FFD09A', intensity: 2.2 }
    : { pos: [18, 4, 14], color: '#FF9A6A', intensity: 1.6 }
  const ambient = theme === 'day'
    ? { color: '#FFE4C0', intensity: 0.35 }
    : { color: '#E8B888', intensity: 0.28 }
  return (
    <>
      <hemisphereLight args={[theme === 'day' ? '#FFD9A8' : '#E89A6E', theme === 'day' ? '#5A3A28' : '#3A2418', 0.55]} />
      <ambientLight intensity={ambient.intensity} color={ambient.color} />
      <directionalLight
        position={sun.pos as [number, number, number]}
        intensity={sun.intensity}
        color={sun.color}
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
      <directionalLight position={[-14, 12, -10]} intensity={0.4} color={theme === 'day' ? '#FAD6B0' : '#D8A088'} />
      <directionalLight position={[-20, 8, 20]} intensity={0.35} color={theme === 'day' ? '#F4D9A0' : '#D9886B'} />
    </>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('day')
  useEffect(() => on('world-theme', (next) => {
    setTheme(next)
    document.body.dataset.worldTheme = next
  }), [])
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
      {/* Fog tinted to theme */}
      <fog attach="fog" args={[theme === 'day' ? '#F4E4C8' : '#D89A78', 55, 140]} />

      <Sky theme={theme} />
      <Void />

      <ThemeAwareLights theme={theme} />

      {/* === The diorama (Suspense-wrapped so async resources show no flash) === */}
      <Suspense fallback={null}>
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
        <MochiNPC />
        <DistantIslands />
        <Campfire />
        <CloudShadows />
        <Lanterns />
        <ContactShadowsLayer />
        <ZoneHitboxes />
        <ZoneHints />
        <AmbientFX />
      </Suspense>

      <CameraControls />

      {/* Adaptive post-processing — drop expensive passes on low-tier devices */}
      <EffectComposer multisampling={0}>
        {QUALITY === 'high' && (
          <DepthOfField focusDistance={0.04} focalLength={0.08} bokehScale={1.5} />
        )}
        {QUALITY !== 'low' && (
          <SSAO
            samples={QUALITY === 'high' ? 20 : 12}
            radius={0.15}
            intensity={14}
            luminanceInfluence={0.6}
            color={0x000000}
            worldDistanceThreshold={0.5}
            worldDistanceFalloff={0.3}
            worldProximityThreshold={3}
            worldProximityFalloff={0.5}
          />
        )}
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.6} mipmapBlur />
        <BrightnessContrast brightness={0.02} contrast={0.08} />
        <Vignette eskil={false} offset={0.18} darkness={0.35} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
