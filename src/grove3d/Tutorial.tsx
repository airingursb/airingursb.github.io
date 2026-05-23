// SHU-733 Phase 6 · Tutorial billboard (top-center HTML overlay)
// Steps tied to stage state machine. Auto-advance via store, not next button.

import { useGroveStore, type Stage } from './store'

const STEPS: Record<Stage, { title: string; body: string } | null> = {
  intro: {
    title: '你跟着 Mochi 走进了林子',
    body: '用 WASD 走 · 鼠标转视角 · 点击屏幕进入第一人称 · 走近看看他',
  },
  approach: {
    title: 'Mochi 在等你',
    body: '走过去 · 旁边那块石头是给你们俩坐的',
  },
  beside: {
    title: '...',
    body: '坐下来',
  },
  seated: {
    title: '坐下了',
    body: '说点什么 · 或者就静静坐着 · 按 ESC 起身',
  },
  leaving: {
    title: '起身',
    body: '回 Nook...',
  },
  done: null,
}

export default function Tutorial() {
  const stage = useGroveStore((s) => s.stage)
  const step = STEPS[stage]
  if (!step) return null

  return (
    <div className="grove-tutorial" role="status" aria-live="polite">
      <div className="grove-tutorial-title">{step.title}</div>
      <div className="grove-tutorial-body">{step.body}</div>
      <style>{`
        .grove-tutorial {
          position: absolute;
          top: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(20, 24, 36, 0.78);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 10px 18px;
          color: #e8edf7;
          font-family: ui-monospace, monospace;
          text-align: center;
          pointer-events: none;
          z-index: 90;
          max-width: 86vw;
        }
        .grove-tutorial-title {
          font-size: 14px; font-weight: 600;
          color: #c5d4e8;
        }
        .grove-tutorial-body {
          font-size: 11px;
          color: #8a93a8;
          margin-top: 4px;
        }
      `}</style>
    </div>
  )
}
