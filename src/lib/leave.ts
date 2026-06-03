import type { Absence, Employee, HolidayRegion } from '../domain/types'
import { COMPANY_MAP } from '../domain/seed'
import { isHoliday } from '../domain/holidays'
import { daysBetweenInclusive, isWeekend } from './dates'

/** Urlaubs-Arbeitstage einer Abwesenheit (ohne Wochenende & regionale Feiertage, Halbtage 0,5). */
export function vacationDays(a: Absence, region: HolidayRegion): number {
  if (a.type !== 'vacation' || a.status === 'rejected') return 0
  const days = daysBetweenInclusive(a.start, a.end).filter((d) => !isWeekend(d) && !isHoliday(d, region))
  let n = days.length
  if (a.halfDayStart && days.includes(a.start)) n -= 0.5
  if (a.halfDayEnd && a.end !== a.start && days.includes(a.end)) n -= 0.5
  return Math.max(0, n)
}

/** Genommene Urlaubstage eines Mitarbeiters (Region aus seiner Gesellschaft). */
export function takenFor(employee: Employee, absences: Absence[]): number {
  const region = COMPANY_MAP[employee.companyId].holidayRegion
  return absences
    .filter((a) => a.employeeId === employee.id)
    .reduce((s, a) => s + vacationDays(a, region), 0)
}
