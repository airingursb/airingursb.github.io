// React error boundary for the world scene. If any 3D component crashes,
// show a graceful fallback instead of blanking the whole page.

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { err: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(err: Error): State {
    return { err }
  }

  componentDidCatch(err: Error) {
    // eslint-disable-next-line no-console
    console.error('[world] scene crashed:', err)
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1410',
            color: '#f4ead5',
            fontFamily: 'ui-monospace, monospace',
            padding: 32,
          }}
        >
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <p>这片林子有点累了——刷新一下试试。</p>
            <details style={{ marginTop: 16, fontSize: 11, opacity: 0.6, textAlign: 'left' }}>
              <summary>technical details</summary>
              <pre style={{ marginTop: 8, fontSize: 10, whiteSpace: 'pre-wrap' }}>
                {String(this.state.err.message)}
              </pre>
            </details>
            <button
              onClick={() => location.reload()}
              style={{
                marginTop: 16,
                background: 'rgba(244, 234, 213, 0.12)',
                border: '1px solid rgba(244, 234, 213, 0.3)',
                color: '#f4ead5',
                padding: '8px 18px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
