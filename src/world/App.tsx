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

import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
import DuskFog from './DuskFog'
import Onsen from './Onsen'
import FoxShrine from './FoxShrine'
import CanopyDapple from './CanopyDapple'
import Footprints from './Footprints'
import WindChime from './WindChime'
import PersimmonTree from './PersimmonTree'
import SunsetBirds from './SunsetBirds'
import PathMushrooms from './PathMushrooms'
import WisteriaArch from './WisteriaArch'
import DistantOwl from './DistantOwl'
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
import BlogKiosk from './BlogKiosk'
import ComicsEasel from './ComicsEasel'
import MusicBandstand from './MusicBandstand'
import ReadingCabinet from './ReadingCabinet'
import CabinBanner from './CabinBanner'
import { Sakura } from './Sakura'
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

// V2 wave 3 finale: 4.5-second cinematic intro pan from close-on-cabin
// to the establishing 3/4 angle. Hands camera to user OrbitControls
// after the pan. Skippable: any pointerdown on the canvas during the
// pan jumps straight to the final pose. Sub-A: this is "what pushes
// the scene from 8.5 to 10 — diorama starts feeling directed."
function CameraControls() {
  const ref = useRef<OrbitControlsImpl | null>(null)
  const introRef = useRef({ started: 0, active: true, skipped: false })
  // Theme-toggle "breath" — subtle dolly that fires when user presses
  // 🌙/☀️. Camera momentarily leans forward (eases distance from 28→25
  // unit radius) over 1.5s as if "leaning in to watch lights come on",
  // then eases back to neutral.
  const breathRef = useRef({ active: false, started: 0 })
  const { camera, gl } = useThree()

  useEffect(() => on('world-reset-camera', () => ref.current?.reset()), [])
  useEffect(() => on('world-theme', () => {
    breathRef.current.active = true
    breathRef.current.started = performance.now() / 1000
  }), [])

  // Skip intro on first user interaction with the canvas
  useEffect(() => {
    const skip = () => { introRef.current.skipped = true }
    const dom = gl.domElement
    dom.addEventListener('pointerdown', skip, { once: true })
    return () => dom.removeEventListener('pointerdown', skip)
  }, [gl])

  useFrame((s) => {
    const intro = introRef.current
    if (intro.active) {
      if (intro.started === 0) intro.started = s.clock.elapsedTime
      const elapsed = s.clock.elapsedTime - intro.started
      let phase = elapsed / 4.5
      if (intro.skipped) phase = 1
      if (phase >= 1) {
        intro.active = false
        camera.position.set(34, 26, 30)
        camera.lookAt(0, 5, 0)
        if (ref.current) ref.current.enabled = true
        return
      }
      const e = 0.5 - Math.cos(phase * Math.PI) * 0.5
      const sx = 5, sy = 4.5, sz = 8
      const tx = 34, ty = 26, tz = 30
      camera.position.set(sx + (tx - sx) * e, sy + (ty - sy) * e, sz + (tz - sz) * e)
      const lx = -2 + (0 - -2) * e
      const ly = 1.5 + (5 - 1.5) * e
      const lz = 0.5 + (0 - 0.5) * e
      camera.lookAt(lx, ly, lz)
      if (ref.current) ref.current.enabled = false
      return
    }
    // Theme-toggle breath: 1.5s in-out push forward + return.
    // Apply only when controls are settled (post-intro).
    const breath = breathRef.current
    if (breath.active && ref.current) {
      const t = performance.now() / 1000 - breath.started
      const p = t / 1.5
      if (p >= 1) {
        breath.active = false
      } else {
        // Bell curve 0→1→0 over 1.5s
        const bell = Math.sin(p * Math.PI)
        // Pull camera 6% closer toward target along current view direction
        const target = ref.current.target
        const dir = camera.position.clone().sub(target).normalize()
        const baseDist = camera.position.distanceTo(target)
        const newDist = baseDist * (1 - bell * 0.06)
        camera.position.copy(target).add(dir.multiplyScalar(newDist))
      }
    }
  })

  return (
    <OrbitControls
      ref={ref as any}
      target={[0, 5, 0]}
      enablePan={false}
      enableZoom={true}
      minDistance={22}
      maxDistance={50}
      minPolarAngle={Math.PI * 0.22}
      maxPolarAngle={Math.PI * 0.44}
      enableDamping
      dampingFactor={0.06}
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
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-14, 12, -10]} intensity={0.4} color={theme === 'day' ? '#FAD6B0' : '#D8A088'} />
      <directionalLight position={[-20, 8, 20]} intensity={0.35} color={theme === 'day' ? '#F4D9A0' : '#D9886B'} />
    </>
  )
}

const THEME_KEY = 'world-theme-v1'

interface BlogEntry { title: string; link: string; date: string }
interface MusicArtist { name: string; plays: number; pct: number }
interface HighlightEntry { id: number; title: string; author: string; text?: string; url?: string }
interface ComicsEntry { issue: number; title_zh: string; title_en?: string }

