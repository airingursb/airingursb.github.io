// Living creatures — white cat on doormat, 2 ducks drifting in pond,
// deer silhouette at far tree line, sparkle birds orbiting gazebo.
// Per Sub-A gap #8: "someone lives here" requires creatures.

import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { POND_CENTER, POND_RADIUS } from './zones'

const CAT_WHITE = '#F4ECDC'
const CAT_PINK  = '#E2A8B0'
const DUCK_BODY = '#F4ECCC'
const DUCK_BEAK = '#E29A4A'
const DUCK_NECK = '#3F5C42'
const DEER_BODY = '#8B6F47'
const DEER_BELLY= '#D4B895'

function CatOnMat({ position }: { position: [number, number, number] }) {
  // Curled-up cat — 3 spheres + 2 cone ears + tail
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (ref.current) {
      // Subtle breathing
      const breath = Math.sin(s.clock.elapsedTime * 0.8) * 0.02
      ref.current.scale.setScalar(1 + breath)
    }
  })
  return (
    <group ref={ref} position={position} rotation={[0, Math.PI / 4, 0]}>
      {/* Body — curled loaf */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={CAT_WHITE} roughness={0.9} flatShading />
      </mesh>
      {/* Hunched back */}
      <mesh position={[0.06, 0.18, -0.04]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={CAT_WHITE} roughness={0.9} flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0.16, 0.18, 0.08]} castShadow>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshStandardMaterial color={CAT_WHITE} roughness={0.9} flatShading />
      </mesh>
      {/* Ears */}
      <mesh position={[0.14, 0.27, 0.05]} rotation={[0, 0, 0.3]} castShadow>
        <coneGeometry args={[0.035, 0.07, 4]} />
        <meshStandardMaterial color={CAT_WHITE} flatShading />
      </mesh>
      <mesh position={[0.2, 0.27, 0.11]} rotation={[0, 0, 0.3]} castShadow>
        <coneGeometry args={[0.035, 0.07, 4]} />
        <meshStandardMaterial color={CAT_WHITE} flatShading />
      </mesh>
      {/* Pink ear interiors */}
      <mesh position={[0.14, 0.27, 0.052]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.02, 0.05, 4]} />
        <meshStandardMaterial color={CAT_PINK} flatShading />
      </mesh>
      <mesh position={[0.2, 0.27, 0.112]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.02, 0.05, 4]} />
        <meshStandardMaterial color={CAT_PINK} flatShading />
      </mesh>
      {/* Tail curling around body */}
      <mesh position={[-0.12, 0.13, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.1, 0.028, 6, 12, Math.PI]} />
        <meshStandardMaterial color={CAT_WHITE} flatShading />
      </mesh>
    </group>
  )
}

function Duck({ angle, radius, speed, size = 1, seed = 0 }: { angle: number; radius: number; speed: number; size?: number; seed?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime * speed + angle
    ref.current.position.x = Math.cos(t) * radius + POND_CENTER[0]
    ref.current.position.z = Math.sin(t) * radius + POND_CENTER[1]
    ref.current.position.y = 0.25 + Math.sin(t * 3 + seed) * 0.02
    ref.current.rotation.y = -t + Math.PI / 2  // face direction of travel
  })
  return (
    <group ref={ref} scale={size}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={DUCK_BODY} roughness={0.9} flatShading />
      </mesh>
      {/* Tail nub */}
      <mesh position={[-0.13, 0.04, 0]} castShadow>
        <coneGeometry args={[0.05, 0.1, 6]} />
        <meshStandardMaterial color={DUCK_BODY} flatShading />
      </mesh>
      {/* Neck */}
      <mesh position={[0.1, 0.1, 0]} rotation={[0, 0, -Math.PI * 0.3]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.16, 8]} />
        <meshStandardMaterial color={DUCK_NECK} roughness={0.85} />
      </mesh>
      {/* Head */}
      <mesh position={[0.16, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={DUCK_NECK} roughness={0.85} />
      </mesh>
      {/* Beak */}
      <mesh position={[0.23, 0.14, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.03, 0.06, 8]} />
        <meshStandardMaterial color={DUCK_BEAK} roughness={0.7} />
      </mesh>
      {/* Tiny black eye */}
      <mesh position={[0.18, 0.18, 0.05]}>
        <sphereGeometry args={[0.012, 6, 5]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

function DeerSilhouette({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    // Slow gentle bob (grazing)
    const t = s.clock.elapsedTime
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.15 - 0.1
  })
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.5, 6, 12]} />
        <meshStandardMaterial color={DEER_BODY} roughness={0.95} flatShading />
      </mesh>
      {/* Belly */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.4, 6, 12]} />
        <meshStandardMaterial color={DEER_BELLY} roughness={0.95} flatShading />
      </mesh>
      {/* Legs — 4 thin cylinders */}
      {[
        [-0.12, 0.35,  0.15],
        [ 0.12, 0.35,  0.15],
        [-0.12, 0.35, -0.15],
        [ 0.12, 0.35, -0.15],
      ].map((p, i) => (
        <mesh key={`l${i}`} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.7, 6]} />
          <meshStandardMaterial color={DEER_BODY} roughness={0.95} />
        </mesh>
      ))}
      {/* Neck */}
      <group ref={ref} position={[0.3, 0.95, 0]}>
        <mesh position={[0, -0.15, 0]} rotation={[0, 0, -Math.PI * 0.25]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.35, 8]} />
          <meshStandardMaterial color={DEER_BODY} roughness={0.95} />
        </mesh>
        {/* Head */}
        <mesh position={[0.15, -0.3, 0]} rotation={[0, 0, -Math.PI * 0.5]} castShadow>
          <coneGeometry args={[0.08, 0.18, 8]} />
          <meshStandardMaterial color={DEER_BODY} roughness={0.95} />
        </mesh>
        {/* Antlers — simple branching */}
        <mesh position={[0.04, -0.05, 0]} rotation={[0, 0, -Math.PI * 0.1]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <meshStandardMaterial color="#3A2516" />
        </mesh>
        <mesh position={[0.1, 0.0, 0]} rotation={[0, 0, -Math.PI * 0.3]}>
          <cylinderGeometry args={[0.01, 0.01, 0.18, 4]} />
          <meshStandardMaterial color="#3A2516" />
        </mesh>
      </group>
    </group>
  )
}

