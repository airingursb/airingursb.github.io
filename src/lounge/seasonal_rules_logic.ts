// Pure seasonal portal-block logic. Phaser-free, no manifest fetches —
// exists so Node tests can exercise the matrix without loading
// `./seasons` (which needs a runtime fetch'd JSON manifest).
//
// `seasonal_rules.ts` calls this with the live season id.

export type PortalDescriptor = { name: string; targetRoom: string }

export function portalBlockedReasonBySeason(
  srcRoom: string,
  p: PortalDescriptor,
  seasonId: string,
): string | null {
  if (seasonId === 'winter') {
    // Shore is snowed over in winter. Block transit/balcony → beach paths.
    if (p.targetRoom === 'room_beach' &&
        (srcRoom === 'room_balcony' || srcRoom === 'transit')) {
      return '❄️ The shore path is snowed over — wait for spring'
    }
  }
  return null
}
