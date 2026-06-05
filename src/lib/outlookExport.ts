import type { Absence, Employee } from '../domain/types'

/* Merker, welche Urlaube bereits nach Outlook exportiert wurden.
   Damit kann der Planer einen Export mit NUR den neuen Urlauben erzeugen –
   so werden beim Import in den bestehenden Outlook-Kalender nur die neuen
   Termine ergänzt, ohne die vorhandenen zu verdoppeln.
   Gespeichert im Browser (localStorage), pro Gerät/Browser. */

const KEY = 'ww-urlaubsplaner-2026-outlook-export-v1'

/**
 * Inhalts-Signatur eines Urlaubs. Ändert sich, wenn sich Zeitraum, Halbtag
 * oder Name ändern – ein bearbeiteter Urlaub gilt dann wieder als „neu".
 * Der Status fließt bewusst NICHT ein (genehmigt ⇒ kein erneuter Export).
 */
export function vacationSig(a: Absence, name: string): string {
  return [a.id, a.start, a.end, a.halfDayStart ? 'h' : '', name].join('|')
}

export function loadExported(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function saveExported(sigs: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...sigs]))
  } catch {
    /* localStorage nicht verfügbar – Export klappt weiterhin, nur ohne Merker. */
  }
}

/** Urlaube (ohne abgelehnte) aus einer Abwesenheitsliste. */
export function vacationsOf(absences: Absence[], visible: (a: Absence) => boolean): Absence[] {
  return absences.filter((a) => a.type === 'vacation' && a.status !== 'rejected' && visible(a))
}

/** Noch nicht exportierte Urlaube. */
export function newVacations(vacations: Absence[], exported: Set<string>, employeeMap: Record<string, Employee>): Absence[] {
  return vacations.filter((a) => !exported.has(vacationSig(a, employeeMap[a.employeeId]?.name ?? a.employeeId)))
}
