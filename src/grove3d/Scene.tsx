// SHU-733 · Scene composition (1 hero sakura + 3 lanterns + stones + ground)
// Asymmetric layout — three-five-seven principle (Heap Plaza north star)

import Ground from './Ground'
import PlaceholderSakura from './PlaceholderSakura'
import StoneLantern from './StoneLantern'
import SittingStone from './SittingStone'
import MochiPlaceholder from './MochiPlaceholder'

export default function Scene() {
  return (
    <>
      <Ground />

      {/* 1 hero (off-center per asymmetry principle) */}
      <PlaceholderSakura position={[2.5, 0, -2]} />

      {/* 3 lanterns + 1 stone, unevenly spaced */}
      <StoneLantern position={[-3, 0, -1]} />
      <StoneLantern position={[5, 0, 2.5]} />
      <StoneLantern position={[-5.5, 0, 4]} />

      <SittingStone position={[1.2, 0, 1.5]} />

      {/* NPC placeholder */}
      <MochiPlaceholder position={[3, 0, -1]} />
    </>
  )
}
