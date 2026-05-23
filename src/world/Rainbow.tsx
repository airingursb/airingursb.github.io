// Small rainbow arching over the waterfall — Tiny Glade-style fairy
// detail. Drawn as 7 thin colored torus arcs in concentric rings.

const COLORS = [
  '#E25A4C',  // red
  '#E89A4A',  // orange
  '#FCD757',  // yellow
  '#7BA374',  // green
  '#6699D8',  // blue
  '#7B6FB0',  // indigo
  '#A87FB8',  // violet
]

export default function Rainbow() {
  // Position: above the waterfall at [15, ?, 5] roughly
  return (
    <group position={[15, 1, 5]} rotation={[0, 0, 0]}>
      {COLORS.map((color, i) => {
        const r = 4.5 + i * 0.12
        return (
          <mesh
            key={i}
            position={[0, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[r, 0.07, 6, 24, Math.PI]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.4}
              transparent
              opacity={0.4}
            />
          </mesh>
        )
      })}
    </group>
  )
}
