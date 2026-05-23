// SHU-733 · Scene composition (1 hero sakura + 3 lanterns + stones + ground)
// Asymmetric layout — three-five-seven principle (Heap Plaza north star)

import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import Ground from './Ground'
import { Sakura } from './Sakura'
import StoneLantern from './StoneLantern'
import SittingStone from './SittingStone'
import Mochi from './Mochi'
import Player from './Player'
import PeerAvatar from './PeerAvatar'
import GlowRing from './GlowRing'
import { useGroveStore } from './store'

export default function Scene() {
  const stage = useGroveStore((s) => s.stage)
  const showStoneGlow = stage === 'intro' || stage === 'approach'

  return (
    <Physics gravity={[0, -9.81, 0]}>
      {/* Ground with collider (static, infinite plane) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[50, 0.1, 50]} position={[0, -0.1, 0]} />
        <Ground />
      </RigidBody>

      {/* 1 hero sakura (Heap Plaza port, alpha-cut petals InstancedMesh) */}
      <RigidBody type="fixed" colliders={false}>
        {/* Trunk collider — keep player from walking through */}
        <CuboidCollider args={[0.25, 1.5, 0.25]} position={[2.5, 1.5, -2]} />
        <Sakura position={[2.5, 0, -2]} seed={42} size={1.5} hero />
      </RigidBody>

      {/* Stone lanterns — collidable so player can't walk through */}
      <RigidBody type="fixed" colliders="cuboid">
        <StoneLantern position={[-3, 0, -1]} />
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <StoneLantern position={[5, 0, 2.5]} />
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <StoneLantern position={[-5.5, 0, 4]} />
      </RigidBody>

      {/* Sitting stone + glow ring */}
      <RigidBody type="fixed" colliders="cuboid">
        <SittingStone position={[1.2, 0, 1.5]} />
      </RigidBody>
      {showStoneGlow && <GlowRing position={[1.2, 0.5, 1.5]} radius={1.0} />}

      {/* Characters */}
      <PlayerWithMarker />
      <Mochi />

      {/* Multiplayer peers (SHU-733/735) */}
      <Peers />
    </Physics>
  )
}

// Mark player Group so Mochi can find it via scene.traverse
function PlayerWithMarker() {
  return (
    <group userData={{ isPlayer: true }}>
      <Player spawn={[-2, 1.2, 5]} />
    </group>
  )
}

function Peers() {
  const peers = useGroveStore((s) => s.peers)
  return (
    <>
      {Object.values(peers).map((p) => (
        <PeerAvatar key={p.id} {...p} />
      ))}
    </>
  )
}
