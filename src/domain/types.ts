/* ============================================================================
   Domänenmodell — Würzburger Gruppe
   Bewusst sauber getrennt von der UI. Dieselben Typen tragen später eine echte
   API/Datenbank (Group → Company → Employee, Absence, DependencyRule …).
   ========================================================================== */

export type CompanyId = 'WGV' | 'AG' | 'GMBH'

export type Country = 'DE' | 'CH'
/** Feiertagsregion: BW = Baden-Württemberg (DE), CH = Schweiz. */
export type HolidayRegion = 'BW' | 'CH'

export interface Company {
  id: CompanyId
  name: string        // Kurzname für UI
  legalName: string   // vollständiger Name
  country: Country    // Würzburger AG ist ein Schweizer Unternehmen, Rest DE
  location: string    // Standort
  holidayRegion: HolidayRegion
  accent: string      // CSS-Farbe (tonaler Akzent) — Firmenfarbe
  /** Textfarbe auf der Firmenfarbe (Kontrast für farbige Kopfzeilen/Ausdrucke). */
  accentText: string
  /** dezenter Flächenton der Firmenfarbe (Hintergründe). */
  accentSoft: string
  /** Engpass-Schwellen: ab wie vielen gleichzeitig Abwesenden gelb / rot. */
  thresholds: { yellow: number; red: number }
}

/** Rollen-/Berechtigungsstufen. Scope = Gesellschaft oder gesamte Gruppe. */
export type RoleLevel =
  | 'employee'           // Self-Service: nur eigene Abwesenheiten
  | 'company_manager'    // Freigaben + Sicht der eigenen Gesellschaft
  | 'group_management'   // gruppenweite Management-Sicht (Wolfgang)
  | 'admin'              // Konfiguration (Stammdaten, Regeln)

/** Funktionsgruppe — für Rollen-/Gruppen-Filter in Exporten und Auswertungen.
   (z. B. „nur Geschäftsführung & Kader nach Outlook exportieren".) */
export type RoleGroup = 'management' | 'kader' | 'verwaltung' | 'mitarbeiter'

export type Department =
  | 'Geschäftsführung'
  | 'Verwaltung'
  | 'Buchhaltung / Lohn'
  | 'Vertrieb'
  | 'Projektleitung'
  | 'Disposition'
  | 'Technik / Montage'
  | 'IT'
  | 'Empfang'

export interface Employee {
  id: string
  name: string
  /** Eindeutige primäre Gesellschaft (Heimatfirma). Mehrfach-Sichtbarkeit
     entsteht über die Rolle (Administrator sieht alle Gesellschaften). */
  companyId: CompanyId
  jobTitle: string
  department: Department
  role: RoleLevel
  /** Teilzeit: Arbeitstage als Wochentage (Mo=0 … So=6). Fehlt/leer = Vollzeit
     Mo–Fr. Bestimmt, welche Tage als Urlaub zählen und den anteiligen Anspruch. */
  workdays?: number[]
  /** Eintrittsdatum (ISO) — für anteiligen Jahresanspruch (unterjährig). */
  entryDate?: string
  /** Austrittsdatum (ISO) — für anteiligen Jahresanspruch (unterjährig). */
  exitDate?: string
  /** Schlüsselrolle: Funktion, die nicht unbesetzt sein darf. */
  isKeyRole: boolean
  /** Geschäftsführungs-/Leitungsebene (für gruppenweite Abstimmung). */
  isManagement: boolean
  /** Vertretungen (IDs) — für Vertretungs-/Eskalationslogik. */
  deputyIds: string[]
  /** Urlaubsanspruch p.a. + Übertrag aus Vorjahr. */
  entitlement: number
  carryover: number
  initials: string
  /** Farbe für Avatar (deterministisch aus Name). */
  hue: number
}

export type AbsenceType =
  | 'vacation'    // Urlaub
  | 'sick'        // Krank
  | 'homeoffice'  // Homeoffice (anwesend, aber markiert)
  | 'training'    // Schulung / Fortbildung
  | 'assembly'    // Montage / Außeneinsatz
  | 'other'       // Sonstiges

export type AbsenceStatus = 'requested' | 'approved' | 'rejected'

export interface Absence {
  id: string
  employeeId: string
  type: AbsenceType
  status: AbsenceStatus
  /** ISO-Datum (YYYY-MM-DD), inklusiv. */
  start: string
  end: string
  /** Halbtag am ersten/letzten Tag. */
  halfDayStart?: boolean
  halfDayEnd?: boolean
  note?: string
  createdAt: string
  decidedBy?: string
  decidedAt?: string
}

export interface Holiday {
  date: string  // YYYY-MM-DD
  name: string
  region: string
}

/* ---- Abhängigkeits- / Regelmodell ---------------------------------------- */

export type DependencyType =
  | 'mutual_exclusion' // diese Personen dürfen nicht gleichzeitig fehlen
  | 'key_coverage'     // von dieser Gruppe muss min. N anwesend sein
  | 'substitution'     // Person + Vertretung dürfen nicht beide fehlen
  | 'cross_company'    // gesellschaftsübergreifende Abstimmung

export type Severity = 'critical' | 'warning' | 'info'

export interface DependencyRule {
  id: string
  type: DependencyType
  label: string
  description: string
  /** beteiligte Mitarbeiter-IDs. */
  memberIds: string[]
  /** bei key_coverage: wie viele müssen mindestens anwesend sein. */
  minPresent?: number
  /** Geltungsbereich (Gesellschaft) — leer = gruppenweit. */
  companyId?: CompanyId | null
  severity: Severity
  active: boolean
}

/* ---- Ergebnis der Konflikt-Engine ---------------------------------------- */

export type ConflictKind =
  | 'bottleneck'        // Engpass: zu viele gleichzeitig abwesend
  | 'mutual_exclusion'
  | 'key_coverage'
  | 'substitution'
  | 'cross_company'

export interface Conflict {
  id: string
  date: string          // YYYY-MM-DD
  kind: ConflictKind
  severity: Severity
  companyId?: CompanyId | null
  ruleId?: string
  involved: string[]    // Mitarbeiter-IDs
  title: string
  detail: string
}

/** Tageskennzahl pro Gesellschaft — für Heatmap & Timeline-Lastzeile. */
export interface DayLoad {
  date: string
  awayByCompany: Record<CompanyId, string[]>
  awayTotal: string[]
  severity: Severity | 'none'
}
