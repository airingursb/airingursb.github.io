// SHU-733 Phase 5 · HTML chat box floats above canvas during 'seated' stage.
// Reuses existing /api/ai-companion/chat with world_3d='mochi_grove' context.

import { useState, useEffect, useRef } from 'react'
import { useGroveStore, postToParent } from './store'
import { sendChat, completeQuest } from './api'

export default function ChatOverlay() {
  const stage = useGroveStore((s) => s.stage)
  const setStage = useGroveStore((s) => s.setStage)
  const messages = useGroveStore((s) => s.messages)
  const append = useGroveStore((s) => s.appendMessage)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const histRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (stage === 'seated') setTimeout(() => inputRef.current?.focus(), 100)
  }, [stage])

  useEffect(() => {
    if (histRef.current) histRef.current.scrollTop = histRef.current.scrollHeight
  }, [messages.length])

  if (stage !== 'seated') return null

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || pending) return
    setInput('')
    append({ role: 'user', content: text })
    setPending(true)
    try {
      const reply = await sendChat(text, { world3d: 'mochi_grove' })
      append({ role: 'assistant', content: reply || '...' })
    } catch (err) {
      append({ role: 'assistant', content: '(Airing 一时没说话)' })
    } finally {
      setPending(false)
    }
  }

  async function leave() {
    setStage('leaving')
    await completeQuest('mochi_grove_walk')
    setStage('done')
    postToParent({ type: 'exit', quest_completed: true })
  }

  return (
    <div className="grove-chat" role="region" aria-label="跟 Airing 聊天">
      <ul ref={histRef} className="grove-chat-history">
        {messages.length === 0 && (
          <li className="grove-chat-empty">坐下来了。月光下，你可以跟 Airing 说点什么。</li>
        )}
        {messages.map((m, i) => (
          <li key={i} className={`grove-chat-msg grove-chat-${m.role}`}>
            {m.content}
          </li>
        ))}
        {pending && <li className="grove-chat-msg grove-chat-assistant grove-chat-pending">…</li>}
      </ul>
      <form onSubmit={send} className="grove-chat-form">
        <input
          ref={inputRef}
          type="text"
          maxLength={500}
          autoComplete="off"
          placeholder="说点什么…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <button type="submit" disabled={pending || !input.trim()}>→</button>
        <button type="button" onClick={leave} className="grove-leave">起身</button>
      </form>
      <style>{`
        .grove-chat {
          position: absolute;
          bottom: 16px; left: 50%; transform: translateX(-50%);
          width: min(520px, 94vw);
          background: rgba(20, 24, 36, 0.88);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #e8edf7;
          font-family: ui-monospace, monospace;
          pointer-events: auto;
          z-index: 100;
          display: flex; flex-direction: column;
          max-height: 50vh;
        }
        .grove-chat-history {
          list-style: none; margin: 0; padding: 12px 14px;
          overflow-y: auto; flex: 1;
          display: flex; flex-direction: column; gap: 6px;
        }
        .grove-chat-empty {
          color: #8a93a8; font-size: 12px; text-align: center; padding: 10px 0;
        }
        .grove-chat-msg {
          font-size: 13px; line-height: 1.5;
          padding: 6px 10px; border-radius: 8px; max-width: 80%;
          word-break: break-word; white-space: pre-wrap;
        }
        .grove-chat-user {
          background: #4a6fa5; align-self: flex-end;
        }
        .grove-chat-assistant {
          background: rgba(60, 70, 90, 0.6); align-self: flex-start;
        }
        .grove-chat-pending { opacity: 0.6; }
        .grove-chat-form {
          display: flex; gap: 6px; padding: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .grove-chat-form input {
          flex: 1; background: rgba(0,0,0,0.3); color: #e8edf7;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
          padding: 6px 10px; font: inherit; outline: none;
        }
        .grove-chat-form input:focus { border-color: rgba(120,160,220,0.5); }
        .grove-chat-form button {
          background: #4a6fa5; color: #fff;
          border: 0; border-radius: 6px;
          padding: 6px 12px; cursor: pointer; font: inherit;
        }
        .grove-chat-form button:hover:not(:disabled) { background: #5a80c0; }
        .grove-chat-form button:disabled { opacity: 0.4; cursor: default; }
        .grove-leave { background: transparent !important; border: 1px solid rgba(255,255,255,0.2) !important; }
      `}</style>
    </div>
  )
}
