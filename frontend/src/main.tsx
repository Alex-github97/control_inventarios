import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error
      return (
        <div style={{
          fontFamily: 'monospace', padding: 32, background: '#0f0f0f',
          color: '#f87171', minHeight: '100vh', whiteSpace: 'pre-wrap',
        }}>
          <h2 style={{ color: '#fbbf24' }}>Error de renderizado</h2>
          <b>{e.message}</b>
          <hr style={{ borderColor: '#333', margin: '16px 0' }} />
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{e.stack}</div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
