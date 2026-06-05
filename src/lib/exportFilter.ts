import type { Absence, CompanyId, Employee, RoleGroup } from '../domain/types'
import { roleGroupOf } from '../domain/roles'

/* ============================================================================
   Export-Filter — bestimmt, WELCHE Urlaube exportiert werden.
   Vier Modi (Vorgabe):
     • all       – alle Urlaube im erlaubten Bereich
     • company   – nur eine Gesellschaft (WGV / AG / GmbH)
     • roleGroup – nach Funktionsgruppe (Geschäftsführung, Kader, Verwaltung,
                   Mitarbeiter) – z. B. „nur GF & Kader nach Outlook"
     • persons   – individuell ausgewählte Personen
   Immer eingeschränkt auf den erlaubten Scope des Exportierenden (Rechte).
   ========================================================================== */

export type ExportMode = 'all' | 'company' | 'roleGroup' | 'persons'

export interface ExportSelection {
  mode: ExportMode
  /** bei mode 'company'. */
  companyId?: CompanyId
  /** bei mode 'roleGroup' (eine oder mehrere Gruppen). */
  roleGroups?: RoleGroup[]
  /** bei mode 'persons'. */
  employeeIds?: string[]
}

/** Mitarbeiter gemäß Auswahl, eingeschränkt auf die erlaubten Gesellschaften. */
export function selectedEmployees(
  employees: Employee[],
  selection: ExportSelection,
  allowed: CompanyId[],
): Employee[] {
  const inScope = employees.filter((e) => allowed.includes(e.companyId))
  switch (selection.mode) {
    case 'all':
      return inScope
    case 'company':
      return inScope.filter((e) => e.companyId === selection.companyId)
    case 'roleGroup': {
      const groups = new Set(selection.roleGroups ?? [])
      return inScope.filter((e) => groups.has(roleGroupOf(e)))
    }
    case 'persons': {
      const ids = new Set(selection.employeeIds ?? [])
      return inScope.filter((e) => ids.has(e.id))
    }
  }
}

/** Urlaube (nicht abgelehnt) der laut Auswahl exportierten Mitarbeiter. */
export function selectedVacations(
  absences: Absence[],
  employees: Employee[],
  selection: ExportSelection,
  allowed: CompanyId[],
): Absence[] {
  const ids = new Set(selectedEmployees(employees, selection, allowed).map((e) => e.id))
  return absences.filter(
    (a) => a.type === 'vacation' && a.status !== 'rejected' && ids.has(a.employeeId),
  )
}