export interface AppInitialData {
  blog: BlogEntry[]
  music: MusicArtist[]
  reading: HighlightEntry[]
  comics: ComicsEntry[]
}

export default function App({ initialData }: { initialData?: AppInitialData } = {}) {
  const data = initialData ?? { blog: [], music: [], reading: [], comics: [] }
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'day'
    try { return (localStorage.getItem(THEME_KEY) as Theme) || 'day' } catch { return 'day' }
  })
  useEffect(() => on('world-theme', (next) => {
    setTheme(next)
    document.body.dataset.worldTheme = next
    try { localStorage.setItem(THEME_KEY, next) } catch {}
  }), [])
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
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
        <Critters theme={theme} />
        <Atmospherics />
        <Avatar />
        <MochiNPC />
        <DistantIslands />
        <Campfire />
        <CloudShadows />
        <Lanterns theme={theme} />
        {QUALITY !== 'low' && <DuskFog theme={theme} />}
        <Onsen />
        <FoxShrine />
        {QUALITY !== 'low' && <CanopyDapple theme={theme} />}
        <Footprints />
        <WindChime />
        <PersimmonTree />
        {QUALITY !== 'low' && <SunsetBirds theme={theme} />}
        <PathMushrooms />
        <WisteriaArch />
        <DistantOwl theme={theme} />
        <ContactShadowsLayer />
        <ZoneHitboxes />
        <ZoneHints />
        <AmbientFX />

        {/* === Portfolio displays — bespoke structure per zone for visual variety === */}
        {/* Blog · newspaper kiosk (tall narrow, arch overhang, bench in front) */}
        <BlogKiosk
          position={[3.5, 10.5]}
          rotation={-2.5}
          spriteUrl="/world/sprites/buildings/C01-bookshelf.png"
          bannerUrl="/world/sprites/banners/E01-blog.png"
          content={{
            title: '文章',
            subtitle: 'Blog · ursb.me/blog',
            accent: '#C97B5C',
            emptyMessage: '（数据加载中…）',
            rows: data.blog.slice(0, 5).map(b => ({ main: b.title, sub: b.date })),
          }}
        />
        {/* Comics · A-frame sandwich-board easel (wide short, paint props) */}
        <ComicsEasel
          position={[-11.0, 4.5]}
          rotation={1.8}
          spriteUrl="/world/sprites/buildings/C02-easel.png"
          bannerUrl="/world/sprites/banners/E02-comics.png"
          content={{
            title: '四格',
            subtitle: 'Comics · ursb.me/comics',
            accent: '#8B5E3C',
            emptyMessage: '点击前往 /comics →',
            rows: data.comics.slice(0, 5).map(c => ({ main: c.title_zh, sub: `Issue #${c.issue}` })),
          }}
        />
        {/* Music · mini bandstand (square, 4 posts, copper-patina hex roof, LP records on grass) */}
        <MusicBandstand
          position={[11.5, -4.5]}
          rotation={-1.0}
          spriteUrl="/world/sprites/buildings/C03-record-player.png"
          bannerUrl="/world/sprites/banners/E03-music.png"
          content={{
            title: '在听',
            subtitle: 'Music · Last.fm',
            accent: '#4A8B6E',
            emptyMessage: '（暂无播放记录）',
            rows: data.music.slice(0, 5).map(a => ({ main: a.name, sub: `${a.plays} plays` })),
          }}
        />
        {/* Reading · low library cabinet (4 short legs, walnut, books on ground) */}
        <ReadingCabinet
          position={[-2.0, -10.0]}
          rotation={0.2}
          spriteUrl="/world/sprites/buildings/C04-armchair.png"
          bannerUrl="/world/sprites/banners/E04-reading.png"
          content={{
            title: '在读',
            subtitle: 'Reading · Readwise',
            accent: '#A05A8B',
            emptyMessage: '（暂无划线）',
            rows: data.reading.slice(0, 5).map(h => ({ main: h.title, sub: h.author })),
          }}
        />
        {/* Chat zone banner — small B&B-style hanging sign next to cabin */}
        <CabinBanner />

        {/* === Hero sakura — large weeping cherry SW of cabin, canopy
            partially overhangs the porch so petals frame the door.
            (Cabin at [-2, 0, -1], avatar at [-2, 1.05, 0.5]) */}
        <Sakura
          position={[-5.5, 0, 2.0]}
          seed={20260524}
          size={1.15}
          density={1.0}
          hero={true}
          rotY={0.6}
          tint="#fad9e4"
        />
      </Suspense>

      <CameraControls />

      {/* Adaptive post-processing — drop expensive passes on low-tier devices */}
      <EffectComposer multisampling={0}>
        {QUALITY === 'high' && (
          <DepthOfField focusDistance={0.04} focalLength={0.08} bokehScale={1.5} />
        )}
        {QUALITY !== 'low' && (
          <SSAO
            samples={QUALITY === 'high' ? 12 : 8}
            radius={0.15}
            intensity={12}
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
