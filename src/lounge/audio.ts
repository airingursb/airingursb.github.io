import Phaser from 'phaser'
import { AUDIO_SFX_KEYS, MUTE_STORAGE_KEY, type SfxKey } from './config'
import { getVolume, onVolumeChange } from './volume'

let sceneRef: Phaser.Scene | null = null
let muted = false
let currentBgm: Phaser.Sound.BaseSound | null = null
let currentAmbient: Phaser.Sound.BaseSound | null = null
let volumeSubscribed = false

function isMutedStored(): boolean {
  try { return localStorage.getItem(MUTE_STORAGE_KEY) === '1' }
  catch { return false }
}
function storeMuted(value: boolean) {
  try { localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0') } catch {}
}

export function preloadAudio(scene: Phaser.Scene) {
  for (const key of AUDIO_SFX_KEYS) {
    scene.load.audio(`sfx_${key}`, [
      `/lounge/assets/audio/sfx/${key}.ogg`,
      `/lounge/assets/audio/sfx/${key}.mp3`
    ])
  }
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    if (file.key.startsWith('bgm_') || file.key.startsWith('amb_')) return
    console.warn('lounge audio: failed to load', file.key)
  })
}

/** Preload BGM + ambient for a room. 404-tolerant — files may not exist yet. */
export function preloadRoomAudio(
  scene: Phaser.Scene,
  bgmKey: string | null,
  bgmPath: string | null,
  ambKey: string | null,
  ambPath: string | null
) {
  if (bgmKey && bgmPath && !scene.cache.audio.exists(bgmKey)) {
    try { scene.load.audio(bgmKey, [bgmPath, bgmPath.replace(/\.ogg$/, '.mp3')]) } catch {}
  }
  if (ambKey && ambPath && !scene.cache.audio.exists(ambKey)) {
    try { scene.load.audio(ambKey, [ambPath, ambPath.replace(/\.ogg$/, '.mp3')]) } catch {}
  }
}

export function bindAudio(scene: Phaser.Scene) {
  sceneRef = scene
  muted = isMutedStored()
  scene.sound.volume = getVolume('master')
  scene.sound.mute = muted

  if (!volumeSubscribed) {
    onVolumeChange((ch) => {
      if (!sceneRef) return
      if (ch === 'master') sceneRef.sound.volume = getVolume('master')
      if (ch === 'bgm' && currentBgm) {
        try { (currentBgm as any).setVolume?.(getVolume('bgm')) } catch {}
      }
      if (ch === 'ambient' && currentAmbient) {
        try { (currentAmbient as any).setVolume?.(getVolume('ambient')) } catch {}
      }
    })
    volumeSubscribed = true
  }
}

export function playSfx(key: SfxKey) {
  if (!sceneRef) return
  try {
    sceneRef.sound.play(`sfx_${key}`, { volume: getVolume('sfx') })
  } catch {}
}

/** Play a room's BGM. No-op if cache key doesn't exist (404-tolerant). */
export function playRoomBgm(scene: Phaser.Scene, bgmKey: string | null) {
  if (currentBgm) {
    try { currentBgm.stop() } catch {}
    try { (currentBgm as any).destroy?.() } catch {}
    currentBgm = null
  }
  if (!bgmKey || !scene.cache.audio.exists(bgmKey)) return
  try {
    currentBgm = scene.sound.add(bgmKey, { loop: true, volume: getVolume('bgm') })
    currentBgm.play()
  } catch {}
}

/** Play a room's ambient loop. No-op if cache key doesn't exist. */
export function playRoomAmbient(scene: Phaser.Scene, ambKey: string | null) {
  if (currentAmbient) {
    try { currentAmbient.stop() } catch {}
    try { (currentAmbient as any).destroy?.() } catch {}
    currentAmbient = null
  }
  if (!ambKey || !scene.cache.audio.exists(ambKey)) return
  try {
    currentAmbient = scene.sound.add(ambKey, { loop: true, volume: getVolume('ambient') })
    currentAmbient.play()
  } catch {}
}

export function stopRoomAudio() {
  if (currentBgm) { try { currentBgm.stop() } catch {} ; currentBgm = null }
  if (currentAmbient) { try { currentAmbient.stop() } catch {} ; currentAmbient = null }
}

export function isMuted(): boolean { return muted }

export function setMuted(value: boolean) {
  muted = value
  storeMuted(value)
  if (sceneRef) sceneRef.sound.mute = value
}

export function toggleMute(): boolean {
  setMuted(!muted)
  return muted
}
