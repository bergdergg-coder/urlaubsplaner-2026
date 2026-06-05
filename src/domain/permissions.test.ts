import { describe, it, expect } from 'vitest'
import type { CompanyId, Employee } from './types'
import { permsFor, scopeCompaniesFor, canSeeEmployee, canEditEmployee } from './permissions'

const ALL: CompanyId[] = ['WGV', 'AG', 'GMBH']
function emp(id: string, companyId: CompanyId): Employee {
  return {
    id, name: id, companyId, jobTitle: '', department: 'Verwaltung',
    role: 'employee', isKeyRole: false, isManagement: false, deputyIds: [],
    entitlement: 30, carryover: 0, initials: 'XX', hue: 0,
  }
}
const gmbhPerson = emp('p-gmbh', 'GMBH')
const wgvPerson = emp('p-wgv', 'WGV')

describe('Berechtigungen je Rolle', () => {
  it('Admin hat alle Rechte', () => {
    expect(permsFor('admin')).toEqual({
      viewAllCompanies: true, manageStaff: true, approve: true, exportData: true, configure: true, manageAccounts: true,
    })
  })
  it('Mitarbeiter hat keine Verwaltungsrechte', () => {
    const p = permsFor('employee')
    expect(p.manageStaff).toBe(false)
    expect(p.approve).toBe(false)
    expect(p.exportData).toBe(false)
    expect(p.configure).toBe(false)
    expect(p.manageAccounts).toBe(false)
    expect(p.viewAllCompanies).toBe(false)
  })
  it('Firmenadministrator darf verwalten/freigeben, aber nicht konfigurieren', () => {
    const p = permsFor('company_manager')
    expect(p.manageStaff).toBe(true)
    expect(p.approve).toBe(true)
    expect(p.exportData).toBe(true)
    expect(p.configure).toBe(false)
    expect(p.viewAllCompanies).toBe(false)
  })
})

describe('Sichtbarkeits-Scope', () => {
  it('Admin sieht alle Gesellschaften, Firmenadmin nur die eigene', () => {
    expect(scopeCompaniesFor('admin', 'GMBH', ALL)).toEqual(ALL)
    expect(scopeCompaniesFor('company_manager', 'GMBH', ALL)).toEqual(['GMBH'])
    expect(scopeCompaniesFor('employee', 'WGV', ALL)).toEqual(['WGV'])
  })
})

describe('Mitarbeiter sehen/bearbeiten — Admin vs. Mitarbeiter', () => {
  it('Admin sieht und bearbeitet jeden', () => {
    const ctx = { role: 'admin' as const, scope: ALL }
    expect(canSeeEmployee(ctx, gmbhPerson)).toBe(true)
    expect(canEditEmployee(ctx, wgvPerson)).toBe(true)
  })

  it('Mitarbeiter sieht NUR sich selbst und darf niemanden bearbeiten', () => {
    const ctx = { role: 'employee' as const, scope: ['GMBH'] as CompanyId[], selfEmployeeId: 'p-gmbh' }
    expect(canSeeEmployee(ctx, gmbhPerson)).toBe(true)   // sich selbst
    expect(canSeeEmployee(ctx, wgvPerson)).toBe(false)   // andere nicht
    expect(canSeeEmployee({ ...ctx }, emp('other', 'GMBH'))).toBe(false) // auch nicht in eigener Firma
    expect(canEditEmployee(ctx, gmbhPerson)).toBe(false) // nicht mal sich selbst (Stammdaten)
  })

  it('Firmenadministrator sieht/bearbeitet nur die eigene Gesellschaft', () => {
    const ctx = { role: 'company_manager' as const, scope: ['GMBH'] as CompanyId[] }
    expect(canSeeEmployee(ctx, gmbhPerson)).toBe(true)
    expect(canSeeEmployee(ctx, wgvPerson)).toBe(false)
    expect(canEditEmployee(ctx, gmbhPerson)).toBe(true)
    expect(canEditEmployee(ctx, wgvPerson)).toBe(false)
  })
})
