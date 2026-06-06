import type {
  Company, Employee, Absence, CompanyId, RoleLevel, Department,
} from './types'
import { iso, TODAY } from '../lib/dates'

/* ---- Helfer ---------------------------------------------------------------- */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
function hue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

/* ---- Gesellschaften -------------------------------------------------------- */
export const COMPANIES: Company[] = [
  {
    id: 'WGV', name: 'WGV', legalName: 'Würzburger Gruppe Verwaltung',
    country: 'DE', location: 'Stuttgart (DE)', holidayRegion: 'BW',
    accent: 'var(--color-wgv)', accentText: '#3a1d00', accentSoft: 'var(--color-wgv-soft)',
    thresholds: { yellow: 3, red: 5 },
  },
  {
    id: 'AG', name: 'Würzburger AG', legalName: 'Würzburger AG',
    country: 'CH', location: 'Zürich (CH)', holidayRegion: 'CH',
    accent: 'var(--color-ag)', accentText: '#ffffff', accentSoft: 'var(--color-ag-soft)',
    thresholds: { yellow: 2, red: 3 },
  },
  {
    id: 'GMBH', name: 'Würzburger GmbH', legalName: 'Würzburger GmbH',
    country: 'DE', location: 'Stuttgart (DE)', holidayRegion: 'BW',
    accent: 'var(--color-gmbh)', accentText: '#14310a', accentSoft: 'var(--color-gmbh-soft)',
    thresholds: { yellow: 3, red: 5 },
  },
]
export const COMPANY_MAP: Record<CompanyId, Company> =
  Object.fromEntries(COMPANIES.map((c) => [c.id, c])) as Record<CompanyId, Company>

/* ---- Abteilungen (für Stammdaten-Pflege) ---------------------------------- */
export const DEPARTMENTS: Department[] = [
  'Geschäftsführung', 'Verwaltung', 'Buchhaltung / Lohn', 'Vertrieb',
  'Projektleitung', 'Disposition', 'Technik / Montage', 'IT', 'Empfang',
]

