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
import { useTimeOfDay, setManualOverride, type TimePhase } from './time-of-day'
import { EffectComposer, Bloom, SMAA, ToneMapping, BrightnessContrast, SSAO, DepthOfField, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping, Color as ThreeColor, Vector3 } from 'three'
// THREE namespace re-export for the demo orbit math (Vector3 is what we use).
const THREE = { Vector3 } as { Vector3: typeof Vector3 }
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
import PondFish from './PondFish'
import PondInteraction from './PondInteraction'
import HiddenPath from './HiddenPath'
import GuestbookStone from './GuestbookStone'
import Telescope from './Telescope'
import CabinBell from './CabinBell'
import WeatherFX from './WeatherFX'
import CliffWaterfalls from './CliffWaterfalls'
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
import SeasonalDecor from './SeasonalDecor'
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
// Expose for components that want to gate features by tier (e.g. Sky stars).
if (typeof window !== 'undefined') (window as unknown as { __WORLD_QUALITY?: string }).__WORLD_QUALITY = QUALITY

// V2 wave 3 finale: 4.5-second cinematic intro pan from close-on-cabin
// to the establishing 3/4 angle. Hands camera to user OrbitControls
// after the pan. Skippable: any pointerdown on the canvas during the
// pan jumps straight to the final pose. Sub-A: this is "what pushes
// the scene from 8.5 to 10 — diorama starts feeling directed."
function CameraControls() {
  const ref = useRef<OrbitControlsImpl | null>(null)
  // H (direction): if user arrived from the homepage pet (Step in chip),
  // start the intro from a HIGH SKY OVERLOOK and swoop down to the
  // default angle — feels like the small pet diorama unfolded into
  // the full world. Detect via sessionStorage flag set by pet onclick.
  const fromPet = (() => {
    if (typeof window === 'undefined') return false
    try {
      const v = sessionStorage.getItem('island-from-pet')
      if (v === '1') {
        sessionStorage.removeItem('island-from-pet')  // one-shot
        return true
      }
    } catch {}
    return false
  })()
  const introRef = useRef({
    started: 0,
    active: true,
    skipped: false,
    fromPet,
    duration: fromPet ? 6 : 4.5,   // longer swoop for from-pet
    audioFired: false,
  })
  // Theme-toggle "breath" — subtle dolly that fires when user presses
  // 🌙/☀️. Camera momentarily leans forward (eases distance from 28→25
  // unit radius) over 1.5s as if "leaning in to watch lights come on",
  // then eases back to neutral.
  const breathRef = useRef({ active: false, started: 0 })
  // C2 — telescope mode. Camera lerps to lookout POV looking at the
  // distant horizon (DistantIslands direction). Toggle on/off via event.
  const telescopeRef = useRef({
    active: false,
    started: 0,
    savedPos: new Vector3(),
    savedTarget: new Vector3(),
    duration: 1.2,
  })
  // J-deeper: mobile demo orbit. On first touch visit, AFTER intro
  // completes, do a 1s slow azimuthal orbit so the user sees that
  // the camera can move. sessionStorage gate (same key as the old
  // text hint) so it fires once. Bumps user-discovery dramatically
  // vs the old text-only hint.
  const demoRef = useRef({
    active: false,
    started: 0,
    pending: typeof window !== 'undefined'
      && matchMedia('(hover: none)').matches
      && sessionStorage.getItem('world-mobile-hint-seen-v1') !== '1',
  })
  const { camera, gl } = useThree()

  // Debug hook for verify scripts — only when ?debug=1 in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1') {
      ;(window as any).__worldDebug = { camera, controls: ref, gl }
    }
  }, [camera, gl])

  useEffect(() => on('world-reset-camera', () => ref.current?.reset()), [])
  useEffect(() => on('world-theme', () => {
    breathRef.current.active = true
    breathRef.current.started = performance.now() / 1000
  }), [])
  // Telescope toggle — entering captures current camera state; exiting
  // lerps it back.
  useEffect(() => on('world-telescope-toggle', () => {
    const tel = telescopeRef.current
    if (!tel.active) {
      // Capture current
      tel.savedPos.copy(camera.position)
      if (ref.current) tel.savedTarget.copy(ref.current.target)
      tel.active = true
      tel.started = performance.now() / 1000
    } else {
      // Exit — re-anchor "started" as exit start; we'll lerp back over duration
      tel.active = false
      tel.started = performance.now() / 1000
    }
    document.body.dataset.worldTelescope = tel.active ? 'on' : 'off'
  }), [camera])
  // Esc to exit telescope
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && telescopeRef.current.active) {
        telescopeRef.current.active = false
        telescopeRef.current.started = performance.now() / 1000
        document.body.dataset.worldTelescope = 'off'
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      // From-pet only: soft low-freq chime at swoop start as audio cue.
      // playChime requires AudioContext which requires a user gesture —
      // the click on the Step in chip counts; but if browser blocks, no-op.
      if (intro.fromPet && !intro.audioFired && elapsed > 0.2) {
        intro.audioFired = true
        try {
          // Dynamic import to keep audio module out of critical path
          import('./AmbientAudio').then(m => m.playChime(220, 2.4)).catch(() => {})
        } catch {}
      }
      let phase = elapsed / intro.duration
      if (intro.skipped) phase = 1
      if (phase >= 1) {
        intro.active = false
        camera.position.set(34, 26, 30)
        camera.lookAt(0, 5, 0)
        if (ref.current) ref.current.enabled = true
        // J-deeper: trigger mobile demo orbit immediately after intro
        if (demoRef.current.pending) {
          demoRef.current.active = true
          demoRef.current.started = s.clock.elapsedTime
          demoRef.current.pending = false
          try { sessionStorage.setItem('world-mobile-hint-seen-v1', '1') } catch {}
        }
        return
      }
      const e = 0.5 - Math.cos(phase * Math.PI) * 0.5
      // From-pet: start MUCH higher + more centered, like the pet
      // diorama camera looking down. Sweep to default establishing
      // angle via QUADRATIC BEZIER with a midpoint that arcs the
      // path rather than straight-lerping through space — feels like
      // a real cinematic swoop (decelerating vertical while horizontal
      // accelerates).
      const sx = intro.fromPet ? 0  : 5
      const sy = intro.fromPet ? 75 : 4.5
      const sz = intro.fromPet ? 12 : 8
      const tx = 34, ty = 26, tz = 30
      // Bezier mid-point: from-pet arcs through high-east position
      // so the camera DESCENDS while CIRCLING — not a straight diag.
      // Default intro uses straight lerp (no mid).
      if (intro.fromPet) {
        const mx = 28, my = 52, mz = 18   // high + east
        const u = e
        const ux = (1-u)*(1-u)*sx + 2*(1-u)*u*mx + u*u*tx
        const uy = (1-u)*(1-u)*sy + 2*(1-u)*u*my + u*u*ty
        const uz = (1-u)*(1-u)*sz + 2*(1-u)*u*mz + u*u*tz
        camera.position.set(ux, uy, uz)
      } else {
        camera.position.set(sx + (tx - sx) * e, sy + (ty - sy) * e, sz + (tz - sz) * e)
      }
      // From-pet: lookAt center-of-island throughout (camera gets
      // closer to default 5,0 only at end). Default: pan from close
      // cabin → establishing center.
      const lxs = intro.fromPet ? 0  : -2
      const lys = intro.fromPet ? 0  : 1.5
      const lzs = intro.fromPet ? 0  : 0.5
      const lx = lxs + (0 - lxs) * e
      const ly = lys + (5 - lys) * e
      const lz = lzs + (0 - lzs) * e
      camera.lookAt(lx, ly, lz)
      if (ref.current) ref.current.enabled = false
      return
    }
    // J-deeper: mobile demo orbit. 1s slow azimuthal sweep showing
    // the camera can move. Hands control back to OrbitControls cleanly.
    const demo = demoRef.current
    if (demo.active) {
      const elapsed = s.clock.elapsedTime - demo.started
      if (elapsed >= 1.2) {
        demo.active = false
        // Snap back to default position so OrbitControls' damping
        // doesn't fight a partial-rotation state
        camera.position.set(34, 26, 30)
        camera.lookAt(0, 5, 0)
        if (ref.current) {
          ref.current.enabled = true
          ref.current.update()
        }
      } else {
        // Disable controls while demoing
        if (ref.current) ref.current.enabled = false
        // Rotate around world center, ~25° azimuth sweep over 1.2s
        // Camera radius = distance(34,26,30 → 0,5,0) ≈ 50.5
        const target = new THREE.Vector3(0, 5, 0)
        const baseRadius = 50.5
        const baseAzimuth = Math.atan2(34, 30)  // current angle in XZ
        const phaseU = elapsed / 1.2
        // Smooth ease-in-out — ramp angle 0 → 0.45 rad → back to ~0.1
        const eased = phaseU < 0.6
          ? (0.5 - Math.cos(phaseU / 0.6 * Math.PI) * 0.5) * 0.45
          : 0.45 - (0.5 - Math.cos((phaseU - 0.6) / 0.4 * Math.PI) * 0.5) * 0.35
        const az = baseAzimuth + eased
        const polar = Math.asin(26 / baseRadius)  // current polar
        const x = baseRadius * Math.cos(polar) * Math.sin(az)
        const y = baseRadius * Math.sin(polar)
        const z = baseRadius * Math.cos(polar) * Math.cos(az)
        camera.position.set(x, y, z)
        camera.lookAt(target)
      }
      return
    }
    // C2 — telescope mode. Lerp camera to/from lookout eyepiece POV.
    // Eyepiece POV: positioned slightly back of the telescope at eye
    // height (~1.6m), looking toward the distant horizon (DistantIslands
    // are at +X far / -Z far). Look-at point ~(80, 6, -60) gives the
    // "long view" feel.
    const tel = telescopeRef.current
    if (tel.started > 0) {
      const tElapsed = performance.now() / 1000 - tel.started
      const phase = Math.min(1, tElapsed / tel.duration)
      const eased = 0.5 - Math.cos(phase * Math.PI) * 0.5
      const scopePos = [-10.0, 1.6, -7.6] as const          // behind telescope at eye height
      const scopeLook = [80, 6, -60] as const               // distant horizon
      if (ref.current) ref.current.enabled = false
      if (tel.active) {
        // Lerp toward telescope POV
        camera.position.set(
          tel.savedPos.x + (scopePos[0] - tel.savedPos.x) * eased,
          tel.savedPos.y + (scopePos[1] - tel.savedPos.y) * eased,
          tel.savedPos.z + (scopePos[2] - tel.savedPos.z) * eased,
        )
        const tx = tel.savedTarget.x + (scopeLook[0] - tel.savedTarget.x) * eased
        const ty = tel.savedTarget.y + (scopeLook[1] - tel.savedTarget.y) * eased
        const tz = tel.savedTarget.z + (scopeLook[2] - tel.savedTarget.z) * eased
        camera.lookAt(tx, ty, tz)
        if (phase >= 1) {
          // settled — leave camera there but stop re-anchoring next frame
          tel.started = 0
        }
        return
      } else {
        // Lerp back toward saved state
        camera.position.set(
          scopePos[0] + (tel.savedPos.x - scopePos[0]) * eased,
          scopePos[1] + (tel.savedPos.y - scopePos[1]) * eased,
          scopePos[2] + (tel.savedPos.z - scopePos[2]) * eased,
        )
        const tx = scopeLook[0] + (tel.savedTarget.x - scopeLook[0]) * eased
        const ty = scopeLook[1] + (tel.savedTarget.y - scopeLook[1]) * eased
        const tz = scopeLook[2] + (tel.savedTarget.z - scopeLook[2]) * eased
        camera.lookAt(tx, ty, tz)
        if (phase >= 1) {
          tel.started = 0
          if (ref.current) {
            // Snap target back so OrbitControls owns it cleanly going forward
            ref.current.target.set(tel.savedTarget.x, tel.savedTarget.y, tel.savedTarget.z)
            ref.current.enabled = true
            ref.current.update()
          }
        }
        return
      }
    }
    // Theme-toggle breath: 1.5s in-out push forward + return.
    // Apply only when controls are settled (post-intro).
    //
    // V2 final polish (Sub-A spotted): OrbitControls damping was
    // fighting our position writes — it caches its own spherical
    // and lerps back next tick, causing a micro-jitter. Disable
    // damping for the 1.5s window, restore after.
    const breath = breathRef.current
    if (breath.active && ref.current) {
      const t = performance.now() / 1000 - breath.started
      const p = t / 1.5
      if (p >= 1) {
        breath.active = false
        ref.current.enableDamping = true
      } else {
        ref.current.enableDamping = false
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
      /* Range expanded: initial cam distance was ~50 (= old maxDistance)
         so zoom-out had ZERO room. User couldn't zoom out with trackpad.
         Now: 18 (close-up) to 90 (far overview). */
      minDistance={18}
      maxDistance={90}
      zoomSpeed={1.2}
      /* Polar range widened so user can look slightly more down or
         slightly more horizon — gives access to better waterfall angles */
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.48}
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
// F-deep: 4-phase scene fog. Was 2-state (#F4E4C8 day / #D89A78 dusk),
// meaning night inherited dusk's sunset-amber. Now lerps cleanly.
const FOG_COLORS: Record<TimePhase, string> = {
  dawn:  '#EAC4B4',
  day:   '#F4E4C8',
  dusk:  '#D89A78',
  // R3-r7 fix: was '#2A2A40' (bright indigo). Lerping dusk amber →
  // night indigo passes through chocolate-brown midpoint (≈#897770)
  // for the ~12min real-world transition window — looked like
  // polluted haze. Less brutal indigo lets the midpoint land at
  // a warm-gray "twilight" that reads atmospherically right.
  night: '#3F3F58',
}
function PhaseFog() {
  const tod = useTimeOfDay()
  const order: TimePhase[] = ['dawn', 'day', 'dusk', 'night']
  const idx = order.indexOf(tod.phase)
  const a = FOG_COLORS[tod.phase]
  const b = FOG_COLORS[order[(idx + 1) % order.length]]
  // Hold each phase's color for the first 75% of its duration, lerp only
  // in the last 25%. Was: continuous lerp across the whole phase, which
  // made night fog drift through indigo→mauve→pink during the 9.5h night
  // (since next-phase is dawn #EAC4B4). At 2-3am local that pink fog
  // painted the Void plane → bright pink horizon band under the NightSkydome.
  const heldBlend = tod.blend < 0.75 ? 0 : (tod.blend - 0.75) / 0.25
  const c = '#' + new ThreeColor(a).lerp(new ThreeColor(b), heldBlend).getHexString()
  return <fog attach="fog" args={[c, 55, 140]} />
}

// F-deep: lights now 4-phase aware via useTimeOfDay. Night was
// inheriting dusk's #FF9A6A 1.6-intensity directional light, making
// 2am scenes read as eternal sunset. Per-phase table with smooth blend.
interface LightParams {
  sunPos: [number, number, number]
  sunColor: string
  sunIntensity: number
  ambientColor: string
  ambientIntensity: number
  hemiSky: string
  hemiGround: string
  fillColor1: string
  fillColor2: string
}
const LIGHT_PHASE: Record<TimePhase, LightParams> = {
  dawn:  { sunPos: [10, 3, 18], sunColor: '#FFAE82', sunIntensity: 1.4, ambientColor: '#E8C0A0', ambientIntensity: 0.30, hemiSky: '#F4B89A', hemiGround: '#4A2E1E', fillColor1: '#F6BC95', fillColor2: '#EAA084' },
  day:   { sunPos: [20, 11, 9], sunColor: '#FFD09A', sunIntensity: 2.2, ambientColor: '#FFE4C0', ambientIntensity: 0.35, hemiSky: '#FFD9A8', hemiGround: '#5A3A28', fillColor1: '#FAD6B0', fillColor2: '#F4D9A0' },
  dusk:  { sunPos: [18, 4, 14], sunColor: '#FF9A6A', sunIntensity: 1.6, ambientColor: '#E8B888', ambientIntensity: 0.28, hemiSky: '#E89A6E', hemiGround: '#3A2418', fillColor1: '#D8A088', fillColor2: '#D9886B' },
  night: { sunPos: [4, 8, 12],  sunColor: '#9AAFD0', sunIntensity: 0.45, ambientColor: '#3E4870', ambientIntensity: 0.26, hemiSky: '#5A6080', hemiGround: '#1A1828', fillColor1: '#5A6088', fillColor2: '#454C72' },
}
function lerpLight(phase: TimePhase, blend: number): LightParams {
  const order: TimePhase[] = ['dawn', 'day', 'dusk', 'night']
  const idx = order.indexOf(phase)
  const a = LIGHT_PHASE[phase]
  const b = LIGHT_PHASE[order[(idx + 1) % order.length]]
  const ln = (av: number, bv: number) => av + (bv - av) * blend
  const lc = (ac: string, bc: string) =>
    '#' + new ThreeColor(ac).lerp(new ThreeColor(bc), blend).getHexString()
  return {
    sunPos: [ln(a.sunPos[0], b.sunPos[0]), ln(a.sunPos[1], b.sunPos[1]), ln(a.sunPos[2], b.sunPos[2])],
    sunColor: lc(a.sunColor, b.sunColor),
    sunIntensity: ln(a.sunIntensity, b.sunIntensity),
    ambientColor: lc(a.ambientColor, b.ambientColor),
    ambientIntensity: ln(a.ambientIntensity, b.ambientIntensity),
    hemiSky: lc(a.hemiSky, b.hemiSky),
    hemiGround: lc(a.hemiGround, b.hemiGround),
    fillColor1: lc(a.fillColor1, b.fillColor1),
    fillColor2: lc(a.fillColor2, b.fillColor2),
  }
}
function ThemeAwareLights({ theme: _theme }: { theme?: Theme } = {}) {
  const tod = useTimeOfDay()
  const p = lerpLight(tod.phase, tod.blend)
  return (
    <>
      <hemisphereLight args={[p.hemiSky, p.hemiGround, 0.55]} />
      <ambientLight intensity={p.ambientIntensity} color={p.ambientColor} />
      <directionalLight
        position={p.sunPos}
        intensity={p.sunIntensity}
        color={p.sunColor}
        castShadow
        /* Perf: 2048² shadow map only on high tier — was the biggest
           GPU cost on medium devices (4M shadow texels/frame). 1024²
           reads identical at the diorama distance + tightened frustum
           (±24→±18) sharpens shadows further. */
        shadow-mapSize={QUALITY === 'high' ? [2048, 2048] : [1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-14, 12, -10]} intensity={0.4} color={p.fillColor1} />
      <directionalLight position={[-20, 8, 20]} intensity={0.35} color={p.fillColor2} />
    </>
  )
}

// Legacy localStorage key — kept for migration. New code uses
// time-of-day.ts which has its own STORAGE_KEY.
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
  // C2: optional now-playing track (most recent from Last.fm scrobble)
  nowPlaying?: { name: string; artist: string; isLive: boolean } | null
}

