// Blog zone — newspaper kiosk / Victorian reading post.
// Tall narrow board on a single thick central post with a wide flat
// overhang roof + finial. Small wood reading bench in front + overhead
// hanging lantern on a curved iron arm.

import {
  SpritePlane,
  HangingBannerPlane,
  ParchmentPlane,
  type DisplayContent,
  WOOD,
  WOOD_LIGHT,
  WOOD_CREAM,
  WOOD_DARK,
  WOOD_DARKER,
  STONE,
  STONE_DK,
  ROPE,
} from './displayParts'

export interface BlogKioskProps {
  position: [number, number]
  rotation?: number
  spriteUrl: string
  bannerUrl: string
  content: DisplayContent
}

export default function BlogKiosk({
  position,
  rotation = 0,
  spriteUrl,
  bannerUrl,
  content,
}: BlogKioskProps) {
  const W = 1.55           // narrower than default
  const H = 2.9            // taller than default
  const POST_H = 1.0
  const BOARD_Y = 0.3 + POST_H + H / 2

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {/* === Stone foundation (square, like a Victorian curb) === */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.2, 0.85]} />
        <meshStandardMaterial color={STONE_DK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.08, 0.7]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>

      {/* === Single thick central post (square cross-section, kiosk-style) === */}
      <mesh position={[0, 0.3 + POST_H / 2, 0]} castShadow>
        <boxGeometry args={[0.25, POST_H, 0.25]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>
      {/* Capital decoration where post meets board */}
      <mesh position={[0, 0.3 + POST_H + 0.04, 0]} castShadow>
        <boxGeometry args={[0.36, 0.1, 0.36]} />
        <meshStandardMaterial color={WOOD_DARKER} roughness={0.92} />
      </mesh>

      {/* === Board === */}
      <group position={[0, BOARD_Y, 0]}>
        {/* Dark wood frame */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[W + 0.16, H + 0.16, 0.09]} />
          <meshStandardMaterial color={WOOD_DARKER} roughness={0.88} />
        </mesh>
        {/* Inner cream weathered wood */}
        <mesh position={[0, 0, 0.046]}>
          <boxGeometry args={[W - 0.04, H - 0.04, 0.02]} />
          <meshStandardMaterial color={WOOD_CREAM} roughness={0.92} />
        </mesh>

        {/* Sprite (bookshelf) — placed upper-third */}
        <group position={[0, H / 2 - 0.55, 0.06]}>
          <SpritePlane url={spriteUrl} width={0.95} />
        </group>

        {/* Parchment — lower two-thirds */}
        <group position={[0, -H / 2 + 0.7, 0.06]}>
          <ParchmentPlane content={content} width={W - 0.2} height={1.35} />
        </group>

        {/* Corner brass tacks */}
        {(
          [
            [-W / 2 + 0.08, H / 2 - 0.08],
            [W / 2 - 0.08, H / 2 - 0.08],
            [-W / 2 + 0.08, -H / 2 + 0.08],
            [W / 2 - 0.08, -H / 2 + 0.08],
          ] as Array<[number, number]>
        ).map(([nx, ny], i) => (
          <mesh
            key={`t${i}`}
            position={[nx, ny, 0.07]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
            <meshStandardMaterial color="#A07840" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}

        {/* === WIDE FLAT OVERHANG ROOF (instead of gable) === */}
        <group position={[0, H / 2 + 0.1, 0]}>
          {/* Eaves slab — wide flat board */}
          <mesh castShadow>
            <boxGeometry args={[W + 0.7, 0.1, 0.7]} />
            <meshStandardMaterial color={WOOD_DARKER} roughness={0.92} />
          </mesh>
          {/* Small dome on top (half sphere) */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#4A8B6E" roughness={0.4} metalness={0.5} flatShading />
          </mesh>
          {/* Finial spike */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <coneGeometry args={[0.05, 0.18, 6]} />
            <meshStandardMaterial color="#A07840" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#A07840" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* Banner hangs from underside of eaves slab */}
        {(() => {
          const BW = W * 0.85
          const BH = BW / 2
          const beamY = H / 2 + 0.04
          const ropeLen = 0.16
          const bannerY = beamY - ropeLen - BH / 2
          return (
            <group position={[0, 0, 0.18]}>
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
      </group>

      {/* === Overhead hanging lantern on a curved iron arm === */}
      <group position={[0, BOARD_Y + H / 2 + 0.5, 0.4]}>
        {/* Iron arm — short curved cylinder (approximate with 2 slanted boxes) */}
        <mesh position={[0, -0.05, -0.2]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <meshStandardMaterial color="#2A1F18" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* Lantern body — warm glow */}
        <mesh position={[0, -0.28, 0]} castShadow>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshStandardMaterial
            color="#E8B888"
            emissive="#FFC580"
            emissiveIntensity={0.85}
            roughness={0.55}
          />
        </mesh>
        {/* Lantern cap */}
        <mesh position={[0, -0.13, 0]} castShadow>
          <coneGeometry args={[0.11, 0.07, 4]} />
          <meshStandardMaterial color="#2A1F18" metalness={0.6} roughness={0.5} flatShading />
        </mesh>
      </group>

      {/* === Wood reading bench in front of kiosk === */}
      <group position={[0, 0, 1.0]}>
        {/* Seat plank */}
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.08, 0.34]} />
          <meshStandardMaterial color={WOOD} roughness={0.92} />
        </mesh>
        {/* 2 leg slabs */}
        {[-0.55, 0.55].map((lx, i) => (
          <mesh key={`lg${i}`} position={[lx, 0.16, 0]} castShadow>
            <boxGeometry args={[0.1, 0.32, 0.3]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
          </mesh>
        ))}
        {/* Back support — short, kept low */}
        <mesh position={[0, 0.48, -0.13]} castShadow>
          <boxGeometry args={[1.4, 0.04, 0.04]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
      </group>
    </group>
  )
}
