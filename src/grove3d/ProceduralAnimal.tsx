// SHU-733/736 · Procedural 11-species avatar — high-poly composed primitives
// + frame-driven animation. ~10-15k tris per avatar.
//
// Why procedural (not GLB files):
//   - No CC0 asset hunt blockage
//   - Single visual style across all 11 species (no Sketchfab inconsistency)
//   - Easy to tweak: change one config value, all updates
//   - Easy to extend: add a new species = add a config entry
//
// Tradeoffs:
//   - No skeletal bone animation (limbs are mesh groups, not bones)
//   - But: per-frame transform IS sufficient for walk/idle/jump cycle
//   - When proper rigged GLB ships later (SHU-736), swap in via PlayerAvatar.tsx

import { useRef, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'

// ── Per-species config ────────────────────────────────────────────────────

interface SpeciesConfig {
  bodyColor: string
  accentColor: string     // ear interior / paw pads / etc
  bellyColor: string      // chest / underside
  noseColor: string

  bodyScale: [number, number, number]  // x/y/z scale of base capsule
  headScale: number                     // uniform scale of head sphere
  headOffsetY: number                   // head sits this far above body
  headOffsetZ: number                   // head leans forward by this much
  legLength: number
  legRadius: number

  ears: 'round' | 'triangle' | 'long' | 'tiny' | 'none' | 'feathered' | 'pointed'
  earSize: number

  tail: 'bushy' | 'short' | 'ball' | 'long' | 'none' | 'leaf'
  tailSize: number

  snout: 'short' | 'long' | 'flat' | 'beak'

  emoji: string  // for billboard label fallback

  // Per-species ornament flags
  pandaEyes?: boolean       // black eye patches
  tuxedo?: boolean          // belly + black back (penguin)
  birdBeak?: boolean
  frogEyes?: boolean        // bulgy top eyes
  whiskers?: boolean        // cat / hamster
  bunnyTeeth?: boolean
  capybaraTeeth?: boolean
}

const SPECIES_CONFIG: Record<string, SpeciesConfig> = {
  bear: {
    bodyColor: '#6a3c1f', accentColor: '#4a2410', bellyColor: '#8a5a30', noseColor: '#1a1008',
    bodyScale: [1.1, 0.95, 1.1], headScale: 0.42, headOffsetY: 0.95, headOffsetZ: 0.05,
    legLength: 0.32, legRadius: 0.14,
    ears: 'round', earSize: 0.13,
    tail: 'short', tailSize: 0.12,
    snout: 'short',
    emoji: '🐻',
  },
  cat: {
    bodyColor: '#d8b890', accentColor: '#f8e8c0', bellyColor: '#f0dab0', noseColor: '#3a1f10',
    bodyScale: [0.85, 0.95, 1.15], headScale: 0.35, headOffsetY: 0.85, headOffsetZ: 0.1,
    legLength: 0.38, legRadius: 0.08,
    ears: 'triangle', earSize: 0.16,
    tail: 'long', tailSize: 0.5,
    snout: 'short',
    emoji: '🐱',
    whiskers: true,
  },
  fox: {
    bodyColor: '#c46a2a', accentColor: '#fff0e0', bellyColor: '#fce8d4', noseColor: '#0a0a0a',
    bodyScale: [0.9, 0.85, 1.2], headScale: 0.36, headOffsetY: 0.82, headOffsetZ: 0.18,
    legLength: 0.38, legRadius: 0.09,
    ears: 'triangle', earSize: 0.18,
    tail: 'bushy', tailSize: 0.55,
    snout: 'long',
    emoji: '🦊',
  },
  capybara: {
    bodyColor: '#7a5a3a', accentColor: '#5a3a20', bellyColor: '#9a7a5a', noseColor: '#1a0808',
    bodyScale: [1.15, 0.85, 1.25], headScale: 0.4, headOffsetY: 0.78, headOffsetZ: 0.22,
    legLength: 0.28, legRadius: 0.12,
    ears: 'tiny', earSize: 0.08,
    tail: 'none', tailSize: 0,
    snout: 'flat',
    emoji: '🐹',
    capybaraTeeth: true,
  },
  bird: {
    bodyColor: '#5878b8', accentColor: '#ffa030', bellyColor: '#a8b8d8', noseColor: '#ffa030',
    bodyScale: [0.75, 0.95, 0.9], headScale: 0.32, headOffsetY: 0.85, headOffsetZ: 0.08,
    legLength: 0.22, legRadius: 0.04,
    ears: 'feathered', earSize: 0.08,
    tail: 'leaf', tailSize: 0.25,
    snout: 'beak',
    emoji: '🐦',
    birdBeak: true,
  },
  bunny: {
    bodyColor: '#e8d8c8', accentColor: '#f8e8d8', bellyColor: '#fcecdc', noseColor: '#e87878',
    bodyScale: [0.85, 1.0, 0.95], headScale: 0.36, headOffsetY: 0.92, headOffsetZ: 0.05,
    legLength: 0.36, legRadius: 0.1,
    ears: 'long', earSize: 0.55,
    tail: 'ball', tailSize: 0.15,
    snout: 'short',
    emoji: '🐰',
    bunnyTeeth: true,
  },
  puppy: {
    bodyColor: '#a87858', accentColor: '#705438', bellyColor: '#c8a888', noseColor: '#0a0a0a',
    bodyScale: [0.9, 0.9, 1.1], headScale: 0.38, headOffsetY: 0.82, headOffsetZ: 0.15,
    legLength: 0.34, legRadius: 0.1,
    ears: 'long', earSize: 0.32,  // floppy ears
    tail: 'short', tailSize: 0.2,
    snout: 'long',
    emoji: '🐶',
  },
  panda: {
    bodyColor: '#f8f8f8', accentColor: '#202020', bellyColor: '#202020', noseColor: '#0a0a0a',
    bodyScale: [1.15, 1.0, 1.1], headScale: 0.46, headOffsetY: 0.95, headOffsetZ: 0.05,
    legLength: 0.32, legRadius: 0.16,
    ears: 'round', earSize: 0.15,
    tail: 'short', tailSize: 0.1,
    snout: 'short',
    emoji: '🐼',
    pandaEyes: true,
  },
  hamster: {
    bodyColor: '#d8a878', accentColor: '#fff0d8', bellyColor: '#fcecd0', noseColor: '#3a1810',
    bodyScale: [0.7, 0.75, 0.75], headScale: 0.32, headOffsetY: 0.65, headOffsetZ: 0.1,
    legLength: 0.18, legRadius: 0.06,
    ears: 'round', earSize: 0.1,
    tail: 'short', tailSize: 0.08,
    snout: 'short',
    emoji: '🐹',
    whiskers: true,
  },
  penguin: {
    bodyColor: '#181820', accentColor: '#f8f8f8', bellyColor: '#f8f8f8', noseColor: '#ffa030',
    bodyScale: [0.85, 1.1, 0.9], headScale: 0.34, headOffsetY: 1.0, headOffsetZ: 0.0,
    legLength: 0.18, legRadius: 0.07,
    ears: 'none', earSize: 0,
    tail: 'short', tailSize: 0.1,
    snout: 'beak',
    emoji: '🐧',
    tuxedo: true,
    birdBeak: true,
  },
  frog: {
    bodyColor: '#3a8848', accentColor: '#2a6828', bellyColor: '#a8c878', noseColor: '#3a1810',
    bodyScale: [1.05, 0.7, 1.05], headScale: 0.42, headOffsetY: 0.6, headOffsetZ: 0.05,
    legLength: 0.32, legRadius: 0.1,
    ears: 'none', earSize: 0,
    tail: 'none', tailSize: 0,
    snout: 'flat',
    emoji: '🐸',
    frogEyes: true,
  },
}

// ── Animation driver ──────────────────────────────────────────────────────

interface Props {
  species: string
  animState?: MutableRefObject<'idle' | 'walking' | 'running' | 'jumping'>
}

export default function ProceduralAnimal({ species, animState }: Props) {
  const cfg = SPECIES_CONFIG[species] ?? SPECIES_CONFIG.bear
  const root = useRef<THREE.Group>(null)
  const legFL = useRef<THREE.Group>(null)
  const legFR = useRef<THREE.Group>(null)
  const legBL = useRef<THREE.Group>(null)
  const legBR = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)

  // Animation driver: per-frame transform of refs based on animState
  useFrame((state) => {
    if (!root.current) return
    const t = state.clock.elapsedTime
    const stateNow = animState?.current ?? 'idle'

    // Walk/run: sin-wave alternating limbs + body bob
    if (stateNow === 'walking' || stateNow === 'running') {
      const freq = stateNow === 'running' ? 8 : 5
      const amp = stateNow === 'running' ? 0.8 : 0.55
      const s = Math.sin(t * freq) * amp
      if (legFL.current) legFL.current.rotation.x = s
      if (legFR.current) legFR.current.rotation.x = -s
      if (legBL.current) legBL.current.rotation.x = -s
      if (legBR.current) legBR.current.rotation.x = s
      // body slight up-down bob
      root.current.position.y = Math.abs(Math.sin(t * freq * 2)) * 0.04
      // tail wag side to side
      if (tail.current) tail.current.rotation.y = Math.sin(t * freq) * 0.4
    } else if (stateNow === 'jumping') {
      // compress legs slightly (knees up to belly)
      const lift = -0.8
      if (legFL.current) legFL.current.rotation.x = lift
      if (legFR.current) legFR.current.rotation.x = lift
      if (legBL.current) legBL.current.rotation.x = -lift * 0.6
      if (legBR.current) legBR.current.rotation.x = -lift * 0.6
      root.current.position.y = 0
    } else {
      // idle: subtle breathing + head bob + tail sway
      const breath = Math.sin(t * 1.5) * 0.025
      root.current.scale.setScalar(1 + breath)
      root.current.position.y = 0
      if (head.current) head.current.rotation.y = Math.sin(t * 0.7) * 0.18
      if (tail.current) tail.current.rotation.y = Math.sin(t * 1.2) * 0.2
      if (legFL.current) legFL.current.rotation.x = 0
      if (legFR.current) legFR.current.rotation.x = 0
      if (legBL.current) legBL.current.rotation.x = 0
      if (legBR.current) legBR.current.rotation.x = 0
    }
  })

  return (
    <group ref={root} position={[0, -0.7, 0]}>
      <Body cfg={cfg} />
      <BellyPatch cfg={cfg} />
      <group ref={head} position={[0, cfg.headOffsetY, cfg.headOffsetZ]}>
        <Head cfg={cfg} />
        <Ears cfg={cfg} />
        <Snout cfg={cfg} />
        <Eyes cfg={cfg} />
      </group>
      <Legs cfg={cfg} legFL={legFL} legFR={legFR} legBL={legBL} legBR={legBR} />
      <Paws cfg={cfg} />
      <group ref={tail}>
        <Tail cfg={cfg} />
      </group>
      {cfg.tuxedo && <TuxedoSplit cfg={cfg} />}
      {cfg.whiskers && <Whiskers headOffsetY={cfg.headOffsetY} headOffsetZ={cfg.headOffsetZ + 0.18 * cfg.headScale * 2} />}
      {cfg.bunnyTeeth && <BunnyTeeth cfg={cfg} />}
      {cfg.capybaraTeeth && <CapybaraTeeth cfg={cfg} />}
    </group>
  )
}

