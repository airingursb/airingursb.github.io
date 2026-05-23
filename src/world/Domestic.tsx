// Domestic life details — vegetable garden, clothesline, mailbox, ladder,
// door wreath, bird feeder, small dinghy at pond. These props sell
// "someone lives here every day" beyond just "scene of objects."

const WOOD          = '#8E6A45'
const WOOD_DARK     = '#5D452B'
const WOOD_LIGHT    = '#A88560'
const SOIL          = '#5C3D24'
const CARROT_ORANGE = '#E29A4A'
const TOMATO_RED    = '#C13E3E'
const LEAF_GREEN    = '#5A7A4C'
const LEAF_LIGHT    = '#7AA565'
const FABRIC_BLUE   = '#7088AA'
const FABRIC_CREAM  = '#F4EAD5'
const FABRIC_GREEN  = '#5A8268'
const ROPE          = '#A48B6E'
const METAL_RED     = '#8B4848'  // muted red so mailbox isn't a competing hot-spot
const METAL_FLAG    = '#A03030'
const SEED_BROWN    = '#7A5B3C'

function VegetableGarden() {
  // Raised bed with rows of carrots + tomatoes near cabin (west side)
  return (
    <group position={[-3.4, 0, 1.2]}>
      {/* Raised wooden bed frame — 4 plank walls */}
      {[
        [0, 0.1, 0.6, 1.4, 0.2, 0.08],
        [0, 0.1, -0.6, 1.4, 0.2, 0.08],
        [-0.66, 0.1, 0, 0.08, 0.2, 1.28],
        [0.66, 0.1, 0, 0.08, 0.2, 1.28],
      ].map((p, i) => (
        <mesh key={`fb${i}`} position={[p[0], p[1], p[2]]} castShadow receiveShadow>
          <boxGeometry args={[p[3], p[4], p[5]]} />
          <meshStandardMaterial color={WOOD} roughness={0.9} />
        </mesh>
      ))}
      {/* Soil fill */}
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[1.3, 0.06, 1.15]} />
        <meshStandardMaterial color={SOIL} roughness={0.97} />
      </mesh>
      {/* Carrot row — 6 carrots, green tops visible */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -0.55 + i * 0.22
        return (
          <group key={`car${i}`} position={[x, 0.2, -0.3]}>
            {/* Green tops */}
            {[0, 0.05, -0.05].map((dx, j) => (
              <mesh key={j} position={[dx, 0.1, dx * 0.5]} castShadow>
                <coneGeometry args={[0.03, 0.16, 4]} />
                <meshStandardMaterial color={LEAF_GREEN} flatShading />
              </mesh>
            ))}
            {/* Orange top peeking out of soil */}
            <mesh position={[0, 0, 0]}>
              <coneGeometry args={[0.04, 0.06, 6]} />
              <meshStandardMaterial color={CARROT_ORANGE} flatShading />
            </mesh>
          </group>
        )
      })}
      {/* Tomato row — 4 small plants with red fruits */}
      {[-0.4, -0.1, 0.2, 0.5].map((x, i) => (
        <group key={`tom${i}`} position={[x, 0.2, 0.3]}>
          {/* Stake */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.36, 4]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshStandardMaterial color={LEAF_GREEN} flatShading />
          </mesh>
          {/* Red tomato fruits */}
          {[
            [0.06, 0.2, 0.04],
            [-0.06, 0.16, 0],
            [0, 0.22, -0.04],
          ].map(([fx, fy, fz], j) => (
            <mesh key={j} position={[fx, fy, fz]} castShadow>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color={TOMATO_RED} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Small "Garden" wooden sign stake */}
      <group position={[0.62, 0.4, -0.55]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 4]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <mesh position={[0.05, 0.15, 0]} rotation={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.16, 0.1, 0.02]} />
          <meshStandardMaterial color={WOOD_LIGHT} />
        </mesh>
      </group>
      {/* === Micro-story: watering can next to garden === */}
      <group position={[-0.6, 0.1, 0.7]}>
        {/* Body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.18, 10]} />
          <meshStandardMaterial color="#6B8B5A" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Spout */}
        <mesh position={[0.15, 0.04, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow>
          <cylinderGeometry args={[0.018, 0.028, 0.2, 6]} />
          <meshStandardMaterial color="#6B8B5A" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Handle */}
        <mesh position={[-0.05, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.012, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#6B8B5A" roughness={0.7} metalness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

function Clothesline() {
  // Strung between two posts east of cabin — 4 shirts hanging
  return (
    <group position={[3.6, 0, -1.0]}>
      {/* Two posts */}
      {[-1.2, 1.2].map((px, i) => (
        <mesh key={`p${i}`} position={[px, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.6, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
      ))}
      {/* Crossbeams on top */}
      {[-1.2, 1.2].map((px, i) => (
        <mesh key={`cb${i}`} position={[px, 1.5, 0]} castShadow>
          <boxGeometry args={[0.4, 0.06, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      {/* The line */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 2.4, 4]} />
        <meshStandardMaterial color={ROPE} />
      </mesh>
      {/* Micro-story: woven laundry basket beneath the line */}
      <group position={[0, 0.13, 0.5]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.22, 14]} />
          <meshStandardMaterial color="#B89A6E" roughness={0.92} />
        </mesh>
        {/* Folded white shirt on top */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <boxGeometry args={[0.28, 0.04, 0.2]} />
          <meshStandardMaterial color={FABRIC_CREAM} roughness={0.9} />
        </mesh>
      </group>
      {/* Fallen sock — micro detail */}
      <group position={[0.2, 0.05, 0.65]} rotation={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.06, 0.04, 0.16]} />
          <meshStandardMaterial color={FABRIC_BLUE} roughness={0.92} />
        </mesh>
      </group>
      {/* 4 hanging items — pinch wide top, drape bottom */}
      {[
        [-0.85, FABRIC_BLUE, 0.28, 0.36],
        [-0.25, FABRIC_CREAM, 0.32, 0.4],
        [ 0.3,  FABRIC_GREEN, 0.3, 0.34],
        [ 0.85, FABRIC_BLUE, 0.26, 0.38],
      ].map(([cx, color, w, h], i) => (
        <group key={`cl${i}`} position={[cx as number, 1.42, 0]}>
          {/* Clothespin */}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.04]} />
            <meshStandardMaterial color={WOOD_LIGHT} />
          </mesh>
          {/* Garment */}
          <mesh position={[0, -(h as number) / 2, 0]} castShadow>
            <boxGeometry args={[w as number, h as number, 0.04]} />
            <meshStandardMaterial color={color as string} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Mailbox() {
  // At path entrance west of cabin
  return (
    <group position={[-2.0, 0, 0.6]}>
      {/* Post */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.1, 6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>
      {/* Mailbox body */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.32, 0.22, 0.45]} />
        <meshStandardMaterial color={METAL_RED} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Rounded top — half cylinder */}
      <mesh position={[0, 1.26, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.45, 12, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={METAL_RED} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Flag (raised — there's mail!) */}
      <group position={[0.18, 1.15, 0]} rotation={[0, 0, Math.PI * 0.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.18, 0.02]} />
          <meshStandardMaterial color={METAL_FLAG} />
        </mesh>
      </group>
      {/* Micro-story: envelope peeking out of the box */}
      <mesh position={[0.16, 1.13, 0.15]} rotation={[0, Math.PI / 6, Math.PI / 14]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.01]} />
        <meshStandardMaterial color={FABRIC_CREAM} roughness={0.88} />
      </mesh>
    </group>
  )
}

function Ladder() {
  // Leaning against the cabin east wall
  return (
    <group position={[2.0, 0, -0.5]} rotation={[0, Math.PI / 2, -Math.PI * 0.08]}>
      {/* 2 rails */}
      {[-0.18, 0.18].map((rx, i) => (
        <mesh key={`lr${i}`} position={[rx, 1.0, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 2.2, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}
      {/* 6 rungs */}
      {[0.2, 0.55, 0.9, 1.25, 1.6, 1.95].map((y, i) => (
        <mesh key={`lg${i}`} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
          <meshStandardMaterial color={WOOD} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function DoorWreath() {
  // Round wreath on cabin door
  return (
    <group position={[0, 1.4, 1.55]}>
      {/* Wreath ring */}
      <mesh castShadow>
        <torusGeometry args={[0.18, 0.04, 8, 18]} />
        <meshStandardMaterial color={LEAF_GREEN} roughness={0.94} flatShading />
      </mesh>
      {/* Berries / accents */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh
            key={`b${i}`}
            position={[Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.02]}
          >
            <sphereGeometry args={[0.025, 6, 5]} />
            <meshStandardMaterial color={TOMATO_RED} roughness={0.7} />
          </mesh>
        )
      })}
      {/* Top bow */}
      <mesh position={[0, 0.22, 0.02]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.02]} />
        <meshStandardMaterial color={METAL_RED} />
      </mesh>
    </group>
  )
}

function BirdFeeder() {
  // Tall pole near hammock spot
  return (
    <group position={[-2.6, 0, -10.0]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 2.0, 6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
      </mesh>
      {/* Cross-arm */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[0.5, 0.04, 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      {/* Feeder house */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[0.32, 0.22, 0.22]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.88} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.78, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.24, 0.16, 4]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>
      {/* Seeds spilling on perch */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh
          key={`s${i}`}
          position={[-0.1 + i * 0.06, 1.51, 0.13]}
        >
          <sphereGeometry args={[0.012, 5, 4]} />
          <meshStandardMaterial color={SEED_BROWN} />
        </mesh>
      ))}
      {/* Hanging chain */}
      <mesh position={[0.22, 1.78, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.4, 4]} />
        <meshStandardMaterial color="#3a2818" />
      </mesh>
      {/* Hanging bell on other arm */}
      <mesh position={[-0.22, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#B87341" roughness={0.6} metalness={0.6} />
      </mesh>
    </group>
  )
}

function PondDock() {
  // Small wooden dock at the pond edge with a tiny dinghy
  return (
    <group position={[7.5, 0, 4.4]}>
      {/* Dock planks */}
      {[-0.25, 0, 0.25].map((pz, i) => (
        <mesh
          key={`dp${i}`}
          position={[0, 0.2, pz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.2, 0.06, 0.22]} />
          <meshStandardMaterial color={WOOD} roughness={0.88} />
        </mesh>
      ))}
      {/* Support posts going into water */}
      {[-0.5, 0.5].map((px, i) => (
        <mesh key={`ds${i}`} position={[px, -0.1, -0.3]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
      ))}
      {/* Small dinghy boat tied to dock */}
      <group position={[0.4, 0.18, 0.55]} rotation={[0, -0.25, 0.05]}>
        {/* Hull bottom (half capsule lying down) */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.18, 0.7, 6, 12]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.88} />
        </mesh>
        {/* Inside floor */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.32, 0.02, 0.85]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
        {/* Single bench */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.34, 0.04, 0.1]} />
          <meshStandardMaterial color={WOOD} roughness={0.88} />
        </mesh>
        {/* Single oar resting */}
        <mesh position={[0.05, 0.1, -0.1]} rotation={[Math.PI / 2, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.7, 6]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        {/* Oar paddle */}
        <mesh position={[0.18, 0.1, -0.42]} rotation={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.08, 0.02, 0.14]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      </group>
      {/* Rope tying boat to dock */}
      <mesh position={[0.4, 0.18, 0.3]} rotation={[Math.PI / 2, 0.3, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
        <meshStandardMaterial color={ROPE} />
      </mesh>
      {/* Micro-story: fishing rod leaning on dock railing */}
      <group position={[-0.5, 0.4, -0.3]} rotation={[0, 0, Math.PI / 4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.012, 0.006, 1.4, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.92} />
        </mesh>
        {/* Small reel */}
        <mesh position={[0, -0.5, 0.04]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
          <meshStandardMaterial color="#2A2018" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
      {/* Bait bucket */}
      <group position={[-0.2, 0.2, -0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.14, 10]} />
          <meshStandardMaterial color="#8B6FB0" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.06, 0.008, 4, 12]} />
          <meshStandardMaterial color="#2A2018" />
        </mesh>
      </group>
    </group>
  )
}

export default function Domestic() {
  return (
    <group>
      <VegetableGarden />
      <Clothesline />
      <Mailbox />
      <Ladder />
      <DoorWreath />
      <BirdFeeder />
      <PondDock />
    </group>
  )
}
