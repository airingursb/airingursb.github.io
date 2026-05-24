// Music zone — small bandstand / mini-gazebo (different from main Gazebo).
// 4 thin posts at corners of a square wood deck floor, with a hex pyramid
// copper-patina roof. Inside: C03 record-player sprite mounted on a
// vertical signboard at center. Parchment list hangs from one side.
// Banner hangs from one of the roof corners. LP records scattered on grass
// nearby.

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
}

const COPPER_DK = '#3A7558'
const LP_BLACK = '#1F1611'
const LP_LABEL_A = '#C97B5C'
const LP_LABEL_B = '#5878B8'

export default function MusicBandstand({
  position,
  rotation = 0,
  spriteUrl,
  bannerUrl,
  content,
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
