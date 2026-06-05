import { describe, it, expect } from 'vitest'
import { parseDate } from './importer'

describe('Import-Datumserkennung', () => {
  it('akzeptiert TT.MM.JJJJ und normalisiert auf ISO', () => {
    expect(parseDate('06.07.2026')).toBe('2026-07-06')
    expect(parseDate('6.7.2026')).toBe('2026-07-06')
  })
  it('akzeptiert ISO und TT/MM/JJJJ', () => {
    expect(parseDate('2026-08-10')).toBe('2026-08-10')
    expect(parseDate('10/08/2026')).toBe('2026-08-10')
  })
  it('akzeptiert zweistellige Jahre (+2000)', () => {
    expect(parseDate('06.07.26')).toBe('2026-07-06')
  })
  it('akzeptiert echte Date-Objekte', () => {
    expect(parseDate(new Date(2026, 6, 6))).toBe('2026-07-06')
  })
  it('lehnt unmögliche Daten ab statt sie stillschweigend zu verschieben', () => {
    expect(parseDate('31.02.2026')).toBeNull() // gäbe sonst fälschlich 03.03.
    expect(parseDate('00.01.2026')).toBeNull()
    expect(parseDate('15.13.2026')).toBeNull()
  })
  it('lehnt Unsinn ab', () => {
    expect(parseDate('kein Datum')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
})
