import { Component, type ErrorInfo, type ReactNode } from 'react'
import { tr } from '../i18n'

type Props = { children: ReactNode }
type State = { message: string | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    return {
      message: error instanceof Error ? error.message : tr('err.unknown'),
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.message) {
      return (
        <div className="flex min-h-svh max-w-full items-center justify-center bg-stone-950 px-4 text-stone-200">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5">
            <p className="font-display text-xl text-stone-50">{tr('err.title')}</p>
            <p className="text-sm text-stone-400">{tr('err.body')}</p>
            <p className="break-words font-mono text-xs text-rose-400">{this.state.message}</p>
            <button
              type="button"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-stone-950"
              onClick={() => {
                this.setState({ message: null })
                window.location.reload()
              }}
            >
              {tr('err.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
