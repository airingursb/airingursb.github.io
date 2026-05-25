// World whispers — the island speaks. Inspired by David O'Reilly's
// Mountain (2014). Lines drift in ambiently every 60-180s, or trigger
// on specific events: first visit, idle, dusk, repeated camera reset,
// empty-ground clicks. Fully toggleable via WorldUI 💭 button +
// persisted in localStorage so a user who hates them can silence forever.

import { useEffect, useRef, useState } from 'react'
import { on } from './events'
import { pickWhisper, hasVisitedBefore, markVisited, type WhisperTrigger, type ZoneId } from './whispers'
import { trackWorld } from './umami'

const ON_KEY = 'world-whispers-on-v1'
const HOLD_MS = 8000
const FADE_OUT_MS = 2000

export default function WhisperOverlay() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try { return localStorage.getItem(ON_KEY) !== 'false' } catch { return true }
  })
  const [text, setText] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const hideTimerRef = useRef<number | null>(null)
  const clearTimerRef = useRef<number | null>(null)
  const lastFireAtRef = useRef<number>(0)

  function clearTimers() {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (clearTimerRef.current) {
      window.clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
  }

  function showText(line: string) {
    // Throttle — don't stack whispers within 4s of each other
    const now = Date.now()
    if (now - lastFireAtRef.current < 4000) return
    lastFireAtRef.current = now

    clearTimers()
    setText(line)
    setVisible(true)
    trackWorld('world-whisper-shown', { len: line.length })
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
      clearTimerRef.current = window.setTimeout(() => setText(null), FADE_OUT_MS + 200)
    }, HOLD_MS)
  }

  function fire(trigger: WhisperTrigger, zone?: ZoneId) {
    const line = pickWhisper(trigger, zone)
    if (line) showText(line.text)
  }

  // === Manual fire (programmatic) ===
  useEffect(() => {
    if (!enabled) return
    return on('world-whisper-fire', ({ text }) => showText(text))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // === First visit (no localStorage flag yet) ===
  useEffect(() => {
    if (!enabled) return
    if (hasVisitedBefore()) return
    const t = window.setTimeout(() => {
      fire('firstVisit')
      markVisited()
    }, 2400)
    return () => window.clearTimeout(t)
  }, [enabled])

  // === Ambient drift (60-180s random) ===
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: number | null = null
    function schedule() {
      const delay = 60_000 + Math.random() * 120_000
      timer = window.setTimeout(() => {
        if (cancelled) return
        fire('ambient')
        schedule()
      }, delay)
    }
    schedule()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // === Idle (no mousemove for 30s) ===
  useEffect(() => {
    if (!enabled) return
    let timer: number | null = null
    function reset() {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => fire('idle'), 30_000)
    }
    reset()
    window.addEventListener('mousemove', reset, { passive: true })
    window.addEventListener('touchstart', reset, { passive: true })
    window.addEventListener('keydown', reset)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('touchstart', reset)
      window.removeEventListener('keydown', reset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // === Dusk theme switched on ===
  useEffect(() => {
    if (!enabled) return
    return on('world-theme', (theme) => {
      if (theme === 'dusk') {
        // small delay so it lands after lighting transition feels settled
        window.setTimeout(() => fire('dusk'), 900)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // === Camera reset — fire on 3rd+ reset within the session ===
  useEffect(() => {
    if (!enabled) return
    let count = 0
    return on('world-reset-camera', () => {
      count++
      if (count >= 3) fire('cameraReset')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // === Empty-ground clicks — 3+ clicks on canvas that didn't hit a zone ===
  useEffect(() => {
    if (!enabled) return
    let emptyCount = 0
    let armed = false
    let armTimer: number | null = null
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'CANVAS') {
        armed = true
        if (armTimer) window.clearTimeout(armTimer)
        armTimer = window.setTimeout(() => {
          if (armed) {
            emptyCount++
            if (emptyCount >= 3) {
              fire('emptyClick')
              emptyCount = 0
            }
          }
          armed = false
        }, 350)
      }
    }
    const unsubZone = on('world-zone-click', () => { armed = false })
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      if (armTimer) window.clearTimeout(armTimer)
      unsubZone()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // === Toggle from UI ===
  useEffect(() => {
    return on('world-whisper-toggle', () => {
      setEnabled(prev => {
        const next = !prev
        try { localStorage.setItem(ON_KEY, String(next)) } catch {}
        if (!next) {
          clearTimers()
          setVisible(false)
          setText(null)
        }
        return next
      })
    })
  }, [])

  if (!text) return null
  return (
    <div
      className={`world-whisper${visible ? ' world-whisper--in' : ' world-whisper--out'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="岛的低语"
    >
      {text}
    </div>
  )
}
