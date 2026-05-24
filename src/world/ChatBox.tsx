// In-cabin Airing chat — uses the same /api/ai-companion/chat endpoint
// at chat.ursb.me that the nook companion UI uses. Streams replies via
// SSE-style delta events.
//
// Mounted as a tab inside the chat ZonePanel when the user clicks the
// cabin. Falls back to a static message if the API rejects (e.g. local
// dev cross-origin 401).

import { useEffect, useRef, useState } from 'react'

interface Msg { role: 'user' | 'assistant'; text: string; hasNook?: boolean }

const API = 'https://chat.ursb.me/api/ai-companion/chat'

export default function ChatBox() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: '坐下来吧。火堆暖暖的——今天想聊点什么？最近读到的、写到的、想到的，都行。' },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const histRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    histRef.current?.scrollTo(0, histRef.current.scrollHeight)
  }, [msgs, pending])

  // Auto-focus input when chat panel opens. preventScroll keeps iOS
  // Safari from yanking the page when chat opens via panel-swap.
  useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 200)
    return () => clearTimeout(id)
  }, [])

  // Abort any in-flight stream when this component unmounts (panel close)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || pending) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text }])
    setPending(true)
    setError(null)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch(API, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npc_id: 'npc_jue', message: text, world_3d: 'world_cabin' }),
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      if (!res.body) throw new Error('no body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assembled = ''
      let buf = ''
      let started = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          try {
            const parsed = JSON.parse(t.slice(5).trim())
            if (parsed.type === 'delta' && typeof parsed.text === 'string') {
              assembled += parsed.text
              if (!started) {
                started = true
                setMsgs((m) => [...m, { role: 'assistant', text: assembled }])
              } else {
                setMsgs((m) => {
                  const c = [...m]
                  c[c.length - 1] = { role: 'assistant', text: assembled }
                  return c
                })
              }
            }
          } catch {}
        }
      }
      if (!assembled) throw new Error('empty stream')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return  // panel closed mid-stream
      const msg = (err as Error).message || 'unknown'
      // 401 is the common "not logged in" case for first-time visitors.
      // Don't expose the raw error — give a friendly seed-reply hinting at
      // the path forward, and offer a fallback /nook link.
      if (msg.includes('401') || msg.includes('empty stream')) {
        // 401 = not logged in. Empty stream = rate limit / silent backend.
        // Both surface as in-character "Airing paused" instead of raw error.
        setMsgs((m) => [
          ...m,
          {
            role: 'assistant',
            text: msg.includes('401')
              ? '（我看着你，没说话——你还没在这个世界登记过名字。要不要先到 nook 那边坐一坐？）'
              : '（Airing 沉默了一会儿，火堆噼啪——再问一句试试？）',
          },
        ])
      } else {
        setError(`Airing 走神了：${msg}`)
      }
    } finally {
      setPending(false)
      abortRef.current = null
    }
  }

  return (
    <div className="world-chat">
      <div className="world-chat-history" ref={histRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`world-chat-msg world-chat-msg-${m.role}`}>
            {/* Only linkify Airing messages, not what the user typed back */}
            {m.role === 'assistant' && m.text.includes('nook')
              ? m.text.split('nook').flatMap((part, j, arr) =>
                  j === arr.length - 1
                    ? [part]
                    : [part, <a key={`nook${j}`} href="/nook" className="world-chat-link">nook</a>]
                )
              : m.text}
          </div>
        ))}
        {pending && <div className="world-chat-msg world-chat-msg-assistant world-chat-pending">…</div>}
        {error && <div className="world-chat-error">{error}</div>}
      </div>
      <form onSubmit={send} className="world-chat-form">
        <input
          ref={inputRef}
          className="world-chat-input"
          type="text"
          aria-label="Send a message to Airing"
          placeholder="跟 Airing 说点什么…"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button
          type="submit"
          className="world-chat-send"
          disabled={pending}
          aria-label="Send message"
        >→</button>
      </form>
    </div>
  )
}
