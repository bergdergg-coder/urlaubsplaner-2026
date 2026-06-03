import type { Holiday, HolidayRegion } from './types'
import { iso } from '../lib/dates'

/* Feiertage 2026 — getrennt nach Region.
   WGV + Würzburger GmbH:  Deutschland / Baden-Württemberg
   Würzburger AG:          Schweiz (national + verbreitet; kantonal anpassbar) */

export const HOLIDAYS_BW_2026: Holiday[] = [
  { date: iso(2026, 1, 1), name: 'Neujahr', region: 'BW' },
  { date: iso(2026, 1, 6), name: 'Hl. Drei Könige', region: 'BW' },
  { date: iso(2026, 4, 3), name: 'Karfreitag', region: 'BW' },
  { date: iso(2026, 4, 6), name: 'Ostermontag', region: 'BW' },
  { date: iso(2026, 5, 1), name: 'Tag der Arbeit', region: 'BW' },
  { date: iso(2026, 5, 14), name: 'Christi Himmelfahrt', region: 'BW' },
  { date: iso(2026, 5, 25), name: 'Pfingstmontag', region: 'BW' },
  { date: iso(2026, 6, 4), name: 'Fronleichnam', region: 'BW' },
  { date: iso(2026, 10, 3), name: 'Tag der Deutschen Einheit', region: 'BW' },
  { date: iso(2026, 11, 1), name: 'Allerheiligen', region: 'BW' },
  { date: iso(2026, 12, 25), name: '1. Weihnachtstag', region: 'BW' },
  { date: iso(2026, 12, 26), name: '2. Weihnachtstag', region: 'BW' },
]

export const HOLIDAYS_CH_2026: Holiday[] = [
  { date: iso(2026, 1, 1), name: 'Neujahr', region: 'CH' },
  { date: iso(2026, 1, 2), name: 'Berchtoldstag', region: 'CH' },
  { date: iso(2026, 4, 3), name: 'Karfreitag', region: 'CH' },
  { date: iso(2026, 4, 6), name: 'Ostermontag', region: 'CH' },
  { date: iso(2026, 5, 1), name: 'Tag der Arbeit', region: 'CH' },
  { date: iso(2026, 5, 14), name: 'Auffahrt', region: 'CH' },
  { date: iso(2026, 5, 25), name: 'Pfingstmontag', region: 'CH' },
  { date: iso(2026, 8, 1), name: 'Bundesfeier (Nationalfeiertag)', region: 'CH' },
  { date: iso(2026, 12, 25), name: 'Weihnachten', region: 'CH' },
  { date: iso(2026, 12, 26), name: 'Stephanstag', region: 'CH' },
]

const MAP_BY_REGION: Record<HolidayRegion, Record<string, Holiday>> = {
  BW: Object.fromEntries(HOLIDAYS_BW_2026.map((h) => [h.date, h])),
  CH: Object.fromEntries(HOLIDAYS_CH_2026.map((h) => [h.date, h])),
}

export function holidayFor(dateISO: string, region: HolidayRegion): Holiday | undefined {
  return MAP_BY_REGION[region][dateISO]
}

export function isHoliday(dateISO: string, region: HolidayRegion): boolean {
  return dateISO in MAP_BY_REGION[region]
}
