// SHU-733 Phase 11 · Loading screen overlay.
//
// Shown over the canvas while the R3F scene + HDR + GLBs warm up
// (~1-3s on first visit, near-instant on cached repeat). Hides itself
// once the scene's Suspense boundary resolves and signals 'ready' via
// the store.

import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [progress, setProgress] = useState(8)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Fake but pleasant progress — the actual readiness comes from
    // Canvas + Suspense which we listen to via window 'grove3d-ready'.
    const start = performance.now()
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(92, p + (Math.random() * 8 + 4)))
    }, 220)
    function onReady() {
      window.clearInterval(id)
      setProgress(100)
      window.setTimeout(() => setDone(true), 250)
    }
    window.addEventListener('grove3d-ready', onReady, { once: true })
    // Safety: hide after 8s no matter what (don't trap user behind splash)
    const safety = window.setTimeout(() => {
      window.clearInterval(id)
      setProgress(100)
      setDone(true)
    }, 8000)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(safety)
      window.removeEventListener('grove3d-ready', onReady)
    }
  }, [])

  if (done) return null

  return (
    <div className="grove-loading" role="status" aria-live="polite">
      <div className="grove-loading-card">
        <div className="grove-loading-flower">🌸</div>
        <div className="grove-loading-title">走进林子…</div>
        <div className="grove-loading-bar">
          <div className="grove-loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="grove-loading-hint">第一次来加载约 2-3 秒</div>
      </div>
      <style>{`
        .grove-loading {
          position: absolute; inset: 0;
          background: #050610;
          display: flex; align-items: center; justify-content: center;
          z-index: 200;
          color: #d8dee9;
          font-family: ui-monospace, monospace;
        }
        .grove-loading-card {
          text-align: center;
          padding: 32px 40px;
        }
        .grove-loading-flower {
          font-size: 48px;
          margin-bottom: 18px;
          animation: grove-loading-pulse 2.5s ease-in-out infinite;
        }
        @keyframes grove-loading-pulse {
          0%, 100% { transform: scale(1) rotate(-3deg); opacity: 0.9; }
          50%      { transform: scale(1.12) rotate(3deg); opacity: 1; }
        }
        .grove-loading-title {
          font-size: 14px;
          color: #c5d4e8;
          margin-bottom: 16px;
        }
        .grove-loading-bar {
          width: 200px; height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto 12px;
        }
        .grove-loading-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #c08aab, #f3b8c8, #fce8a8);
          transition: width 280ms ease-out;
        }
        .grove-loading-hint {
          font-size: 10px;
          color: #6a7080;
        }
      `}</style>
    </div>
  )
}
