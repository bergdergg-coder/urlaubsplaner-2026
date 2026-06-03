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
    accent: 'var(--color-wgv)', thresholds: { yellow: 3, red: 5 },
  },
  {
    id: 'AG', name: 'Würzburger AG', legalName: 'Würzburger AG',
    country: 'CH', location: 'Zürich (CH)', holidayRegion: 'CH',
    accent: 'var(--color-ag)', thresholds: { yellow: 2, red: 3 },
  },
  {
    id: 'GMBH', name: 'Würzburger GmbH', legalName: 'Würzburger GmbH',
    country: 'DE', location: 'Stuttgart (DE)', holidayRegion: 'BW',
    accent: 'var(--color-gmbh)', thresholds: { yellow: 3, red: 5 },
  },
]
export const COMPANY_MAP: Record<CompanyId, Company> =
  Object.fromEntries(COMPANIES.map((c) => [c.id, c])) as Record<CompanyId, Company>

/* ---- Mitarbeiter ----------------------------------------------------------- */
type Mini = {
  id: string; name: string; companyId: CompanyId; jobTitle: string; department: Department
  role?: RoleLevel; key?: boolean; mgmt?: boolean; deputies?: string[]
}
const RAW: Mini[] = [
  // WGV — Holding / gruppenweite Verwaltung (DE)
  { id: 'wolfgang-w', name: 'Wolfgang Würzburger', companyId: 'WGV', jobTitle: 'Geschäftsführender Gesellschafter', department: 'Geschäftsführung', role: 'group_management', key: true, mgmt: true, deputies: ['susanne-w'] },
  { id: 'susanne-w', name: 'Susanne Würzburger', companyId: 'WGV', jobTitle: 'Leitung Verwaltung', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['wolfgang-w'] },
  { id: 'rebecca-w', name: 'Rebecca Würzburger', companyId: 'WGV', jobTitle: 'Assistenz der GF', department: 'Verwaltung' },
  { id: 'nadja-p', name: 'Nadja Pereira', companyId: 'WGV', jobTitle: 'Leitung Buchhaltung', department: 'Buchhaltung / Lohn', key: true, deputies: ['lirije-r'] },
  { id: 'eric-d', name: 'Eric Dijkhof', companyId: 'WGV', jobTitle: 'Leitung IT (Gruppe)', department: 'IT', role: 'admin', key: true, deputies: ['andreas-s'] },
  { id: 'wolfgang-m', name: 'Wolfgang Müller', companyId: 'WGV', jobTitle: 'Disposition', department: 'Disposition', key: true, deputies: ['viktor-h'] },
  { id: 'sascha-e', name: 'Sascha Eichin', companyId: 'WGV', jobTitle: 'Vertrieb', department: 'Vertrieb' },
  { id: 'lirije-r', name: 'Lirije Ramqaj', companyId: 'WGV', jobTitle: 'Lohnbuchhaltung', department: 'Buchhaltung / Lohn', deputies: ['nadja-p'] },
  { id: 'viktor-h', name: 'Viktor Hehn', companyId: 'WGV', jobTitle: 'Sachbearbeitung', department: 'Verwaltung' },
  { id: 'andreas-s', name: 'Andreas Schneider', companyId: 'WGV', jobTitle: 'IT-Administration', department: 'IT', deputies: ['eric-d'] },

  // Würzburger AG — Schweiz (CH)
  { id: 'carina-s', name: 'Carina Schwandt', companyId: 'AG', jobTitle: 'Verwaltungsratspräsidentin', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['jochen-s'] },
  { id: 'jochen-s', name: 'Jochen Schwandt', companyId: 'AG', jobTitle: 'Geschäftsführer', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['carina-s'] },
  { id: 'mirko-w', name: 'Mirko Weiß', companyId: 'AG', jobTitle: 'Leitung Projekte', department: 'Projektleitung', key: true, deputies: ['nicolas-g'] },
  { id: 'nicolas-g', name: 'Nicolas Glishaber', companyId: 'AG', jobTitle: 'Projektleiter', department: 'Projektleitung', deputies: ['mirko-w'] },
  { id: 'leonie-s', name: 'Leonie Schwandt', companyId: 'AG', jobTitle: 'Verwaltung / Empfang', department: 'Empfang' },

  // Würzburger GmbH — Deutschland (DE)
  { id: 'bernd-w', name: 'Bernd Würzburger', companyId: 'GMBH', jobTitle: 'Geschäftsführer', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['frank-w'] },
  { id: 'frank-w', name: 'Frank Würzburger', companyId: 'GMBH', jobTitle: 'Geschäftsführer', department: 'Geschäftsführung', role: 'company_manager', key: true, mgmt: true, deputies: ['bernd-w'] },
  { id: 'thomas-mo', name: 'Thomas Möschlin', companyId: 'GMBH', jobTitle: 'Leitung Projekte', department: 'Projektleitung', key: true, deputies: ['markus-t'] },
  { id: 'harald-d', name: 'Harald Dehner', companyId: 'GMBH', jobTitle: 'Leitung Disposition', department: 'Disposition', key: true, deputies: ['ralf-w'] },
  { id: 'ewa-h', name: 'Ewa Höferlin', companyId: 'GMBH', jobTitle: 'Leitung Buchhaltung / Lohn', department: 'Buchhaltung / Lohn', key: true, deputies: ['nadine-r'] },
  { id: 'markus-t', name: 'Markus Textor', companyId: 'GMBH', jobTitle: 'Projektleiter', department: 'Projektleitung', deputies: ['thomas-mo'] },
  { id: 'boehm', name: 'Herr Böhm', companyId: 'GMBH', jobTitle: 'Leitung Montage', department: 'Technik / Montage', key: true, deputies: ['thomas-ma'] },
  { id: 'thomas-ma', name: 'Thomas Männlin', companyId: 'GMBH', jobTitle: 'Monteur', department: 'Technik / Montage', deputies: ['sven-d'] },
  { id: 'nadine-r', name: 'Nadine Rühle', companyId: 'GMBH', jobTitle: 'Buchhaltung', department: 'Buchhaltung / Lohn', deputies: ['ewa-h'] },
  { id: 'ralf-w', name: 'Ralf Werner', companyId: 'GMBH', jobTitle: 'Disposition', department: 'Disposition', deputies: ['harald-d'] },
  { id: 'sven-d', name: 'Sven Döbele', companyId: 'GMBH', jobTitle: 'Monteur', department: 'Technik / Montage', deputies: ['thomas-ma'] },
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
  entitlement: 30,
  carryover: 0,
  initials: initials(m.name),
  hue: hue(m.name),
}))
export const EMPLOYEE_MAP: Record<string, Employee> =
  Object.fromEntries(EMPLOYEES.map((e) => [e.id, e]))

/* ---- Urlaubseinträge -------------------------------------------------------
   Reale WGV-Einträge aus der Excel + realistisch ergänzte Einträge für AG/GmbH.
   Aktuell nur Urlaub als Abwesenheitsart.                                      */
let _n = 0
const U = (employeeId: string, start: string, end: string, note?: string): Absence => ({
  id: `a${++_n}`, employeeId, type: 'vacation', status: 'approved', start, end,
  createdAt: iso(2026, 1, 15), ...(note ? { note } : {}),
})

export const ABSENCES: Absence[] = [
  U('eric-d', iso(2026, 6, 10), iso(2026, 6, 15)),
  U('viktor-h', iso(2026, 7, 6), iso(2026, 7, 17)),
  U('rebecca-w', iso(2026, 6, 19), iso(2026, 6, 19)),
  U('rebecca-w', iso(2026, 6, 26), iso(2026, 6, 26)),
  U('rebecca-w', iso(2026, 6, 30), iso(2026, 7, 10)),
  U('nadja-p', iso(2026, 6, 18), iso(2026, 6, 19)),
  U('nadja-p', iso(2026, 7, 20), iso(2026, 7, 31)),
  U('nadja-p', iso(2026, 8, 14), iso(2026, 8, 14)),
]
