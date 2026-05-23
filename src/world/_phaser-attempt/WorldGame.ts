// Mount the diorama into #world-mount.
import Phaser from 'phaser'
import { DioramaScene } from './scenes/DioramaScene'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'world-mount',
  width: window.innerWidth,
  height: window.innerHeight,
  scene: [DioramaScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#1f1a2a',
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
})

// Wire up interact dispatching — for MVP just log to console + show toast
window.addEventListener('world-interact', (e) => {
  const detail = (e as CustomEvent).detail
  // eslint-disable-next-line no-console
  console.log('[world] interact:', detail)
  const toast = document.getElementById('world-toast')
  if (toast) {
    toast.textContent = `→ 进入 ${detail.label}（面板待接，MVP 阶段）`
    toast.hidden = false
    clearTimeout((window as any)._worldToastT)
    ;(window as any)._worldToastT = setTimeout(() => { toast.hidden = true }, 2200)
  }
})