export default function App({ initialData }: { initialData?: AppInitialData } = {}) {
  const data = initialData ?? { blog: [], music: [], reading: [], comics: [], nowPlaying: null }
  // Theme is now DERIVED from time-of-day (real local time, with manual
  // override via setManualOverride()). The legacy 'world-theme' event +
  // localStorage are still honored for back-compat with WorldUI's toggle.
  const tod = useTimeOfDay()
  const theme: Theme = tod.theme
  useEffect(() => on('world-theme', (next) => {
    // User flipped the toggle — write to the new override system AND
    // legacy key (for migration). time-of-day.ts handles propagation.
    setManualOverride(next)
    document.body.dataset.worldTheme = next
    try { localStorage.setItem(THEME_KEY, next) } catch {}
  }), [])
  // Migrate legacy localStorage on first mount: if old THEME_KEY exists
  // but new STORAGE_KEY doesn't, transfer the value.
  useEffect(() => {
    try {
      const legacy = localStorage.getItem(THEME_KEY)
      const current = localStorage.getItem('world-time-override')
      if (legacy && !current && (legacy === 'day' || legacy === 'dusk')) {
        setManualOverride(legacy as Theme)
      }
    } catch {}
  }, [])
  // V2 wave 3 perf (Sub-A P1 from first audit, finally addressed):
  // pause the render loop when the tab is backgrounded. ~25+ useFrame
  // loops would otherwise burn CPU + battery for an invisible scene.
  // 'always' when tab visible, 'never' when hidden.
  const [pageVisible, setPageVisible] = useState<boolean>(
    () => typeof document === 'undefined' ? true : !document.hidden,
  )
  useEffect(() => {
    if (typeof document === 'undefined') return
    function onVis() { setPageVisible(!document.hidden) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return (
    <Canvas
      shadows
      // V2 polish revert: DPR=2 on high-tier was visibly crisper on
      // cabin chinking but caused real frame drops on retina because
      // every shader pass (SSAO ×12 samples, shadow map, postchain)
      // pays 4× the pixel cost. Pixel work scales with DPR²; SSAO
      // alone is fullscreen per sample. Stay at 1.5 — SMAA in post
      // handles AA, and the diorama is camera-distant enough that
      // 1.5 reads sharp.
      dpr={[1, 1.5]}
      camera={{ position: [34, 26, 30], fov: 26 }}
      frameloop={pageVisible ? 'always' : 'never'}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      {/* Fog tinted to theme */}
      <PhaseFog />

      <Sky theme={theme} />
      <Void />

      <ThemeAwareLights theme={theme} />

      {/* === The diorama (Suspense-wrapped so async resources show no flash) === */}
      {/* D2 (phased): CORE scene loads first (Island/Forest/Cabin/zones/
          avatars) so the user sees the recognizable diorama ASAP. Inner
          Suspense holds decorations (mushrooms, fox shrine, wisteria,
          fog, birds, distant owl) until first paint settles — they
          stream in over the next ~500ms without blocking core layout. */}
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
        <Avatar />
        <MochiNPC />
        <DistantIslands />
        <Lanterns theme={theme} />
        <Onsen />

        <Suspense fallback={null}>
          {/* SECONDARY: decorations + atmosphere — load after core */}
          <Storytelling />
          <Domestic />
          <Critters theme={theme} />
          <Atmospherics />
          <Campfire />
          <CloudShadows />
          {QUALITY !== 'low' && <DuskFog theme={theme} />}
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
          <PondFish />
          <PondInteraction />
          <HiddenPath />
          <GuestbookStone />
          <Telescope />
          <CabinBell />
          <WeatherFX />
          <CliffWaterfalls />
        </Suspense>

        {/* === Portfolio displays — bespoke structure per zone for visual variety === */}
        {/* Blog · newspaper kiosk (tall narrow, arch overhang, bench in front) */}
        <BlogKiosk
          position={[3.5, 10.5]}
          rotation={-2.5}
          spriteUrl="/world/sprites/buildings/C01-bookshelf.png"
          bannerUrl="/world/sprites/banners/E01-blog.png"
          fresh={(() => {
            // C1: pulse if most recent blog post is within last 7 days.
            // dates are YYYY.MM.DD strings.
            const latest = data.blog[0]?.date
            if (!latest) return false
            const [y, m, d] = latest.split('.').map(Number)
            if (!y || !m || !d) return false
            const ts = new Date(y, m - 1, d).getTime()
            return Date.now() - ts < 7 * 86400 * 1000
          })()}
          // A2: scroll on top of kiosk shows latest post title on hover.
          latestPost={data.blog[0] ? { title: data.blog[0].title, date: data.blog[0].date } : null}
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
          nowPlaying={data.nowPlaying}
          content={{
            title: '在听',
            // C2: show now-playing track in the subtitle when available.
            // 'isLive' (Last.fm reports currently scrobbling) gets a 🔴
            // marker; otherwise shows last-played as historical signal.
            subtitle: data.nowPlaying
              ? `${data.nowPlaying.isLive ? '🔴 ' : ''}${data.nowPlaying.name} · ${data.nowPlaying.artist}`
              : 'Music · Last.fm',
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

        {/* D: seasonal layer — couplets (春节), extra moon + 月饼 (中秋),
            snowfall (winter), confetti (birthday URL flag). Returns null
            during default season → zero cost. */}
        <SeasonalDecor />

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
            /* Perf: dropped samples (8→5 on medium) + radius (0.15→0.10).
               Smaller radius = fewer cache misses. Visually identical at
               this camera distance. */
            samples={QUALITY === 'high' ? 8 : 5}
            radius={QUALITY === 'high' ? 0.15 : 0.10}
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
