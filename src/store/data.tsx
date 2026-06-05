import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Absence, CompanyId, Department, Employee } from '../domain/types'
import { ABSENCES, EMPLOYEES as SEED_EMPLOYEES } from '../domain/seed'
import { TODAY } from '../lib/dates'
import { useAuth } from './auth'

/* Kleiner, reaktiver Datenspeicher: Mitarbeiter + Urlaube veränderbar.
   Wird im Browser gespeichert (localStorage), übersteht also das Neuladen.
   Gesellschaften bleiben fest (WGV / Würzburger AG / Würzburger GmbH). */

// Version im Schlüssel: bei Datenstand-Updates hochzählen, damit neue Stammdaten/
// Urlaube auch bei Nutzern mit altem Browser-Speicher geladen werden.
const STORAGE_KEY = 'ww-urlaubsplaner-2026-v5'

export interface EmployeeInput {
  name: string
  companyId: CompanyId
  entitlement: number
  carryover: number
  department?: Department
  jobTitle?: string
  isKeyRole?: boolean
  isManagement?: boolean
  /** Teilzeit-Arbeitstage (Mo=0…So=6); leer/Mo–Fr = Vollzeit. */
  workdays?: number[]
  entryDate?: string
  exitDate?: string
}
export interface AbsenceInput {
  employeeId: string
  start: string
  end: string
  halfDayStart?: boolean
  status?: 'requested' | 'approved'
  note?: string
}

interface DataCtx {
  employees: Employee[]
  employeeMap: Record<string, Employee>
  absences: Absence[]
  addAbsence: (a: AbsenceInput) => void
  updateAbsence: (id: string, a: AbsenceInput) => void
  removeAbsence: (id: string) => void
  /** Antrag genehmigen (Status → approved, mit Bearbeiter/Datum). */
  approveAbsence: (id: string, decidedBy?: string) => void
  /** Antrag ablehnen (Status → rejected, mit Bearbeiter/Datum). */
  rejectAbsence: (id: string, decidedBy?: string) => void
  addEmployee: (e: EmployeeInput) => void
  updateEmployee: (id: string, patch: EmployeeInput) => void
  removeEmployee: (id: string) => void
  /** Import: legt fehlende Mitarbeiter an und ergänzt Urlaube (je Gesellschaft). */
  importVacations: (companyId: CompanyId, rows: { name: string; start: string; end: string; half?: boolean }[]) => { employeesAdded: number; absencesAdded: number }
}

