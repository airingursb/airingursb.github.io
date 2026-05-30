// Pure logic for ambient ghosts — extracted so it's importable in Node tests
// without dragging the Phaser-coupled renderer along.
// `ambient_ghosts.ts` re-exports ghostTargetCount from here.

/** Clamp ghost count: max(0, min(max, onlineSite - realPeers)).  NaN/negative → 0. */
export function ghostTargetCount(
  onlineSite: number,
  realPeers: number,
  max: number,
): number {
  if (!Number.isFinite(onlineSite) || onlineSite < 0) return 0
  if (!Number.isFinite(realPeers) || realPeers < 0) realPeers = 0
  return Math.max(0, Math.min(max, onlineSite - realPeers))
}
