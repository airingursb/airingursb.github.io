// SHU-733 · Soft grass-toned disc. Real foliage texture comes later.
import { CircleGeometry } from 'three'
import { useMemo } from 'react'

export default function Ground() {
  // CircleGeometry: better than a giant plane for fog-cut on horizon
  const geo = useMemo(() => new CircleGeometry(20, 64), [])
  return (
    <mesh
      geometry={geo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#1b2a1d" roughness={0.95} />
    </mesh>
  )
}
