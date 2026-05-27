// Blog zone — newspaper kiosk / Victorian reading post.
// Tall narrow board on a single thick central post with a wide flat
// overhang roof + finial. Small wood reading bench in front + overhead
// hanging lantern on a curved iron arm.

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
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

// V2 wave 3: coffee mug on the kiosk bench with rising steam — same
// "just-put-down" beat as RockerTeaCup. 3 small steam puffs loop.
function KioskCoffeeMug() {
  const puffRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  useFrame((s) => {
    const t = s.clock.elapsedTime
    puffRefs.forEach((r, i) => {
      const m = r.current
      if (!m) return
      const phase = ((t * 0.4 + i * 0.33) % 1)
      m.position.y = phase * 0.45
      m.position.x = Math.sin(t * 0.7 + i) * 0.015 * phase
      m.scale.setScalar(0.018 + phase * 0.012)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, (1 - phase) * 0.50)
    })
  })
  return (
    <group position={[-0.55, 0.36, 0.04]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.045, 0.10, 12]} />
        <meshStandardMaterial color="#5878B8" roughness={0.85} />
      </mesh>
      <mesh position={[0.058, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.007, 4, 10, Math.PI]} />
        <meshStandardMaterial color="#5878B8" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.051, 0]}>
        <cylinderGeometry args={[0.046, 0.046, 0.004, 12]} />
        <meshStandardMaterial color="#3A2516" roughness={0.4} metalness={0.15} />
      </mesh>
      {/* Steam puffs */}
      <group position={[0, 0.06, 0]}>
        {puffRefs.map((r, i) => (
          <mesh key={`s${i}`} ref={r}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export interface BlogKioskProps {
  position: [number, number]
  rotation?: number
  spriteUrl: string
  bannerUrl: string
  content: DisplayContent
  // C1 (direction): if true (post within last 7 days), kiosk gets a
  // warm pulsing aura — "Airing is writing." Real-data heartbeat.
  fresh?: boolean
  // A2: latest post for the "fresh issue" scroll on top of the kiosk
  // dome. Hover on the scroll → drei Html tooltip with title + date.
  latestPost?: { title: string; date: string } | null
}

// A2 hanging scroll — small rolled parchment dangling from a ribbon
// under the kiosk's dome. Slight breeze sway, gentle bob. On hover,
// drei <Html> floats the post title above it as a tooltip.
function LatestPostScroll({ post, fresh }: { post: { title: string; date: string }; fresh: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useFrame((s) => {
    if (!groupRef.current) return
    const t = s.clock.elapsedTime
    // Hanging sway — slow pendulum + tiny rotation around y for paper twist
    groupRef.current.rotation.z = Math.sin(t * 0.9) * 0.05
    groupRef.current.rotation.y = Math.sin(t * 0.6 + 1.2) * 0.10
  })
  // Bigger hitbox than visual for forgiving hover (the scroll itself is small)
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = '' }}
    >
      {/* Ribbon — vertical strap holding scroll to ceiling above */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.04, 0.32, 0.01]} />
        <meshStandardMaterial color="#C97B5C" roughness={0.85} />
      </mesh>
      <group ref={groupRef}>
        {/* Rolled scroll body — horizontal cylinder, parchment cream */}
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.40, 12]} />
          <meshStandardMaterial color="#F2EAD8" roughness={0.92} />
        </mesh>
        {/* Two darker end caps to suggest rolled paper edges */}
        {[-0.20, 0.20].map((ex, i) => (
          <mesh key={`cap${i}`} position={[ex, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.072, 0.072, 0.005, 12]} />
            <meshStandardMaterial color="#D6CBB4" roughness={0.95} />
          </mesh>
        ))}
        {/* Unrolled flap dangling down with abstract ink-line "preview" —
            reads as "this scroll has writing on it" without text. */}
        <mesh position={[0, -0.10, 0.001]} castShadow>
          <planeGeometry args={[0.34, 0.22]} />
          <meshStandardMaterial color="#FAF3DF" roughness={0.93} side={THREE.DoubleSide} />
        </mesh>
        {/* 3 dark ink strokes implying headline + body */}
        <mesh position={[-0.04, -0.04, 0.0015]}>
          <planeGeometry args={[0.20, 0.012]} />
          <meshStandardMaterial color="#3A2818" />
        </mesh>
        <mesh position={[-0.04, -0.08, 0.0015]}>
          <planeGeometry args={[0.24, 0.006]} />
          <meshStandardMaterial color="#5A4830" />
        </mesh>
        <mesh position={[-0.04, -0.12, 0.0015]}>
          <planeGeometry args={[0.18, 0.006]} />
          <meshStandardMaterial color="#5A4830" />
        </mesh>
        {/* Brass wax seal at the bottom center — extra weight + 'this is
            from Airing' signal. Glows softly when post is fresh. */}
        <mesh position={[0.10, -0.18, 0.002]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.006, 12]} />
          <meshStandardMaterial
            color={fresh ? '#FFC57A' : '#A07840'}
            emissive={fresh ? '#FFC57A' : '#000000'}
            emissiveIntensity={fresh ? 0.4 : 0}
            metalness={0.55}
            roughness={0.4}
          />
        </mesh>
      </group>
      {/* Hover tooltip — title + date floats above the scroll. distanceFactor
          tuned to be readable but not overwhelming at default camera. */}
      {hovered && (
        <Html
          position={[0, 0.55, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="zone-hover-label" style={{ maxWidth: 240, textAlign: 'center', lineHeight: 1.4 }}>
            <div style={{ fontSize: '0.78em', opacity: 0.7, marginBottom: 2 }}>{post.date}</div>
            <div>{post.title}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function BlogKiosk({
  position,
  rotation = 0,
  spriteUrl,
  bannerUrl,
  content,
  fresh = false,
  latestPost = null,
}: BlogKioskProps) {
  const W = 1.55           // narrower than default
  const H = 2.9            // taller than default
  const POST_H = 1.0
  const BOARD_Y = 0.3 + POST_H + H / 2
  const auraRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => {
    if (!fresh || !auraRef.current) return
    const t = s.clock.elapsedTime
    // Polish 2: dimmed range 0.08 → 0.22 (was 0.15 → 0.45). With Bloom
    // the previous range bloomed into a giant white ball at night that
    // dominated the lower-left of the default frame.
    auraRef.current.opacity = 0.15 + Math.sin(t * 1.6) * 0.07
  })

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      {/* C1: 'fresh post' aura — soft warm sphere pulsing around the
          kiosk top when a blog post landed in last 7 days. Reads as
          "Airing has been writing." emissive-friendly mat so Bloom
          picks it up. */}
      {fresh && (
        <mesh position={[0, BOARD_Y, 0]} renderOrder={1}>
          {/* Polish 2: radius 0.85 → 0.55 — sphere fits over the kiosk
              top instead of engulfing the surrounding tree canopies. */}
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshBasicMaterial
            ref={auraRef}
            color="#FFD08A"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
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

        {/* === A2: latest-post scroll dangling from underside of eaves.
                Y offset puts the ribbon TOP just under the eaves slab
                instead of clipping through it. Offset to the right so
                it doesn't overlap the banner. Hover shows title + date. */}
        {latestPost && (
          <group position={[W * 0.55, H / 2 - 0.40, 0.32]}>
            <LatestPostScroll post={latestPost} fresh={fresh} />
          </group>
        )}

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

        {/* V2 wave 3 (Sub-A "loneliest zone" fix): lived-in details so
            BlogKiosk catches up to Onsen / Gazebo / Hammock in
            inhabitation cues. */}

        {/* Folded newspaper on the right end of the seat */}
        <group position={[0.55, 0.38, 0.02]} rotation={[0, -0.15, 0.05]}>
          {/* Newspaper body — slightly cream */}
          <mesh castShadow>
            <boxGeometry args={[0.28, 0.012, 0.20]} />
            <meshStandardMaterial color="#F2EAD8" roughness={0.92} />
          </mesh>
          {/* Headline strip — darker line across the top */}
          <mesh position={[0, 0.008, -0.07]}>
            <boxGeometry args={[0.22, 0.003, 0.015]} />
            <meshStandardMaterial color="#3A2818" />
          </mesh>
          <mesh position={[0, 0.008, -0.03]}>
            <boxGeometry args={[0.18, 0.003, 0.008]} />
            <meshStandardMaterial color="#3A2818" />
          </mesh>
          <mesh position={[0, 0.008, 0.01]}>
            <boxGeometry args={[0.20, 0.003, 0.005]} />
            <meshStandardMaterial color="#3A2818" />
          </mesh>
          {/* Fold crease line down the middle */}
          <mesh position={[0, 0.0065, 0]}>
            <boxGeometry args={[0.005, 0.004, 0.20]} />
            <meshStandardMaterial color="#D6CBB4" />
          </mesh>
        </group>

        {/* Coffee mug on the left end of the seat — with steam */}
        <KioskCoffeeMug />
      </group>

      {/* A-frame chalkboard sign at the base of the kiosk — "今日の記事" */}
      <group position={[0.9, 0, 0.6]} rotation={[0, -0.4, 0]}>
        {/* Two A-frame legs */}
        <mesh position={[-0.05, 0.25, 0]} rotation={[0, 0, -0.18]} castShadow>
          <boxGeometry args={[0.03, 0.55, 0.18]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
        <mesh position={[0.05, 0.25, 0]} rotation={[0, 0, 0.18]} castShadow>
          <boxGeometry args={[0.03, 0.55, 0.18]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
        {/* Top crossbar joining the two legs */}
        <mesh position={[0, 0.50, 0]} castShadow>
          <boxGeometry args={[0.13, 0.02, 0.18]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
        {/* Chalkboard panel (front face slightly forward) */}
        <mesh position={[0, 0.35, 0.10]} rotation={[0.18, 0, 0]} castShadow>
          <planeGeometry args={[0.32, 0.32]} />
          <meshStandardMaterial color="#2A2520" roughness={0.95} />
        </mesh>
        {/* Three white chalk strokes implying "今日の記事" without text */}
        <mesh position={[0, 0.45, 0.11]} rotation={[0.18, 0, 0]}>
          <planeGeometry args={[0.18, 0.012]} />
          <meshStandardMaterial color="#E8E0D2" />
        </mesh>
        <mesh position={[0, 0.36, 0.11]} rotation={[0.18, 0, 0]}>
          <planeGeometry args={[0.22, 0.010]} />
          <meshStandardMaterial color="#E8E0D2" />
        </mesh>
        <mesh position={[0, 0.27, 0.11]} rotation={[0.18, 0, 0]}>
          <planeGeometry args={[0.15, 0.008]} />
          <meshStandardMaterial color="#E8E0D2" />
        </mesh>
      </group>

      {/* Stack of old newspapers tied with twine at base of kiosk */}
      <group position={[-0.7, 0, 0.55]} rotation={[0, 0.3, 0]}>
        {/* Stack of 4 slightly-offset rectangles */}
        {[0, 0.045, 0.090, 0.135].map((y, i) => (
          <mesh
            key={`pap${i}`}
            position={[i * 0.005, 0.025 + y, i * 0.008]}
            rotation={[0, i * 0.03, 0]}
            castShadow
          >
            <boxGeometry args={[0.30, 0.025, 0.22]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#F2EAD8' : '#EDE3CB'} roughness={0.92} />
          </mesh>
        ))}
        {/* Twine wrapped around the stack */}
        <mesh position={[0.07, 0.10, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.005, 4, 16]} />
          <meshStandardMaterial color="#A48B6E" roughness={0.95} />
        </mesh>
        <mesh position={[-0.07, 0.10, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.115, 0.005, 4, 16]} />
          <meshStandardMaterial color="#A48B6E" roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
}
