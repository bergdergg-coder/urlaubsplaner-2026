import { describe, it, expect } from 'vitest'
import type { Absence, Employee } from '../domain/types'
import { workdaysInRange, vacationWorkdays, leaveAccount, takenFor, regionOf, effectiveEntitlement, absenceDays, isPartTime } from './leave'

/* Hinweis zu den Testdaten 2026:
   - Fr 05.06.2026 … Mo 08.06.2026 ist eine normale Freitag–Montag-Spanne.
   - Mo 25.05.2026 ist Pfingstmontag (Feiertag in BW und CH).
   - Do 04.06.2026 ist Fronleichnam (Feiertag in BW, NICHT in CH).            */

function emp(p: Partial<Employee> = {}): Employee {
  return {
    id: 'e1', name: 'Test Person', companyId: 'GMBH', jobTitle: '', department: 'Verwaltung',
    role: 'employee', isKeyRole: false, isManagement: false, deputyIds: [],
    entitlement: 30, carryover: 0, initials: 'TP', hue: 0, ...p,
  }
}
let n = 0
function vac(start: string, end: string, p: Partial<Absence> = {}): Absence {
  return { id: `a${n++}`, employeeId: 'e1', type: 'vacation', status: 'approved', start, end, createdAt: '2026-01-01', ...p }
}

describe('Urlaubstage ohne Wochenenden', () => {
  it('zählt Freitag–Montag nur als 2 Tage (Sa/So fallen weg)', () => {
    expect(workdaysInRange('2026-06-05', '2026-06-08', 'BW')).toBe(2)
  })
  it('zählt eine ganze Woche Mo–Fr als 5 Tage', () => {
    expect(workdaysInRange('2026-06-08', '2026-06-12', 'BW')).toBe(5)
  })
  it('ein reines Wochenende ergibt 0 Tage', () => {
    expect(workdaysInRange('2026-06-06', '2026-06-07', 'BW')).toBe(0)
  })
})

describe('Urlaubstage ohne Feiertage', () => {
  it('Freitag–Montag mit Feiertag am Montag (Pfingstmontag) zählt nur 1 Tag', () => {
    // Fr 22.05. zählt, Mo 25.05. ist Pfingstmontag -> fällt weg.
    expect(workdaysInRange('2026-05-22', '2026-05-25', 'BW')).toBe(1)
  })
  it('berücksichtigt regionale Unterschiede: Fronleichnam ist nur in BW frei', () => {
    expect(workdaysInRange('2026-06-04', '2026-06-04', 'BW')).toBe(0) // Feiertag BW
    expect(workdaysInRange('2026-06-04', '2026-06-04', 'CH')).toBe(1) // in CH normaler Arbeitstag
  })
  it('Halbtag am ersten Tag zieht 0,5 ab', () => {
    expect(workdaysInRange('2026-06-05', '2026-06-05', 'BW', true)).toBe(0.5)
  })
})

describe('Halbtag-Sonderfälle (kein 0,5-Abzug, wenn der erste Tag gar nicht zählt)', () => {
  it('Halbtag auf einem Samstag ergibt 0 (nicht -0,5)', () => {
    expect(workdaysInRange('2026-06-06', '2026-06-06', 'BW', true)).toBe(0)
  })
  it('Sa(½)–Mo zählt nur den Montag = 1 (kein Abzug für den Wochenend-Starttag)', () => {
    expect(workdaysInRange('2026-06-06', '2026-06-08', 'BW', true)).toBe(1)
  })
  it('Halbtag auf einem Feiertag ergibt 0', () => {
    // 04.06.2026 = Fronleichnam (BW)
    expect(workdaysInRange('2026-06-04', '2026-06-04', 'BW', true)).toBe(0)
  })
})

describe('Region eines Mitarbeiters', () => {
  it('GmbH/WGV → Baden-Württemberg, AG → Schweiz', () => {
    expect(regionOf(emp({ companyId: 'GMBH' }))).toBe('BW')
    expect(regionOf(emp({ companyId: 'WGV' }))).toBe('BW')
    expect(regionOf(emp({ companyId: 'AG' }))).toBe('CH')
  })
  it('vacationWorkdays nutzt die Region der Gesellschaft', () => {
    const a = vac('2026-06-04', '2026-06-04')
    expect(vacationWorkdays(a, 'BW')).toBe(0)
    expect(vacationWorkdays(a, 'CH')).toBe(1)
  })
})

