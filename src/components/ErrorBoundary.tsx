import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null; info: string | null };

/**
 * Catches render-time exceptions anywhere in the tree and surfaces them
 * to the user instead of blanking the screen. Critical for the friend's
 * "click EMERGENCY → blank" scenario — without this, React 19 unmounts
 * the whole tree on an uncaught error and leaves a white screen with no
 * console output that's easy to find.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[Sentinel ErrorBoundary]', error, info);
    this.setState({ error, info: info.componentStack ?? null });
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fixed inset-0 z-50 bg-rig-bg text-rig-text overflow-y-auto p-6 font-mono">
        <div className="max-w-3xl mx-auto bg-rig-surface border-2 border-rig-critical/60 rounded-md p-5">
          <div className="text-xs uppercase tracking-widest text-rig-critical mb-2">
            Sentinel hit an unexpected error
          </div>
          <div className="text-rig-text mb-3">
            <strong className="font-bold">{this.state.error.name}:</strong> {this.state.error.message}
          </div>
          {this.state.error.stack && (
            <details className="mb-3" open>
              <summary className="text-[11px] uppercase tracking-widest text-rig-dim cursor-pointer">
                stack trace
              </summary>
              <pre className="mt-2 text-[10px] text-rig-dim whitespace-pre-wrap break-words">{this.state.error.stack}</pre>
            </details>
          )}
          {this.state.info && (
            <details className="mb-3">
              <summary className="text-[11px] uppercase tracking-widest text-rig-dim cursor-pointer">
                component stack
              </summary>
              <pre className="mt-2 text-[10px] text-rig-dim whitespace-pre-wrap break-words">{this.state.info}</pre>
            </details>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-rig-accent text-rig-bg rounded text-xs uppercase tracking-widest font-bold hover:bg-rig-accent/85"
            >
              Try again
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
              className="px-4 py-2 bg-rig-surface border border-rig-dim/40 rounded text-xs uppercase tracking-widest hover:bg-rig-bg"
            >
              Clear state + reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
