// Pure logic for ambient residents — extracted so it's importable in Node tests
// without dragging the Phaser-coupled renderer along.
// `ambient_residents.ts` re-exports residentTargetCount from here.

/** Clamp resident count: max(0, min(max, onlineSite - realPeers)).  NaN/negative → 0. */
export function residentTargetCount(
  onlineSite: number,
  realPeers: number,
  max: number,
): number {
  if (!Number.isFinite(onlineSite) || onlineSite < 0) return 0
  if (!Number.isFinite(realPeers) || realPeers < 0) realPeers = 0
  return Math.max(0, Math.min(max, onlineSite - realPeers))
}
