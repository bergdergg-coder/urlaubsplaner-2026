import { describe, it, expect } from 'vitest'
import type { Absence, CompanyId, Employee } from '../domain/types'
import { outlookIcs } from './ics'

function emp(id: string, companyId: CompanyId, name: string): Employee {
  return {
    id, name, companyId, jobTitle: '', department: 'Verwaltung', role: 'employee',
    isKeyRole: false, isManagement: false, deputyIds: [], entitlement: 30, carryover: 0, initials: 'XX', hue: 0,
  }
}
const employeeMap: Record<string, Employee> = {
  e1: emp('e1', 'GMBH', 'Anna, Müller'), // Komma im Namen → Escaping testen
  e2: emp('e2', 'AG', 'Ben Berg'),
}
function vac(id: string, employeeId: string, start: string, end: string, p: Partial<Absence> = {}): Absence {
  return { id, employeeId, type: 'vacation', status: 'approved', start, end, createdAt: '2026-01-01', ...p }
}

describe('ICS-Export (outlookIcs)', () => {
  it('DTEND ist exklusiv (letzter Tag + 1), inkl. Jahreswechsel', () => {
    const ics = outlookIcs([vac('a1', 'e1', '2026-12-30', '2026-12-31')], employeeMap)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261230')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
  })
  it('escaped das Komma im Namen (RFC 5545 TEXT)', () => {
    const ics = outlookIcs([vac('a1', 'e1', '2026-06-08', '2026-06-12')], employeeMap)
    expect(ics).toContain('SUMMARY:Urlaub: Anna\\, Müller')
  })
  it('genehmigt → CONFIRMED, Antrag → TENTATIVE mit (Antrag)', () => {
    const ics = outlookIcs([
      vac('a1', 'e1', '2026-06-08', '2026-06-12'),
      vac('a2', 'e2', '2026-07-01', '2026-07-03', { status: 'requested' }),
    ], employeeMap)
    expect(ics).toContain('STATUS:CONFIRMED')
    expect(ics).toContain('STATUS:TENTATIVE')
    expect(ics).toContain('(Antrag)')
  })
  it('abgelehnte Urlaube werden nicht exportiert', () => {
    const ics = outlookIcs([vac('a1', 'e1', '2026-06-08', '2026-06-12', { status: 'rejected' })], employeeMap)
    expect(ics).not.toContain('BEGIN:VEVENT')
  })
  it('Firmenname als zweite Kategorie (Komma als Listentrenner, nicht escaped)', () => {
    const ics = outlookIcs([vac('a1', 'e1', '2026-06-08', '2026-06-12')], employeeMap)
    expect(ics).toContain('CATEGORIES:Urlaub,Würzburger GmbH')
  })
  it('Halbtag-Kennzeichnung in SUMMARY', () => {
    const ics = outlookIcs([vac('a1', 'e1', '2026-06-08', '2026-06-08', { halfDayStart: true })], employeeMap)
    expect(ics).toContain('(½ Tag)')
  })
  it('gültiges VCALENDAR-Gerüst', () => {
    const ics = outlookIcs([vac('a1', 'e1', '2026-06-08', '2026-06-12')], employeeMap)
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })
})
