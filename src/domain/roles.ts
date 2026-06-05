import type { Employee, RoleGroup } from './types'

/* ============================================================================
   Funktionsgruppen — eine fachliche Einordnung jedes Mitarbeiters in
   Geschäftsführung / Kader / Verwaltung / Mitarbeiter.
   Wird für Rollen-/Gruppen-Filter genutzt (Outlook-Export, Auswertungen).
   Abgeleitet aus department + isManagement/isKeyRole, damit keine zusätzliche
   Pflege nötig ist; bewusst zentral, damit überall dieselbe Logik gilt.
   ========================================================================== */

export const ROLE_GROUP_LABEL: Record<RoleGroup, string> = {
  management: 'Geschäftsführung',
  kader: 'Kader',
  verwaltung: 'Verwaltung',
  mitarbeiter: 'Mitarbeiter',
}

/** Anzeige-/Sortierreihenfolge (von oben nach unten in der Hierarchie). */
export const ROLE_GROUP_ORDER: RoleGroup[] = ['management', 'kader', 'verwaltung', 'mitarbeiter']

const VERWALTUNG_DEPARTMENTS = new Set([
  'Verwaltung', 'Buchhaltung / Lohn', 'Empfang', 'IT',
])

/** Funktionsgruppe einer Person bestimmen. */
export function roleGroupOf(e: Employee): RoleGroup {
  if (e.isManagement || e.department === 'Geschäftsführung') return 'management'
  if (e.isKeyRole) return 'kader'
  if (VERWALTUNG_DEPARTMENTS.has(e.department)) return 'verwaltung'
  return 'mitarbeiter'
}

export function roleGroupLabelOf(e: Employee): string {
  return ROLE_GROUP_LABEL[roleGroupOf(e)]
}
