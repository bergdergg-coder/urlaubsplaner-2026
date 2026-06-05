import type { AbsenceType } from './types'

/* ============================================================================
   Zentrales Schema der Abwesenheitsarten — Label, Farbe und Auswahl an einer
   Stelle, damit Dialog, Plan, Listen und Druck konsistent bleiben.
   Nur 'vacation' zählt gegen den Urlaubsanspruch (countsAsLeave); alle anderen
   werden direkt erfasst (keine Freigabe) und in eigener Farbe dargestellt.
   ========================================================================== */

export interface AbsenceTypeMeta {
  label: string
  short: string
  /** CSS-Farbe; leer = Firmenfarbe (nur Urlaub). */
  color: string
  bg: string
  /** zählt gegen den Urlaubsanspruch (nur Urlaub). */
  countsAsLeave: boolean
  /** Person ist trotzdem verfügbar (z. B. Homeoffice) → kein „abwesend" in Engpass/Summen. */
  present: boolean
}

export const ABSENCE_TYPE: Record<AbsenceType, AbsenceTypeMeta> = {
  vacation:   { label: 'Urlaub',       short: 'Urlaub',  color: '',                     bg: '',                         countsAsLeave: true,  present: false },
  sick:       { label: 'Krankheit',    short: 'Krank',   color: 'var(--color-sick)',    bg: 'var(--color-sick-bg)',     countsAsLeave: false, present: false },
  homeoffice: { label: 'Homeoffice',   short: 'HO',      color: 'var(--color-ho)',      bg: 'var(--color-ho-bg)',       countsAsLeave: false, present: true },
  special:    { label: 'Sonderurlaub', short: 'Sonder',  color: 'var(--color-special)', bg: 'var(--color-special-bg)',  countsAsLeave: false, present: false },
  training:   { label: 'Schulung',     short: 'Schulung', color: 'var(--color-ho)',     bg: 'var(--color-ho-bg)',       countsAsLeave: false, present: true },
  assembly:   { label: 'Montage',      short: 'Montage',  color: 'var(--color-special)', bg: 'var(--color-special-bg)', countsAsLeave: false, present: true },
  other:      { label: 'Sonstiges',    short: 'Sonst.',   color: 'var(--color-faint)',  bg: 'var(--color-line-soft)',   countsAsLeave: false, present: false },
}

/** Im Eintrags-Dialog wählbare Arten (Reihenfolge = Anzeige). */
export const SELECTABLE_TYPES: AbsenceType[] = ['vacation', 'sick', 'homeoffice', 'special']
