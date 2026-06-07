// Figma-style live multiplayer cursors for the homepage.
//
// Visual: a small chunky rounded pointer in the visitor's theme color + a
// label pill "🇸🇬 #3,412" (region flag · visitor number).
//
// Motion — physics-based, to feel ALIVE rather than a stiff slide
// (researched from Karl Koch's "10 Principles for Fluid UI", CursorBuddy's
// damped-spring follower, and recast's idle-sway/squash cursor effects):
//   • Damped spring follow (overshoot + settle) instead of linear lerp — the
//     spring carries velocity, so a fast flick overshoots and springs back.
//   • Velocity-driven tilt — leans into travel direction, eases upright at rest.
//   • Squash & stretch — stretches along motion, relaxes when it stops.
//   • Idle sway — a tiny breathing wobble at rest (tapers with speed) so the
//     cursor is never frozen.
//
// Architecture (see src/lib/cursor-presence.ts for the why):
//   • Presence  → who's online + identity metadata (color/cc/num). Also GATES
//     broadcasting: we never send cursor messages when alone (quota saver).
//   • Broadcast → ephemeral {nx, ry} cursor positions: rAF-throttled while
//     moving, PLUS a low-freq heartbeat so a present-but-idle peer stays
//     visible at their real spot (instead of fading / sitting at the random
//     spawn placeholder). Only sent when visible + 2+ people present.
//
// Coordinates anchor to the centered `.container` column (max-width 520px) so
// they map across desktop widths despite responsive reflow. Disabled on touch.

import { useEffect, useRef, useState } from 'react'
import {
  getSupabase, getIdentitySeed, colorFor,
  flagEmoji, readVisitorNumber, readCountry,
} from '../lib/cursor-presence'

const ROOM = 'cursors:home'
const POP_MS = 280
// Heartbeat re-broadcasts our position even while idle. Kept well under
// IDLE_FADE_MS so a present peer never crosses the fade threshold and idle
// peers resolve to their real position rather than the random spawn spot.
const HEARTBEAT_MS = 3000
const IDLE_FADE_MS = 8000

// Spring tuning — m = 1, ω_n = √STIFFNESS ≈ 28.6 rad/s, ζ = DAMPING/(2ω_n)
// ≈ 0.66 → a small, tasteful overshoot (lively, not rubbery).
const STIFFNESS = 820
const DAMPING = 38

type Meta = { color: string; cc: string | null; num: number | null }

type Peer = Meta & {
  id: string
  nx: number // normalized x within the content column [0..1]
  ry: number // y offset from the column's document-top, in px
  curX: number; curY: number // current rendered viewport pos (spring)
  vx: number; vy: number // spring velocity (px/s) — drives tilt + stretch
  placed: boolean // snap into place on first frame, then spring
  ang: number // current tilt angle (deg), smoothed
  phase: number // per-peer idle-sway phase offset
  spawn: number // performance.now() at creation — drives the pop
  seen: number // last position update — drives idle fade
  el?: HTMLDivElement | null // outer: translate + opacity
  glyph?: HTMLDivElement | null // inner: sway + rotate + squash
}

function ChunkyPointer({ color }: { color: string }) {
  // Fat, bezier-rounded pointer — bubbly but with a clear tip. Sized down ~25%.
  return (
    <svg width="22" height="23" viewBox="0 0 30 32" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.3))' }}>
      <path
        d="M6 3 C5 2.4 3.6 3 3.7 4.3 L6 25 C6.2 26.6 8.2 27.2 9.2 25.9 L13 21 L20 21 C21.6 21 22.3 19 21 18 L7.5 4 Z"
        fill={color} stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  )
}

function labelText(m: Meta): string {
  const flag = flagEmoji(m.cc)
  return m.num != null ? `${flag} #${m.num.toLocaleString('en-US')}` : flag
}

