// Void treatment — cloud sea below the floating island so the camera
// doesn't look into bare sky-fog when it pans down. Per Sub-A gap #1.

import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

export default function Void() {
  return (
    <group>
      {/* Vast distant ocean plane far below — pale blue, lightly reflective */}
      <mesh position={[0, -22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600, 1, 1]} />
        <meshStandardMaterial
          color="#8FB4D9"
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Layered cloud sea — close + far layers, varied bounds, broader Y range */}
      <Clouds material={THREE.MeshBasicMaterial} limit={800}>
        {/* Near layer y=-18 to -22 */}
        <Cloud seed={101} segments={32} position={[-10, -18,   8]} bounds={[10, 3, 8]} volume={6} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={102} segments={32} position={[ 14, -20, -10]} bounds={[12, 3, 7]} volume={7} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={103} segments={32} position={[ 22, -19,   4]} bounds={[8, 3, 6]} volume={5} color="#ffffff" opacity={0.65} fade={22} />
        <Cloud seed={104} segments={32} position={[-18, -21, -10]} bounds={[10, 3, 7]} volume={6} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={105} segments={32} position={[  4, -22,  16]} bounds={[7, 3, 6]} volume={4} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={106} segments={32} position={[-22, -22,   4]} bounds={[8, 3, 6]} volume={5} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={107} segments={32} position={[ 26, -21,  -4]} bounds={[9, 3, 6]} volume={6} color="#ffffff" opacity={0.7} fade={22} />
        <Cloud seed={108} segments={28} position={[  0, -19,   0]} bounds={[14, 3, 14]} volume={8} color="#ffffff" opacity={0.55} fade={24} />
        {/* Far layer y=-30 to -38 — darker shadow tint */}
        <Cloud seed={201} segments={28} position={[-16, -32,  20]} bounds={[12, 3, 10]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={202} segments={28} position={[ 22, -36, -14]} bounds={[10, 3, 8]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={203} segments={28} position={[-26, -34, -18]} bounds={[12, 3, 10]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={204} segments={28} position={[ 30, -38,  16]} bounds={[10, 3, 8]} volume={6} color="#B8C8DC" opacity={0.7} fade={28} />
        <Cloud seed={205} segments={28} position={[  6, -36,  30]} bounds={[14, 3, 12]} volume={8} color="#B8C8DC" opacity={0.65} fade={28} />
      </Clouds>

      {/* Misty far horizon — soft haze ring on the horizon line */}
      <mesh position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[55, 95, 64]} />
        <meshBasicMaterial color="#D7E9F5" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
