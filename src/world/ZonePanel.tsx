// HTML panel that slides in from the right when a zone is clicked.
// Lives outside the Canvas (in WorldGame.astro), listens for
// 'world-zone-click' events. Renders zone-specific content view.

import { useEffect, useState } from 'react'
import type { Interaction } from './zones'

interface BlogEntry { title: string; slug: string; pubDate: string; tags: string[] }
interface ComicsEntry { id: number; title: string; cover: string }
interface MusicEntry { name: string; artist: string; playcount: number }
interface ReadingEntry { title: string; author: string }

const LABELS: Record<Interaction, string> = {
  chat: 'Mochi · 闲谈',
  blog: 'Blog · 文章',
  comics: 'Comics · 四格漫画',
  music: 'Music · 最近在听',
  reading: 'Reading · 在读',
}

export default function ZonePanel() {
  const [zone, setZone] = useState<Interaction | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      setZone(detail.kind as Interaction)
      setData(null)
      setLoading(true)
    }
    window.addEventListener('world-zone-click', handler)
    return () => window.removeEventListener('world-zone-click', handler)
  }, [])

  useEffect(() => {
    if (!zone) return
    setLoading(true)
    loadData(zone)
      .then((d) => setData(d))
      .catch((err) => setData({ error: String(err.message ?? err) }))
      .finally(() => setLoading(false))
  }, [zone])

  if (!zone) return null

  return (
    <div className="world-panel">
      <div className="world-panel-head">
        <span className="world-panel-title">{LABELS[zone]}</span>
        <button className="world-panel-close" onClick={() => setZone(null)} aria-label="Close">✕</button>
      </div>
      <div className="world-panel-body">
        {loading && <div className="world-panel-loading">加载中…</div>}
        {!loading && data?.error && <div className="world-panel-error">{data.error}</div>}
        {!loading && data && !data.error && renderZoneContent(zone, data)}
      </div>
    </div>
  )
}

async function loadData(zone: Interaction): Promise<any> {
  switch (zone) {
    case 'blog': {
      const r = await fetch('/data/feed.json')
      if (!r.ok) throw new Error('feed.json 404')
      const j = await r.json()
      const blog = (j.blog as any[] || []).slice(0, 12)
      return { entries: blog as BlogEntry[] }
    }
    case 'comics': {
      // Comics are listed in feed.json under comics array
      const r = await fetch('/data/feed.json')
      if (!r.ok) throw new Error('feed.json 404')
      const j = await r.json()
      return { entries: (j.comics as ComicsEntry[] || []).slice(0, 12) }
    }
    case 'music': {
      const r = await fetch('/data/feed.json')
      if (!r.ok) throw new Error('feed.json 404')
      const j = await r.json()
      return { entries: (j.lastfm?.recent || j.music || []).slice(0, 12) as MusicEntry[] }
    }
    case 'reading': {
      const r = await fetch('/data/feed.json')
      if (!r.ok) throw new Error('feed.json 404')
      const j = await r.json()
      return { entries: (j.readwise?.books || j.reading || []).slice(0, 8) as ReadingEntry[] }
    }
    case 'chat':
      return { message: '坐下来跟 Mochi 聊聊（聊天功能待接入）' }
  }
}

function renderZoneContent(zone: Interaction, data: any) {
  switch (zone) {
    case 'chat':
      return <div className="world-panel-message">{data.message}</div>
    case 'blog':
      return (
        <ul className="world-panel-list">
          {data.entries.map((e: BlogEntry, i: number) => (
            <li key={i} className="world-panel-row">
              <a href={`/blog/${e.slug}`} className="world-panel-link">{e.title}</a>
              <span className="world-panel-meta">{e.pubDate?.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )
    case 'comics':
      return (
        <ul className="world-panel-list">
          {data.entries.map((e: ComicsEntry, i: number) => (
            <li key={i} className="world-panel-row">
              <a href={`/comics`} className="world-panel-link">#{e.id} · {e.title}</a>
            </li>
          ))}
        </ul>
      )
    case 'music':
      return (
        <ul className="world-panel-list">
          {data.entries.map((e: MusicEntry, i: number) => (
            <li key={i} className="world-panel-row">
              <span className="world-panel-link">{e.name}</span>
              <span className="world-panel-meta">{e.artist}</span>
            </li>
          ))}
        </ul>
      )
    case 'reading':
      return (
        <ul className="world-panel-list">
          {data.entries.map((e: ReadingEntry, i: number) => (
            <li key={i} className="world-panel-row">
              <span className="world-panel-link">{e.title}</span>
              <span className="world-panel-meta">{e.author}</span>
            </li>
          ))}
        </ul>
      )
  }
}
