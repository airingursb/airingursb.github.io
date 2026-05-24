// HTML overlay UI — sit OUTSIDE the Canvas. Provides:
//   - Photo snap button (downloads canvas as PNG)
//   - Day/night toggle (dispatches custom event picked up by App)
//   - Reset camera button (dispatches custom event)
//   - Tiny zone-name display when player hovers near interactable

import { useState } from 'react'
import { emit } from './events'

const THEME_KEY = 'world-theme-v1'
const WHISPER_KEY = 'world-whispers-on-v1'

export default function WorldUI() {
  const [theme, setTheme] = useState<'day' | 'dusk'>(() => {
    if (typeof window === 'undefined') return 'day'
    try { return (localStorage.getItem(THEME_KEY) as 'day' | 'dusk') || 'day' } catch { return 'day' }
  })
  const [whispersOn, setWhispersOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try { return localStorage.getItem(WHISPER_KEY) !== 'false' } catch { return true }
  })

  function snap() {
    const canvas = document.querySelector('#world-root canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `airing-world-${Date.now()}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  function toggleTheme() {
    const next = theme === 'day' ? 'dusk' : 'day'
    setTheme(next)
    emit('world-theme', next)
  }

  function resetCam() {
    emit('world-reset-camera', undefined)
  }

  function toggleWhispers() {
    emit('world-whisper-toggle', undefined)
    setWhispersOn(prev => !prev)
  }

  // V2 a11y polish: buttons are icon-only — without aria-label, a
  // screen reader announces just "button". title= tooltips are visual
  // only. Mirror title text into aria-label so VoiceOver/NVDA actually
  // names the action. aria-pressed on toggleable buttons (theme,
  // whispers) so AT can announce their on/off state.
  const themeLabel = theme === 'day' ? '切到黄昏' : '切到白天'
  const whisperLabel = whispersOn ? '关闭岛的低语' : '让岛说话'
  return (
    <div className="world-ui" role="toolbar" aria-label="场景控制">
      <button onClick={snap} className="world-btn" title="保存截图" aria-label="保存截图">
        <img src="/world/sprites/icons/F01-camera.png" alt="" className="world-btn-icon" />
      </button>
      <button
        onClick={toggleTheme}
        className="world-btn"
        title={themeLabel}
        aria-label={themeLabel}
        aria-pressed={theme === 'dusk'}
      >
        <img
          src={theme === 'day' ? '/world/sprites/icons/F02-moon.png' : '/world/sprites/icons/F03-sun.png'}
          alt=""
          className="world-btn-icon"
        />
      </button>
      <button onClick={resetCam} className="world-btn" title="重置镜头" aria-label="重置镜头">
        <img src="/world/sprites/icons/F04-compass.png" alt="" className="world-btn-icon" />
      </button>
      <button
        onClick={toggleWhispers}
        className={`world-btn${whispersOn ? '' : ' world-btn--off'}`}
        title={whisperLabel}
        aria-label={whisperLabel}
        aria-pressed={whispersOn}
      >
        <img src="/world/sprites/icons/F05-whisper.png" alt="" className="world-btn-icon" />
      </button>
    </div>
  )
}
