// Bottom-left ambient HUD + 2 extra buttons in the world-ui column.
//
// Surfaces:
//   - Time spent on the island this session
//   - Cumulative time across sessions (persisted in localStorage)
//   - Optional Pomodoro countdown (25 min focus → 5 min break → repeat-once)
//   - BGM toggle (off / brown / pink / white noise — Web Audio procedural)
//
// All zero-asset (chimes generated via Web Audio oscillator, noise
// generated via random buffer source).

import { useEffect, useRef, useState } from 'react'
import { setNoise, playChime, type NoiseColor } from './AmbientAudio'

const NOISE_CYCLE: NoiseColor[] = ['off', 'brown', 'pink', 'white']
const NOISE_LABEL: Record<NoiseColor, string> = {
  off: '关',
  brown: '棕噪',
  pink: '粉噪',
  white: '白噪',
}

type PomodoroPhase = 'idle' | 'focus' | 'break'
const FOCUS_MS = 25 * 60 * 1000
const BREAK_MS = 5 * 60 * 1000

const TIME_TOTAL_KEY = 'world-time-total-ms-v1'
const NOISE_KEY = 'world-noise-v1'

function fmtMmSs(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtHumanMinutes(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin} 分钟`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`
}

export default function AmbientHUD() {
  const sessionStartRef = useRef<number>(Date.now())
  const [sessionMs, setSessionMs] = useState(0)
  const [storedTotalMs] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    try { return Number(localStorage.getItem(TIME_TOTAL_KEY) || '0') || 0 } catch { return 0 }
  })

  const [noise, setNoiseState] = useState<NoiseColor>(() => {
    if (typeof window === 'undefined') return 'off'
    try {
      const saved = localStorage.getItem(NOISE_KEY) as NoiseColor | null
      return saved && NOISE_CYCLE.includes(saved) ? saved : 'off'
    } catch { return 'off' }
  })

  const [pomo, setPomo] = useState<PomodoroPhase>('idle')
  const [pomoRemaining, setPomoRemaining] = useState(0)

  // ─── Session tick (1s) ───
  useEffect(() => {
    const id = window.setInterval(() => {
      setSessionMs(Date.now() - sessionStartRef.current)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // ─── Persist total on flush (every 30s + before unload) ───
  useEffect(() => {
    function flush() {
      const total = storedTotalMs + (Date.now() - sessionStartRef.current)
      try { localStorage.setItem(TIME_TOTAL_KEY, String(total)) } catch {}
    }
    const id = window.setInterval(flush, 30_000)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [storedTotalMs])

  // ─── Pomodoro tick ───
  useEffect(() => {
    if (pomo === 'idle') return
    const id = window.setInterval(() => {
      setPomoRemaining((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          // Phase boundary
          playChime(pomo === 'focus' ? 660 : 880)
          if (pomo === 'focus') {
            setPomo('break')
            return BREAK_MS
          }
          setPomo('idle')
          return 0
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [pomo])

  function cycleNoise() {
    const idx = NOISE_CYCLE.indexOf(noise)
    const next = NOISE_CYCLE[(idx + 1) % NOISE_CYCLE.length]
    setNoiseState(next)
    setNoise(next)
    try { localStorage.setItem(NOISE_KEY, next) } catch {}
  }

  function togglePomodoro() {
    if (pomo === 'idle') {
      setPomo('focus')
      setPomoRemaining(FOCUS_MS)
      playChime(550)
    } else {
      setPomo('idle')
      setPomoRemaining(0)
    }
  }

  const sessionMin = Math.floor(sessionMs / 60000)
  const liveTotal = storedTotalMs + sessionMs
  const noiseIsOn = noise !== 'off'

  return (
    <>
      {/* === 2 extra control buttons — separate column below the main
          world-ui icon stack (camera/moon/compass/whisper). === */}
      <div className="world-ui-extra">
        <button
          onClick={cycleNoise}
          className={`world-btn world-btn-text${noiseIsOn ? '' : ' world-btn--off'}`}
          title={`白噪音：${NOISE_LABEL[noise]}（点击切换）`}
        >
          <span className="world-btn-text-glyph">BGM</span>
          <span className="world-btn-text-sub">{NOISE_LABEL[noise]}</span>
        </button>
        <button
          onClick={togglePomodoro}
          className={`world-btn world-btn-text${pomo !== 'idle' ? ' world-btn--active' : ''}`}
          title={pomo === 'idle' ? '开始 25 分钟番茄钟' : '取消番茄钟'}
        >
          <span className="world-btn-text-glyph">番茄</span>
          {pomo !== 'idle' && (
            <span className="world-btn-text-sub">{fmtMmSs(pomoRemaining)}</span>
          )}
        </button>
      </div>

      {/* === Bottom-left time HUD === */}
      <div className="world-hud-time">
        <div className="world-hud-time-main">在岛上 {sessionMin} 分钟</div>
        {liveTotal > sessionMs + 60_000 && (
          <div className="world-hud-time-sub">
            累计 {fmtHumanMinutes(liveTotal)}
          </div>
        )}
        {pomo !== 'idle' && (
          <div className={`world-hud-pomo world-hud-pomo--${pomo}`}>
            {pomo === 'focus' ? '专注中' : '休息中'} · {fmtMmSs(pomoRemaining)}
          </div>
        )}
      </div>
    </>
  )
}
