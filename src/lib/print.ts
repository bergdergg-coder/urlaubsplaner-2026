/** Entfernt alle Druck-Markierungen idempotent (auch von früheren, abgebrochenen Drucken). */
function resetPrintState() {
  document.querySelectorAll('.print-target').forEach((node) => {
    node.classList.remove('print-target')
  })
  document.body.classList.remove('printing')
}

/** Druckt nur den übergebenen Bereich (Rest der Seite wird ausgeblendet). */
export function printElement(el: HTMLElement | null) {
  if (!el) return
  // Falls ein vorheriger Druck nicht sauber aufgeräumt wurde (z. B. 'afterprint'
  // ist nicht gefeuert), zuerst evtl. hängende Markierungen entfernen.
  resetPrintState()

  el.classList.add('print-target')
  document.body.classList.add('printing')

  // matchMedia('print') als Fallback-Cleanup: feuert auch dann, wenn 'afterprint'
  // bei manchen Browsern/Abbrüchen ausbleibt.
  const mql =
    typeof window.matchMedia === 'function' ? window.matchMedia('print') : null

  const onMediaChange = (e: MediaQueryListEvent) => {
    // Druckmodus wurde verlassen (Dialog geschlossen/fertig) → aufräumen.
    if (!e.matches) cleanup()
  }

  const cleanup = () => {
    resetPrintState()
    window.removeEventListener('afterprint', cleanup)
    mql?.removeEventListener('change', onMediaChange)
  }

  window.addEventListener('afterprint', cleanup)
  mql?.addEventListener('change', onMediaChange)

  // kleiner Aufschub, damit die Druck-Klassen sicher angewandt sind
  setTimeout(() => window.print(), 40)
}