const Ctx = createContext<DataCtx | null>(null)

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? '?'
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase()
}
function hue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}
let _seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${_seq++}`

function ordered(start: string, end: string) {
  return start <= end ? { start, end } : { start: end, end: start }
}

function loadStored(): { employees: Employee[]; absences: Absence[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!Array.isArray(d?.employees) || !Array.isArray(d?.absences)) return null
    // Korrupte/unvollständige Einträge herausfiltern, damit mergeWithSeed und die
    // Berechnungen nicht an Fremddaten abstürzen.
    const employees = (d.employees as unknown[]).filter(
      (e): e is Employee => !!e && typeof e === 'object' && typeof (e as Employee).id === 'string',
    )
    const absences = (d.absences as unknown[]).filter(
      (a): a is Absence => !!a && typeof a === 'object'
        && typeof (a as Absence).id === 'string' && typeof (a as Absence).employeeId === 'string'
        && typeof (a as Absence).start === 'string' && typeof (a as Absence).end === 'string',
    )
    return { employees, absences }
  } catch { /* ignore */ }
  return null
}

/* Stellt sicher, dass ALLE Seed-Mitarbeiter vorhanden sind — auch bei altem oder
   unvollständigem Browser-Speicher. So tauchen neu im Stammdaten-Seed ergänzte
   Personen (z. B. Wolfgang Würzburger bei der WGV) immer auf, ohne dass dafür der
   Speicher-Schlüssel hochgezählt werden muss. Reihenfolge folgt dem Seed
   (Wolfgang steht damit über Susanne); bereits gespeicherte/bearbeitete Stände
   behalten Vorrang, selbst angelegte Mitarbeiter bleiben erhalten. */
function mergeWithSeed(storedEmployees: Employee[]): Employee[] {
  const byId = new Map(storedEmployees.map((e) => [e.id, e]))
  // Seed-Felder als Grundlage, gespeicherte (bearbeitete) Werte gewinnen. So
  // werden neu ergänzte Pflichtfelder (department, role, isKeyRole, isManagement …)
  // auch bei Mitarbeitern aus altem Browser-Speicher zuverlässig ergänzt —
  // sonst landen sie z. B. in der falschen Funktionsgruppe.
  const merged = SEED_EMPLOYEES.map((se) => {
    const st = byId.get(se.id)
    return st ? { ...se, ...st } : se
  })
  const seedIds = new Set(SEED_EMPLOYEES.map((e) => e.id))
  for (const e of storedEmployees) if (!seedIds.has(e.id)) merged.push(e)
  return merged
}

export function DataProvider({ children }: { children: ReactNode }) {
  const stored = loadStored()
  const [employees, setEmployees] = useState<Employee[]>(stored ? mergeWithSeed(stored.employees) : SEED_EMPLOYEES)
  const [absences, setAbsences] = useState<Absence[]>(stored?.absences ?? ABSENCES)

  // bei jeder Änderung im Browser sichern
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ employees, absences })) }
    catch (e) { console.warn('Speichern im Browser fehlgeschlagen – Änderungen gehen beim Neuladen verloren:', e) }
  }, [employees, absences])

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])) as Record<string, Employee>,
    [employees],
  )

  /* ---- Rechtegrenze --------------------------------------------------------
     Alle Schreibzugriffe prüfen hier (nicht nur in der UI) den Scope des
     angemeldeten Zugangs. So lässt sich die Rollentrennung nicht durch
     manipulierte UI-Zustände umgehen. */
  const { isEmployee, selfEmployeeId, scopeCompanies, perms } = useAuth()
  /** Darf der aktuelle Zugang die Abwesenheiten dieses Mitarbeiters bearbeiten? */
  const canTouch = (employeeId: string): boolean => {
    if (isEmployee) return !!selfEmployeeId && employeeId === selfEmployeeId
    const emp = employeeMap[employeeId]
    return !!emp && scopeCompanies.includes(emp.companyId)
  }
  /** Darf der aktuelle Zugang Mitarbeiter dieser Gesellschaft pflegen? */
  const canManageCompany = (companyId: CompanyId): boolean =>
    perms.manageStaff && scopeCompanies.includes(companyId)

  const value: DataCtx = {
    employees,
    employeeMap,
    absences,
    addAbsence: (a) => {
      // Mitarbeiter dürfen nur für sich selbst und ausschließlich als Antrag eintragen.
      const employeeId = isEmployee && selfEmployeeId ? selfEmployeeId : a.employeeId
      if (!canTouch(employeeId)) return
      const status = isEmployee ? 'requested' : (a.status ?? 'approved')
      const { start, end } = ordered(a.start, a.end)
      setAbsences((prev) => [...prev, {
        id: uid('a'), employeeId, type: 'vacation', status,
        start, end, createdAt: TODAY,
        ...(a.halfDayStart ? { halfDayStart: true } : {}),
        ...(a.note?.trim() ? { note: a.note.trim() } : {}),
      }])
    },
    updateAbsence: (id, a) => {
      const existing = absences.find((x) => x.id === id)
      if (!existing || !canTouch(existing.employeeId)) return
      // Mitarbeiter dürfen nur eigene, noch OFFENE Anträge ändern (nicht entschiedene).
      if (isEmployee && existing.status !== 'requested') return
      const employeeId = isEmployee && selfEmployeeId ? selfEmployeeId : a.employeeId
      if (!canTouch(employeeId)) return
      const { start, end } = ordered(a.start, a.end)
      setAbsences((prev) => prev.map((x) => {
        if (x.id !== id) return x
        const { halfDayStart: _h, note: _n, decidedBy, decidedAt, ...rest } = x
        const status = isEmployee ? 'requested' : (a.status ?? x.status)
        // Bearbeiter-/Datums-Spur nur behalten, wenn der Status entschieden bleibt;
        // wird ein genehmigter Eintrag wieder zum Antrag, fällt sie weg.
        const keepDecision = status !== 'requested' && status === x.status
        return {
          ...rest, employeeId, start, end, status,
          ...(a.halfDayStart ? { halfDayStart: true } : {}),
          ...(a.note?.trim() ? { note: a.note.trim() } : {}),
          ...(keepDecision && decidedBy ? { decidedBy } : {}),
          ...(keepDecision && decidedAt ? { decidedAt } : {}),
        }
      }))
    },
    removeAbsence: (id) => setAbsences((prev) => {
      const t = prev.find((a) => a.id === id)
      if (!t) return prev
      if (!canTouch(t.employeeId)) return prev
      // Mitarbeiter dürfen nur eigene, noch offene Anträge zurückziehen.
      if (isEmployee && t.status !== 'requested') return prev
      return prev.filter((a) => a.id !== id)
    }),
    approveAbsence: (id, decidedBy) => {
      if (!perms.approve) return
      setAbsences((prev) => prev.map((x) =>
        x.id === id && x.status === 'requested' && canTouch(x.employeeId) ? { ...x, status: 'approved', decidedAt: TODAY, ...(decidedBy ? { decidedBy } : {}) } : x))
    },
    rejectAbsence: (id, decidedBy) => {
      if (!perms.approve) return
      setAbsences((prev) => prev.map((x) =>
        x.id === id && x.status === 'requested' && canTouch(x.employeeId) ? { ...x, status: 'rejected', decidedAt: TODAY, ...(decidedBy ? { decidedBy } : {}) } : x))
    },
    addEmployee: (e) => {
      if (!canManageCompany(e.companyId)) return
      setEmployees((prev) => [...prev, {
        id: uid('e'), name: e.name.trim(), companyId: e.companyId,
        jobTitle: e.jobTitle?.trim() ?? '', department: e.department ?? 'Verwaltung', role: 'employee',
        isKeyRole: e.isKeyRole ?? false, isManagement: e.isManagement ?? false, deputyIds: [],
        entitlement: e.entitlement, carryover: e.carryover,
        ...(e.workdays && e.workdays.length ? { workdays: e.workdays } : {}),
        ...(e.entryDate ? { entryDate: e.entryDate } : {}),
        ...(e.exitDate ? { exitDate: e.exitDate } : {}),
        initials: initials(e.name), hue: hue(e.name),
      }])
    },
    updateEmployee: (id, patch) => {
      const cur = employeeMap[id]
      // Bestehende UND Ziel-Gesellschaft müssen im eigenen Bereich liegen.
      if (!cur || !canManageCompany(cur.companyId) || !canManageCompany(patch.companyId)) return
      setEmployees((prev) => prev.map((emp) => {
        if (emp.id !== id) return emp
        // workdays/entryDate/exitDate werden vollständig aus dem Patch gesetzt
        // (Auslassen = entfernen → Vollzeit bzw. ganzjährig).
        const { workdays: _w, entryDate: _en, exitDate: _ex, ...base } = emp
        return {
          ...base, name: patch.name.trim(), companyId: patch.companyId,
          entitlement: patch.entitlement, carryover: patch.carryover,
          ...(patch.department ? { department: patch.department } : {}),
          ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle.trim() } : {}),
          ...(patch.isKeyRole !== undefined ? { isKeyRole: patch.isKeyRole } : {}),
          ...(patch.isManagement !== undefined ? { isManagement: patch.isManagement } : {}),
          ...(patch.workdays && patch.workdays.length ? { workdays: patch.workdays } : {}),
          ...(patch.entryDate ? { entryDate: patch.entryDate } : {}),
          ...(patch.exitDate ? { exitDate: patch.exitDate } : {}),
          initials: initials(patch.name), hue: hue(patch.name),
        }
      }))
    },
    removeEmployee: (id) => {
      const cur = employeeMap[id]
      if (!cur || !canManageCompany(cur.companyId)) return
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      setAbsences((prev) => prev.filter((a) => a.employeeId !== id))
    },
    importVacations: (companyId, rows) => {
      if (!canManageCompany(companyId)) return { employeesAdded: 0, absencesAdded: 0 }
      const byName = new Map(
        employees.filter((e) => e.companyId === companyId).map((e) => [e.name.trim().toLowerCase(), e]),
      )
      const newEmps: Employee[] = []
      const newAbs: Absence[] = []
      for (const r of rows) {
        const key = r.name.trim().toLowerCase()
        let emp = byName.get(key)
        if (!emp) {
          emp = {
            id: uid('e'), name: r.name.trim(), companyId,
            jobTitle: '', department: 'Verwaltung', role: 'employee',
            isKeyRole: false, isManagement: false, deputyIds: [],
            entitlement: 30, carryover: 0, initials: initials(r.name), hue: hue(r.name),
          }
          byName.set(key, emp); newEmps.push(emp)
        }
        const { start, end } = ordered(r.start, r.end)
        newAbs.push({
          id: uid('a'), employeeId: emp.id, type: 'vacation', status: 'approved',
          start, end, createdAt: TODAY, ...(r.half ? { halfDayStart: true } : {}),
        })
      }
      if (newEmps.length) setEmployees((prev) => [...prev, ...newEmps])
      if (newAbs.length) setAbsences((prev) => [...prev, ...newAbs])
      return { employeesAdded: newEmps.length, absencesAdded: newAbs.length }
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used within DataProvider')
  return v
}
