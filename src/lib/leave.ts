import type { Absence, Employee, HolidayRegion } from '../domain/types'
import { COMPANY_MAP } from '../domain/seed'
import { isHoliday } from '../domain/holidays'
import { daysBetweenInclusive, weekdayMon0, iso, YEAR, YEAR_START, YEAR_END, TODAY } from './dates'

/* ============================================================================
   Urlaubstage-Berechnung & Resturlaubs-Konto
   ----------------------------------------------------------------------------
   Grundregeln (gesetzeskonform):
     • Nur die ARBEITSTAGE der Person zählen (Vollzeit Mo–Fr, Teilzeit nach
       individuellem Wochentagsmuster). Wochenenden/freie Tage zählen nie.
     • Gesetzliche Feiertage der Region zählen nicht (BW bzw. CH, je Gesellschaft).
     • Halbtag am ersten Tag → 0,5 Tage Abzug.
     • Anteiliger Jahresanspruch bei unterjährigem Ein-/Austritt (1/12 je vollem
       Beschäftigungsmonat, auf halbe Tage gerundet).
     • Resturlaub aus dem Vorjahr verfällt, wenn er bis zum Stichtag (31.03.)
       nicht genommen wurde.
   ========================================================================== */

/** Vollzeit-Arbeitstage: Montag–Freitag (Mo=0 … Fr=4). */
export const FULLTIME_WORKDAYS = [0, 1, 2, 3, 4]

/** Arbeitstage (Wochentage) einer Person — Vollzeit Mo–Fr, falls nichts gesetzt. */
export function workdaysOf(e: Employee): number[] {
  return e.workdays && e.workdays.length ? e.workdays : FULLTIME_WORKDAYS
}

/** true, wenn die Person ein abweichendes (Teilzeit-)Arbeitstagsmuster hat. */
export function isPartTime(e: Employee): boolean {
  const wd = workdaysOf(e)
  return !(wd.length === 5 && FULLTIME_WORKDAYS.every((d) => wd.includes(d)))
}

/** Zählt die Arbeitstage (ohne arbeitsfreie Wochentage & Feiertage) in einem Zeitraum. */
export function workdaysInRange(
  start: string,
  end: string,
  region: HolidayRegion,
  halfDayStart = false,
  workdays: number[] = FULLTIME_WORKDAYS,
): number {
  const set = new Set(workdays)
  const days = daysBetweenInclusive(start, end)
    .filter((d) => set.has(weekdayMon0(d)) && !isHoliday(d, region))
  let n = days.length
  if (halfDayStart && days.includes(start)) n -= 0.5
  return Math.max(0, n)
}

/** Urlaubs-Arbeitstage einer einzelnen Abwesenheit (region- & arbeitstagsabhängig). */
export function vacationWorkdays(a: Absence, region: HolidayRegion, workdays?: number[]): number {
  if (a.type !== 'vacation') return 0
  return workdaysInRange(a.start, a.end, region, !!a.halfDayStart, workdays)
}

/** Region (Feiertagskalender) eines Mitarbeiters aus seiner Gesellschaft. */
export function regionOf(employee: Employee): HolidayRegion {
  return COMPANY_MAP[employee.companyId].holidayRegion
}

/** Urlaubstage einer Abwesenheit für einen konkreten Mitarbeiter (Region + Arbeitstage). */
export function absenceDays(a: Absence, employee: Employee): number {
  return vacationWorkdays(a, regionOf(employee), workdaysOf(employee))
}

/** Wirksames Fenster im Planungsjahr: Schnittmenge aus Jahr und Beschäftigung (Ein-/Austritt). */
function windowOf(e: Employee): { start: string; end: string } {
  const start = e.entryDate && e.entryDate > YEAR_START ? e.entryDate : YEAR_START
  const end = e.exitDate && e.exitDate < YEAR_END ? e.exitDate : YEAR_END
  return { start, end }
}

/** Urlaubstage einer Abwesenheit, begrenzt auf Planungsjahr + Beschäftigungsfenster.
   So bleiben Anspruch (anteilig) und Verbrauch konsistent; Urlaube außerhalb (Altdaten,
   Import mit Fremdjahr, vor Eintritt/nach Austritt) zählen nicht ins Konto. */
