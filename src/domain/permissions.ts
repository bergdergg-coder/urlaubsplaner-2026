import type { CompanyId, Employee } from './types'

/* ============================================================================
   Rollen & Berechtigungen — reine Logik (ohne React), damit überall – inkl.
   Tests – dieselben Regeln gelten.
     • admin            – Hauptadministrator: alle Firmen, alle Rechte.
     • company_manager  – Firmenadministrator: nur die eigene Gesellschaft.
     • employee         – Mitarbeiter-Self-Service: nur die EIGENE Person.
   ========================================================================== */

export type AccountRole = 'admin' | 'company_manager' | 'employee'

export interface Permissions {
  viewAllCompanies: boolean
  manageStaff: boolean    // Mitarbeiter anlegen/bearbeiten
  approve: boolean        // Anträge genehmigen/ablehnen
  exportData: boolean     // Outlook-/PDF-Export
  configure: boolean      // globale Einstellungen / Controlling
  manageAccounts: boolean // Zugänge anlegen
}

export function permsFor(role: AccountRole): Permissions {
  switch (role) {
    case 'admin':
      return { viewAllCompanies: true, manageStaff: true, approve: true, exportData: true, configure: true, manageAccounts: true }
    case 'company_manager':
      return { viewAllCompanies: false, manageStaff: true, approve: true, exportData: true, configure: false, manageAccounts: true }
    case 'employee':
      return { viewAllCompanies: false, manageStaff: false, approve: false, exportData: false, configure: false, manageAccounts: false }
  }
}

/** Welche Gesellschaften darf dieser Zugang sehen? */
export function scopeCompaniesFor(
  role: AccountRole,
  companyId: CompanyId | undefined,
  allCompanies: CompanyId[],
): CompanyId[] {
  if (role === 'admin') return allCompanies
  return companyId ? [companyId] : []
}

/** Darf dieser Zugang den angegebenen Mitarbeiter sehen? */
export function canSeeEmployee(
  ctx: { role: AccountRole; scope: CompanyId[]; selfEmployeeId?: string | null },
  e: Employee,
): boolean {
  if (ctx.role === 'admin') return true
  if (ctx.role === 'employee') return e.id === ctx.selfEmployeeId
  return ctx.scope.includes(e.companyId)
}

/** Darf dieser Zugang den Mitarbeiter bearbeiten (Stammdaten)? */
export function canEditEmployee(
  ctx: { role: AccountRole; scope: CompanyId[] },
  e: Employee,
): boolean {
  if (!permsFor(ctx.role).manageStaff) return false
  return ctx.role === 'admin' || ctx.scope.includes(e.companyId)
}
