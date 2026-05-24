// Small B&B-style hanging shop sign next to the cabin's front door.
// Mounts the E05 chat banner (Chat · Mochi 在木屋) on a short wooden
// post + cross-arm, so the cabin reads as the chat work zone.

import { useTexture } from '@react-three/drei'
import WindSway from './WindSway'

const WOOD       = '#9E7A52'
const WOOD_DARK  = '#5D452B'
const WOOD_DARKER = '#3A2516'
const ROPE       = '#A48B6E'

const BANNER_URL = '/world/sprites/banners/E05-chat.png'

// Place west of cabin door, facing the path coming from the south.
// Cabin is at [-2, -1]; avatar (panda) stands at [-2.0, 1.05, 0.5].
// The path approaches from positive z. So the sign goes a bit south-west
// of the door, oriented to be readable from the path.
const POS: [number, number, number] = [-3.5, 0, 1.4]
const ROT_Y = 0.5

export default function CabinBanner() {
  const tex = useTexture(BANNER_URL)

  const POST_H = 2.2
  const ARM_LEN = 0.95
  const BANNER_W = 0.95
  const BANNER_H = BANNER_W / 2  // 320:160 aspect

  return (
    <group position={POS} rotation={[0, ROT_Y, 0]}>
      {/* Stone foot at base of post */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.34, 0.2, 8]} />
        <meshStandardMaterial color="#8E8579" roughness={0.95} flatShading />
      </mesh>

      {/* Main vertical post */}
      <mesh position={[0, 0.2 + POST_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, POST_H, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 0.2 + POST_H + 0.04, 0]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.22]} />
        <meshStandardMaterial color={WOOD_DARKER} roughness={0.92} />
      </mesh>

      {/* Horizontal cross-arm extending out to the front */}
      <mesh position={[0, 0.2 + POST_H - 0.08, ARM_LEN / 2]} castShadow>
        <boxGeometry args={[0.06, 0.06, ARM_LEN]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>

      {/* Diagonal brace under cross-arm */}
      <mesh
        position={[0, 0.2 + POST_H - 0.32, ARM_LEN * 0.4]}
        rotation={[Math.PI / 4, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.05, 0.05, ARM_LEN * 0.6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>

      {/* === Banner hanging from end of cross-arm === */}
      <WindSway amp={0.04} freq={0.6} phase={1.1}>
        <group position={[0, 0.2 + POST_H - 0.15, ARM_LEN - 0.05]}>
          {/* 2 rope ties from cross-arm to banner top corners */}
          {[-BANNER_W / 2 + 0.05, BANNER_W / 2 - 0.05].map((rx, i) => (
            <mesh key={`r${i}`} position={[rx, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.16, 6]} />
              <meshStandardMaterial color={ROPE} roughness={0.95} />
            </mesh>
          ))}
          {/* Banner plane */}
          <mesh position={[0, -0.16 - BANNER_H / 2, 0]}>
            <planeGeometry args={[BANNER_W, BANNER_H]} />
            <meshStandardMaterial
              map={tex}
              transparent
              alphaTest={0.04}
              emissive="#FFFFFF"
              emissiveMap={tex}
              emissiveIntensity={0.22}
              roughness={0.9}
              side={2}
              depthWrite={false}
            />
          </mesh>
        </group>
      </WindSway>

      {/* Small warm lantern hanging on the OTHER side of cross-arm for charm */}
      <group position={[0, 0.2 + POST_H - 0.5, -0.2]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.36, 4]} />
          <meshStandardMaterial color={ROPE} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.14, 6]} />
          <meshStandardMaterial
            color="#E8B888"
            roughness={0.5}
            emissive="#FFC580"
            emissiveIntensity={0.9}
          />
        </mesh>
        <mesh position={[0, 0.085, 0]}>
          <coneGeometry args={[0.08, 0.06, 4]} />
          <meshStandardMaterial color={WOOD_DARKER} roughness={0.92} flatShading />
        </mesh>
      </group>
    </group>
  )
}
