// B2 — World weather sync. Reads real Singapore weather (open-meteo)
// and renders matching atmospheric FX over the island:
//   rainy   → falling rain streaks
//   thunder → rare brief lightning flash + heavier rain
//   cloudy  → no extra particles (Sky's cloud cover already covers it)
//   sunny   → light golden dust motes drifting
//
// Source priority:
//   1. localStorage 'site-weather' (set by homepage IslandWidget)
//   2. Own fetch to open-meteo if user landed on /world/ first
// Refetches every 30 minutes.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type WeatherKind = 'sunny' | 'cloudy' | 'rainy' | 'thunder' | null

const STORAGE_KEY = 'site-weather'

function weatherCodeToKind(code: number): WeatherKind {
  if (code <= 1) return 'sunny'
  if (code <= 49) return 'cloudy'
  if (code <= 94) return 'rainy'
  return 'thunder'
}

function readCached(): WeatherKind {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'sunny' || v === 'cloudy' || v === 'rainy' || v === 'thunder') return v
  } catch {}
  return null
}

function useWeather(): WeatherKind {
  const [weather, setWeather] = useState<WeatherKind>(readCached)
  useEffect(() => {
    // Fetch fresh value (regardless of cache — but we use cache immediately).
    async function fetchNow() {
      try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=1.29&longitude=103.85&current_weather=true')
        const data = await r.json()
        const kind = weatherCodeToKind(data?.current_weather?.weathercode ?? 0)
        if (kind) {
          setWeather(kind)
          try { localStorage.setItem(STORAGE_KEY, kind) } catch {}
        }
      } catch {}
    }
    fetchNow()
    // Refetch every 30 min
    const id = window.setInterval(fetchNow, 30 * 60 * 1000)
    // Cross-tab sync
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        const cached = readCached()
        if (cached) setWeather(cached)
      }
    }
    window.addEventListener('storage', onStorage)
    // Same-page bridge — if homepage's pet-weather event fires on /world/
    // (it won't normally, but covers edge case where another widget runs)
    function onPetWeather(e: Event) {
      const d = (e as CustomEvent<string>).detail
      if (d === 'sunny' || d === 'cloudy' || d === 'rainy' || d === 'thunder') {
        setWeather(d)
        try { localStorage.setItem(STORAGE_KEY, d) } catch {}
      }
    }
    window.addEventListener('pet-weather', onPetWeather)
    return () => {
      clearInterval(id)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pet-weather', onPetWeather)
    }
  }, [])
  return weather
}

// Rain streaks — InstancedMesh of small vertical lines falling fast.
// Speed scales with `intensity` (thunder = 1.5×).
function RainLayer({ intensity }: { intensity: number }) {
  const COUNT = Math.floor(380 * intensity)
  const ref = useRef<THREE.InstancedMesh>(null)
  const dataRef = useRef(
    Array.from({ length: 600 }, () => ({
      x: (Math.random() - 0.5) * 50,
      y: 5 + Math.random() * 25,
      z: (Math.random() - 0.5) * 50,
      speed: 18 + Math.random() * 8,
    })),
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    for (let i = 0; i < COUNT; i++) {
      const d = dataRef.current[i]
      d.y -= d.speed * dt * intensity
      if (d.y < -3) {
        d.y = 22 + Math.random() * 8
        d.x = (Math.random() - 0.5) * 50
        d.z = (Math.random() - 0.5) * 50
      }
      dummy.position.set(d.x, d.y, d.z)
      dummy.scale.set(0.012, 0.45, 0.012)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#A4C4E0" transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  )
}

// Lightning flash — full-scene brief ambient flash. Fires every 25-50s
// while thunder weather is active. Uses ambient light override + a
// massive transparent sphere so the flash reaches every surface.
function LightningFlash() {
  const lightRef = useRef<THREE.AmbientLight>(null)
  const stateRef = useRef({ nextAt: 0, flashStart: -1 })
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const st = stateRef.current
    if (st.nextAt === 0) st.nextAt = t + 15 + Math.random() * 20
    if (st.flashStart < 0 && t >= st.nextAt) {
      st.flashStart = t
      st.nextAt = t + 25 + Math.random() * 25
    }
    if (lightRef.current && st.flashStart >= 0) {
      const flashT = t - st.flashStart
      if (flashT < 0.06) {
        lightRef.current.intensity = 4.5
      } else if (flashT < 0.12) {
        lightRef.current.intensity = 0.5
      } else if (flashT < 0.20) {
        lightRef.current.intensity = 3.0
      } else if (flashT < 0.36) {
        // Quick decay
        lightRef.current.intensity = Math.max(0, 3.0 * (1 - (flashT - 0.20) / 0.16))
      } else {
        lightRef.current.intensity = 0
        st.flashStart = -1
      }
    }
  })
  return <ambientLight ref={lightRef} color="#E8EEFF" intensity={0} />
}

// Sunny dust motes — small sparkles drifting in golden light beams
function SunnyMotes() {
  const COUNT = 80
  const ref = useRef<THREE.InstancedMesh>(null)
  const dataRef = useRef(
    Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: 1 + Math.random() * 8,
      z: (Math.random() - 0.5) * 30,
      sway: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.25,
    })),
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((s, dt) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const d = dataRef.current[i]
      d.y += Math.sin(t * 0.4 + d.sway) * 0.005
      d.x += Math.cos(t * 0.3 + d.sway) * 0.003
      dummy.position.set(d.x, d.y, d.z)
      dummy.scale.setScalar(0.025 + Math.sin(t * 0.8 + d.sway) * 0.015)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial color="#FFE0A8" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}

export default function WeatherFX() {
  const weather = useWeather()
  if (!weather || weather === 'cloudy') return null
  return (
    <group>
      {weather === 'rainy' && <RainLayer intensity={1.0} />}
      {weather === 'thunder' && (
        <>
          <RainLayer intensity={1.5} />
          <LightningFlash />
        </>
      )}
      {weather === 'sunny' && <SunnyMotes />}
    </group>
  )
}