// ── Sub-meshes ────────────────────────────────────────────────────────────

function Body({ cfg }: { cfg: SpeciesConfig }) {
  // High-poly capsule: 32 cap subdiv × 48 radial → ~3.5k tris for silhouette smoothness
  const geo = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.32, 0.55, 32, 48)
    g.scale(cfg.bodyScale[0], cfg.bodyScale[1], cfg.bodyScale[2])
    return g
  }, [cfg.bodyScale])
  return (
    <mesh geometry={geo} position={[0, 0.55, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={cfg.bodyColor} roughness={0.78} />
    </mesh>
  )
}

function BellyPatch({ cfg }: { cfg: SpeciesConfig }) {
  if (cfg.bellyColor === cfg.bodyColor) return null
  // slightly smaller capsule, front-facing, contrasting color
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.26, 24, 24)
    g.scale(0.8, 1.05, 0.4)
    return g
  }, [])
  return (
    <mesh geometry={geo} position={[0, 0.55, cfg.bodyScale[2] * 0.32 * 0.55]} castShadow>
      <meshStandardMaterial color={cfg.bellyColor} roughness={0.85} />
    </mesh>
  )
}

function Head({ cfg }: { cfg: SpeciesConfig }) {
  // High-res head sphere — primary character feature; 64×48 = ~6k tris
  return (
    <mesh castShadow>
      <sphereGeometry args={[cfg.headScale, 64, 48]} />
      <meshStandardMaterial color={cfg.bodyColor} roughness={0.78} />
    </mesh>
  )
}

