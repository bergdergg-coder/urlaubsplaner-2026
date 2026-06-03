import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Avatar, Modal, CountryFlag } from './ui/ui'
import { COMPANIES, COMPANY_MAP } from '../domain/seed'
import { useData } from '../store/data'
import { YEAR_START, YEAR_END, formatRangeDE } from '../lib/dates'

export interface Draft { id?: string; employeeId: string; start: string; end: string; halfDay?: boolean }

export function AddDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { employees, employeeMap, addAbsence, updateAbsence, removeAbsence } = useData()
  const isEdit = !!draft.id
  const [employeeId, setEmployeeId] = useState(draft.employeeId)
  const [start, setStart] = useState(draft.start)
  const [end, setEnd] = useState(draft.end)
  const [halfDay, setHalfDay] = useState(!!draft.halfDay)

  const e = employeeMap[employeeId]
  if (!e) return null
  const c = COMPANY_MAP[e.companyId]
  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'
  const clamp = (v: string) => (v < YEAR_START ? YEAR_START : v > YEAR_END ? YEAR_END : v)
  const lo = clamp(start <= end ? start : end)
  const hi = halfDay ? lo : clamp(end >= start ? end : start)

  function save() {
    const payload = { employeeId, start: lo, end: hi, halfDayStart: halfDay }
    if (isEdit && draft.id) updateAbsence(draft.id, payload)
    else addAbsence(payload)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Urlaub bearbeiten' : 'Urlaub eintragen'} width={500}>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-canvas)]">
          <Avatar e={e} size={36} />
          <div className="flex-1 min-w-0">
            <select aria-label="Mitarbeiter" value={employeeId} onChange={(ev) => setEmployeeId(ev.target.value)}
              className="w-full bg-transparent text-[14px] font-semibold focusable rounded cursor-pointer">
              {COMPANIES.map((co) => (
                <optgroup key={co.id} label={co.name}>
                  {employees.filter((x) => x.companyId === co.id).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="text-[12px] text-[var(--color-muted)] flex items-center gap-1">
              {c.name} <CountryFlag country={c.country} />
            </div>
          </div>
        </div>

        <div className={`grid gap-3 ${halfDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <label htmlFor="leave-start" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">{halfDay ? 'Tag' : 'Von'}</label>
            <input id="leave-start" type="date" className={field} value={start} min={YEAR_START} max={YEAR_END} onChange={(ev) => setStart(ev.target.value)} />
          </div>
          {!halfDay && (
            <div>
              <label htmlFor="leave-end" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Bis</label>
              <input id="leave-end" type="date" className={field} value={end} min={YEAR_START} max={YEAR_END} onChange={(ev) => setEnd(ev.target.value)} />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-[13px] text-[var(--color-ink-soft)] cursor-pointer select-none">
          <input type="checkbox" checked={halfDay} onChange={(ev) => setHalfDay(ev.target.checked)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
          ½ Tag (nur halber Tag)
        </label>

        <div className="text-[12.5px] text-[var(--color-muted)] bg-[var(--color-canvas)] rounded-lg px-3 py-2">
          {halfDay ? `${formatRangeDE(lo, lo)} · ½ Tag` : formatRangeDE(lo, hi)}
        </div>

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
            <button onClick={save} disabled={!start || (!halfDay && !end)}
              className="focusable h-10 px-5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-40 disabled:cursor-not-allowed">
              {isEdit ? 'Speichern' : 'Eintragen'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