/* ---- Mitarbeiter ----------------------------------------------------------- */
type Mini = {
  id: string; name: string; companyId: CompanyId; jobTitle: string; department: Department
  role?: RoleLevel; key?: boolean; mgmt?: boolean; deputies?: string[]
  /** Jahresanspruch (Standard 30). */ ent?: number
  /** Resturlaub aus dem Vorjahr. */ carry?: number
  /** Teilzeit: Arbeitstage (Mo=0 … So=6). */ workdays?: number[]
  /** Eintritt (ISO) — anteiliger Anspruch. */ entry?: string
  /** Austritt (ISO) — anteiliger Anspruch. */ exit?: string
}
const RAW: Mini[] = [
  // WGV — Holding / gruppenweite Verwaltung (DE)
  { id: 'wolfgang-w', name: 'Wolfgang Würzburger', companyId: 'WGV', jobTitle: 'Geschäftsführender Gesellschafter', department: 'Geschäftsführung', role: 'admin', key: true, mgmt: true, deputies: ['susanne-w'], carry: 8 },
  { id: 'susanne-w', name: 'Susanne Würzburger', companyId: 'WGV', jobTitle: 'Leitung Verwaltung', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['wolfgang-w'], carry: 5 },
  { id: 'rebecca-w', name: 'Rebecca Würzburger', companyId: 'WGV', jobTitle: 'Assistenz der GF', department: 'Verwaltung', carry: 3 },
  { id: 'nadja-p', name: 'Nadja Pereira', companyId: 'WGV', jobTitle: 'Leitung Buchhaltung', department: 'Buchhaltung / Lohn', key: true, deputies: ['lirije-r'], carry: 4 },
  { id: 'eric-d', name: 'Eric Dijkhof', companyId: 'WGV', jobTitle: 'Leitung IT (Gruppe)', department: 'IT', role: 'admin', key: true, deputies: ['andreas-s'], carry: 6 },
  { id: 'wolfgang-m', name: 'Wolfgang Müller', companyId: 'WGV', jobTitle: 'Disposition', department: 'Disposition', key: true, deputies: ['viktor-h', 'andreas-s'] },
  { id: 'sascha-e', name: 'Sascha Eichin', companyId: 'WGV', jobTitle: 'Vertrieb', department: 'Vertrieb' },
  // Teilzeit: arbeitet Mo–Mi (3-Tage-Woche), Anspruch entsprechend 18 Tage.
  { id: 'lirije-r', name: 'Lirije Ramqaj', companyId: 'WGV', jobTitle: 'Lohnbuchhaltung (Teilzeit)', department: 'Buchhaltung / Lohn', deputies: ['nadja-p'], ent: 18, workdays: [0, 1, 2] },
  // Austritt unterjährig zum 30.09. → anteiliger Anspruch.
  { id: 'viktor-h', name: 'Viktor Hehn', companyId: 'WGV', jobTitle: 'Sachbearbeitung', department: 'Verwaltung', exit: '2026-09-30' },
  { id: 'andreas-s', name: 'Andreas Schneider', companyId: 'WGV', jobTitle: 'IT-Administration', department: 'IT', deputies: ['eric-d'] },

  // Würzburger AG — Schweiz (CH)
  { id: 'carina-s', name: 'Carina Schwandt', companyId: 'AG', jobTitle: 'Verwaltungsratspräsidentin', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['jochen-s'] },
  { id: 'jochen-s', name: 'Jochen Schwandt', companyId: 'AG', jobTitle: 'Geschäftsführer', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['carina-s'] },
  { id: 'mirko-w', name: 'Mirko Weiß', companyId: 'AG', jobTitle: 'Leitung Projekte', department: 'Projektleitung', key: true, deputies: ['nicolas-g'] },
  { id: 'nicolas-g', name: 'Nicolas Glishaber', companyId: 'AG', jobTitle: 'Projektleiter', department: 'Projektleitung', deputies: ['mirko-w'] },
  { id: 'leonie-s', name: 'Leonie Schwandt', companyId: 'AG', jobTitle: 'Verwaltung / Empfang', department: 'Empfang' },

  // Würzburger GmbH — Deutschland (DE)
  { id: 'bernd-w', name: 'Bernhard Würzburger', companyId: 'GMBH', jobTitle: 'Geschäftsführer', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['frank-w'], carry: 7 },
  { id: 'frank-w', name: 'Frank Würzburger', companyId: 'GMBH', jobTitle: 'Geschäftsführer', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['bernd-w'], carry: 5 },
  { id: 'thomas-mo', name: 'Thomas Möschlin', companyId: 'GMBH', jobTitle: 'Leitung Projekte', department: 'Projektleitung', key: true, deputies: ['markus-t'] },
  { id: 'harald-d', name: 'Harald Dehner', companyId: 'GMBH', jobTitle: 'Leitung Disposition', department: 'Disposition', key: true, deputies: ['ralf-w'] },
  { id: 'ewa-h', name: 'Ewa Höferlin', companyId: 'GMBH', jobTitle: 'Leitung Buchhaltung / Lohn', department: 'Buchhaltung / Lohn', key: true, deputies: ['nadine-r'] },
  { id: 'markus-t', name: 'Markus Textor', companyId: 'GMBH', jobTitle: 'Projektleiter', department: 'Projektleitung', deputies: ['thomas-mo'] },
  { id: 'boehm', name: 'Christian Böhm', companyId: 'GMBH', jobTitle: 'Leitung Montage', department: 'Technik / Montage', key: true, deputies: ['thomas-ma'] },
  { id: 'thomas-ma', name: 'Thomas Männlin', companyId: 'GMBH', jobTitle: 'Monteur', department: 'Technik / Montage', deputies: ['sven-d'] },
  { id: 'nadine-r', name: 'Nadine Rühle', companyId: 'GMBH', jobTitle: 'Buchhaltung', department: 'Buchhaltung / Lohn', deputies: ['ewa-h'] },
  { id: 'ralf-w', name: 'Ralf Werner', companyId: 'GMBH', jobTitle: 'Disposition', department: 'Disposition', deputies: ['harald-d'] },
  { id: 'sven-d', name: 'Sven Döbele', companyId: 'GMBH', jobTitle: 'Monteur', department: 'Technik / Montage', deputies: ['thomas-ma'] },

  // Würzburger GmbH — ergänzt aus GmbH-Urlaubsliste 2026 (Funktion folgt)
  { id: 'klaus-b', name: 'Klaus Bick', companyId: 'GMBH', jobTitle: '', department: 'Projektleitung' },
  { id: 'rouven-r', name: 'Rouven Riede', companyId: 'GMBH', jobTitle: '', department: 'Projektleitung' },
  { id: 'miriam-w', name: 'Miriam Würzburger', companyId: 'GMBH', jobTitle: '', department: 'Buchhaltung / Lohn' },
  { id: 'claudia-s', name: 'Claudia Schürmann', companyId: 'GMBH', jobTitle: '', department: 'Buchhaltung / Lohn' },
  { id: 'doris-mo', name: 'Doris Möschlin', companyId: 'GMBH', jobTitle: '', department: 'Verwaltung' },
  // Eintritt unterjährig zum 01.05. → anteiliger Anspruch (8/12).
  { id: 'andrea-a', name: 'Andrea Ambs', companyId: 'GMBH', jobTitle: '', department: 'Verwaltung', entry: '2026-05-01' },
]

