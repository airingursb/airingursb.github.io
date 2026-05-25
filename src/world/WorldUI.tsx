// HTML overlay UI — sit OUTSIDE the Canvas. Provides:
//   - Photo snap button (downloads canvas as PNG)
//   - Day/night toggle (dispatches custom event picked up by App)
//   - Reset camera button (dispatches custom event)
//   - Tiny zone-name display when player hovers near interactable

import { useEffect, useState } from 'react'
import { emit } from './events'
import { trackWorld } from './umami'

const THEME_KEY = 'world-theme-v1'
const WHISPER_KEY = 'world-whispers-on-v1'
// J (direction): mobile hint persistence. Shown once per session.
const MOBILE_HINT_SEEN_KEY = 'world-mobile-hint-seen-v1'

export default function WorldUI() {
  const [theme, setTheme] = useState<'day' | 'dusk'>(() => {
    if (typeof window === 'undefined') return 'day'
    try { return (localStorage.getItem(THEME_KEY) as 'day' | 'dusk') || 'day' } catch { return 'day' }
  })
  // J: show "拖动看看 / drag to look around" hint on mobile-first-visit.
  // Auto-dismisses on first user interaction OR after 5s of being visible.
  // sessionStorage marked SEEN on first touch (or hint completion) so
  // we don't pester. Dismiss listener only registers AFTER hint shows
  // — otherwise WebGL init taps prematurely dismissed it.
  const [mobileHint, setMobileHint] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isTouch = matchMedia('(hover: none)').matches
    if (!isTouch) return
    try {
      if (sessionStorage.getItem(MOBILE_HINT_SEEN_KEY) === '1') return
    } catch {}

    let dismissed = false
    function markSeen() {
      try { sessionStorage.setItem(MOBILE_HINT_SEEN_KEY, '1') } catch {}
    }
    function dismissOnTouch() {
      if (dismissed) return
      dismissed = true
      setMobileHint(false)
      markSeen()
      window.removeEventListener('pointerdown', dismissOnTouch)
    }
    // Mark seen on first touch unconditionally — even if the hint
    // never shows (user scrolled away faster than 6.5s).
    const earlyTouch = () => {
      markSeen()
      window.removeEventListener('pointerdown', earlyTouch)
    }
    window.addEventListener('pointerdown', earlyTouch, { passive: true, once: true })

    const showTimer = setTimeout(() => {
      if (dismissed) return
      setMobileHint(true)
      window.removeEventListener('pointerdown', earlyTouch)
      // Register the dismiss listener ONLY after the hint is visible.
      window.addEventListener('pointerdown', dismissOnTouch, { passive: true })
    }, 6500)
    const hideTimer = setTimeout(() => {
      if (dismissed) return
      dismissed = true
      setMobileHint(false)
      markSeen()
      window.removeEventListener('pointerdown', dismissOnTouch)
    }, 11500)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      window.removeEventListener('pointerdown', earlyTouch)
      window.removeEventListener('pointerdown', dismissOnTouch)
    }
  }, [])
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
    trackWorld('world-photo-snap')
  }

  function toggleTheme() {
    const next = theme === 'day' ? 'dusk' : 'day'
    setTheme(next)
    emit('world-theme', next)
    trackWorld('world-theme-toggle', { to: next })
  }

  function resetCam() {
    emit('world-reset-camera', undefined)
    trackWorld('world-camera-reset')
  }

  function toggleWhispers() {
    emit('world-whisper-toggle', undefined)
    setWhispersOn(prev => !prev)
    trackWorld('world-whisper-toggle', { to: whispersOn ? 'off' : 'on' })
  }

  // V2 a11y polish: buttons are icon-only — without aria-label, a
  // screen reader announces just "button". title= tooltips are visual
  // only. Mirror title text into aria-label so VoiceOver/NVDA actually
  // names the action. aria-pressed on toggleable buttons (theme,
  // whispers) so AT can announce their on/off state.
  const themeLabel = theme === 'day' ? '切到黄昏' : '切到白天'
  const whisperLabel = whispersOn ? '关闭岛的低语' : '让岛说话'
  return (
    <>
    {mobileHint && (
      <div className="world-mobile-hint" role="status" aria-live="polite">
        <span className="world-mobile-hint-icon" aria-hidden="true">✦</span>
        <span>拖动看看 · drag to explore</span>
      </div>
    )}
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
    </>
  )
}
