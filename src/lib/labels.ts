import type { AbsenceStatus, AbsenceType, ConflictKind, RoleLevel, Severity } from '../domain/types'

export const TYPE_LABEL: Record<AbsenceType, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  homeoffice: 'Homeoffice',
  training: 'Schulung',
  assembly: 'Montage',
  other: 'Sonstiges',
}

/** Balkenfarbe je Abwesenheitsart (ruhig, markenkonform). */
export const TYPE_COLOR: Record<AbsenceType, string> = {
  vacation: 'var(--color-ww-red)',
  sick: '#8b5cf6',
  homeoffice: '#0ea5e9',
  training: '#0891b2',
  assembly: '#b8740a',
  other: '#6c6c76',
}

export const STATUS_LABEL: Record<AbsenceStatus, string> = {
  requested: 'Beantragt',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Kritisch',
  warning: 'Warnung',
  info: 'Hinweis',
}

export const SEVERITY_COLOR: Record<Severity, { fg: string; bg: string }> = {
  critical: { fg: 'var(--color-crit)', bg: 'var(--color-crit-bg)' },
  warning: { fg: 'var(--color-warn)', bg: 'var(--color-warn-bg)' },
  info: { fg: 'var(--color-info)', bg: 'var(--color-info-bg)' },
}

export const KIND_LABEL: Record<ConflictKind, string> = {
  bottleneck: 'Engpass',
  mutual_exclusion: 'Gleichzeitig-Konflikt',
  key_coverage: 'Schlüsselrolle unbesetzt',
  substitution: 'Vertretung fehlt',
  cross_company: 'Gruppenführung',
}

export const ROLE_LABEL: Record<RoleLevel, string> = {
  employee: 'Mitarbeiter',
  company_manager: 'Gesellschafts-Leitung',
  group_management: 'Gruppenleitung',
  admin: 'Administration',
}
