import type { Holiday, HolidayRegion } from './types'
import { iso, toISO, parseISO } from '../lib/dates'

/* ============================================================================
   Feiertage — algorithmisch für JEDES Jahr berechnet (nicht mehr fest 2026).
   Region:
     BW = Deutschland / Baden-Württemberg
     CH = Schweiz (national + verbreitet)
   Bewegliche Feiertage leiten sich vom Ostersonntag ab (Gauß/Meeus-Formel).
   ========================================================================== */

/** Ostersonntag eines Jahres (Anonymous-Gregorian-Algorithmus). */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Datum relativ zu Ostersonntag (+/- Tage) als ISO-String. */
function fromEaster(year: number, offset: number): string {
  const d = easterSunday(year)
  d.setDate(d.getDate() + offset)
  return toISO(d)
}

function buildHolidays(year: number, region: HolidayRegion): Holiday[] {
  // Bewegliche Feiertage (beide Regionen, gleiche Oster-Basis)
  const karfreitag = fromEaster(year, -2)
  const ostermontag = fromEaster(year, 1)
  const himmelfahrt = fromEaster(year, 39)   // Christi Himmelfahrt / Auffahrt
  const pfingstmontag = fromEaster(year, 50)
  const fronleichnam = fromEaster(year, 60)   // nur BW

  if (region === 'BW') {
    return [
      { date: iso(year, 1, 1), name: 'Neujahr', region },
      { date: iso(year, 1, 6), name: 'Hl. Drei Könige', region },
      { date: karfreitag, name: 'Karfreitag', region },
      { date: ostermontag, name: 'Ostermontag', region },
      { date: iso(year, 5, 1), name: 'Tag der Arbeit', region },
      { date: himmelfahrt, name: 'Christi Himmelfahrt', region },
      { date: pfingstmontag, name: 'Pfingstmontag', region },
      { date: fronleichnam, name: 'Fronleichnam', region },
      { date: iso(year, 10, 3), name: 'Tag der Deutschen Einheit', region },
      { date: iso(year, 11, 1), name: 'Allerheiligen', region },
      { date: iso(year, 12, 25), name: '1. Weihnachtstag', region },
      { date: iso(year, 12, 26), name: '2. Weihnachtstag', region },
    ]
  }
  // CH
  return [
    { date: iso(year, 1, 1), name: 'Neujahr', region },
    { date: iso(year, 1, 2), name: 'Berchtoldstag', region },
    { date: karfreitag, name: 'Karfreitag', region },
    { date: ostermontag, name: 'Ostermontag', region },
    { date: iso(year, 5, 1), name: 'Tag der Arbeit', region },
    { date: himmelfahrt, name: 'Auffahrt', region },
    { date: pfingstmontag, name: 'Pfingstmontag', region },
    { date: iso(year, 8, 1), name: 'Bundesfeier (Nationalfeiertag)', region },
    { date: iso(year, 12, 25), name: 'Weihnachten', region },
    { date: iso(year, 12, 26), name: 'Stephanstag', region },
  ]
}

// Berechnete Jahre werden zwischengespeichert (Map ist günstiger als Neuberechnung).
const cache = new Map<string, Record<string, Holiday>>()
function holidayMap(year: number, region: HolidayRegion): Record<string, Holiday> {
  const key = `${region}-${year}`
  let m = cache.get(key)
  if (!m) {
    m = Object.fromEntries(buildHolidays(year, region).map((h) => [h.date, h]))
    cache.set(key, m)
  }
  return m
}

/** Alle Feiertage eines Jahres (für Anzeige/Tests). */
export function holidaysFor(year: number, region: HolidayRegion): Holiday[] {
  return buildHolidays(year, region)
}

export function holidayFor(dateISO: string, region: HolidayRegion): Holiday | undefined {
  const year = parseISO(dateISO).getFullYear()
  return holidayMap(year, region)[dateISO]
}

export function isHoliday(dateISO: string, region: HolidayRegion): boolean {
  const year = parseISO(dateISO).getFullYear()
  return dateISO in holidayMap(year, region)
}
