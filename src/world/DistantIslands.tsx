// 3 distant smaller islands floating far from the main island.
// Each has a single tree or small structure. They sit in the cloud sea
// and add depth + suggest a wider world.
//
// K (direction): liveliness — distant islands now have lit windows at
// dusk/night via useTimeOfDay, suggesting other inhabitants live there.

import * as THREE from 'three'
import { useTimeOfDay } from './time-of-day'

const GRASS = '#7FB36A'
const STONE = '#6E5F4D'
const TRUNK = '#5A4128'
const FOLIAGE = '#5A7A4C'
const WINDOW_GLOW = '#FFB860'  // matches main scene's lantern

function TinyIsland({ position, scale = 1, tree = true, windmill = false, glowIntensity = 0 }: {
  position: [number, number, number]
  scale?: number
  tree?: boolean
  windmill?: boolean
  glowIntensity?: number
}) {
  return (
    <group position={position} scale={scale}>
      {/* Grass top */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.4, 0.3, 12]} />
        <meshStandardMaterial color={GRASS} roughness={0.95} flatShading />
      </mesh>
      {/* Stone underside */}
      <mesh position={[0, -0.4, 0]} castShadow>
        <coneGeometry args={[1.4, 0.9, 12, 1]} />
        <meshStandardMaterial color={STONE} roughness={0.96} flatShading />
      </mesh>

      {/* Optional pine tree */}
      {tree && (
        <group position={[0.1, 0.15, -0.1]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 1.4, 6]} />
            <meshStandardMaterial color={TRUNK} flatShading />
          </mesh>
          {[1.5, 1.85, 2.1].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} castShadow>
              <coneGeometry args={[0.6 - i * 0.12, 0.6 - i * 0.1, 8]} />
              <meshStandardMaterial color={FOLIAGE} flatShading />
            </mesh>
          ))}
        </group>
      )}

      {/* Optional windmill */}
      {windmill && (
        <group position={[0, 0.15, 0]}>
          {/* Tower */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 1.8, 8]} />
            <meshStandardMaterial color="#E8E0D0" roughness={0.9} flatShading />
          </mesh>
          {/* Cap */}
          <mesh position={[0, 1.95, 0]} castShadow>
            <coneGeometry args={[0.3, 0.4, 8]} />
            <meshStandardMaterial color="#5C3A22" roughness={0.92} />
          </mesh>
          {/* Tiny window — lit at dusk/night via emissive intensity.
              Faces the camera so the glow is visible from main scene. */}
          {glowIntensity > 0 && (
            <mesh position={[0, 0.5, 0.33]} renderOrder={2}>
              <planeGeometry args={[0.18, 0.22]} />
              <meshBasicMaterial
                color={WINDOW_GLOW}
                transparent
                opacity={glowIntensity * 0.95}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )}
          {/* Sails — 4 paddles */}
          <Windmill />
        </group>
      )}
      {/* Lantern next to pine tree (small island) — lit at dusk/night.
          Suggests a watcher / hermit. */}
      {tree && glowIntensity > 0 && (
        <group position={[-0.6, 0.25, 0.4]}>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshBasicMaterial
              color={WINDOW_GLOW}
              transparent
              opacity={glowIntensity * 0.85}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Halo glow disc — soft outer aura */}
          <mesh position={[0, 0.18, 0]} renderOrder={3}>
            <sphereGeometry args={[0.32, 10, 8]} />
            <meshBasicMaterial
              color={WINDOW_GLOW}
              transparent
              opacity={glowIntensity * 0.22}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

function Windmill() {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.rotation.z = s.clock.elapsedTime * 0.6
  })
  return (
    <group ref={ref} position={[0.06, 1.85, 0]}>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <group key={i} rotation={[0, 0, a]}>
            <mesh position={[0.45, 0, 0]} castShadow>
              <boxGeometry args={[0.7, 0.1, 0.04]} />
              <meshStandardMaterial color="#FAEFC8" roughness={0.85} />
            </mesh>
          </group>
        )
      })}
      {/* Hub */}
      <mesh>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#3A2516" />
      </mesh>
    </group>
  )
}

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function DistantIslands() {
  // K: glow intensity derived from time-of-day. 0 during day, ramps
  // up to 1.0 at full night. At dusk, fade in from 0 → 0.7 across the
  // blend (0..1 within the dusk phase).
  const tod = useTimeOfDay()
  let glow = 0
  if (tod.phase === 'night') glow = 1
  else if (tod.phase === 'dusk') glow = 0.2 + 0.6 * tod.blend
  else if (tod.phase === 'dawn') glow = 0.5 * (1 - tod.blend)   // dim, fading
  return (
    <group>
      {/* Pulled back to 4 → 2 for cleaner horizon — keep windmill island + far one */}
      <TinyIsland position={[42, -5, 30]} scale={1.4} tree={false} windmill={true} glowIntensity={glow} />
      <TinyIsland position={[-30, -8, 40]} scale={1.2} tree={true} glowIntensity={glow} />

      {/* V2 wave 3: soft drop shadows on the cloud-sea below the
          distant islands. Without these the islands look "untethered"
          to the world below — the shadow plane anchors them visually
          to the cloud layer. Plane just above void at y=-15 (cloud
          sea is at y≈-12), rotated flat. */}
      <mesh position={[42, -13.5, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.6, 20]} />
        <meshBasicMaterial color="#3A4250" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[-30, -13.5, 40]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.8, 20]} />
        <meshBasicMaterial color="#3A4250" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  )
}
