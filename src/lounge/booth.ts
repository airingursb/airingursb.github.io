import Phaser from 'phaser'
import { effectiveAmbientVolume, onVolumeChange } from './volume'

export type BoothTrack = { id: string; name: string; file: string }

let currentSound: Phaser.Sound.BaseSound | null = null
let currentTrackName: string | null = null
let volSubscribed = false

// Track list is the source of truth here (also declared in manifest.json for
// validator); avoids a runtime fetch race with the scene boot.
const TRACKS: BoothTrack[] = [
  { id: 'dawn_drift',     name: 'Dawn Drift',     file: 'audio/booth/dawn_drift.ogg' },
  { id: 'midnight_drift', name: 'Midnight Drift', file: 'audio/booth/midnight_drift.ogg' },
  { id: 'static_haze',    name: 'Static Haze',    file: 'audio/booth/static_haze.ogg' },
  { id: 'warm_bath',      name: 'Warm Bath',      file: 'audio/booth/warm_bath.ogg' }
]

export function getBoothTracks(): BoothTrack[] {
  return TRACKS
}

export async function loadBoothManifest(): Promise<BoothTrack[]> {
  return TRACKS
}

export function preloadBoothTracks(scene: Phaser.Scene, tracks: BoothTrack[]) {
  for (const t of tracks) {
    const key = `booth_${t.id}`
    if (scene.cache.audio.exists(key)) continue
    const ogg = '/lounge/assets/' + t.file
    const mp3 = ogg.replace(/\.ogg$/, '.mp3')
    try { scene.load.audio(key, [ogg, mp3]) } catch {}
  }
}

export function playBoothTrack(scene: Phaser.Scene, track: BoothTrack) {
  stopBoothTrack()
  const key = `booth_${track.id}`
  if (!scene.cache.audio.exists(key)) return
  try {
    currentSound = scene.sound.add(key, { loop: true, volume: effectiveAmbientVolume() })
    currentTrackName = track.name
    currentSound.play()
  } catch {}
  if (!volSubscribed) {
    onVolumeChange((ch) => {
      if ((ch === 'master' || ch === 'ambient') && currentSound) {
        try { (currentSound as any).setVolume?.(effectiveAmbientVolume()) } catch {}
      }
    })
    volSubscribed = true
  }
}

export function stopBoothTrack() {
  if (currentSound) {
    try { currentSound.stop() } catch {}
    try { (currentSound as any).destroy?.() } catch {}
    currentSound = null
  }
  currentTrackName = null
}

export function getCurrentTrackName(): string | null {
  return currentTrackName
}