function Birds({ center, radius = 3, count = 5 }: { center: [number, number, number]; radius?: number; count?: number }) {
  return (
    <Sparkles
      count={count}
      scale={[radius * 2, 2, radius * 2]}
      position={center}
      size={4}
      speed={0.6}
      color="#FFFFFF"
      opacity={0.6}
    />
  )
}

export default function Critters() {
  return (
    <group>
      {/* White cat curled on cabin doormat. Sub-A fix: was at world
          [0.3, 0.35, 2.1] which is ~3.7 units away from the actual
          doormat. Cabin chat zone is at (-2.0, -1.0); porch extends
          to local z = CABIN_D/2 + 0.6 = 2.1, so doormat is at world
          (-2.0, 0.34, +1.1). Cat now slightly offset so it doesn't
          block the door silhouette. */}
      <CatOnMat position={[-1.45, 0.35, 1.1]} />

      {/* 2 ducks drifting in pond — circular paths */}
      <Duck angle={0} radius={POND_RADIUS * 0.5} speed={0.15} size={1.0} seed={0} />
      <Duck angle={Math.PI} radius={POND_RADIUS * 0.4} speed={0.18} size={0.9} seed={1} />

      {/* Deer grazing at far north tree line */}
      <DeerSilhouette position={[-3.0, 0, -16.0]} />

      {/* Sparkle birds orbiting gazebo */}
      <Birds center={[13.5, 4, -2.5]} radius={3} count={5} />

      {/* Butterflies near easel */}
      <Sparkles
        count={3}
        scale={[1.2, 1, 1.2]}
        position={[-13.0, 1.3, 3.0]}
        size={6}
        speed={0.3}
        color="#F2A8C8"
        opacity={0.8}
      />

      {/* Bees buzzing around lavender patches */}
      <Sparkles
        count={4}
        scale={[1.5, 1, 1.5]}
        position={[-2.4, 0.6, 0.6]}
        size={3}
        speed={1.2}
        color="#FCD757"
        opacity={0.7}
      />
      <Sparkles
        count={3}
        scale={[1.2, 1, 1.2]}
        position={[2.4, 0.6, 0.6]}
        size={3}
        speed={1.2}
        color="#FCD757"
        opacity={0.7}
      />
      <Sparkles
        count={3}
        scale={[1.2, 1, 1.2]}
        position={[8, 0.6, 4]}
        size={3}
        speed={1.2}
        color="#FCD757"
        opacity={0.7}
      />

      {/* Fireflies near hammock */}
      <Sparkles
        count={8}
        scale={[3, 2, 3]}
        position={[-4.0, 1.5, -12.0]}
        size={5}
        speed={0.3}
        color="#FFE89A"
        opacity={0.7}
      />
    </group>
  )
}
