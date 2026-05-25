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

// Cycle order: off → noises (棕粉白) → soundscapes (风水林).
// Soundscapes are procedurally filtered noise: 风 = brown + bandpass +
// LFO gust, 水 = pink + narrow bandpass + LFO ripple, 林 = pink lowpass
// + sparse procedural bird chirps.
const NOISE_CYCLE: NoiseColor[] = ['off', 'brown', 'pink', 'white', 'wind', 'water', 'forest']
const NOISE_LABEL: Record<NoiseColor, string> = {
  off: '关',
  brown: '棕噪',
  pink: '粉噪',
  white: '白噪',
  wind: '风声',
  water: '水声',
  forest: '林声',
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

  // V2 a11y polish (matches WorldUI sweep): icon buttons need
  // aria-label since the title= attribute alone isn't reliably
  // announced. Pomodoro button gets aria-pressed for the running
  // state. Time HUD gets aria-live='polite' so screen readers
  // know it updates (without nagging — sessionMin only changes
  // every minute, pomo ticks every second but is gated to running).
  const noiseLabel = `白噪音：${NOISE_LABEL[noise]}（点击切换）`
  const pomoLabel = pomo === 'idle' ? '开始 25 分钟番茄钟' : '取消番茄钟'
  return (
    <>
      {/* === 2 extra control buttons — separate column below the main
          world-ui icon stack (camera/moon/compass/whisper). === */}
      <div className="world-ui-extra" role="toolbar" aria-label="环境控制">
        <button
          onClick={cycleNoise}
          className={`world-btn world-btn-with-sub${noiseIsOn ? '' : ' world-btn--off'}`}
          title={noiseLabel}
          aria-label={noiseLabel}
          aria-pressed={noiseIsOn}
        >
          <img src="/world/sprites/icons/F06-bgm.png" alt="" className="world-btn-icon" />
          <span className="world-btn-sub-label" aria-hidden="true">{NOISE_LABEL[noise]}</span>
        </button>
        <button
          onClick={togglePomodoro}
          className={`world-btn world-btn-with-sub${pomo !== 'idle' ? ' world-btn--active' : ''}`}
          title={pomoLabel}
          aria-label={pomoLabel}
          aria-pressed={pomo !== 'idle'}
        >
          <img src="/world/sprites/icons/F07-tomato.png" alt="" className="world-btn-icon" />
          {pomo !== 'idle' && (
            <span className="world-btn-sub-label" aria-hidden="true">{fmtMmSs(pomoRemaining)}</span>
          )}
        </button>
      </div>

      {/* === Bottom-left time HUD ===
          V2 a11y fix: previously the whole HUD was one aria-live
          region with aria-atomic=true. Since pomoRemaining ticks
          every second, screen readers were re-announcing the whole
          block ("在岛上 X 分钟. 累计 Y. 专注中 · 24:58") every
          second — extremely noisy. Split into pieces:
          - 在岛上 X 分钟 changes every minute, polite aria-live OK.
          - 累计 Y is essentially static during a session — no aria-live.
          - Pomo timer is second-by-second visual feedback — aria-hidden
            its seconds counter so AT doesn't tick. */}
      <div className="world-hud-time">
        <div className="world-hud-time-main" aria-live="polite">在岛上 {sessionMin} 分钟</div>
        {liveTotal > sessionMs + 60_000 && (
          <div className="world-hud-time-sub">
            累计 {fmtHumanMinutes(liveTotal)}
          </div>
        )}
        {pomo !== 'idle' && (
          <div
            className={`world-hud-pomo world-hud-pomo--${pomo}`}
            aria-label={pomo === 'focus' ? '番茄钟专注中' : '番茄钟休息中'}
          >
            <span aria-hidden="true">{pomo === 'focus' ? '专注中' : '休息中'} · {fmtMmSs(pomoRemaining)}</span>
          </div>
        )}
      </div>
    </>
  )
}
