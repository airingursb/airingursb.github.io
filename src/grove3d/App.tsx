// SHU-733 Phase 1 · R3F scaffold for Mochi's Grove
//
// Bare-bones canvas: night sky + moonlight + ground + 1 placeholder
// sakura tree. Heap Plaza assets get ported in next commits.

import { Canvas } from '@react-three/fiber'
import { ContactShadows, Stars, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { Suspense, useEffect } from 'react'
import Scene from './Scene'
import ChatOverlay from './ChatOverlay'
import Tutorial from './Tutorial'
import MobileJoystick from './MobileJoystick'
import LoadingScreen from './LoadingScreen'
import { useGroveStore, postToParent } from './store'
import { acceptQuest } from './api'
import { connectWorld, disconnectWorld } from './ws'
import { getQualitySettings } from './quality'

export default function App() {
  const setSpecies = useGroveStore((s) => s.setSpecies)
  const setDisplayName = useGroveStore((s) => s.setDisplayName)
  const setStage = useGroveStore((s) => s.setStage)
  const q = getQualitySettings()

  // Bootstrap: read query params + signal ready + accept quest (idempotent)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const species = params.get('species') || localStorage.getItem('lounge_species_v1') || 'bear'
    const name = params.get('name') || ''
    setSpecies(species)
    setDisplayName(name)
    acceptQuest('mochi_grove_walk')
    postToParent({ type: 'ready' })

    // SHU-733/735 · Multiplayer co-presence: connect to /api/world/mochi_grove/ws
    connectWorld('mochi_grove', { species, displayName: name })

    // Dev affordance: Shift+S jumps straight into seated (skip walk)
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyS' && (e.shiftKey || e.ctrlKey)) {
        setStage('seated')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      disconnectWorld()
    }
  }, [setSpecies, setDisplayName, setStage])

  return (
    <>
    <Canvas
      shadows
      dpr={q.dpr as [number, number]}
      camera={{ position: [4, 3, 6], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0a0e1c']} />
      <fog attach="fog" args={['#0a0e1c', 12, q.fog]} />

      {/* Moon ambient + key */}
      <ambientLight intensity={0.25} color="#7088aa" />
      <directionalLight
        position={[8, 16, 4]}
        intensity={1.1}
        color="#c5d4e8"
        castShadow
        shadow-mapSize={[q.shadowMapSize, q.shadowMapSize]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <Suspense fallback={null}>
        <SceneReadyEmitter />
        {/* HDR night ambience (drei preset) — costs ~256KB HDRI but huge
            visual upgrade. material clearcoat / transmission start to read. */}
        <Environment preset="night" />
        <Stars radius={50} depth={40} count={q.starCount} factor={3} fade speed={0.3} />
        <Scene />
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.5}
          scale={20}
          blur={2.5}
          far={6}
        />
        {/* Post-processing — Bloom only on high/medium quality (saves perf on low) */}
        {q.bloom ? (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.45} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.55} />
            <SMAA />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={0}>
            <Vignette eskil={false} offset={0.2} darkness={0.55} />
            <SMAA />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
    <LoadingScreen />
    <Tutorial />
    <ChatOverlay />
    <MobileJoystick />
    </>
  )
}

/** Fires once after Suspense resolves, telling LoadingScreen to fade out. */
function SceneReadyEmitter() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('grove3d-ready'))
    })
    return () => cancelAnimationFrame(id)
  }, [])
  return null
}
