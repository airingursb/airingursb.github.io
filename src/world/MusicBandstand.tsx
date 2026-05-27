// Music zone — small bandstand / mini-gazebo (different from main Gazebo).
// 4 thin posts at corners of a square wood deck floor, with a hex pyramid
// copper-patina roof. Inside: C03 record-player sprite mounted on a
// vertical signboard at center. Parchment list hangs from one side.
// Banner hangs from one of the roof corners. LP records scattered on grass
// nearby.
//
// A1 (V53.7): spinning vinyl turntable on the floor inside the bandstand.
// When nowPlaying.isLive → 33⅓ rpm; when nowPlaying is just recent (not
// live) → slow drift (drained record, last spin). When nothing at all →
// stationary. Tonearm angles in for live, parked for off.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  SpritePlane,
  HangingBannerPlane,
  ParchmentPlane,
  type DisplayContent,
  WOOD,
  WOOD_LIGHT,
  WOOD_DARK,
  WOOD_DARKER,
  STONE,
  STONE_DK,
  ROPE,
  COPPER_PATINA,
} from './displayParts'

export interface MusicBandstandProps {
  position: [number, number]
  rotation?: number
  spriteUrl: string
  bannerUrl: string
  content: DisplayContent
  // A1: now-playing state. isLive=true → vinyl spins at 33⅓ rpm + tonearm
  // engaged + label glows warm. isLive=false but trackName set → slow
  // drift (record still on platter, last spun a few mins ago). Null → off.
  nowPlaying?: { name: string; artist: string; isLive: boolean } | null
}

const COPPER_DK = '#3A7558'
const LP_BLACK = '#1F1611'
const LP_LABEL_A = '#C97B5C'
const LP_LABEL_B = '#5878B8'
const LP_LABEL_LIVE = '#FFC57A'   // warm amber for currently-playing record

// A1 spinning vinyl + tonearm. Drives platter rotation off isLive.
// 33⅓ rpm ≈ 0.555 rev/s ≈ 3.49 rad/s. Off-state: slow drift so the
// platter doesn't read frozen (real cabinet records still rotate from
// belt momentum for ~30s after stop).
function VinylPlayer({ now }: { now: MusicBandstandProps['nowPlaying'] }) {
  const platterRef = useRef<THREE.Group>(null)
  const tonearmRef = useRef<THREE.Group>(null)
  const labelMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const stylusMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const isLive = !!now?.isLive
  const hasRecord = !!now   // covers either live OR just-played
  useFrame((s, dt) => {
    if (platterRef.current) {
      // 33⅓ rpm when live, slow 6 rpm drift when off (still has a record),
      // 0 when no track ever logged.
      const omega = isLive ? 3.49 : hasRecord ? 0.628 : 0
      platterRef.current.rotation.y += omega * dt
    }
    if (tonearmRef.current) {
      // Tonearm engaged: cuts in ~25° toward center. Disengaged: parked
      // at rest (~0°). Lerp smoothly between states.
      const targetYaw = isLive ? -0.42 : 0
      const k = 1 - Math.exp(-dt * 1.5)
      tonearmRef.current.rotation.y += (targetYaw - tonearmRef.current.rotation.y) * k
    }
    if (labelMatRef.current && isLive) {
      // Subtle pulse on label when live — picks up Bloom for a small glow.
      const t = s.clock.elapsedTime
      labelMatRef.current.emissiveIntensity = 0.4 + Math.sin(t * 2.1) * 0.15
    } else if (labelMatRef.current) {
      labelMatRef.current.emissiveIntensity = 0
    }
    // Stylus head: faster pulse than the label when live — signals
    // "this needle is in the groove right now". Off when not live.
    if (stylusMatRef.current) {
      if (isLive) {
        const t = s.clock.elapsedTime
        stylusMatRef.current.emissiveIntensity = 0.5 + Math.sin(t * 4.3) * 0.25
      } else {
        stylusMatRef.current.emissiveIntensity = 0
      }
    }
  })
  const labelColor = isLive ? LP_LABEL_LIVE : (hasRecord ? LP_LABEL_A : LP_LABEL_B)
  return (
    <group>
      {/* Turntable plinth (small wooden box base) */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color={WOOD_DARKER} roughness={0.85} />
      </mesh>
      {/* Recessed platter well — slightly darker inner */}
      <mesh position={[0, 0.082, 0]}>
        <cylinderGeometry args={[0.31, 0.31, 0.005, 24]} />
        <meshStandardMaterial color="#1A130F" roughness={0.55} />
      </mesh>
      {/* Spinning platter group — only this rotates */}
      <group ref={platterRef} position={[0, 0.09, 0]}>
        {/* Vinyl */}
        <mesh castShadow>
          <cylinderGeometry args={[0.30, 0.30, 0.008, 32]} />
          <meshStandardMaterial color={LP_BLACK} roughness={0.4} />
        </mesh>
        {/* Center label */}
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.10, 0.10, 0.002, 16]} />
          <meshStandardMaterial
            ref={labelMatRef}
            color={labelColor}
            emissive={labelColor}
            emissiveIntensity={0}
            roughness={0.5}
          />
        </mesh>
        {/* Center spindle hole + post */}
        <mesh position={[0, 0.014, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.020, 8]} />
          <meshStandardMaterial color="#A07840" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Spiral groove suggestion — 3 concentric thin rings */}
        {[0.18, 0.22, 0.26].map((r, i) => (
          <mesh key={`gr${i}`} position={[0, 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.001, r + 0.001, 32]} />
            <meshBasicMaterial color="#3A2E26" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* Tonearm pivot — back-right corner of plinth */}
      <group ref={tonearmRef} position={[0.28, 0.12, -0.28]}>
        {/* Pivot post */}
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.08, 8]} />
          <meshStandardMaterial color="#3A2A20" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Counterweight back-stub */}
        <mesh position={[0.06, 0.03, 0.04]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#1E1A18" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Arm itself — long thin cylinder pointing toward platter */}
        <mesh position={[-0.18, 0.03, 0.14]} rotation={[0, 0.66, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.40, 6]} />
          <meshStandardMaterial color="#2E2622" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Headshell + stylus end. Material has live-pulse emissive
            (driven from useFrame above) so on isLive=true the stylus
            head glows like a tiny warm LED. */}
        <mesh position={[-0.33, 0.03, 0.27]} castShadow>
          <boxGeometry args={[0.05, 0.025, 0.035]} />
          <meshStandardMaterial
            ref={stylusMatRef}
            color="#3A2A20"
            emissive="#FFD58F"
            emissiveIntensity={0}
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      </group>
    </group>
  )
}

