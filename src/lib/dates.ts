/* Schlanke Datums-Helfer (deutsche Lokalisierung, ohne externe Abhängigkeit). */

export const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]
export const MONTHS_SHORT_DE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]
export const WEEKDAYS_SHORT_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** YYYY-MM-DD aus Datumsteilen. */
export function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function toISO(d: Date): string {
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** Parse YYYY-MM-DD als lokales Datum (kein UTC-Versatz). */
export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Mo=0 … So=6 (deutsche Wochenführung). */
export function weekdayMon0(s: string): number {
  return (parseISO(s).getDay() + 6) % 7
}

export function isWeekend(s: string): boolean {
  return weekdayMon0(s) >= 5
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function daysBetweenInclusive(a: string, b: string): string[] {
  const out: string[] = []
  let cur = a
  let guard = 0
  while (cur <= b && guard < 1000) {
    out.push(cur)
    cur = addDays(cur, 1)
    guard++
  }
  return out
}

export function formatDE(s: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = parseISO(s)
  const wd = opts.weekday ? WEEKDAYS_SHORT_DE[weekdayMon0(s)] + ', ' : ''
  const yr = opts.year === false ? '' : ` ${d.getFullYear()}`
  return `${wd}${d.getDate()}. ${MONTHS_SHORT_DE[d.getMonth()]}${yr}`
}

export function formatRangeDE(start: string, end: string): string {
  if (start === end) return formatDE(start, { weekday: true })
  const a = parseISO(start)
  const b = parseISO(end)
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}.–${b.getDate()}. ${MONTHS_SHORT_DE[b.getMonth()]} ${b.getFullYear()}`
  }
  return `${formatDE(start)} – ${formatDE(end)}`
}

export const YEAR = 2026
export const YEAR_START = iso(YEAR, 1, 1)
export const YEAR_END = iso(YEAR, 12, 31)
// „Heute" = tatsächliches Datum, auf das Planungsjahr begrenzt.
export const TODAY = (() => {
  const t = toISO(new Date())
  return t < YEAR_START ? YEAR_START : t > YEAR_END ? YEAR_END : t
})()

/** Alle Tage des Planungsjahres. */
export function yearDays(): string[] {
  return daysBetweenInclusive(YEAR_START, YEAR_END)
}
