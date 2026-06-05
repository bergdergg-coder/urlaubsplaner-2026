import type { AbsenceType } from '../domain/types'

/** Balkenfarbe je Abwesenheitsart (ruhig, markenkonform). */
export const TYPE_COLOR: Record<AbsenceType, string> = {
  vacation: 'var(--color-ww-red)',
  sick: '#8b5cf6',
  homeoffice: '#0ea5e9',
  training: '#0891b2',
  assembly: '#b8740a',
  other: '#6c6c76',
}
