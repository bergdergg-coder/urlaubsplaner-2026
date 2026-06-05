import type { Absence, Employee } from '../domain/types'
import { addDays } from './dates'

/* iCalendar-Export (RFC 5545) — von Outlook nativ erkannt.
   Doppelklick auf die .ics-Datei importiert die Urlaube als ganztägige Termine
   in den bestehenden Outlook-Kalender. Zuverlässiger als der CSV-Import:
   eindeutiges Datumsformat, korrektes Ganztags-Enddatum, stabile Termin-IDs. */

/** YYYY-MM-DD -> YYYYMMDD (iCalendar-DATE-Wert). */
function icsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

/** RFC-5545-Escaping für TEXT-Werte (Backslash, Komma, Semikolon, Zeilenumbruch). */
function escText(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/[,;]/g, (m) => '\\' + m)
    .replace(/\r?\n/g, '\\n')
}

/** Aktueller Zeitstempel als UTC (YYYYMMDDTHHMMSSZ) für DTSTAMP. */
function icsStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

/** Zeile auf max. 75 Oktette falten (RFC 5545); Folgezeilen mit führendem Leerzeichen. */
function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    const limit = out.length === 0 ? 75 : 74 // Folgezeilen tragen ein Leerzeichen
    if (bytes + b > limit) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += b
  }
  if (cur) out.push(cur)
  return out.map((p, i) => (i === 0 ? p : ' ' + p)).join('\r\n')
}

/**
 * Outlook-/Standard-Kalenderdatei: ein GANZTÄGIGER Termin je Urlaub
 * („Urlaub: Name"). Die Termine sind als „frei" markiert, damit ein
 * Gruppen-Überblick die eigene Verfügbarkeit in Outlook nicht blockiert.
 */
export function outlookIcs(
  absences: Absence[],
  employeeMap: Record<string, Employee>,
  calName = 'Urlaub Würzburger Gruppe 2026',
): string {
  const events = absences
    .filter((a) => a.type === 'vacation' && a.status !== 'rejected')
    .sort((a, b) =>
      a.start.localeCompare(b.start) ||
      (employeeMap[a.employeeId]?.name ?? '').localeCompare(employeeMap[b.employeeId]?.name ?? ''))

  const stamp = icsStamp()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Würzburger Gruppe//Urlaubsplaner//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escText(calName)}`,
  ]

  for (const a of events) {
    const name = employeeMap[a.employeeId]?.name ?? a.employeeId
    const half = a.halfDayStart || a.halfDayEnd ? ' (½ Tag)' : ''
    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@urlaubsplaner.wuerzburger-gruppe`,
      `DTSTAMP:${stamp}`,
      // Ganztags: DATE-Werte; DTEND ist exklusiv -> letzter Urlaubstag + 1.
      `DTSTART;VALUE=DATE:${icsDate(a.start)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(a.end, 1))}`,
      `SUMMARY:${escText(`Urlaub: ${name}${half}`)}`,
      'TRANSP:TRANSPARENT',
      'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
      'CATEGORIES:Urlaub',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
