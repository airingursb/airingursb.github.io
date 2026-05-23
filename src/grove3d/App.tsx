// SHU-733 Phase 1 · R3F scaffold for Mochi's Grove
//
// Bare-bones canvas: night sky + moonlight + ground + 1 placeholder
// sakura tree. Heap Plaza assets get ported in next commits.

import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, ContactShadows, Sky, Stars } from '@react-three/drei'
import { Suspense, useEffect } from 'react'
import Scene from './Scene'
import ChatOverlay from './ChatOverlay'
import { useGroveStore, postToParent } from './store'
import { acceptQuest } from './api'

export default function App() {
  const setSpecies = useGroveStore((s) => s.setSpecies)
  const setDisplayName = useGroveStore((s) => s.setDisplayName)
  const setStage = useGroveStore((s) => s.setStage)

  // Bootstrap: read query params + signal ready + accept quest (idempotent)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const species = params.get('species') || localStorage.getItem('lounge_species_v1') || 'bear'
    const name = params.get('name') || ''
    setSpecies(species)
    setDisplayName(name)
    acceptQuest('mochi_grove_walk')
    postToParent({ type: 'ready' })

    // Dev affordance: hit `S` to toggle straight into seated stage so we can
    // exercise the chat overlay without walking yet (Phase 2 brings Player).
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyS' && (e.shiftKey || e.ctrlKey)) {
        setStage('seated')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSpecies, setDisplayName, setStage])

  return (
    <>
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4, 3, 6], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0a0e1c']} />
      <fog attach="fog" args={['#0a0e1c', 12, 40]} />

      {/* Moon ambient + key */}
      <ambientLight intensity={0.25} color="#7088aa" />
      <directionalLight
        position={[8, 16, 4]}
        intensity={1.1}
        color="#c5d4e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <Suspense fallback={null}>
        <Stars radius={50} depth={40} count={1500} factor={3} fade speed={0.3} />
        <Scene />
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.5}
          scale={20}
          blur={2.5}
          far={6}
        />
      </Suspense>

      {/* TODO: replace OrbitControls with proper Player + camera follow */}
      <OrbitControls
        enableDamping
        minDistance={2}
        maxDistance={20}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 0.8, 0]}
      />
    </Canvas>
    <ChatOverlay />
    </>
  )
}
