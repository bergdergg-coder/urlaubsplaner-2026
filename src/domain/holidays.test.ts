import { describe, it, expect } from 'vitest'
import { isHoliday, holidayFor, holidaysFor } from './holidays'

describe('Feiertage — algorithmisch für jedes Jahr', () => {
  it('BW 2026: feste & bewegliche Feiertage korrekt', () => {
    expect(isHoliday('2026-01-01', 'BW')).toBe(true) // Neujahr
    expect(isHoliday('2026-01-06', 'BW')).toBe(true) // Hl. Drei Könige
    expect(isHoliday('2026-04-03', 'BW')).toBe(true) // Karfreitag
    expect(isHoliday('2026-04-06', 'BW')).toBe(true) // Ostermontag
    expect(isHoliday('2026-05-14', 'BW')).toBe(true) // Christi Himmelfahrt
    expect(isHoliday('2026-05-25', 'BW')).toBe(true) // Pfingstmontag
    expect(isHoliday('2026-06-04', 'BW')).toBe(true) // Fronleichnam
    expect(isHoliday('2026-10-03', 'BW')).toBe(true) // Deutsche Einheit
    expect(isHoliday('2026-11-01', 'BW')).toBe(true) // Allerheiligen
    expect(isHoliday('2026-12-26', 'BW')).toBe(true) // 2. Weihnachtstag
  })
  it('Fronleichnam nur in BW, nicht in CH', () => {
    expect(isHoliday('2026-06-04', 'BW')).toBe(true)
    expect(isHoliday('2026-06-04', 'CH')).toBe(false)
  })
  it('CH 2026: Berchtoldstag & Bundesfeier (nicht in BW)', () => {
    expect(isHoliday('2026-01-02', 'CH')).toBe(true) // Berchtoldstag
    expect(isHoliday('2026-08-01', 'CH')).toBe(true) // Bundesfeier
    expect(isHoliday('2026-01-02', 'BW')).toBe(false)
    expect(isHoliday('2026-08-01', 'BW')).toBe(false)
  })
  it('berechnet andere Jahre korrekt (Ostersonntag-basiert)', () => {
    // Ostern 2025 = 20.04. → Karfreitag 18.04., Ostermontag 21.04.
    expect(isHoliday('2025-04-18', 'BW')).toBe(true)
    expect(isHoliday('2025-04-21', 'BW')).toBe(true)
    expect(holidayFor('2025-04-18', 'BW')?.name).toBe('Karfreitag')
    // Ostern 2027 = 28.03. → Karfreitag 26.03.
    expect(isHoliday('2027-03-26', 'BW')).toBe(true)
  })
  it('normale Arbeitstage sind keine Feiertage', () => {
    expect(isHoliday('2026-06-05', 'BW')).toBe(false)
    expect(isHoliday('2026-07-15', 'CH')).toBe(false)
  })
  it('holidaysFor liefert die vollständige Jahresliste', () => {
    expect(holidaysFor(2026, 'BW')).toHaveLength(12)
    expect(holidaysFor(2026, 'CH')).toHaveLength(10)
  })
})
