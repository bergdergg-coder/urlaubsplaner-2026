import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Absence, CompanyId, Employee } from '../domain/types'
import { ABSENCES, EMPLOYEES as SEED_EMPLOYEES } from '../domain/seed'
import { TODAY } from '../lib/dates'

/* Kleiner, reaktiver Datenspeicher: Mitarbeiter + Urlaube veränderbar.
   Wird im Browser gespeichert (localStorage), übersteht also das Neuladen.
   Gesellschaften bleiben fest (WGV / Würzburger AG / Würzburger GmbH). */

const STORAGE_KEY = 'ww-urlaubsplaner-2026'

export interface EmployeeInput {
  name: string
  companyId: CompanyId
  entitlement: number
  carryover: number
}
export interface AbsenceInput {
  employeeId: string
  start: string
  end: string
  halfDayStart?: boolean
}

interface DataCtx {
  employees: Employee[]
  employeeMap: Record<string, Employee>
  absences: Absence[]
  addAbsence: (a: AbsenceInput) => void
  updateAbsence: (id: string, a: AbsenceInput) => void
  removeAbsence: (id: string) => void
  addEmployee: (e: EmployeeInput) => void
  updateEmployee: (id: string, patch: EmployeeInput) => void
  removeEmployee: (id: string) => void
  resetAll: () => void
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
    if (Array.isArray(d?.employees) && Array.isArray(d?.absences)) return d
  } catch { /* ignore */ }
  return null
}

export function DataProvider({ children }: { children: ReactNode }) {
  const stored = loadStored()
  const [employees, setEmployees] = useState<Employee[]>(stored?.employees ?? SEED_EMPLOYEES)
  const [absences, setAbsences] = useState<Absence[]>(stored?.absences ?? ABSENCES)

  // bei jeder Änderung im Browser sichern
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ employees, absences })) } catch { /* ignore */ }
  }, [employees, absences])

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])) as Record<string, Employee>,
    [employees],
  )

  const value: DataCtx = {
    employees,
    employeeMap,
    absences,
    addAbsence: (a) => {
      const { start, end } = ordered(a.start, a.end)
      setAbsences((prev) => [...prev, {
        id: uid('a'), employeeId: a.employeeId, type: 'vacation', status: 'approved',
        start, end, createdAt: TODAY, ...(a.halfDayStart ? { halfDayStart: true } : {}),
      }])
    },
    updateAbsence: (id, a) => {
      const { start, end } = ordered(a.start, a.end)
      setAbsences((prev) => prev.map((x) => x.id === id
        ? { ...x, employeeId: a.employeeId, start, end, halfDayStart: a.halfDayStart ? true : undefined }
        : x))
    },
    removeAbsence: (id) => setAbsences((prev) => prev.filter((a) => a.id !== id)),
    addEmployee: (e) => setEmployees((prev) => [...prev, {
      id: uid('e'), name: e.name.trim(), companyId: e.companyId,
      jobTitle: '', department: 'Verwaltung', role: 'employee',
      isKeyRole: false, isManagement: false, deputyIds: [],
      entitlement: e.entitlement, carryover: e.carryover,
      initials: initials(e.name), hue: hue(e.name),
    }]),
    updateEmployee: (id, patch) => setEmployees((prev) => prev.map((emp) => emp.id === id ? {
      ...emp, name: patch.name.trim(), companyId: patch.companyId,
      entitlement: patch.entitlement, carryover: patch.carryover,
      initials: initials(patch.name), hue: hue(patch.name),
    } : emp)),
    removeEmployee: (id) => {
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      setAbsences((prev) => prev.filter((a) => a.employeeId !== id))
    },
    resetAll: () => {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      setEmployees(SEED_EMPLOYEES)
      setAbsences(ABSENCES)
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData must be used within DataProvider')
  return v
}
