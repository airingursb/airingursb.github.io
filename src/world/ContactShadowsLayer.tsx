// Soft contact shadows under the major zones — eliminates floating-furniture
// syndrome (Sub-A gap #5). Uses drei <ContactShadows> as a flat darkening
// disc baked from above per zone.

import { ContactShadows } from '@react-three/drei'
import { ZONES } from './zones'

export default function ContactShadowsLayer() {
  return (
    <group>
      {ZONES.map((z) => (
        <ContactShadows
          key={z.kind}
          position={[z.pos[0], 0.62, z.pos[1]]}
          opacity={0.45}
          blur={2.2}
          far={3}
          resolution={1024}
          scale={5}
        />
      ))}
      {/* Pond contact shadow + cabin extras for the bigger structures */}
      <ContactShadows
        position={[8, 0.62, 6]}
        opacity={0.3}
        blur={3}
        far={4}
        resolution={1024}
        scale={6}
      />
    </group>
  )
}