function Ears({ cfg }: { cfg: SpeciesConfig }) {
  if (cfg.ears === 'none') return null
  const xOffset = cfg.headScale * 0.7
  const yOffset = cfg.headScale * 0.85
  const earColor = cfg.bodyColor
  const innerColor = cfg.accentColor

  switch (cfg.ears) {
    case 'round':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * xOffset, yOffset, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[cfg.earSize, 32, 24]} />
                <meshStandardMaterial color={earColor} roughness={0.78} />
              </mesh>
              <mesh position={[0, 0, 0.025]}>
                <sphereGeometry args={[cfg.earSize * 0.65, 24, 18]} />
                <meshStandardMaterial color={innerColor} roughness={0.85} />
              </mesh>
            </group>
          ))}
        </>
      )
    case 'triangle':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * xOffset * 0.85, yOffset, 0]} rotation={[0, 0, side * -0.2]}>
              <mesh castShadow>
                <coneGeometry args={[cfg.earSize * 0.55, cfg.earSize * 1.4, 12]} />
                <meshStandardMaterial color={earColor} roughness={0.78} />
              </mesh>
              <mesh position={[0, 0, 0.02]}>
                <coneGeometry args={[cfg.earSize * 0.3, cfg.earSize * 0.95, 10]} />
                <meshStandardMaterial color={innerColor} roughness={0.85} />
              </mesh>
            </group>
          ))}
        </>
      )
    case 'long': {
      // Floppy long ears (bunny / puppy)
      const droop = cfg.ears === 'long' && cfg.earSize > 0.4 ? 0 : 0.6  // bunny stand up, puppy floppy
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * xOffset * 0.6, yOffset, 0]} rotation={[droop * 0.5, 0, side * 0.15]}>
              <mesh castShadow>
                <capsuleGeometry args={[cfg.earSize * 0.18, cfg.earSize * 1.5, 8, 16]} />
                <meshStandardMaterial color={earColor} roughness={0.78} />
              </mesh>
              <mesh position={[0, 0, 0.025]}>
                <capsuleGeometry args={[cfg.earSize * 0.12, cfg.earSize * 1.3, 8, 12]} />
                <meshStandardMaterial color={innerColor} roughness={0.85} />
              </mesh>
            </group>
          ))}
        </>
      )
    }
    case 'tiny':
      return (
        <>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * xOffset, yOffset, 0]} castShadow>
              <sphereGeometry args={[cfg.earSize, 14, 10]} />
              <meshStandardMaterial color={cfg.accentColor} roughness={0.85} />
            </mesh>
          ))}
        </>
      )
    case 'feathered':
      return (
        <>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * xOffset * 0.6, yOffset, 0]} rotation={[0, 0, side * 0.4]} castShadow>
              <coneGeometry args={[cfg.earSize, cfg.earSize * 2, 6]} />
              <meshStandardMaterial color={cfg.accentColor} roughness={0.7} />
            </mesh>
          ))}
        </>
      )
    case 'pointed':
    default:
      return null
  }
}

