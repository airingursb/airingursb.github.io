// Comics zone — outdoor gallery sandwich-board / A-frame easel.
// Wide horizontal board mounted between 2 lean-back posts forming an
// inverted V. No gable — the A-frame slope IS the roof silhouette.
// Banner mounted horizontally across the top edge of the board.
// Paint splatters on board surface + paint bucket and brush jar on ground.

import {
  SpritePlane,
  HangingBannerPlane,
  ParchmentPlane,
  type DisplayContent,
  WOOD,
  WOOD_LIGHT,
  WOOD_DARK,
  WOOD_DARKER,
  ROPE,
} from './displayParts'

export interface ComicsEaselProps {
  position: [number, number]
  rotation?: number
  spriteUrl: string
  bannerUrl: string
  content: DisplayContent
}

const PAINT_COLORS = ['#C13E3E', '#7BA374', '#5878B8', '#E29A4A', '#A05A8B']

export default function ComicsEasel({
  position,
  rotation = 0,
  spriteUrl,
  bannerUrl,
  content,
}: ComicsEaselProps) {
  const W = 2.7            // wide
  const H = 1.8            // short
  const LEG_LEN = 2.4
  // The 2 legs lean inward forming an A. Total height ~2m.
  const LEAN_ANGLE = Math.PI * 0.11

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {/* === A-frame legs (2 pairs — front + back for stability) === */}
      {[
        { x: -W / 2 - 0.1, z: 0.0, lean: LEAN_ANGLE },
        { x: W / 2 + 0.1, z: 0.0, lean: -LEAN_ANGLE },
      ].map((leg, i) => (
        <group key={`fL${i}`} position={[leg.x, 0, leg.z]}>
          {/* Front leg pair */}
          <mesh position={[0, LEG_LEN / 2, 0.18]} rotation={[0, 0, leg.lean]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, LEG_LEN, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
          </mesh>
          {/* Back leg pair */}
          <mesh position={[0, LEG_LEN / 2, -0.18]} rotation={[0, 0, leg.lean]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, LEG_LEN, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* Horizontal cross-brace at the bottom (stabilizer bar) */}
      <mesh position={[0, 0.15, 0.18]} castShadow>
        <boxGeometry args={[W + 0.3, 0.05, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.15, -0.18]} castShadow>
        <boxGeometry args={[W + 0.3, 0.05, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>

      {/* === Main board (mounted between the legs) === */}
      <group position={[0, 1.05, 0]}>
        {/* Frame */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[W + 0.16, H + 0.16, 0.08]} />
          <meshStandardMaterial color={WOOD_DARKER} roughness={0.88} />
        </mesh>
        {/* Inner board (light wood) */}
        <mesh position={[0, 0, 0.043]}>
          <boxGeometry args={[W - 0.04, H - 0.04, 0.02]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.92} />
        </mesh>

        {/* Sprite (easel) — LEFT half */}
        <group position={[-W / 4 - 0.05, 0, 0.058]}>
          <SpritePlane url={spriteUrl} width={1.05} height={1.4} />
        </group>

        {/* Parchment — RIGHT half (horizontal layout!) */}
        <group position={[W / 4 + 0.1, -0.05, 0.058]}>
          <ParchmentPlane content={content} width={W / 2 - 0.2} height={H - 0.2} />
        </group>

        {/* Banner mounted ACROSS top edge (instead of hanging from above) */}
        {(() => {
          const BW = W * 0.45
          const BH = BW / 2
          return (
            <group position={[0, H / 2 - 0.04, 0.08]}>
              <HangingBannerPlane url={bannerUrl} width={BW} height={BH} />
            </group>
          )
        })()}

        {/* Paint splatters scattered on board surface */}
        {[
          [-0.4, 0.5, 0.06],
          [0.5, -0.3, 0.04],
          [-0.15, -0.6, 0.03],
          [0.7, 0.2, 0.05],
          [-0.7, -0.1, 0.045],
        ].map((p, i) => (
          <mesh key={`pt${i}`} position={[p[0], p[1], 0.062]} rotation={[0, 0, i * 0.7]}>
            <circleGeometry args={[p[2], 8]} />
            <meshStandardMaterial color={PAINT_COLORS[i % PAINT_COLORS.length]} roughness={0.55} side={2} />
          </mesh>
        ))}
      </group>

      {/* === Ground props === */}
      {/* Paint bucket (tipped over slightly) */}
      <group position={[-W / 2 - 0.5, 0, 0.7]} rotation={[0, 0.3, Math.PI * 0.08]}>
        <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.26, 12]} />
          <meshStandardMaterial color="#6B6358" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.02, 12]} />
          <meshStandardMaterial color="#C13E3E" roughness={0.4} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.012, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#3A2516" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* Brush jar */}
      <group position={[-W / 2 - 0.5, 0, 0.3]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.24, 10]} />
          <meshStandardMaterial color={WOOD_DARKER} roughness={0.88} />
        </mesh>
        {/* 3 brushes sticking out */}
        {[0, 0.04, -0.04].map((dx, i) => (
          <mesh
            key={`br${i}`}
            position={[dx, 0.32, i === 0 ? 0.02 : -0.03]}
            rotation={[0, 0, i === 1 ? 0.18 : -0.08]}
            castShadow
          >
            <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
            <meshStandardMaterial color={WOOD} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* A few crumpled comic drafts on grass */}
      {[[0.9, 0.6], [-0.85, -0.3], [1.1, -0.7]].map(([cx, cz], i) => (
        <mesh key={`cd${i}`} position={[cx, 0.06, cz]} castShadow>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#FAEFC8" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}
