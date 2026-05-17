import Phaser from 'phaser'
import { AUDIO_SFX_KEYS, AUDIO_DEFAULTS, MUTE_STORAGE_KEY, type SfxKey } from './config'

let sceneRef: Phaser.Scene | null = null
let muted = false
let bgmSound: Phaser.Sound.BaseSound | null = null

function isMutedStored(): boolean {
  try { return localStorage.getItem(MUTE_STORAGE_KEY) === '1' }
  catch { return false }
}
function storeMuted(value: boolean) {
  try { localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0') } catch {}
}

/**
 * Preload all SFX into Phaser's loader. Call inside scene.preload().
 */
export function preloadAudio(scene: Phaser.Scene) {
  for (const key of AUDIO_SFX_KEYS) {
    scene.load.audio(`sfx_${key}`, [
      `/lounge/assets/audio/sfx/${key}.ogg`,
      `/lounge/assets/audio/sfx/${key}.mp3`
    ])
  }
  scene.load.audio('bgm_lobby_day', [
    '/lounge/assets/audio/bgm/lobby_day.ogg',
    '/lounge/assets/audio/bgm/lobby_day.mp3'
  ])
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    if (file.key === 'bgm_lobby_day') return
    console.warn('lounge audio: failed to load', file.key)
  })
}

/**
 * Bind the audio system to a scene after its create() has run.
 */
export function bindAudio(scene: Phaser.Scene) {
  sceneRef = scene
  muted = isMutedStored()
  scene.sound.volume = AUDIO_DEFAULTS.master
  scene.sound.mute = muted

  if (scene.cache.audio.exists('bgm_lobby_day')) {
    try {
      bgmSound = scene.sound.add('bgm_lobby_day', { loop: true, volume: AUDIO_DEFAULTS.bgm })
      bgmSound.play()
    } catch (e) {
      console.warn('bgm play failed', e)
    }
  }
}

export function playSfx(key: SfxKey, volume = AUDIO_DEFAULTS.sfx) {
  if (!sceneRef) return
  try {
    sceneRef.sound.play(`sfx_${key}`, { volume })
  } catch {}
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
