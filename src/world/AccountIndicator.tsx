// Top-right account pill + login modal.
//
// Logged in: shows initial + display name, click → menu with "退出登录"
//            + link to nook.
// Logged out: shows "登录 →" pill, click → opens login modal with 3
//             options (Google, GitHub, magic link via email).
//
// All session state is cookie-based (set by blog-api on chat.ursb.me,
// shared via cookie scope). Component just renders the current state +
// triggers redirects.

import { useEffect, useState, useRef } from 'react'
import {
  fetchCurrentAccount,
  startGoogleLogin,
  startGithubLogin,
  requestMagicLink,
  logout,
  type WorldAccount,
} from './account'

function initials(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  // For mixed CJK + ASCII, just take first char (works visually).
  return trimmed.slice(0, 1).toUpperCase()
}

export default function AccountIndicator() {
  const [account, setAccount] = useState<WorldAccount | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchCurrentAccount().then((acc) => {
      if (cancelled) return
      setAccount(acc)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Click outside or ESC closes menu. V2 a11y: ESC is the keyboard
  // user's expected dismissal action — matches the same ESC handler
  // wired up in ZonePanel.
  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function onLogout() {
    setMenuOpen(false)
    await logout()
    setAccount(null)
  }

  if (!loaded) return null

  return (
    <>
      <div className="world-account" ref={wrapperRef}>
        {account ? (
          <button
            className="world-account-pill world-account-pill--in"
            onClick={() => setMenuOpen((v) => !v)}
            title={`${account.display_name} (${account.email})`}
            aria-label={`账户菜单：${account.display_name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="world-account-avatar" aria-hidden="true">{initials(account.display_name)}</span>
            <span className="world-account-name">{account.display_name}</span>
          </button>
        ) : (
          <button
            className="world-account-pill world-account-pill--out"
            onClick={() => setModalOpen(true)}
            title="登录账户"
            aria-label="登录账户"
            aria-haspopup="dialog"
          >
            <span className="world-account-avatar" aria-hidden="true">＋</span>
            <span className="world-account-name">登录</span>
          </button>
        )}

        {menuOpen && account && (
          <div className="world-account-menu" role="menu">
            <a className="world-account-menu-item" href="/nook/" role="menuitem">前往 nook</a>
            <button className="world-account-menu-item" onClick={onLogout} role="menuitem">退出登录</button>
          </div>
        )}
      </div>

      {modalOpen && (
        <LoginModal onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function sendMagic(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('请输入有效的邮箱地址')
      return
    }
    setSending(true)
    setError(null)
    const res = await requestMagicLink(trimmed, '/world/')
    setSending(false)
    if (res.sent) {
      setSent(true)
    } else {
      setError(res.error ?? '发送失败，请稍后再试')
    }
  }

  return (
    <div className="world-login-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="world-login-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-login-title"
      >
        <div className="world-login-head">
          <span className="world-login-title" id="world-login-title">登录</span>
          <button className="world-login-close" onClick={onClose} aria-label="关闭登录窗口">✕</button>
        </div>
        <p className="world-login-blurb">登录后你的访问、漫画、聊天记录会跨设备同步。</p>

        <div className="world-login-oauth">
          <button className="world-login-btn" onClick={() => startGoogleLogin('/world/')}>用 Google 登录</button>
          <button className="world-login-btn" onClick={() => startGithubLogin('/world/')}>用 GitHub 登录</button>
        </div>

        <div className="world-login-divider"><span>或者</span></div>

        {sent ? (
          <p className="world-login-sent" role="status">
            ✓ 已发送登录链接到 {email}<br/>
            <small>查收邮件，点击链接即可登录</small>
          </p>
        ) : (
          <form onSubmit={sendMagic} className="world-login-form">
            <input
              ref={inputRef}
              type="email"
              className="world-login-input"
              placeholder="your@email.com"
              aria-label="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="world-login-btn world-login-btn--magic" disabled={sending}>
              {sending ? '发送中…' : '发送登录链接'}
            </button>
            {error && <div className="world-login-error" role="alert">{error}</div>}
          </form>
        )}
      </div>
    </div>
  )
}
