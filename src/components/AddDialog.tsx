import { useState } from 'react'
import { Trash2, CalendarRange, Thermometer, Home, Star } from 'lucide-react'
import { Avatar, Modal, CountryFlag } from './ui/ui'
import { COMPANIES, COMPANY_MAP } from '../domain/seed'
import { ABSENCE_TYPE, SELECTABLE_TYPES } from '../domain/absenceTypes'
import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import type { AbsenceType } from '../domain/types'

const TYPE_ICON: Partial<Record<AbsenceType, typeof CalendarRange>> = {
  vacation: CalendarRange, sick: Thermometer, homeoffice: Home, special: Star,
}
import { YEAR_START, YEAR_END, formatRangeDE } from '../lib/dates'
import { leaveAccount, regionOf, workdaysInRange, workdaysOf } from '../lib/leave'

export interface Draft { id?: string; employeeId: string; start: string; end: string; halfDay?: boolean; status?: 'requested' | 'approved'; note?: string; type?: AbsenceType }

export function AddDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { employees, employeeMap, absences, addAbsence, updateAbsence, removeAbsence } = useData()
  const { scopeCompanies, isManager, isEmployee, selfEmployeeId } = useAuth()
  const isEdit = !!draft.id
  // Mitarbeiter im Self-Service: immer die eigene Person, kein Genehmigen.
  const [employeeId, setEmployeeId] = useState(isEmployee && selfEmployeeId ? selfEmployeeId : draft.employeeId)
  const [type, setType] = useState<AbsenceType>(draft.type ?? 'vacation')
  const [start, setStart] = useState(draft.start)
  const [end, setEnd] = useState(draft.end)
  const [halfDay, setHalfDay] = useState(!!draft.halfDay)
  const [note, setNote] = useState(draft.note ?? '')
  const [status, setStatus] = useState<'approved' | 'requested'>(
    isEmployee ? 'requested' : (draft.status ?? 'approved'),
  )
  const meta = ABSENCE_TYPE[type]
  const notVacation = type !== 'vacation'

  const e = employeeMap[employeeId]
  if (!e) return null
  const c = COMPANY_MAP[e.companyId]
  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'
  const clamp = (v: string) => (v < YEAR_START ? YEAR_START : v > YEAR_END ? YEAR_END : v)
  const lo = clamp(start <= end ? start : end)
  const hi = halfDay ? lo : clamp(end >= start ? end : start)

  // Tatsächliche Urlaubstage dieser Eingabe (ohne arbeitsfreie Tage & Feiertage,
  // gemäß dem individuellen Arbeitstagsmuster der Person).
  const days = workdaysInRange(lo, hi, regionOf(e), halfDay, workdaysOf(e))
  const acct = leaveAccount(e, absences)
  // Vorschau auf Basis „verbleibend inkl. offener Anträge" (konsistent zur Anzeige
  // unten). Beim Bearbeiten zählen die bisherigen Tage des Eintrags zuerst zurück.
  const originalDays = isEdit ? workdaysInRange(draft.start, draft.end, regionOf(e), !!draft.halfDay, workdaysOf(e)) : 0
  const projectedRemaining = acct.remainingIfApproved + originalDays - days

  function save() {
    const payload = { employeeId, start: lo, end: hi, halfDayStart: halfDay, status, note, type }
    if (isEdit && draft.id) updateAbsence(draft.id, payload)
    else addAbsence(payload)
    onClose()
  }

  const title = isEdit ? `${meta.label} bearbeiten` : (notVacation ? `${meta.label} eintragen` : (isEmployee ? 'Urlaub beantragen' : 'Urlaub eintragen'))

  return (
    <Modal open onClose={onClose} title={title} width={500}>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-canvas)]">
          <Avatar e={e} size={36} />
          <div className="flex-1 min-w-0">
            {isEmployee ? (
              <div className="text-[14px] font-semibold">{e.name}</div>
            ) : (
              <select aria-label="Mitarbeiter" value={employeeId} onChange={(ev) => setEmployeeId(ev.target.value)}
                className="w-full bg-transparent text-[14px] font-semibold focusable rounded cursor-pointer">
                {COMPANIES.filter((co) => scopeCompanies.includes(co.id)).map((co) => (
                  <optgroup key={co.id} label={co.name}>
                    {employees.filter((x) => x.companyId === co.id).map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            <div className="text-[12px] text-[var(--color-muted)] flex items-center gap-1">
              {c.name} <CountryFlag country={c.country} />
            </div>
          </div>
        </div>

        {/* Abwesenheitsart — nur Urlaub durchläuft die Freigabe, der Rest wird direkt erfasst. */}
        <div className="flex flex-wrap gap-0.5 p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
          {SELECTABLE_TYPES.map((v) => {
            const Icon = TYPE_ICON[v] ?? CalendarRange
            return (
              <button key={v} type="button" onClick={() => setType(v)} aria-pressed={type === v}
                className={`focusable inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors ${type === v ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                <Icon size={14} /> {ABSENCE_TYPE[v].label}
              </button>
            )
          })}
        </div>

        <div className={`grid gap-3 ${halfDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <label htmlFor="leave-start" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">{halfDay ? 'Tag' : 'Von'}</label>
            <input id="leave-start" type="date" autoFocus className={field} value={start} min={YEAR_START} max={YEAR_END} onChange={(ev) => setStart(clamp(ev.target.value))} />
          </div>
          {!halfDay && (
            <div>
              <label htmlFor="leave-end" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Bis</label>
              <input id="leave-end" type="date" className={field} value={end} min={start} max={YEAR_END} onChange={(ev) => setEnd(clamp(ev.target.value))} />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-[13px] text-[var(--color-ink-soft)] cursor-pointer select-none">
          <input type="checkbox" checked={halfDay} onChange={(ev) => setHalfDay(ev.target.checked)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
          ½ Tag
        </label>

        <div>
          <label htmlFor="leave-note" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Kommentar <span className="text-[var(--color-faint)] font-normal">(optional)</span></label>
          <textarea id="leave-note" rows={2} value={note} onChange={(ev) => setNote(ev.target.value)}
            placeholder={isEmployee ? 'z. B. Familienurlaub, Begründung …' : 'interne Notiz zum Eintrag …'}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable resize-none" />
        </div>

        {/* Direkt genehmigen nur für Verwalter bei URLAUB; andere Arten werden direkt erfasst. */}
        {isManager && !notVacation && (
          <div>
            <div className="text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Eintragsart</div>
            <div className="inline-flex p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
              {([['approved', 'Direkt genehmigt'], ['requested', 'Als Antrag']] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setStatus(v)} aria-pressed={status === v}
                  className={`focusable px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${status === v ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>{l}</button>
              ))}
            </div>
            {status === 'requested' && <p className="text-[11.5px] text-[var(--color-muted)] mt-1.5">Erscheint unter „Freigaben" und zählt erst nach Genehmigung als Urlaub.</p>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-[12.5px] bg-[var(--color-canvas)] rounded-lg px-3 py-2">
          <span className="text-[var(--color-muted)]">{halfDay ? `${formatRangeDE(lo, lo)} · ½ Tag` : formatRangeDE(lo, hi)}</span>
          <span className="tnum font-semibold" style={{ color: days === 0 ? 'var(--color-warn)' : 'var(--color-ink)' }}>{days} {notVacation ? 'Tag' : 'Urlaubstag'}{days === 1 ? '' : 'e'}</span>
        </div>
        {days === 0 ? (
          <div className="text-[11.5px] text-[var(--color-warn)] -mt-2 px-1">Im gewählten Zeitraum liegen keine Arbeitstage (nur Wochenende/Feiertage).</div>
        ) : notVacation ? (
          <div className="text-[11.5px] text-[var(--color-muted)] -mt-2 px-1">{meta.label} wird direkt erfasst und zählt nicht gegen den Urlaubsanspruch.</div>
        ) : (
          <div className="text-[11.5px] text-[var(--color-muted)] -mt-2 px-1">
            Resturlaub {e.name.split(' ')[0]}: {acct.remainingIfApproved} → <span className={projectedRemaining < 0 ? 'text-[var(--color-crit)] font-semibold' : 'font-semibold text-[var(--color-ink-soft)]'}>{projectedRemaining}</span> Tage
            {acct.requested > 0 ? ` · ${acct.requested} bereits beantragt` : ''}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {isEdit && (
              <button onClick={() => { if (draft.id) removeAbsence(draft.id); onClose() }}
                className="focusable inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[13px] font-medium text-[var(--color-crit)] hover:bg-[var(--color-crit-bg)]">
                <Trash2 size={15} /> Löschen
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="focusable h-10 px-4 rounded-lg text-[13px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]">Abbrechen</button>
            <button onClick={save} disabled={!start || (!halfDay && !end) || days === 0}
              className="focusable h-10 px-5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-40 disabled:cursor-not-allowed">
              {isEdit ? 'Speichern' : (notVacation ? `${meta.label} eintragen` : (status === 'requested' ? 'Antrag stellen' : 'Eintragen'))}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