// easeOutBack — gives the spawn a little overshoot ("pop").
function popScale(elapsed: number): number {
  if (elapsed >= POP_MS) return 1
  const p = elapsed / POP_MS
  const c1 = 1.70158, c3 = c1 + 1
  const e = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2)
  return 0.45 + 0.55 * e
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function LiveCursors() {
  // Only the *set* of peer ids lives in React state; per-frame motion is
  // written straight to DOM transforms via refs to avoid re-render churn.
  const [ids, setIds] = useState<string[]>([])
  const peers = useRef<Map<string, Peer>>(new Map())

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(pointer: coarse)').matches) return // no hover cursor on touch

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const id = getIdentitySeed()
    const meta: Meta = { color: colorFor(id), cc: readCountry(), num: readVisitorNumber() }
    const container = () => document.querySelector('.container') as HTMLElement | null

    const supabase = getSupabase()
    const channel = supabase.channel(ROOM, {
      config: { broadcast: { self: false }, presence: { key: id } },
    })

    let broadcasting = false
    let hidden = document.hidden

    const refreshPeers = () => {
      const state = channel.presenceState() as Record<string, Array<Partial<Meta>>>
      const online = Object.keys(state)
      const wasBroadcasting = broadcasting
      broadcasting = online.length >= 2 // ← cost gate: silent when alone
      for (const pid of [...peers.current.keys()]) {
        if (pid === id || !online.includes(pid)) peers.current.delete(pid)
      }
      for (const pid of online) {
        if (pid === id) continue
        const m = state[pid]?.[0] || {}
        const ex = peers.current.get(pid)
        if (ex) {
          ex.color = m.color || ex.color
          ex.cc = m.cc ?? ex.cc
          ex.num = m.num ?? ex.num
        } else {
          // Spawn at a random spot in the first screen (not top-center).
          peers.current.set(pid, {
            id: pid,
            color: m.color || '#888', cc: m.cc ?? null, num: m.num ?? null,
            nx: 0.12 + Math.random() * 0.76,
            ry: 60 + Math.random() * Math.max(120, window.innerHeight - 160),
            curX: 0, curY: 0, vx: 0, vy: 0, placed: false, ang: 0,
            phase: Math.random() * Math.PI * 2,
            spawn: performance.now(), seen: performance.now(),
          })
        }
      }
      setIds([...peers.current.keys()])
      // Just crossed into "not alone" → announce our real position right away
      // so peers see us where we actually are, not the random spawn spot.
      if (!wasBroadcasting && broadcasting) sendNow()
    }

    channel.on('presence', { event: 'sync' }, refreshPeers)
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const p = peers.current.get(payload.id)
      if (p) { p.nx = payload.nx; p.ry = payload.ry; p.seen = performance.now() }
    })
    const trackMeta = () => { channel.track({ ...meta }) }
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') trackMeta() })

    // ---- late-arriving identity: number + country land async; re-track ----
    let polls = 0
    const poll = window.setInterval(() => {
      let changed = false
      if (meta.num == null) { const n = readVisitorNumber(); if (n != null) { meta.num = n; changed = true } }
      if (meta.cc == null) { const c = readCountry(); if (c) { meta.cc = c; changed = true } }
      if (changed) trackMeta()
      if ((meta.num != null && meta.cc != null) || ++polls > 16) window.clearInterval(poll)
    }, 600)
    const onCountry = (e: Event) => {
      const cc = (e as CustomEvent).detail?.country
      if (cc && meta.cc !== cc) { meta.cc = cc; trackMeta() }
    }
    window.addEventListener('visitor-country-ready', onCountry as EventListener)

    // ---- send my cursor ----
    // Live updates are rAF-throttled on pointermove; a low-freq heartbeat keeps
    // a present-but-idle visitor alive (resolves their real spot + dodges the
    // idle fade). hasPos guards against broadcasting the (0,0) placeholder
    // before the pointer has ever moved.
    let lastNx = 0, lastRy = 0, pending = false, hasPos = false
    const sendNow = () => {
      if (!broadcasting || hidden || !hasPos) return
      channel.send({ type: 'broadcast', event: 'cursor', payload: { id, nx: lastNx, ry: lastRy } })
    }
    const flushSend = () => { pending = false; sendNow() }
    const onMove = (e: PointerEvent) => {
      const c = container(); if (!c) return
      const rect = c.getBoundingClientRect()
      lastNx = (e.clientX - rect.left) / rect.width
      lastRy = e.clientY - rect.top // == cursorDocY - columnDocTop (scroll cancels)
      hasPos = true
      if (!pending && broadcasting && !hidden) {
        pending = true
        requestAnimationFrame(flushSend)
      }
    }
    const onVis = () => { hidden = document.hidden }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    const heartbeat = window.setInterval(sendNow, HEARTBEAT_MS)

    // ---- render loop: damped-spring follow + tilt + squash + idle sway ----
    let raf = 0
    let lastNow = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = clamp((now - lastNow) / 1000, 0.001, 0.033) // clamp for stability
      lastNow = now
      const c = container()
      if (c && peers.current.size) {
        const rect = c.getBoundingClientRect()
        for (const p of peers.current.values()) {
          const tx = rect.left + p.nx * rect.width
          const ty = rect.top + p.ry
          if (!p.placed) { p.curX = tx; p.curY = ty; p.vx = 0; p.vy = 0; p.placed = true }

          if (reduceMotion) {
            p.curX = tx; p.curY = ty; p.vx = 0; p.vy = 0
          } else {
            // semi-implicit Euler integration of a damped spring
            p.vx += (STIFFNESS * (tx - p.curX) - DAMPING * p.vx) * dt
            p.vy += (STIFFNESS * (ty - p.curY) - DAMPING * p.vy) * dt
            p.curX += p.vx * dt
            p.curY += p.vy * dt
          }

          const speed = Math.hypot(p.vx, p.vy)
          // tilt toward horizontal travel (spring velocity), ease for smoothness
          const targetAng = reduceMotion ? 0 : clamp(p.vx * 0.022, -26, 26)
          p.ang += (targetAng - p.ang) * 0.25
          // squash & stretch — stretch lengthwise with speed, thin across
          const stretch = reduceMotion ? 0 : clamp(speed * 0.00018, 0, 0.2)
          const pop = reduceMotion ? 1 : popScale(now - p.spawn)
          const sX = (1 - stretch * 0.55) * pop
          const sY = (1 + stretch) * pop
          // idle sway — tiny breathing wobble at rest, gone once moving
          const taper = reduceMotion ? 0 : clamp(1 - speed / 280, 0, 1)
          const swx = taper * 1.8 * Math.sin(now / 430 + p.phase)
          const swy = taper * 1.8 * Math.sin(now / 570 + p.phase * 1.7)

          if (p.el) {
            p.el.style.opacity = now - p.seen > IDLE_FADE_MS ? '0' : '1'
            p.el.style.transform = `translate3d(${p.curX - 4}px, ${p.curY - 3}px, 0)`
          }
          if (p.glyph) {
            p.glyph.style.transform = `translate(${swx}px, ${swy}px) rotate(${p.ang}deg) scale(${sX}, ${sY})`
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('visitor-country-ready', onCountry as EventListener)
      window.clearInterval(poll)
      window.clearInterval(heartbeat)
      cancelAnimationFrame(raf)
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000, overflow: 'hidden' }}>
      {ids.map((pid) => {
        const p = peers.current.get(pid)
        if (!p) return null
        return (
          <div
            key={pid}
            ref={(el) => { const pp = peers.current.get(pid); if (pp) pp.el = el }}
            style={{ position: 'absolute', top: 0, left: 0, willChange: 'transform, opacity', transition: 'opacity .4s ease', transform: 'translate3d(-400px,-400px,0)' }}
          >
            <div
              ref={(el) => { const pp = peers.current.get(pid); if (pp) pp.glyph = el }}
              style={{ transformOrigin: '4px 3px', willChange: 'transform' }}
            >
              <ChunkyPointer color={p.color} />
            </div>
            <span
              style={{
                position: 'absolute', left: 15, top: 16, whiteSpace: 'nowrap',
                font: '600 10.5px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif',
                color: '#fff', background: p.color, padding: '2px 7px',
                borderRadius: 10, boxShadow: '0 2px 6px rgba(0,0,0,.22)',
                letterSpacing: '.01em',
              }}
            >
              {labelText(p)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
