import { Component, type ErrorInfo, type ReactNode } from 'react'

/* Fängt Render-Fehler ab, damit nie ein dauerhafter Weißbildschirm entsteht.
   Bietet Neu-Laden und – als Notausgang – das Zurücksetzen der lokalen Daten. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unerwarteter Anwendungsfehler:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-canvas)]">
        <div className="card p-6 max-w-md w-full text-center">
          <h1 className="text-[18px] font-semibold mb-2">Es ist ein Fehler aufgetreten</h1>
          <p className="text-[13.5px] text-[var(--color-muted)] mb-4">
            Die Anwendung konnte nicht korrekt dargestellt werden. Bitte neu laden. Hilft das nicht,
            lassen sich die lokal im Browser gespeicherten Daten zurücksetzen.
          </p>
          <pre className="text-[11px] text-left text-[var(--color-crit)] bg-[var(--color-crit-bg)] rounded-lg p-2 mb-4 overflow-auto max-h-32 whitespace-pre-wrap">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()}
              className="focusable h-10 px-4 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)]">
              Neu laden
            </button>
            <button onClick={() => { try { localStorage.clear() } catch { /* ignore */ } window.location.reload() }}
              className="focusable h-10 px-4 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
              App-Daten zurücksetzen
            </button>
          </div>
        </div>
      </div>
    )
  }
}
