// Reading zone — low wide library cabinet on 4 short legs.
// No central post. The cabinet body has 3 horizontal shelves visible
// as wood strips. C04 armchair sprite stands on TOP of cabinet as a
// standing signboard. Banner mounted on top of cabinet. Parchment list
// is the front face of the cabinet. Stacked books + teacup on ground
// beside.

import {
  SpritePlane,
  HangingBannerPlane,
  ParchmentPlane,
  type DisplayContent,
  WOOD,
  WOOD_LIGHT,
  WOOD_DARK,
  WOOD_DARKER,
  WOOD_WALNUT,
  ROPE,
} from './displayParts'

export interface ReadingCabinetProps {
  position: [number, number]
  rotation?: number
  spriteUrl: string
  bannerUrl: string
  content: DisplayContent
}

const BOOK_COLORS = ['#5E5288', '#7A4A2D', '#3E5E5C', '#A05A8B', '#4A6B40', '#C97B5C']

export default function ReadingCabinet({
  position,
  rotation = 0,
  spriteUrl,
  bannerUrl,
  content,
}: ReadingCabinetProps) {
  const W = 2.5
  const H = 1.5             // shorter than other displays
  const D = 0.45            // deeper — like furniture
  const LEG_H = 0.35

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {/* === 4 short legs (no central post) === */}
      {(
        [
          [-W / 2 + 0.15, -D / 2 + 0.08],
          [W / 2 - 0.15, -D / 2 + 0.08],
          [-W / 2 + 0.15, D / 2 - 0.08],
          [W / 2 - 0.15, D / 2 - 0.08],
        ] as Array<[number, number]>
      ).map(([lx, lz], i) => (
        <mesh key={`lg${i}`} position={[lx, LEG_H / 2, lz]} castShadow>
          <boxGeometry args={[0.12, LEG_H, 0.12]} />
          <meshStandardMaterial color={WOOD_DARKER} roughness={0.92} />
        </mesh>
      ))}

      {/* === Cabinet body === */}
      <group position={[0, LEG_H + H / 2, 0]}>
        {/* Outer walnut frame */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial color={WOOD_WALNUT} roughness={0.85} />
        </mesh>
        {/* Inner front face (recessed) */}
        <mesh position={[0, 0, D / 2 - 0.015]}>
          <boxGeometry args={[W - 0.1, H - 0.1, 0.01]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>

        {/* === 3 horizontal shelf strips (visible on front face) === */}
        {[-0.42, 0.0, 0.42].map((sy, i) => (
          <mesh key={`sh${i}`} position={[0, sy, D / 2 - 0.005]} castShadow>
            <boxGeometry args={[W - 0.04, 0.05, 0.02]} />
            <meshStandardMaterial color={WOOD} roughness={0.92} />
          </mesh>
        ))}

        {/* === Parchment list as the FRONT FACE === */}
        <group position={[0, 0, D / 2 + 0.005]}>
          <ParchmentPlane content={content} width={W - 0.18} height={H - 0.18} />
        </group>

        {/* Small brass handles on the bottom shelf (decorative) */}
        {[-0.4, 0.4].map((hx, i) => (
          <mesh
            key={`bh${i}`}
            position={[hx, -0.5, D / 2 + 0.015]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.04, 0.012, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#A07840" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* === Top of cabinet === */}
      <group position={[0, LEG_H + H + 0.02, 0]}>
        {/* Overhanging top slab */}
        <mesh castShadow>
          <boxGeometry args={[W + 0.1, 0.05, D + 0.1]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
      </group>

      {/* === C04 armchair sprite as standing signboard on top === */}
      <group position={[-W / 4 - 0.1, LEG_H + H + 0.7, 0]}>
        {/* Mounting board */}
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.3, 0.05]} />
          <meshStandardMaterial color={WOOD_DARKER} roughness={0.92} />
        </mesh>
        {/* Sprite */}
        <group position={[0, 0, 0.03]}>
          <SpritePlane url={spriteUrl} width={1.0} height={1.2} />
        </group>
      </group>

      {/* === Banner mounted on cabinet top, right of sprite === */}
      {(() => {
        const BW = 0.95
        const BH = BW / 2
        return (
          <group position={[W / 4 + 0.15, LEG_H + H + 0.6, 0]}>
            {/* Backing plank */}
            <mesh castShadow>
              <boxGeometry args={[BW + 0.08, BH + 0.08, 0.04]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
            </mesh>
            <group position={[0, 0, 0.025]}>
              <HangingBannerPlane url={bannerUrl} width={BW} height={BH} />
            </group>
          </group>
        )
      })()}

      {/* === Stacked books on ground beside cabinet === */}
      {[
        { y: 0.05, w: 0.32, d: 0.22, color: BOOK_COLORS[0], x: -W / 2 - 0.45, z: 0.1 },
        { y: 0.15, w: 0.30, d: 0.20, color: BOOK_COLORS[1], x: -W / 2 - 0.43, z: 0.05 },
        { y: 0.25, w: 0.34, d: 0.21, color: BOOK_COLORS[2], x: -W / 2 - 0.46, z: 0.08 },
        { y: 0.35, w: 0.28, d: 0.19, color: BOOK_COLORS[3], x: -W / 2 - 0.42, z: 0.12 },
      ].map((b, i) => (
        <mesh
          key={`bk${i}`}
          position={[b.x, b.y, b.z]}
          rotation={[0, i * 0.04, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.w, 0.08, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.85} />
        </mesh>
      ))}

      {/* Steaming teacup beside book stack */}
      <group position={[-W / 2 - 0.45, 0.06, 0.45]}>
        {/* Saucer */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.015, 12]} />
          <meshStandardMaterial color="#F4EAD5" roughness={0.5} />
        </mesh>
        {/* Cup */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.08, 12]} />
          <meshStandardMaterial color="#F4EAD5" roughness={0.5} />
        </mesh>
        {/* Tea surface */}
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.005, 12]} />
          <meshStandardMaterial color="#7A4A2D" roughness={0.3} />
        </mesh>
        {/* Handle */}
        <mesh position={[0.07, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.025, 0.008, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#F4EAD5" roughness={0.5} />
        </mesh>
      </group>

      {/* Open book lying on top of stack */}
      <group position={[-W / 2 - 0.45, 0.45, 0.1]} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.02, 0.18]} />
          <meshStandardMaterial color={BOOK_COLORS[4]} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.22, 0.005, 0.16]} />
          <meshStandardMaterial color="#FAEFC8" roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}
