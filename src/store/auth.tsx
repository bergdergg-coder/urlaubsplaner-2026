import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompanyId, Employee } from '../domain/types'
import { COMPANIES, EMPLOYEES } from '../domain/seed'
import {
  permsFor, scopeCompaniesFor, canSeeEmployee as canSee, canEditEmployee as canEdit,
  type AccountRole, type Permissions,
} from '../domain/permissions'

export type { AccountRole, Permissions } from '../domain/permissions'

/* ============================================================================
   Zugänge, Rollen & Berechtigungen
   ----------------------------------------------------------------------------
   Demo-Anmeldung — KEINE echte Sicherheit (läuft komplett im Browser).
   Drei Rollen:
     • admin            – Hauptadministrator der Gruppe: alle Firmen, alle Rechte,
                          Controlling, Stammdaten, Zugänge, Freigaben, Export.
     • company_manager  – Administrator einer Gesellschaft: nur die eigene Firma,
                          darf dort Mitarbeiter & Urlaube pflegen, freigeben,
                          exportieren und Zugänge der eigenen Firma anlegen.
     • employee         – Mitarbeiter-Self-Service: nur die EIGENEN Urlaube
                          beantragen und die eigene Übersicht/Status sehen.
   Admin-/Firmenadmin-Zugänge können weitere Zugänge anlegen; diese werden im
   Browser (localStorage) gespeichert. Passwort der Demo-Zugänge: 123.
   ========================================================================== */

export interface Account {
  id: string
  label: string
  sub: string
  role: AccountRole
  /** Heimatgesellschaft (bei company_manager / employee). */
  companyId?: CompanyId
  /** Verknüpfter Mitarbeiter (bei employee zwingend, bei Manager optional). */
  employeeId?: string
  /** true = vom Admin angelegt (löschbar); fehlt bei festen Demo-Zugängen. */
  custom?: boolean
}

interface AccountRecord extends Account {
  password: string
  /** true = vom Admin angelegt (löschbar); false = fester Demo-Zugang. */
  custom?: boolean
}

const PW = '123'
const ALL: CompanyId[] = COMPANIES.map((c) => c.id)
const empName = (id: string) => EMPLOYEES.find((e) => e.id === id)?.name ?? id

/* ---- Feste Demo-Zugänge ---------------------------------------------------- */
const BASE: AccountRecord[] = [
  { id: 'wolfgang', label: 'Wolfgang Würzburger', sub: 'Hauptadministrator · alle Firmen + Controlling', role: 'admin', employeeId: 'wolfgang-w', password: PW },
  { id: 'admin-it', label: 'Eric Dijkhof', sub: 'Administrator IT (Gruppe) · alle Firmen', role: 'admin', employeeId: 'eric-d', password: PW },
  { id: 'mgr-wgv', label: 'Susanne Würzburger', sub: 'Firmenadministratorin · WGV', role: 'company_manager', companyId: 'WGV', employeeId: 'susanne-w', password: PW },
  { id: 'mgr-ag', label: 'Jochen Schwandt', sub: 'Firmenadministrator · Würzburger AG (CH)', role: 'company_manager', companyId: 'AG', employeeId: 'jochen-s', password: PW },
  { id: 'mgr-gmbh', label: 'Frank Würzburger', sub: 'Firmenadministrator · Würzburger GmbH', role: 'company_manager', companyId: 'GMBH', employeeId: 'frank-w', password: PW },
  { id: 'emp-wgv', label: 'Rebecca Würzburger', sub: 'Mitarbeiterin · WGV (nur eigene Urlaube)', role: 'employee', companyId: 'WGV', employeeId: 'rebecca-w', password: PW },
  { id: 'emp-ag', label: 'Nicolas Glishaber', sub: 'Mitarbeiter · Würzburger AG (nur eigene Urlaube)', role: 'employee', companyId: 'AG', employeeId: 'nicolas-g', password: PW },
  { id: 'emp-gmbh', label: 'Nadine Rühle', sub: 'Mitarbeiterin · Würzburger GmbH (nur eigene Urlaube)', role: 'employee', companyId: 'GMBH', employeeId: 'nadine-r', password: PW },
]

