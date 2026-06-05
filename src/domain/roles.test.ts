import { describe, it, expect } from 'vitest'
import type { CompanyId, Department, Employee } from './types'
import { roleGroupOf, ROLE_GROUP_LABEL } from './roles'

function emp(p: { department: Department; key?: boolean; mgmt?: boolean; companyId?: CompanyId }): Employee {
  return {
    id: 'x', name: 'x', companyId: p.companyId ?? 'GMBH', jobTitle: '', department: p.department,
    role: 'employee', isKeyRole: !!p.key, isManagement: !!p.mgmt, deputyIds: [],
    entitlement: 30, carryover: 0, initials: 'XX', hue: 0,
  }
}

describe('Funktionsgruppen (für Rollen-Export)', () => {
  it('Geschäftsführung über isManagement', () => {
    expect(roleGroupOf(emp({ department: 'Vertrieb', mgmt: true }))).toBe('management')
  })
  it('Geschäftsführung über Abteilung', () => {
    expect(roleGroupOf(emp({ department: 'Geschäftsführung' }))).toBe('management')
  })
  it('Kader über Schlüsselrolle', () => {
    expect(roleGroupOf(emp({ department: 'Disposition', key: true }))).toBe('kader')
  })
  it('Verwaltung über Verwaltungsabteilungen', () => {
    expect(roleGroupOf(emp({ department: 'Verwaltung' }))).toBe('verwaltung')
    expect(roleGroupOf(emp({ department: 'Buchhaltung / Lohn' }))).toBe('verwaltung')
    expect(roleGroupOf(emp({ department: 'IT' }))).toBe('verwaltung')
  })
  it('Mitarbeiter als Standard (operative Bereiche ohne Schlüsselrolle)', () => {
    expect(roleGroupOf(emp({ department: 'Technik / Montage' }))).toBe('mitarbeiter')
    expect(roleGroupOf(emp({ department: 'Vertrieb' }))).toBe('mitarbeiter')
  })
  it('Management hat Vorrang vor Schlüsselrolle', () => {
    expect(roleGroupOf(emp({ department: 'Geschäftsführung', key: true, mgmt: true }))).toBe('management')
  })
  it('alle Gruppen haben ein deutsches Label', () => {
    expect(ROLE_GROUP_LABEL.management).toBe('Geschäftsführung')
    expect(ROLE_GROUP_LABEL.kader).toBe('Kader')
    expect(ROLE_GROUP_LABEL.verwaltung).toBe('Verwaltung')
    expect(ROLE_GROUP_LABEL.mitarbeiter).toBe('Mitarbeiter')
  })
})
