// HTML panel that slides in from the right when a zone is clicked.
// Mounted outside the Canvas in WorldGame.astro. Data is loaded
// build-time via Astro imports and passed as initialData prop.

import { useEffect, useRef, useState } from 'react'
import type { Interaction } from './zones'
import ChatBox from './ChatBox'
import { on } from './events'

interface BlogEntry { title: string; link: string; date: string }
interface MusicArtist { name: string; plays: number; pct: number }
interface HighlightEntry { id: number; title: string; author: string; text?: string; url?: string }

interface InitialData {
  blog: BlogEntry[]
  music: MusicArtist[]
  reading: HighlightEntry[]
}

const LABELS: Record<Interaction, string> = {
  chat: 'Airing · 木屋',
  blog: 'Blog · 文章',
  comics: 'Comics · 四格漫画',
  music: 'Music · 最近在听',
  reading: 'Reading · 在读',
}

export default function ZonePanel({ initialData }: { initialData?: InitialData }) {
  const [zone, setZone] = useState<Interaction | null>(null)
  const [closing, setClosing] = useState(false)
  // V2 a11y polish: restore focus on close so keyboard users don't
  // get dumped at the top of the document. Capture the active element
  // when panel opens, refocus it on unmount.
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Listen for click events from in-canvas hitboxes (typed event bus)
  useEffect(() => {
    return on('world-zone-click', ({ kind }) => {
      // Clicking the same zone again toggles closed (matches user expectation)
      if (zone === kind) {
        close()
        return
      }
      // Different zone open → animate out, then swap
      if (zone && zone !== kind) {
        setClosing(true)
        setTimeout(() => { setZone(kind); setClosing(false) }, 180)
      } else {
        setClosing(false)
        setZone(kind)
      }
    })
  }, [zone])

  // ESC key to close (deps array so it doesn't re-register every render)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && zone) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zone])

  // Reset cursor on unmount (in case hitbox pointerOut never fires)
  useEffect(() => () => { document.body.style.cursor = 'auto' }, [])

  // V2 a11y polish: capture focus on open, restore on close.
  // When zone goes from null → set, save the previously focused
  // element and move focus into the panel. When it goes set → null,
  // restore focus so keyboard users land back where they were.
  useEffect(() => {
    if (zone) {
      lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null
      // After mount + animation, focus the panel itself (then internal
      // tab order takes over). requestAnimationFrame so the panel is
      // in the DOM and the slide-in has begun.
      requestAnimationFrame(() => panelRef.current?.focus())
    } else if (lastFocusedRef.current) {
      lastFocusedRef.current.focus?.()
      lastFocusedRef.current = null
    }
  }, [zone])

  function close() {
    setClosing(true)
    setTimeout(() => { setZone(null); setClosing(false) }, 180)
  }

  if (!zone) return null

  // Click backdrop outside panel to close
  function onBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) close()
  }

  return (
    <div className="world-panel-backdrop" onClick={onBackdrop}>
    <div
      ref={panelRef}
      className={`world-panel world-panel--${zone}${closing ? ' world-panel--closing' : ''}`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-panel-title"
      tabIndex={-1}
    >
      {/* B2: cabin-interior visual treatment for chat zone. Hearth glow
          in bottom-left corner of the panel + faint paper texture. */}
      {zone === 'chat' && (
        <div className="world-panel-cabin-bg" aria-hidden="true">
          <div className="cabin-hearth-glow" />
          <div className="cabin-shoji-grid" />
        </div>
      )}
      <div className="world-panel-head">
        <span className="world-panel-title" id="world-panel-title">{LABELS[zone]}</span>
        <button className="world-panel-close" onClick={close} aria-label="关闭面板">✕</button>
      </div>
      <div className="world-panel-body">
        {zone === 'chat' && (
          <p className="world-panel-cabin-tagline">
            进了 Airing 的木屋。火炉旁问点什么吧。
          </p>
        )}
        {renderZoneContent(zone, initialData)}
      </div>
    </div>
    </div>
  )
}

function renderZoneContent(zone: Interaction, data?: InitialData) {
  switch (zone) {
    case 'chat':
      return <ChatBox />
    case 'blog':
      return (
        <ul className="world-panel-list">
          {(data?.blog ?? []).map((e, i) => (
            <li key={i} className="world-panel-row">
              <a href={e.link} className="world-panel-link">{e.title}</a>
              <span className="world-panel-meta">{e.date}</span>
            </li>
          ))}
          <li className="world-panel-row">
            <a href="/blog" className="world-panel-link world-panel-more">更多文章 →</a>
          </li>
        </ul>
      )
    case 'comics':
      return (
        <div className="world-panel-message">
          <p>四格漫画都在这里 ↓</p>
          <p><a href="/comics" className="world-panel-link world-panel-more">前往 /comics →</a></p>
        </div>
      )
    case 'music':
      return (
        <ul className="world-panel-list">
          {(data?.music ?? []).map((a, i) => (
            <li key={i} className="world-panel-row">
              <span className="world-panel-link">{a.name}</span>
              <span className="world-panel-meta">{a.plays} plays</span>
            </li>
          ))}
          <li className="world-panel-row">
            <a href="/music" className="world-panel-link world-panel-more">完整 Last.fm 数据 →</a>
          </li>
        </ul>
      )
    case 'reading':
      return (
        <ul className="world-panel-list">
          {(data?.reading ?? []).map((h, i) => (
            <li key={i} className="world-panel-row">
              <a href={h.url || '#'} className="world-panel-link" target="_blank" rel="noopener">{h.title}</a>
              <span className="world-panel-meta">{h.author}</span>
            </li>
          ))}
          <li className="world-panel-row">
            <a href="/reading" className="world-panel-link world-panel-more">更多划线 →</a>
          </li>
        </ul>
      )
  }
}