const SESSION_KEY = 'ww-auth-v2'
const ACCOUNTS_KEY = 'ww-auth-accounts-v1'
const REMOVED_KEY = 'ww-auth-removed-base-v1'

function loadCustomAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    const arr = raw ? (JSON.parse(raw) as AccountRecord[]) : []
    return Array.isArray(arr) ? arr.map((a) => ({ ...a, custom: true })) : []
  } catch { return [] }
}
function saveCustomAccounts(list: AccountRecord[]): void {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}
// Gelöschte feste Demo-Zugänge (IDs) — damit auch sie dauerhaft entfernt bleiben.
function loadRemovedBase(): string[] {
  try {
    const raw = localStorage.getItem(REMOVED_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

const strip = ({ password, ...a }: AccountRecord): Account => { void password; return a }

export interface NewAccountInput {
  employeeId: string
  companyId: CompanyId
  role: AccountRole
  label: string
  password: string
}

interface AuthCtx {
  account: Account | null
  isAdmin: boolean
  isManager: boolean      // admin ODER company_manager (darf verwalten/freigeben)
  isEmployee: boolean
  /** Kompatibilität: „sieht alle Gesellschaften" = Hauptadministrator. */
  isSuper: boolean
  /** Bei Mitarbeiter-Self-Service gesetzt → Sichten auf diese Person beschränken. */
  selfEmployeeId: string | null
  scopeCompanies: CompanyId[]
  perms: Permissions
  canSeeEmployee: (e: Employee) => boolean
  canEditEmployee: (e: Employee) => boolean
  /** Zugangsverwaltung (nur sichtbar mit manageAccounts). */
  accounts: Account[]
  createAccount: (input: NewAccountInput) => { ok: boolean; error?: string }
  removeAccount: (id: string) => { ok: boolean; error?: string }
  /** Gelöschte feste Demo-Zugänge wiederherstellen. */
  restoreRemovedAccounts: () => void
  /** Anzahl der ausgeblendeten festen Demo-Zugänge. */
  removedAccountCount: number
  loginOptions: { id: string; label: string; sub: string }[]
  login: (id: string, pw: string) => boolean
  logout: () => void
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<AccountRecord[]>(loadCustomAccounts)
  const [removedBase, setRemovedBase] = useState<string[]>(loadRemovedBase)
  const records = useMemo<AccountRecord[]>(() => {
    const removed = new Set(removedBase)
    return [...BASE.filter((b) => !removed.has(b.id)), ...custom]
  }, [custom, removedBase])

  const [account, setAccount] = useState<Account | null>(() => {
    try {
      const id = localStorage.getItem(SESSION_KEY)
      const a = [...BASE, ...loadCustomAccounts()].find((x) => x.id === id)
      return a ? strip(a) : null
    } catch { return null }
  })

  useEffect(() => { saveCustomAccounts(custom) }, [custom])
  useEffect(() => {
    try { localStorage.setItem(REMOVED_KEY, JSON.stringify(removedBase)) } catch { /* ignore */ }
  }, [removedBase])

  const role: AccountRole | null = account?.role ?? null
  const perms = permsFor(role ?? 'employee')
  const isAdmin = role === 'admin'
  const isManager = role === 'admin' || role === 'company_manager'
  const isEmployee = role === 'employee'
  const selfEmployeeId = isEmployee ? account?.employeeId ?? null : null
  const scopeCompanies = role ? scopeCompaniesFor(role, account?.companyId, ALL) : []

  function canSeeEmployee(e: Employee): boolean {
    if (!role) return false
    return canSee({ role, scope: scopeCompanies, selfEmployeeId }, e)
  }
  function canEditEmployee(e: Employee): boolean {
    if (!role) return false
    return canEdit({ role, scope: scopeCompanies }, e)
  }

  const value: AuthCtx = {
    account,
    isAdmin, isManager, isEmployee,
    isSuper: isAdmin,
    selfEmployeeId,
    scopeCompanies,
    perms,
    canSeeEmployee,
    canEditEmployee,
    accounts: records.map(strip),
    createAccount: ({ employeeId, companyId, role: r, label, password }) => {
      // Rechtegrenze: auch hier (nicht nur in der UI) gegen den eigenen Scope prüfen.
      if (!perms.manageAccounts) return { ok: false, error: 'Keine Berechtigung, Zugänge anzulegen.' }
      if (!employeeId) return { ok: false, error: 'Bitte einen Mitarbeiter wählen.' }
      if (!password.trim()) return { ok: false, error: 'Bitte ein Passwort vergeben.' }
      // Firmenadministratoren dürfen nur Mitarbeiter-Zugänge der EIGENEN Gesellschaft anlegen.
      if (r !== 'employee' && !isAdmin) return { ok: false, error: 'Nur Administratoren dürfen Verwalter-/Admin-Zugänge anlegen.' }
      if (!isAdmin && !scopeCompanies.includes(companyId)) return { ok: false, error: 'Gesellschaft außerhalb des Zuständigkeitsbereichs.' }
      if (records.some((a) => a.employeeId === employeeId)) {
        return { ok: false, error: 'Für diese Person existiert bereits ein Zugang.' }
      }
      const sub = r === 'admin' ? 'Administrator · alle Firmen'
        : r === 'company_manager' ? `Firmenadministrator · ${companyId}`
          : `Mitarbeiter · ${companyId} (nur eigene Urlaube)`
      const rec: AccountRecord = {
        id: `acc-${employeeId}-${r}`, label: label.trim() || empName(employeeId), sub,
        role: r, companyId, employeeId, password: password.trim(), custom: true,
      }
      setCustom((prev) => [...prev, rec])
      return { ok: true }
    },
    removeAccount: (id) => {
      if (!perms.manageAccounts) return { ok: false, error: 'Keine Berechtigung.' }
      if (id === account?.id) return { ok: false, error: 'Der aktuell angemeldete Zugang kann nicht gelöscht werden.' }
      const target = records.find((a) => a.id === id)
      if (!target) return { ok: false, error: 'Zugang nicht gefunden.' }
      // Firmenadministratoren: nur Zugänge der eigenen Gesellschaft, keine Admin-Zugänge.
      if (!isAdmin && (target.role === 'admin' || !(target.companyId && scopeCompanies.includes(target.companyId)))) {
        return { ok: false, error: 'Außerhalb des Zuständigkeitsbereichs.' }
      }
      // Mindestens ein Administrator-Zugang muss bestehen bleiben.
      if (target.role === 'admin' && records.filter((a) => a.role === 'admin').length <= 1) {
        return { ok: false, error: 'Der letzte Administrator-Zugang kann nicht gelöscht werden.' }
      }
      if (custom.some((c) => c.id === id)) setCustom((prev) => prev.filter((a) => a.id !== id))
      else setRemovedBase((prev) => prev.includes(id) ? prev : [...prev, id])
      return { ok: true }
    },
    restoreRemovedAccounts: () => setRemovedBase([]),
    removedAccountCount: removedBase.length,
    loginOptions: records.map(({ id, label, sub }) => ({ id, label, sub })),
    login: (id, pw) => {
      const a = records.find((x) => x.id === id)
      if (a && a.password === pw) {
        setAccount(strip(a))
        try { localStorage.setItem(SESSION_KEY, id) } catch { /* ignore */ }
        return true
      }
      return false
    },
    logout: () => {
      setAccount(null)
      try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
