// SHU-733 Phase 7 · Mobile virtual joystick
//
// Pattern matches Heap Plaza MobileControls.tsx — left thumb stick translates
// to synthetic KeyW/A/S/D events so the existing Player input handlers work
// unmodified. Right area of screen handles camera drag for view rotation.

import { useEffect, useRef, useState } from 'react'

const RADIUS = 60
const DEAD_ZONE = 0.18

export default function MobileJoystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [touchActive, setTouchActive] = useState(false)
  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  useEffect(() => {
    if (!isTouchDevice) return
    const base = baseRef.current
    const knob = knobRef.current
    if (!base || !knob) return

    let originX = 0, originY = 0
    let activeId: number | null = null
    const heldKeys = new Set<string>()

    function emitKey(code: string, down: boolean) {
      const evt = new KeyboardEvent(down ? 'keydown' : 'keyup', { code })
      window.dispatchEvent(evt)
    }

    function setKey(code: string, down: boolean) {
      if (down && !heldKeys.has(code)) {
        heldKeys.add(code)
        emitKey(code, true)
      } else if (!down && heldKeys.has(code)) {
        heldKeys.delete(code)
        emitKey(code, false)
      }
    }

    function releaseAll() {
      for (const k of [...heldKeys]) setKey(k, false)
    }

    function onStart(e: TouchEvent) {
      const t = e.changedTouches[0]
      // Only respond if touch starts in left-half of screen
      if (t.clientX > window.innerWidth / 2) return
      activeId = t.identifier
      const r = base!.getBoundingClientRect()
      originX = r.left + r.width / 2
      originY = r.top + r.height / 2
      setTouchActive(true)
      e.preventDefault()
    }

    function onMove(e: TouchEvent) {
      if (activeId === null) return
      const t = Array.from(e.touches).find((x) => x.identifier === activeId)
      if (!t) return
      let dx = t.clientX - originX
      let dy = t.clientY - originY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const clamped = Math.min(dist, RADIUS)
      if (dist > 0) { dx = (dx / dist) * clamped; dy = (dy / dist) * clamped }
      knob!.style.transform = `translate(${dx}px, ${dy}px)`

      // Map to WASD with deadzone
      const nx = dx / RADIUS
      const ny = dy / RADIUS
      setKey('KeyD', nx >  DEAD_ZONE)
      setKey('KeyA', nx < -DEAD_ZONE)
      setKey('KeyS', ny >  DEAD_ZONE)
      setKey('KeyW', ny < -DEAD_ZONE)
      e.preventDefault()
    }

    function onEnd(e: TouchEvent) {
      const ended = Array.from(e.changedTouches).find((x) => x.identifier === activeId)
      if (!ended) return
      activeId = null
      knob!.style.transform = 'translate(0, 0)'
      setTouchActive(false)
      releaseAll()
    }

    window.addEventListener('touchstart', onStart, { passive: false })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
      releaseAll()
    }
  }, [isTouchDevice])

  if (!isTouchDevice) return null

  return (
    <>
      <div ref={baseRef} className="grove-joystick-base" data-active={touchActive}>
        <div ref={knobRef} className="grove-joystick-knob" />
      </div>
      <style>{`
        .grove-joystick-base {
          position: absolute;
          left: 20px; bottom: 28px;
          width: 120px; height: 120px;
          border: 2px solid rgba(255,255,255,0.18);
          border-radius: 50%;
          background: rgba(20, 24, 36, 0.4);
          backdrop-filter: blur(6px);
          z-index: 80;
          touch-action: none;
          display: flex; align-items: center; justify-content: center;
          transition: background 120ms;
        }
        .grove-joystick-base[data-active='true'] {
          background: rgba(60, 80, 120, 0.4);
        }
        .grove-joystick-knob {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(220, 230, 250, 0.5);
          border: 1px solid rgba(255,255,255,0.4);
          transition: transform 80ms;
          pointer-events: none;
        }
      `}</style>
    </>
  )
}