export const EMPLOYEES: Employee[] = RAW.map((m) => ({
  id: m.id,
  name: m.name,
  companyId: m.companyId,
  jobTitle: m.jobTitle,
  department: m.department,
  role: m.role ?? 'employee',
  isKeyRole: m.key ?? false,
  isManagement: m.mgmt ?? false,
  deputyIds: m.deputies ?? [],
  ...(m.workdays ? { workdays: m.workdays } : {}),
  ...(m.entry ? { entryDate: m.entry } : {}),
  ...(m.exit ? { exitDate: m.exit } : {}),
  entitlement: m.ent ?? 30,
  carryover: m.carry ?? 0,
  initials: initials(m.name),
  hue: hue(m.name),
}))

/* ---- Urlaubseinträge -------------------------------------------------------
   Reale WGV-Einträge aus der Excel + realistisch ergänzte Einträge für AG/GmbH.
   Aktuell nur Urlaub als Abwesenheitsart.                                      */
let _n = 0
const U = (employeeId: string, start: string, end: string, note?: string): Absence => ({
  id: `a${++_n}`, employeeId, type: 'vacation', status: 'approved', start, end,
  createdAt: iso(2026, 1, 15), ...(note ? { note } : {}),
})

export const ABSENCES: Absence[] = [
  // Jahresanfang — beeinflusst den Resturlaub-Verfall (Stichtag 31.03.):
  U('nadja-p', iso(2026, 3, 23), iso(2026, 3, 27)),   // 5 Tage → Übertrag (4) voll genutzt, kein Verfall
  U('wolfgang-w', iso(2026, 2, 9), iso(2026, 2, 13)), // 5 Tage → von 8 Übertrag bleiben 3 → verfallen
  U('eric-d', iso(2026, 1, 12), iso(2026, 1, 16)),    // 5 Tage → von 6 Übertrag bleibt 1 → verfällt
  U('eric-d', iso(2026, 6, 10), iso(2026, 6, 15)),
  U('viktor-h', iso(2026, 7, 6), iso(2026, 7, 17)),
  U('rebecca-w', iso(2026, 6, 19), iso(2026, 6, 19)),
  U('rebecca-w', iso(2026, 6, 26), iso(2026, 6, 26)),
  U('rebecca-w', iso(2026, 6, 30), iso(2026, 7, 10)),
  U('nadja-p', iso(2026, 6, 18), iso(2026, 6, 19)),
  U('nadja-p', iso(2026, 7, 20), iso(2026, 7, 31)),
  U('nadja-p', iso(2026, 8, 14), iso(2026, 8, 14)),

  // Würzburger AG — Carina & Jochen Schwandt (Geschäftsleitung), 2026
  U('carina-s', iso(2026, 1, 22), iso(2026, 2, 6)),
  U('jochen-s', iso(2026, 1, 22), iso(2026, 2, 6)),
  U('carina-s', iso(2026, 3, 2), iso(2026, 3, 4), 'Hamburg'),
  U('carina-s', iso(2026, 3, 26), iso(2026, 3, 30), 'Paris'),
  U('jochen-s', iso(2026, 3, 26), iso(2026, 3, 30), 'Paris'),
  U('carina-s', iso(2026, 4, 25), iso(2026, 5, 5)),
  U('jochen-s', iso(2026, 4, 25), iso(2026, 5, 5)),
  U('carina-s', iso(2026, 7, 9), iso(2026, 7, 10), 'Schweiz'),
  U('jochen-s', iso(2026, 7, 9), iso(2026, 7, 10), 'Schweiz'),
  U('carina-s', iso(2026, 7, 15), iso(2026, 7, 18), 'Spanien'),
  U('jochen-s', iso(2026, 7, 15), iso(2026, 7, 18), 'Spanien'),

  // Würzburger GmbH — aus GmbH-Urlaubsliste 2026 (rot markierte Tage)
  U('bernd-w', iso(2026, 1, 2), iso(2026, 1, 2)),
  U('bernd-w', iso(2026, 2, 16), iso(2026, 3, 3)),
  U('bernd-w', iso(2026, 6, 18), iso(2026, 6, 19)),
  U('thomas-mo', iso(2026, 1, 2), iso(2026, 1, 5)),
  U('thomas-mo', iso(2026, 3, 16), iso(2026, 4, 1)),
  U('thomas-mo', iso(2026, 6, 26), iso(2026, 6, 29)),
  U('thomas-mo', iso(2026, 7, 17), iso(2026, 7, 20)),
  U('thomas-mo', iso(2026, 8, 17), iso(2026, 8, 31)),
  U('frank-w', iso(2026, 6, 18), iso(2026, 6, 19)),
  U('frank-w', iso(2026, 7, 1), iso(2026, 7, 3)),
  U('frank-w', iso(2026, 8, 6), iso(2026, 8, 7)),
  U('frank-w', iso(2026, 8, 31), iso(2026, 9, 11)),
  U('ralf-w', iso(2026, 1, 2), iso(2026, 1, 2)),
  U('ralf-w', iso(2026, 3, 23), iso(2026, 3, 27)),
  U('ralf-w', iso(2026, 5, 29), iso(2026, 5, 29)),
  U('ralf-w', iso(2026, 7, 6), iso(2026, 7, 17)),
  U('ralf-w', iso(2026, 10, 5), iso(2026, 10, 9)),
  U('thomas-ma', iso(2026, 1, 2), iso(2026, 1, 5)),
  U('thomas-ma', iso(2026, 8, 24), iso(2026, 9, 11)),
  U('sven-d', iso(2026, 6, 1), iso(2026, 6, 5)),
  U('sven-d', iso(2026, 8, 3), iso(2026, 8, 21)),
  U('harald-d', iso(2026, 1, 2), iso(2026, 1, 5)),
  U('harald-d', iso(2026, 5, 15), iso(2026, 5, 15)),
  U('harald-d', iso(2026, 5, 28), iso(2026, 6, 12)),
  U('markus-t', iso(2026, 1, 2), iso(2026, 1, 5)),
  U('ewa-h', iso(2026, 6, 15), iso(2026, 6, 19)),
  U('ewa-h', iso(2026, 7, 13), iso(2026, 7, 24)),
  U('ewa-h', iso(2026, 12, 21), iso(2026, 12, 31)),
  U('miriam-w', iso(2026, 2, 23), iso(2026, 3, 6)),
  U('miriam-w', iso(2026, 8, 10), iso(2026, 8, 21)),
  U('miriam-w', iso(2026, 10, 26), iso(2026, 10, 30)),
  U('claudia-s', iso(2026, 4, 16), iso(2026, 4, 24)),
  U('claudia-s', iso(2026, 5, 15), iso(2026, 5, 18)),
  U('claudia-s', iso(2026, 6, 1), iso(2026, 6, 5)),
  U('doris-mo', iso(2026, 1, 2), iso(2026, 1, 2)),
  U('doris-mo', iso(2026, 3, 18), iso(2026, 3, 20)),
  U('doris-mo', iso(2026, 3, 25), iso(2026, 3, 27)),
  U('doris-mo', iso(2026, 4, 1), iso(2026, 4, 1)),
  U('doris-mo', iso(2026, 6, 26), iso(2026, 6, 26)),
  U('doris-mo', iso(2026, 7, 17), iso(2026, 7, 17)),
  U('doris-mo', iso(2026, 8, 19), iso(2026, 8, 21)),
  U('doris-mo', iso(2026, 8, 26), iso(2026, 8, 28)),
  U('andrea-a', iso(2026, 5, 4), iso(2026, 5, 22)), // Eintritt 01.05. → erster Urlaub ab Mai
  U('andrea-a', iso(2026, 8, 24), iso(2026, 8, 28)),
  U('nadine-r', iso(2026, 5, 26), iso(2026, 5, 29)),
  U('nadine-r', iso(2026, 6, 2), iso(2026, 6, 5)),
  U('nadine-r', iso(2026, 8, 4), iso(2026, 8, 7)),
  U('nadine-r', iso(2026, 8, 11), iso(2026, 8, 14)),
  U('nadine-r', iso(2026, 8, 18), iso(2026, 8, 21)),
]