export default function MusicBandstand({
  position,
  rotation = 0,
  spriteUrl,
  bannerUrl,
  content,
  nowPlaying,
}: MusicBandstandProps) {
  const SIDE = 1.7        // square footprint
  const FLOOR_H = 0.15
  const POST_H = 1.8
  const ROOF_H = 0.9

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {/* === Stone foundation === */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[SIDE + 0.3, 0.16, SIDE + 0.3]} />
        <meshStandardMaterial color={STONE_DK} roughness={0.95} flatShading />
      </mesh>

      {/* === Wooden floor === */}
      <mesh position={[0, 0.16 + FLOOR_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[SIDE, FLOOR_H, SIDE]} />
        <meshStandardMaterial color={WOOD} roughness={0.88} />
      </mesh>
      {/* Plank seams */}
      {[-SIDE / 3, 0, SIDE / 3].map((sx, i) => (
        <mesh key={`sm${i}`} position={[sx, 0.16 + FLOOR_H + 0.005, 0]}>
          <boxGeometry args={[0.02, 0.005, SIDE]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}

      {/* === A1: spinning vinyl turntable on the floor, front-center.
              Sits between the central signboard and the front edge so
              it reads as "the record-player on the sign is actually
              playing this one". Live → 33⅓ rpm + warm glowing label;
              recently-played → slow drift; never-played → still. */}
      <group position={[0, 0.16 + FLOOR_H, SIDE / 3.2]}>
        <VinylPlayer now={nowPlaying ?? null} />
      </group>

      {/* === 4 corner posts === */}
      {(
        [
          [-SIDE / 2 + 0.12, -SIDE / 2 + 0.12],
          [SIDE / 2 - 0.12, -SIDE / 2 + 0.12],
          [-SIDE / 2 + 0.12, SIDE / 2 - 0.12],
          [SIDE / 2 - 0.12, SIDE / 2 - 0.12],
        ] as Array<[number, number]>
      ).map(([px, pz], i) => (
        <group key={`p${i}`} position={[px, 0, pz]}>
          <mesh position={[0, 0.16 + FLOOR_H + POST_H / 2, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.075, POST_H, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </mesh>
          {/* Top cap */}
          <mesh position={[0, 0.16 + FLOOR_H + POST_H + 0.04, 0]} castShadow>
            <boxGeometry args={[0.16, 0.08, 0.16]} />
            <meshStandardMaterial color={WOOD_DARKER} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* === Hex pyramid copper-patina roof (4 tiers, like main Gazebo) === */}
      {(() => {
        const TIERS = 4
        const baseR = SIDE * 0.72
        const tipR = 0.04
        const roofBaseY = 0.16 + FLOOR_H + POST_H + 0.12
        return Array.from({ length: TIERS }).map((_, i) => {
          const t0 = i / TIERS
          const t1 = (i + 1) / TIERS
          const r0 = baseR * (1 - t0) + tipR * t0
          const r1 = baseR * (1 - t1) + tipR * t1
          const y = roofBaseY + ROOF_H * t0
          const h = ROOF_H / TIERS
          return (
            <mesh key={`roof${i}`} position={[0, y + h / 2, 0]} castShadow>
              <cylinderGeometry args={[r1, r0, h, 6, 1]} />
              <meshStandardMaterial
                color={i % 2 ? COPPER_DK : COPPER_PATINA}
                roughness={0.4}
                metalness={0.55}
                flatShading
              />
            </mesh>
          )
        })
      })()}
      {/* Roof finial */}
      <mesh position={[0, 0.16 + FLOOR_H + POST_H + 0.12 + ROOF_H + 0.08, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#A07840" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* === Central vertical signboard with C03 record-player sprite === */}
      <group position={[0, 0.16 + FLOOR_H + POST_H * 0.55, 0]}>
        {/* Backing board (vertical wooden plank) */}
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.4, 0.06]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.9} />
        </mesh>
        {/* Sprite on front */}
        <group position={[0, 0, 0.035]}>
          <SpritePlane url={spriteUrl} width={1.0} height={1.3} />
        </group>
      </group>

      {/* === Parchment list hangs from side (left side of bandstand) === */}
      {(() => {
        const PW = 1.0
        const PH = 1.0
        const px = -SIDE / 2 + 0.05
        const py = 0.16 + FLOOR_H + POST_H * 0.5
        return (
          <group position={[px, py, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Wooden plaque background */}
            <mesh castShadow>
              <boxGeometry args={[PW + 0.1, PH + 0.1, 0.04]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
            </mesh>
            <group position={[0, 0, 0.025]}>
              <ParchmentPlane content={content} width={PW} height={PH} />
            </group>
          </group>
        )
      })()}

      {/* === Banner hanging from roof edge (front-facing) === */}
      {(() => {
        const BW = 1.0
        const BH = BW / 2
        const beamY = 0.16 + FLOOR_H + POST_H + 0.08
        const ropeLen = 0.22
        const bannerY = beamY - ropeLen - BH / 2
        const beamZ = SIDE / 2 - 0.1
        return (
          <group position={[0, 0, beamZ]}>
            {[-BW / 2 + 0.06, BW / 2 - 0.06].map((rx, i) => (
              <mesh
                key={`bnr${i}`}
                position={[rx, beamY - ropeLen / 2, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.016, 0.016, ropeLen, 6]} />
                <meshStandardMaterial color={ROPE} roughness={0.95} />
              </mesh>
            ))}
            <group position={[0, bannerY, 0]}>
              <HangingBannerPlane url={bannerUrl} width={BW} />
            </group>
          </group>
        )
      })()}

      {/* === LP records scattered on grass beside bandstand === */}
      {[
        { x: -SIDE / 2 - 0.5, z: -SIDE / 2 - 0.3, label: LP_LABEL_A, tilt: 0.2 },
        { x: -SIDE / 2 - 0.3, z: -SIDE / 2 - 0.7, label: LP_LABEL_B, tilt: -0.15 },
        { x: SIDE / 2 + 0.45, z: SIDE / 2 + 0.4, label: LP_LABEL_A, tilt: 0.1 },
      ].map((rec, i) => (
        <group key={`lp${i}`} position={[rec.x, 0.03, rec.z]} rotation={[Math.PI / 2, 0, rec.tilt]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.012, 24]} />
            <meshStandardMaterial color={LP_BLACK} roughness={0.45} />
          </mesh>
          {/* Center label */}
          <mesh position={[0, 0.007, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.002, 16]} />
            <meshStandardMaterial color={rec.label} roughness={0.5} />
          </mesh>
          {/* Center hole */}
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.005, 8]} />
            <meshStandardMaterial color="#0E0807" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