function Snout({ cfg }: { cfg: SpeciesConfig }) {
  const z = cfg.headScale * 0.85
  const noseY = cfg.headScale * 0.1
  if (cfg.snout === 'beak') {
    return (
      <mesh position={[0, noseY, z]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[cfg.headScale * 0.25, cfg.headScale * 0.55, 12]} />
        <meshStandardMaterial color={cfg.birdBeak ? '#ffa030' : cfg.noseColor} roughness={0.5} />
      </mesh>
    )
  }
  // Snout bump (sphere lighter color) + nose tip
  const snoutSize =
    cfg.snout === 'long'  ? cfg.headScale * 0.5 :
    cfg.snout === 'flat'  ? cfg.headScale * 0.7 :
                            cfg.headScale * 0.45
  const snoutColor = cfg.bellyColor !== cfg.bodyColor ? cfg.bellyColor : cfg.bodyColor

  return (
    <>
      {/* Snout protrusion */}
      <mesh position={[0, noseY, z * 0.8]} castShadow>
        <sphereGeometry args={[snoutSize * 0.45, 20, 16]} />
        <meshStandardMaterial color={snoutColor} roughness={0.85} />
      </mesh>
      {/* Nose tip */}
      <mesh position={[0, noseY + 0.02, z]} castShadow>
        <sphereGeometry args={[snoutSize * 0.13, 12, 10]} />
        <meshStandardMaterial color={cfg.noseColor} roughness={0.3} />
      </mesh>
    </>
  )
}

