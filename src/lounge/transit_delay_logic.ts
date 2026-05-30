// Pure delay-range logic for transit NPCs — extracted so it's importable in
// Node tests without dragging the Phaser-coupled renderer along.
// `transit_npcs.ts` re-exports transitDelayRange from here.

const MIN_COOLDOWN_MS = 90_000
const MAX_COOLDOWN_MS = 180_000

/**
 * Compute the [min, max] delay range for transit NPC spawns based on online count.
 * online 0  → [90_000, 180_000] ms (unchanged baseline)
 * online 12 → [20_000,  40_000] ms (busiest)
 * Exported so it can be unit-tested without instantiating TransitNpcController.
 */
export function transitDelayRange(online: number): [number, number] {
  const clamped = Math.max(0, Math.min(12, online))
  const busy = clamped / 12   // 0..1
  const minD = MIN_COOLDOWN_MS - busy * (MIN_COOLDOWN_MS - 20_000)   // 90s → 20s
  const maxD = MAX_COOLDOWN_MS - busy * (MAX_COOLDOWN_MS - 40_000)   // 180s → 40s
  return [minD, maxD]
}
