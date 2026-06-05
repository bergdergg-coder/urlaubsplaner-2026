import { describe, it, expect } from 'vitest'
import type { Absence, CompanyId, Employee } from '../domain/types'
import { selectedEmployees, selectedVacations } from './exportFilter'

const ALL: CompanyId[] = ['WGV', 'AG', 'GMBH']

function emp(id: string, companyId: CompanyId, p: Partial<Employee> = {}): Employee {
  return {
    id, name: id, companyId, jobTitle: '', department: 'Verwaltung',
    role: 'employee', isKeyRole: false, isManagement: false, deputyIds: [],
    entitlement: 30, carryover: 0, initials: id.slice(0, 2).toUpperCase(), hue: 0, ...p,
  }
}
function vac(employeeId: string, p: Partial<Absence> = {}): Absence {
  return { id: `a-${employeeId}`, employeeId, type: 'vacation', status: 'approved', start: '2026-06-08', end: '2026-06-12', createdAt: '2026-01-01', ...p }
}

// Würzburger Gruppe in Klein: je Funktionsgruppe und Firma ein Beispiel.
const gf = emp('gf', 'GMBH', { isManagement: true, department: 'Geschäftsführung' })
const kader = emp('kader', 'GMBH', { isKeyRole: true, department: 'Disposition' })
const monteur = emp('monteur', 'GMBH', { department: 'Technik / Montage' })
const verwWgv = emp('verwWgv', 'WGV', { department: 'Buchhaltung / Lohn' })
const gfAg = emp('gfAg', 'AG', { isManagement: true, department: 'Geschäftsführung' })
const EMPLOYEES = [gf, kader, monteur, verwWgv, gfAg]

const ABSENCES = [
  vac('gf'), vac('kader'), vac('monteur'), vac('verwWgv'), vac('gfAg'),
  vac('monteur', { id: 'a-monteur-rej', status: 'rejected' }), // abgelehnt -> nie exportieren
]

const ids = (es: Employee[]) => es.map((e) => e.id).sort()

describe('Export-Filter: Modi', () => {
  it('alle: jeder im erlaubten Bereich', () => {
    expect(ids(selectedEmployees(EMPLOYEES, { mode: 'all' }, ALL))).toEqual(ids(EMPLOYEES))
  })

  it('nach Firma: nur die gewählte Gesellschaft', () => {
    const sel = selectedEmployees(EMPLOYEES, { mode: 'company', companyId: 'GMBH' }, ALL)
    expect(ids(sel)).toEqual(['gf', 'kader', 'monteur'])
  })

  it('nach Rolle/Gruppe: nur Geschäftsführung', () => {
    const sel = selectedEmployees(EMPLOYEES, { mode: 'roleGroup', roleGroups: ['management'] }, ALL)
    expect(ids(sel)).toEqual(['gf', 'gfAg'])
  })

  it('nach Rolle/Gruppe: Geschäftsführung + Kader (z. B. „Wolfgang exportiert nur Kader/GF")', () => {
    const sel = selectedEmployees(EMPLOYEES, { mode: 'roleGroup', roleGroups: ['management', 'kader'] }, ALL)
    expect(ids(sel)).toEqual(['gf', 'gfAg', 'kader'])
  })

  it('einzelne Personen: nur die ausgewählten', () => {
    const sel = selectedEmployees(EMPLOYEES, { mode: 'persons', employeeIds: ['kader', 'gfAg'] }, ALL)
    expect(ids(sel)).toEqual(['gfAg', 'kader'])
  })
})

describe('Export-Filter: Firmenansichten & Scope', () => {
  it('beschränkt auf den erlaubten Scope (Firmenadmin sieht nur die eigene Firma)', () => {
    const sel = selectedEmployees(EMPLOYEES, { mode: 'all' }, ['WGV'])
    expect(ids(sel)).toEqual(['verwWgv'])
  })

  it('eine Person außerhalb des Scopes wird herausgefiltert', () => {
    const sel = selectedEmployees(EMPLOYEES, { mode: 'persons', employeeIds: ['gf', 'verwWgv'] }, ['WGV'])
    expect(ids(sel)).toEqual(['verwWgv'])
  })
})

describe('Export-Filter: Urlaube', () => {
  it('liefert nur nicht-abgelehnte Urlaube der ausgewählten Personen', () => {
    const list = selectedVacations(ABSENCES, EMPLOYEES, { mode: 'company', companyId: 'GMBH' }, ALL)
    const out = list.map((a) => a.id).sort()
    expect(out).toEqual(['a-gf', 'a-kader', 'a-monteur']) // a-monteur-rej (rejected) fehlt
  })

  it('Gesamtgruppe: alle Urlaube außer abgelehnten', () => {
    const list = selectedVacations(ABSENCES, EMPLOYEES, { mode: 'all' }, ALL)
    expect(list).toHaveLength(5)
    expect(list.every((a) => a.status !== 'rejected')).toBe(true)
  })
})