function windowedWorkdays(a: Absence, employee: Employee, capEnd?: string): number {
  if (a.type !== 'vacation') return 0
  const w = windowOf(employee)
  const lo = a.start < w.start ? w.start : a.start
  let hi = a.end > w.end ? w.end : a.end
  if (capEnd && hi > capEnd) hi = capEnd
  if (lo > hi) return 0
  // Halbtag nur, wenn der echte erste Tag im Fenster liegt (nicht weggeklemmt wurde).
  const half = !!a.halfDayStart && a.start === lo
  return workdaysInRange(lo, hi, regionOf(employee), half, workdaysOf(employee))
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

/** Anteiliger Jahresanspruch bei unterjährigem Ein-/Austritt (1/12 je vollem Monat). */
export function effectiveEntitlement(e: Employee, year = YEAR): number {
  if (!e.entryDate && !e.exitDate) return e.entitlement
  const yStart = iso(year, 1, 1), yEnd = iso(year, 12, 31)
  const entry = e.entryDate && e.entryDate > yStart ? e.entryDate : yStart
  const exit = e.exitDate && e.exitDate < yEnd ? e.exitDate : yEnd
  if (entry > exit) return 0
  let fullMonths = 0
  for (let m = 1; m <= 12; m++) {
    const mStart = iso(year, m, 1)
    const mEnd = iso(year, m, lastDayOfMonth(year, m))
    if (entry <= mStart && exit >= mEnd) fullMonths++
  }
  return Math.round((e.entitlement * fullMonths / 12) * 2) / 2
}

/** Genommene (genehmigte) Urlaubstage eines Mitarbeiters. */
export function takenFor(employee: Employee, absences: Absence[]): number {
  return absences
    .filter((a) => a.employeeId === employee.id && a.type === 'vacation' && a.status === 'approved')
    .reduce((s, a) => s + windowedWorkdays(a, employee), 0)
}

/** Stichtag (MM-TT), bis zu dem der Resturlaub aus dem Vorjahr genommen sein muss. */
export const CARRYOVER_EXPIRY_MMDD = '03-31'

/** Vollständiges Resturlaubs-Konto eines Mitarbeiters. */
export interface LeaveAccount {
  /** Voller Jahresanspruch (bei Vollbeschäftigung im ganzen Jahr). */
  entitlement: number
  /** Tatsächlicher (anteiliger) Jahresanspruch — bei Ein-/Austritt reduziert. */
  entitlementEffective: number
  /** Resturlaub aus dem Vorjahr (roh). */
  carryover: number
  /** Davon verfallen (Stichtag überschritten und nicht genommen). */
  carryoverLapsed: number
  /** Stichtag für den Übertrag (ISO). */
  carryoverExpiry: string
  /** Gesamt verfügbar = anteiliger Anspruch + noch gültiger Übertrag. */
  available: number
  /** Bereits genehmigter (genommener) Urlaub. */
  approved: number
  /** Offen beantragter Urlaub. */
  requested: number
  /** Verbleibender Resturlaub nach genehmigtem Urlaub. */
  remaining: number
  /** Voraussichtlicher Rest, wenn alle offenen Anträge genehmigt würden. */
  remainingIfApproved: number
  /** Teilzeit-Kennzeichen + Arbeitstage. */
  partTime: boolean
  workdays: number[]
}

/** Berechnet das Resturlaubs-Konto eines Mitarbeiters. `today` steuert den Verfall. */
export function leaveAccount(employee: Employee, absences: Absence[], today = TODAY): LeaveAccount {
  const wd = workdaysOf(employee)
  const mine = absences.filter((a) => a.employeeId === employee.id && a.type === 'vacation')
  // Verbrauch konsequent aufs Beschäftigungsfenster im Planungsjahr begrenzen.
  const approved = mine
    .filter((a) => a.status === 'approved')
    .reduce((s, a) => s + windowedWorkdays(a, employee), 0)
  const requested = mine
    .filter((a) => a.status === 'requested')
    .reduce((s, a) => s + windowedWorkdays(a, employee), 0)

  const entitlementEffective = effectiveEntitlement(employee)

  // Resturlaub-Verfall: bis zum Stichtag genommene (genehmigte) Tage verbrauchen
  // zuerst den Übertrag; ein danach nicht gedeckter Rest verfällt.
  const expiry = `${YEAR}-${CARRYOVER_EXPIRY_MMDD}`
  const usedByExpiry = mine
    .filter((a) => a.status === 'approved' && a.start <= expiry)
    .reduce((s, a) => s + windowedWorkdays(a, employee, expiry), 0)
  const carryoverLapsed = today > expiry ? Math.max(0, employee.carryover - usedByExpiry) : 0
  const carryoverEffective = employee.carryover - carryoverLapsed
  const available = entitlementEffective + carryoverEffective

  return {
    entitlement: employee.entitlement,
    entitlementEffective,
    carryover: employee.carryover,
    carryoverLapsed,
    carryoverExpiry: expiry,
    available,
    approved,
    requested,
    remaining: available - approved,
    remainingIfApproved: available - approved - requested,
    partTime: isPartTime(employee),
    workdays: wd,
  }
}
