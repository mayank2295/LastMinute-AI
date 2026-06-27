import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Top-level error boundary — if any page throws during render, show a friendly
 * fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-6">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-light border border-accent-border mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent-text" />
            </div>
            <h1 className="text-lg font-bold text-primary mb-1">Something went wrong</h1>
            <p className="text-sm text-muted mb-5">
              An unexpected error occurred. Reloading usually fixes it.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => window.location.reload()} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">
                Reload
              </button>
              <a href="/" className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-primary hover:bg-subtle">
                Go home
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
