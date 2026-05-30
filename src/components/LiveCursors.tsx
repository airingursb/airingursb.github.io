// Figma-style live multiplayer cursors for the homepage.
//
// Visual: a chunky rounded pointer in the visitor's theme color + a small
// label pill "🇸🇬 #3,412" (region flag · visitor number).
//
// Architecture (see src/lib/cursor-presence.ts for the why):
//   • Presence  → who's online + identity metadata (color/animal/cc/num).
//     Also GATES broadcasting: we never send cursor messages when alone —
//     the single biggest Realtime-quota saver.
//   • Broadcast → ephemeral {nx, ry} cursor positions, rAF-throttled, only
//     while moving + visible + 2+ people present.
//
// Coordinates anchor to the centered `.container` column (max-width 520px) so
// they map across desktop widths despite responsive reflow. Disabled on touch.

import { useEffect, useRef, useState } from 'react'
import {
  getSupabase, getIdentitySeed, colorFor,
  flagEmoji, readVisitorNumber, readCountry,
} from '../lib/cursor-presence'

const ROOM = 'cursors:home'

type Meta = { color: string; cc: string | null; num: number | null }

type Peer = Meta & {
  id: string
  nx: number // normalized x within the content column [0..1]
  ry: number // y offset from the column's document-top, in px
  curX: number // current rendered viewport X (lerped)
  curY: number
  seen: number // performance.now() of last position update — for idle fade
  el?: HTMLDivElement | null
}

function ChunkyPointer({ color }: { color: string }) {
  // Fat, bezier-rounded pointer — bubbly + cute while keeping a clear tip.
  return (
    <svg width="30" height="32" viewBox="0 0 30 32" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.3))' }}>
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

export default function LiveCursors() {
  // Only the *set* of peer ids lives in React state; per-frame motion is
  // written straight to DOM transforms via refs to avoid re-render churn.
  const [ids, setIds] = useState<string[]>([])
  const peers = useRef<Map<string, Peer>>(new Map())

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(pointer: coarse)').matches) return // no hover cursor on touch

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const lerp = reduceMotion ? 1 : 0.22

    const id = getIdentitySeed()
    const meta: Meta = {
      color: colorFor(id),
      cc: readCountry(), num: readVisitorNumber(),
    }
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
      broadcasting = online.length >= 2 // ← cost gate: silent when alone
      for (const pid of [...peers.current.keys()]) {
        if (pid === id || !online.includes(pid)) peers.current.delete(pid)
      }
      for (const pid of online) {
        if (pid === id) continue
        const m = state[pid]?.[0] || {}
        const ex = peers.current.get(pid)
        if (ex) {
          // refresh metadata (it can arrive late via re-track)
          ex.color = m.color || ex.color
          ex.cc = m.cc ?? ex.cc
          ex.num = m.num ?? ex.num
        } else {
          peers.current.set(pid, {
            id: pid,
            color: m.color || '#888',
            cc: m.cc ?? null, num: m.num ?? null,
            nx: 0.5, ry: 0, curX: -200, curY: -200, seen: performance.now(),
          })
        }
      }
      setIds([...peers.current.keys()])
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

    // ---- send my cursor (rAF-throttled, only when moving + live) ----
    let lastNx = 0, lastRy = 0, pending = false
    const flushSend = () => {
      pending = false
      if (!broadcasting || hidden) return
      channel.send({ type: 'broadcast', event: 'cursor', payload: { id, nx: lastNx, ry: lastRy } })
    }
    const onMove = (e: PointerEvent) => {
      const c = container(); if (!c) return
      const rect = c.getBoundingClientRect()
      lastNx = (e.clientX - rect.left) / rect.width
      lastRy = e.clientY - rect.top // == cursorDocY - columnDocTop (scroll cancels)
      if (!pending && broadcasting && !hidden) {
        pending = true
        requestAnimationFrame(flushSend)
      }
    }
    const onVis = () => { hidden = document.hidden }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVis)

    // ---- render loop: lerp toward target, position in viewport space ----
    let raf = 0
    const tick = () => {
      const c = container()
      if (c && peers.current.size) {
        const rect = c.getBoundingClientRect()
        const now = performance.now()
        for (const p of peers.current.values()) {
          const tx = rect.left + p.nx * rect.width
          const ty = rect.top + p.ry
          p.curX += (tx - p.curX) * lerp
          p.curY += (ty - p.curY) * lerp
          if (p.el) {
            p.el.style.opacity = now - p.seen > 8000 ? '0' : '1'
            p.el.style.transform = `translate3d(${p.curX}px, ${p.curY}px, 0)`
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
      cancelAnimationFrame(raf)
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000, overflow: 'hidden' }}>
      <style>{`@keyframes lc-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}`}</style>
      {ids.map((pid) => {
        const p = peers.current.get(pid)
        if (!p) return null
        return (
          <div
            key={pid}
            ref={(el) => { const pp = peers.current.get(pid); if (pp) pp.el = el }}
            style={{ position: 'absolute', top: 0, left: 0, willChange: 'transform', transition: 'opacity .4s ease', transform: 'translate3d(-200px,-200px,0)' }}
          >
            <div style={{ animation: 'lc-pop .26s cubic-bezier(.34,1.56,.64,1) both', transformOrigin: '5px 4px' }}>
              <ChunkyPointer color={p.color} />
              <span
                style={{
                  position: 'absolute', left: 22, top: 24, whiteSpace: 'nowrap',
                  font: '600 11px/1.4 ui-sans-serif, system-ui, -apple-system, sans-serif',
                  color: '#fff', background: p.color, padding: '3px 8px',
                  borderRadius: 11, boxShadow: '0 2px 6px rgba(0,0,0,.22)',
                  letterSpacing: '.01em',
                }}
              >
                {labelText(p)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