describe('Resturlaub Vorjahr & Berechnung des Resturlaubs', () => {
  // today vor dem Stichtag (31.03.), damit der Übertrag hier nicht verfällt.
  const beforeExpiry = '2026-02-01'

  it('rechnet Übertrag (carryover) zum verfügbaren Urlaub hinzu', () => {
    const e = emp({ entitlement: 30, carryover: 5 })
    const acct = leaveAccount(e, [], beforeExpiry)
    expect(acct.available).toBe(35)
    expect(acct.remaining).toBe(35)
  })

  it('schlüsselt genehmigt, beantragt und verbleibend korrekt auf', () => {
    const e = emp({ entitlement: 30, carryover: 5 })
    const absences = [
      vac('2026-06-08', '2026-06-12'),                          // 5 Tage genehmigt
      vac('2026-06-15', '2026-06-16', { status: 'requested' }), // 2 Tage beantragt
      vac('2026-07-01', '2026-07-01', { status: 'rejected' }),  // abgelehnt -> zählt nicht
    ]
    const acct = leaveAccount(e, absences, beforeExpiry)
    expect(acct.entitlement).toBe(30)
    expect(acct.carryover).toBe(5)
    expect(acct.available).toBe(35)
    expect(acct.approved).toBe(5)
    expect(acct.requested).toBe(2)
    expect(acct.remaining).toBe(30)            // 35 - 5 genehmigt
    expect(acct.remainingIfApproved).toBe(28)  // 35 - 5 - 2 beantragt
  })

  it('takenFor zählt nur genehmigten Urlaub', () => {
    const e = emp()
    const absences = [
      vac('2026-06-08', '2026-06-12'),                          // genehmigt: 5
      vac('2026-06-15', '2026-06-16', { status: 'requested' }), // beantragt: ignoriert
    ]
    expect(takenFor(e, absences)).toBe(5)
  })
})

describe('Anteiliger Anspruch bei unterjährigem Ein-/Austritt', () => {
  it('voller Anspruch ohne Ein-/Austritt', () => {
    expect(effectiveEntitlement(emp({ entitlement: 30 }))).toBe(30)
  })
  it('Eintritt 01.05. → 8 volle Monate = 8/12 von 30 = 20', () => {
    expect(effectiveEntitlement(emp({ entitlement: 30, entryDate: '2026-05-01' }))).toBe(20)
  })
  it('Eintritt 15.05. (Mai nicht voll) → Juni–Dez = 7/12 = 17,5', () => {
    expect(effectiveEntitlement(emp({ entitlement: 30, entryDate: '2026-05-15' }))).toBe(17.5)
  })
  it('Austritt 30.09. → 9/12 = 22,5', () => {
    expect(effectiveEntitlement(emp({ entitlement: 30, exitDate: '2026-09-30' }))).toBe(22.5)
  })
  it('außerhalb des Jahres beschäftigt → 0', () => {
    expect(effectiveEntitlement(emp({ entitlement: 30, entryDate: '2027-01-01' }))).toBe(0)
  })
  it('fließt in das Konto ein (available)', () => {
    const acct = leaveAccount(emp({ entitlement: 30, entryDate: '2026-05-01' }), [], '2026-02-01')
    expect(acct.entitlementEffective).toBe(20)
    expect(acct.available).toBe(20)
  })
})

describe('Teilzeit (individuelle Arbeitstage)', () => {
  const partTime = emp({ workdays: [0, 1, 2] }) // Mo, Di, Mi
  it('zählt nur die Arbeitstage der Person', () => {
    // Mo 08.06 – So 14.06: Vollzeit 5, Teilzeit (Mo/Di/Mi) = 3
    expect(workdaysInRange('2026-06-08', '2026-06-14', 'BW', false, [0, 1, 2])).toBe(3)
  })
  it('absenceDays nutzt das Arbeitstagsmuster des Mitarbeiters', () => {
    const a = vac('2026-06-08', '2026-06-12') // Mo–Fr
    expect(absenceDays(a, partTime)).toBe(3)  // nur Mo/Di/Mi
    expect(absenceDays(a, emp())).toBe(5)     // Vollzeit Mo–Fr
  })
  it('isPartTime erkennt das abweichende Muster', () => {
    expect(isPartTime(emp())).toBe(false)
    expect(isPartTime(partTime)).toBe(true)
  })
})

describe('Resturlaub-Verfall (Stichtag 31.03.)', () => {
  const ee = () => emp({ entitlement: 30, carryover: 5 })
  it('vor dem Stichtag ist der Übertrag voll verfügbar', () => {
    const acct = leaveAccount(ee(), [], '2026-02-01')
    expect(acct.carryoverLapsed).toBe(0)
    expect(acct.available).toBe(35)
  })
  it('nach dem Stichtag und ungenutzt verfällt der Übertrag vollständig', () => {
    const acct = leaveAccount(ee(), [], '2026-06-01')
    expect(acct.carryoverLapsed).toBe(5)
    expect(acct.available).toBe(30)
  })
  it('teils vor dem Stichtag genutzt → nur der Rest verfällt', () => {
    const acct = leaveAccount(ee(), [vac('2026-02-09', '2026-02-11')], '2026-06-01') // 3 Tage
    expect(acct.approved).toBe(3)
    expect(acct.carryoverLapsed).toBe(2) // 5 - 3
    expect(acct.available).toBe(33)      // 30 + 3
    expect(acct.remaining).toBe(30)      // 33 - 3
  })
  it('genug vor dem Stichtag genommen → kein Verfall', () => {
    const acct = leaveAccount(ee(), [vac('2026-02-09', '2026-02-13')], '2026-06-01') // 5 Tage
    expect(acct.carryoverLapsed).toBe(0)
    expect(acct.available).toBe(35)
  })
})
