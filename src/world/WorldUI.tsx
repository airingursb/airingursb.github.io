// HTML overlay UI — sit OUTSIDE the Canvas. Provides:
//   - Photo snap button (downloads canvas as PNG)
//   - Day/night toggle (dispatches custom event picked up by App)
//   - Reset camera button (dispatches custom event)
//   - Tiny zone-name display when player hovers near interactable

import { useState } from 'react'
import { emit } from './events'

const THEME_KEY = 'world-theme-v1'

export default function WorldUI() {
  const [theme, setTheme] = useState<'day' | 'dusk'>(() => {
    if (typeof window === 'undefined') return 'day'
    try { return (localStorage.getItem(THEME_KEY) as 'day' | 'dusk') || 'day' } catch { return 'day' }
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

  return (
    <div className="world-ui">
      <button onClick={snap} className="world-btn" title="Save photo">📷</button>
      <button onClick={toggleTheme} className="world-btn" title={theme === 'day' ? 'Switch to dusk' : 'Switch to day'}>
        {theme === 'day' ? '🌙' : '☀️'}
      </button>
      <button onClick={resetCam} className="world-btn" title="Reset camera">🎯</button>
    </div>
  )
}
