import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onReset?: () => void
}

type State = { error: Error | null }

/**
 * Show render/effect crashes instead of a blank white screen (common on old iPad).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      console.error('[zizi]', error, info && info.componentStack)
    } catch {
      /* ignore */
    }
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || String(this.state.error)
      return (
        <div
          style={{
            padding: '1.25rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            color: '#1b3a4b',
            lineHeight: 1.5,
          }}
        >
          <p style={{ fontWeight: 700 }}>呢頁開唔到（舊系統）</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>{msg}</p>
          <button
            type="button"
            style={{
              marginTop: '1rem',
              padding: '0.65rem 1rem',
              borderRadius: '999px',
              border: 'none',
              background: '#ff7a59',
              color: '#fff',
              fontWeight: 700,
            }}
            onClick={() => {
              this.setState({ error: null })
              if (typeof this.props.onReset === 'function') {
                try {
                  this.props.onReset()
                } catch {
                  /* ignore */
                }
              }
            }}
          >
            返主頁再試
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
