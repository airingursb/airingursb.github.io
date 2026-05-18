// V13.6 — Seasonal geometry rules. Decides whether a particular portal is
// passable right now. Called from RoomScene when materializing portals.
//
// First rule: winter (Dec/Jan/Feb) blocks the balcony→beach door because
// the seaside is snowed over. Players take the long way: balcony → grove
// → … (no direct grove→beach portal exists; that's the point — winter
// makes beach harder to reach).
//
// Easy to extend per-season later.

import { getCurrentSeason } from './seasons'

export type PortalDescriptor = { name: string; targetRoom: string }

/** Returns null if the portal is currently passable. Otherwise returns a
 *  reason string (a short toast suitable for "you can't go here"). */
export function portalBlockedReason(srcRoom: string, p: PortalDescriptor): string | null {
  const season = getCurrentSeason()
  const sid = season?.id ?? ''
  if (sid === 'winter') {
    // V13.6: shore is snowed over in winter. Apply globally for transit
    // (srcRoom === 'transit') and specifically for balcony→beach for
    // portal walks. From other rooms the player would have to detour
    // anyway; only block transit + balcony.
    if (p.targetRoom === 'room_beach' &&
        (srcRoom === 'room_balcony' || srcRoom === 'transit')) {
      return '❄️ The shore path is snowed over — wait for spring'
    }
  }
  return null
}

/** True if the portal should be REMOVED from the map (player can't even
 *  walk into the tile). For now we use "show a toast" via the soft path
 *  (portalBlockedReason); this hook is reserved for future hard blocks. */
export function portalHidden(srcRoom: string, p: PortalDescriptor): boolean {
  return portalBlockedReason(srcRoom, p) != null
}

// V13.7 — seasonal interactables: a virtual interactable injected into a
// room based on the current season. Returns null when the room has no
// seasonal feature this month.
export type SeasonalInteractable = {
  name: string
  x: number
  y: number
  w: number
  h: number
  kind: string
  emoji: string
  blurb: string
}

export function getSeasonalInteractableFor(roomId: string): SeasonalInteractable | null {
  const sid = getCurrentSeason()?.id ?? ''
  // Summer: rooftop pool — small splash zone at center, sit-style interactable.
  if (sid === 'summer' && roomId === 'room_rooftop') {
    return {
      name: 'rooftop_pool', x: 224, y: 144, w: 32, h: 32,
      kind: 'seasonal_pool', emoji: '🏊',
      blurb: 'Summer pool — +5 max energy for 24h'
    }
  }
  // Autumn (named 'fall' in the manifest): grove pumpkin patch.
  // V13.8-review C4 fix — original (320, 200) was inside pond_water;
  // (64, 240) was inside tree_f. (160, 224) is clear of all colliders
  // in grove.tmj (verified: not in any wall/tree/pond/bench rect).
  if (sid === 'fall' && roomId === 'room_grove') {
    return {
      name: 'grove_pumpkin', x: 160, y: 224, w: 32, h: 32,
      kind: 'seasonal_pumpkin', emoji: '🎃',
      blurb: 'Pumpkin patch — harvest for +1 pumpkin material'
    }
  }
  return null
}
