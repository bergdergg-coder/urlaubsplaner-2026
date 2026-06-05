export interface ImportRow { name: string; start: string; end: string; half: boolean }
export interface ImportResult { rows: ImportRow[]; skipped: number }

function pad(n: number) { return String(n).padStart(2, '0') }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function mk(y: string, m: string, d: string): string | null {
  let yr = parseInt(y, 10); if (yr < 100) yr += 2000
  const mo = parseInt(m, 10), dy = parseInt(d, 10)
  if (mo < 1 || mo > 12 || dy < 1 || dy > 31) return null
  // Gegenprüfen, dass das Datum real existiert (z. B. 31.02. → ungültig, nicht 03.03.).
  const dt = new Date(yr, mo - 1, dy)
  if (dt.getFullYear() !== yr || dt.getMonth() !== mo - 1 || dt.getDate() !== dy) return null
  return `${yr}-${pad(mo)}-${pad(dy)}`
}

/** Datum aus Zelle: Date-Objekt, "TT.MM.JJJJ", "JJJJ-MM-TT" oder "TT/MM/JJJJ". */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return toISO(v)
  if (typeof v === 'string') {
    const s = v.trim()
    let m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(s); if (m) return mk(m[3], m[2], m[1])
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); if (m) return mk(m[1], m[2], m[3])
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); if (m) return mk(m[3], m[2], m[1])
  }
  return null
}

const reName = /^(mitarbeiter|mitarbeiterin|name|vorname|nachname|person)/i
const reStart = /(start|beginn|^ab$|von\b)/i
const reEnd = /(ende|bis\b)/i
const reHalf = /(halb|½)/i
const truthy = /^(ja|x|true|1|wahr|½|halb)/i

export async function parseImportFile(file: File): Promise<ImportResult> {
  const XLSX = await import('xlsx') // erst beim Import laden (kleinere Startgröße)
  const buf = await file.arrayBuffer()
  // raw lesen: KEIN cellDates — sonst wandelt die US-MDY-Heuristik beim Lesen
  // deutsche TT.MM.JJJJ-Strings (Tag/Monat je ≤12) in falsche Daten. Mit raw
  // bleiben CSV-Zellen exakte Strings; echte Excel-Datumszellen werden zu Serien.
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true })
  // Excel-Datums-Serie → ISO; sonst die deutsche parseDate-Regex.
  const toDate = (v: unknown): string | null => {
    if (typeof v === 'number' && isFinite(v)) {
      const o = XLSX.SSF.parse_date_code(v)
      return o && o.y ? `${o.y}-${pad(o.m)}-${pad(o.d)}` : null
    }
    return parseDate(v)
  }
  const rows: ImportRow[] = []
  let skipped = 0
  if (!json.length) return { rows, skipped }

  const keys = Object.keys(json[0])
  const nameKey = keys.find((k) => reName.test(k.trim()))
  const startKey = keys.find((k) => reStart.test(k.trim()))
  const endKey = keys.find((k) => reEnd.test(k.trim()))
  const halfKey = keys.find((k) => reHalf.test(k.trim()))

  for (const obj of json) {
    const name = nameKey ? String(obj[nameKey] ?? '').trim() : ''
    const start = startKey ? toDate(obj[startKey]) : null
    const end = endKey ? toDate(obj[endKey]) : start
    if (!name || !start) { skipped++; continue }
    const half = halfKey ? truthy.test(String(obj[halfKey] ?? '').trim()) : false
    rows.push({ name, start, end: end ?? start, half })
  }
  return { rows, skipped }
}

/** Beispiel-Vorlage als CSV (Semikolon, deutsches Datumsformat). */
export function importTemplateCsv(): string {
  return '﻿' + [
    'Mitarbeiter;Von;Bis;Halbtag',
    'Max Mustermann;06.07.2026;17.07.2026;',
    'Erika Beispiel;10.08.2026;10.08.2026;Ja',
  ].join('\r\n') + '\r\n'
}
