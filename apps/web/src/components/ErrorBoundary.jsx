// React Error Boundary — prevents a single component crash from blanking the
// whole app. Renders a red fallback with the error message so developers can
// diagnose instead of staring at a white screen.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white p-6 text-[#2D2D2D]"
        >
          <div className="max-w-lg text-center">
            <h2 className="text-2xl font-bold text-[#C0392B] mb-2">Something went wrong on this screen</h2>
            <p className="mb-4 text-sm leading-relaxed text-[#5D4037]">
              {this.state.error?.message ?? this.state.error?.toString() ?? 'An unknown error occurred.'}
            </p>
            {this.state.errorInfo?.componentStack && (
              <pre className="text-[10px] text-[#8C847A] overflow-auto max-h-64">{this.state.errorInfo.componentStack}</pre>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null })
                window.location.reload()
              }}
              className="cursor-pointer rounded-md bg-[#D96C4D] px-4 py-2 text-xs font-bold text-[#5D4037] hover:bg-[#C0392B]"
            >
              Refresh page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
