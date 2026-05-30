// Ambient animal "residents" in the lobby — represent people who are online
// on the blog but not inside the nook. Real Bear avatars that stand idle on the
// lobby floor, translucent, with no name label, and a country flag floating
// overhead (the game's own mood-emoji slot) showing where the visitor is from.
//
// Replaces the old "ghost silhouettes" system (ambient_ghosts.ts).
// Residents are STATIC (they don't wander) — ambient presence, zero jank.

import type Phaser from 'phaser'
import { Bear, type Direction } from './bear'
import { ccToRegion, SPECIES, type Species, type RoomId } from './config'
import { startOnlinePolling, getOnlineSite, getOnlineCountries, onOnlineChange } from './online_presence'
export { residentTargetCount } from './ambient_residents_logic'
import { residentTargetCount } from './ambient_residents_logic'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RESIDENTS = 5

// Lobby is 480×320 px. Safe floor stand-points in the open floor (avoid the top
// ~100 px entrance/NPCs and the edges). Verified to sit on the floor.
const LOBBY_POINTS: Array<[number, number]> = [
  [100, 196], [160, 220], [220, 196], [280, 220],
  [340, 196], [380, 220], [300, 248], [160, 248],
  [240, 268], [200, 180], [320, 268], [260, 240],
]

const POLL_INTERVAL_MS = 45_000   // re-reconcile with online count every 45 s
const RESIDENT_ALPHA = 0.5        // translucent — clearly "presence", not a real player
const FACINGS: Direction[] = ['down', 'left', 'right']

// ─── Module-level state ───────────────────────────────────────────────────────

type Resident = { bear: Bear }

let residents: Resident[] = []
let pollTimer: ReturnType<typeof setInterval> | null = null
let unsubOnline: (() => void) | null = null
let sceneRef: Phaser.Scene | null = null
let getPeerCountFn: (() => number) | null = null

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

export function setupAmbientResidents(
  scene: Phaser.Scene,
  roomId: RoomId,
  getPeerCount: () => number,
) {
  teardownAmbientResidents()
  if (roomId !== 'room_lobby') return

  sceneRef = scene
  getPeerCountFn = getPeerCount

  startOnlinePolling()

  // Reconcile the moment the online count first lands (~<1s) so residents don't
  // wait the full 45s poll cadence on a cold load.
  unsubOnline = onOnlineChange(() => { if (sceneRef) reconcileResidents(sceneRef) })

  // Immediate reconcile (uses cached count if the poll is already warm)
  reconcileResidents(scene)

  // Backstop re-reconcile (also catches peer-count changes, which don't notify)
  pollTimer = setInterval(() => {
    if (sceneRef) reconcileResidents(sceneRef)
  }, POLL_INTERVAL_MS)
}

export function teardownAmbientResidents() {
  if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null }
  if (unsubOnline) { unsubOnline(); unsubOnline = null }
  for (const r of residents) { try { r.bear.destroy() } catch {} }
  residents = []
  sceneRef = null
  getPeerCountFn = null
  // Do NOT stopOnlinePolling() here — transit_npcs shares it; RoomScene owns it.
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function reconcileResidents(scene: Phaser.Scene) {
  const onlineSite = getOnlineSite()
  const realPeers = getPeerCountFn ? getPeerCountFn() : 0
  const target = residentTargetCount(onlineSite, realPeers, MAX_RESIDENTS)
  const current = residents.length

  if (target > current) {
    for (let i = current; i < target; i++) residents.push(spawnResident(scene))
  } else if (target < current) {
    const excess = residents.splice(target)
    for (const r of excess) {
      scene.tweens.add({
        targets: r.bear.sprite, alpha: 0, duration: 1000, ease: 'Sine.easeOut',
        onComplete: () => { try { r.bear.destroy() } catch {} },
      })
    }
  }
}

function spawnResident(scene: Phaser.Scene): Resident {
  const [sx, sy] = LOBBY_POINTS[Math.floor(Math.random() * LOBBY_POINTS.length)]
  const bear = new Bear(scene, sx, sy, ccToRegion(null), pickSpecies(scene))
  bear.facing = FACINGS[Math.floor(Math.random() * FACINGS.length)]
  bear.update(0, true)            // lock an idle pose for the facing — then never ticked (static)
  bear.sprite.setDepth(3)
  bear.sprite.setAlpha(0)
  // No name label — that's the cue distinguishing residents from real peers.
  scene.tweens.add({ targets: bear.sprite, alpha: RESIDENT_ALPHA, duration: 1200, ease: 'Sine.easeIn' })

  // Country flag in the name-label slot (closest-to-head label position) — sits
  // exactly where every character's name sits, so it's consistent and tight to
  // the body. Residents have no name, so the flag IS their only overhead label.
  const cc = pickCountry()
  if (cc) bear.setDisplayName(countryToFlag(cc))

  return { bear }
}

/** Pick a country weighted by the live online distribution, e.g. {CN:7, SG:1}. '' if unknown. */
function pickCountry(): string {
  const countries = getOnlineCountries()
  const flat: string[] = []
  for (const [cc, n] of Object.entries(countries)) {
    for (let i = 0; i < n; i++) flat.push(cc)
  }
  if (flat.length === 0) return ''
  return flat[Math.floor(Math.random() * flat.length)]
}

/** ISO country code → flag emoji (regional indicators). 'CN' → 🇨🇳. */
function countryToFlag(cc: string): string {
  const c = cc.toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(A + c.charCodeAt(0) - 65, A + c.charCodeAt(1) - 65)
}

/** Pick a random species that has a loaded texture (mirrors transit_npcs.ts). */
function pickSpecies(scene: Phaser.Scene): Species {
  const region = ccToRegion(null)
  const cached = SPECIES.filter(sp => sp === 'bear' || scene.textures.exists(`${sp}_${region}`))
  const pool = cached.length > 0 ? cached : [...SPECIES]
  return pool[Math.floor(Math.random() * pool.length)]
}