function Eyes({ cfg }: { cfg: SpeciesConfig }) {
  const eyeX = cfg.headScale * 0.35
  const eyeY = cfg.headScale * 0.15
  const eyeZ = cfg.headScale * 0.75
  const eyeR = cfg.headScale * 0.11

  if (cfg.frogEyes) {
    // Bulgy top eyes
    return (
      <>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * eyeX * 0.9, cfg.headScale * 0.85, eyeZ * 0.4]}>
            {/* white sclera */}
            <mesh castShadow>
              <sphereGeometry args={[eyeR * 1.6, 20, 16]} />
              <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
            </mesh>
            {/* pupil */}
            <mesh position={[0, -0.02, eyeR * 1.2]}>
              <sphereGeometry args={[eyeR * 0.55, 14, 12]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.2} />
            </mesh>
          </group>
        ))}
      </>
    )
  }

  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * eyeX, eyeY, eyeZ]}>
          {/* white sclera */}
          {!cfg.pandaEyes && (
            <mesh castShadow>
              <sphereGeometry args={[eyeR, 16, 14]} />
              <meshStandardMaterial color="#f8f8f8" roughness={0.3} />
            </mesh>
          )}
          {/* panda eye patch (black around eye) */}
          {cfg.pandaEyes && (
            <mesh position={[0, 0, -0.02]} scale={[1.6, 1.7, 1]} castShadow>
              <sphereGeometry args={[eyeR, 16, 14]} />
              <meshStandardMaterial color="#181818" roughness={0.85} />
            </mesh>
          )}
          {/* pupil */}
          <mesh position={[0, 0, eyeR * 0.5]}>
            <sphereGeometry args={[eyeR * 0.45, 12, 10]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.2} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Legs({
  cfg, legFL, legFR, legBL, legBR,
}: {
  cfg: SpeciesConfig
  legFL: React.RefObject<THREE.Group | null>
  legFR: React.RefObject<THREE.Group | null>
  legBL: React.RefObject<THREE.Group | null>
  legBR: React.RefObject<THREE.Group | null>
}) {
  const yBase = -cfg.legLength * 0.05  // top of leg sits just under body
  const xOff = cfg.bodyScale[0] * 0.25
  const zOff = cfg.bodyScale[2] * 0.32

  const positions: Array<[number, number, number, React.RefObject<THREE.Group | null>]> = [
    [-xOff, yBase,  zOff, legFL],
    [ xOff, yBase,  zOff, legFR],
    [-xOff, yBase, -zOff, legBL],
    [ xOff, yBase, -zOff, legBR],
  ]

  return (
    <>
      {positions.map(([x, y, z, ref], i) => (
        <group key={i} ref={ref} position={[x, y + cfg.legLength / 2, z]}>
          <mesh position={[0, -cfg.legLength / 2, 0]} castShadow>
            <cylinderGeometry args={[cfg.legRadius * 0.85, cfg.legRadius, cfg.legLength, 20]} />
            <meshStandardMaterial color={cfg.bodyColor} roughness={0.82} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Paws({ cfg }: { cfg: SpeciesConfig }) {
  const xOff = cfg.bodyScale[0] * 0.25
  const zOff = cfg.bodyScale[2] * 0.32
  const yBase = -cfg.legLength
  const positions: Array<[number, number, number]> = [
    [-xOff, yBase,  zOff], [ xOff, yBase,  zOff],
    [-xOff, yBase, -zOff], [ xOff, yBase, -zOff],
  ]
  return (
    <>
      {positions.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y - 0.02, z + 0.02]} castShadow>
          <sphereGeometry args={[cfg.legRadius * 1.15, 14, 10]} />
          <meshStandardMaterial color={cfg.accentColor} roughness={0.85} />
        </mesh>
      ))}
    </>
  )
}

function Tail({ cfg }: { cfg: SpeciesConfig }) {
  const tailZ = -cfg.bodyScale[2] * 0.4
  const tailY = 0.55
  switch (cfg.tail) {
    case 'none': return null
    case 'short':
      return (
        <mesh position={[0, tailY, tailZ]} castShadow>
          <sphereGeometry args={[cfg.tailSize, 16, 12]} />
          <meshStandardMaterial color={cfg.bodyColor} roughness={0.85} />
        </mesh>
      )
    case 'ball':
      return (
        <mesh position={[0, tailY - 0.05, tailZ - 0.05]} castShadow>
          <sphereGeometry args={[cfg.tailSize, 22, 16]} />
          <meshStandardMaterial color="#fff8f0" roughness={0.65} />
        </mesh>
      )
    case 'long':
      return (
        <mesh position={[0, tailY + 0.1, tailZ - 0.2]} rotation={[0.3, 0, 0]} castShadow>
          <capsuleGeometry args={[cfg.tailSize * 0.12, cfg.tailSize, 8, 16]} />
          <meshStandardMaterial color={cfg.bodyColor} roughness={0.85} />
        </mesh>
      )
    case 'bushy': {
      // Fox bushy tail — multiple spheres stacked
      const segs: Array<[number, number, number, number]> = [
        [0, tailY + 0.05, tailZ - 0.0, cfg.tailSize * 0.35],
        [0, tailY + 0.05, tailZ - 0.2, cfg.tailSize * 0.42],
        [0, tailY + 0.0,  tailZ - 0.42, cfg.tailSize * 0.45],
        [0, tailY - 0.05, tailZ - 0.62, cfg.tailSize * 0.38],
      ]
      return (
        <>
          {segs.map((s, i) => (
            <mesh key={i} position={[s[0], s[1], s[2]]} castShadow>
              <sphereGeometry args={[s[3], 18, 14]} />
              <meshStandardMaterial color={i === segs.length - 1 ? '#fff0e0' : cfg.bodyColor} roughness={0.85} />
            </mesh>
          ))}
        </>
      )
    }
    case 'leaf':
      // bird tail: flat splayed plane
      return (
        <mesh position={[0, tailY + 0.1, tailZ - 0.1]} rotation={[0.4, 0, 0]} castShadow>
          <coneGeometry args={[cfg.tailSize, cfg.tailSize * 1.5, 4]} />
          <meshStandardMaterial color={cfg.bodyColor} roughness={0.8} />
        </mesh>
      )
    default: return null
  }
}

function TuxedoSplit({ cfg }: { cfg: SpeciesConfig }) {
  // Penguin-specific: white front belly that wraps around chest
  return (
    <mesh position={[0, 0.6, cfg.bodyScale[2] * 0.18]} castShadow>
      <sphereGeometry args={[0.26, 28, 22]} />
      <meshStandardMaterial color={cfg.bellyColor} roughness={0.75} />
    </mesh>
  )
}

function Whiskers({ headOffsetY, headOffsetZ }: { headOffsetY: number; headOffsetZ: number }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.18, headOffsetY + 0.05, headOffsetZ]}>
          {[-0.06, 0, 0.06].map((dy, i) => (
            <mesh key={i} rotation={[0, side * -0.3, 0]} position={[side * 0.05, dy, 0]}>
              <boxGeometry args={[0.18, 0.005, 0.005]} />
              <meshStandardMaterial color="#f8f8f8" />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function BunnyTeeth({ cfg }: { cfg: SpeciesConfig }) {
  return (
    <mesh position={[0, cfg.headOffsetY - 0.05, cfg.headOffsetZ + cfg.headScale * 0.85]} castShadow>
      <boxGeometry args={[0.08, 0.08, 0.06]} />
      <meshStandardMaterial color="#fff8f0" roughness={0.4} />
    </mesh>
  )
}

function CapybaraTeeth({ cfg }: { cfg: SpeciesConfig }) {
  return (
    <mesh position={[0, cfg.headOffsetY - 0.1, cfg.headOffsetZ + cfg.headScale * 0.75]} castShadow>
      <boxGeometry args={[0.1, 0.06, 0.05]} />
      <meshStandardMaterial color="#fceabc" roughness={0.5} />
    </mesh>
  )
}

// Expose emoji for any external nameplate use
export function speciesEmoji(species: string): string {
  return SPECIES_CONFIG[species]?.emoji ?? '🐾'
}
