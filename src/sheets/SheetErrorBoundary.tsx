import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
}

export class SheetErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SheetErrorBoundary]', this.props.label, error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-8">
          <div className="mck-panel p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="mck-rule" />
              <span className="text-[11px] font-semibold uppercase tracking-section text-mck-teal">
                Sheet error
              </span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-mck-navy">
              {this.props.label || 'Sheet'} failed to render
            </h2>
            <p className="mt-2 text-sm text-mck-gray">{this.state.error.message}</p>
            <button
              type="button"
              className="mt-4 border border-mck-navy bg-white px-4 py-2 text-sm font-semibold text-mck-navy hover:bg-mck-mist"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
