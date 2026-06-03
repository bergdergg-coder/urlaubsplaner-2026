import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, UserPlus } from 'lucide-react'
import { Card, Avatar, CountryFlag, Modal } from '../components/ui/ui'
import { COMPANIES } from '../domain/seed'
import { useData, type EmployeeInput } from '../store/data'
import { takenFor } from '../lib/leave'
import type { CompanyId, Employee } from '../domain/types'

export function Stammdaten() {
  const { employees, absences, addEmployee, updateEmployee, removeEmployee } = useData()
  const [dialog, setDialog] = useState<null | { mode: 'add' | 'edit'; emp?: Employee }>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div className="px-6 py-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Stammdaten</h2>
          <p className="text-[13px] text-[var(--color-muted)] mt-0.5">Mitarbeiter anlegen, ändern und Urlaubsanspruch pflegen.</p>
        </div>
        <button onClick={() => setDialog({ mode: 'add' })}
          className="focusable inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] transition-colors shadow-sm">
          <Plus size={16} /> Mitarbeiter
        </button>
      </div>

      <div className="space-y-4">
        {COMPANIES.map((c) => {
          const emps = employees.filter((e) => e.companyId === c.id)
          return (
            <Card key={c.id} pad={false}>
              <div className="px-5 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.accent }} />
                <span className="text-[14px] font-semibold">{c.legalName}</span>
                <CountryFlag country={c.country} />
                <span className="text-[12px] text-[var(--color-muted)]">· {c.location} · {emps.length}</span>
              </div>
              {emps.length === 0 ? (
                <div className="px-5 py-6 text-[13px] text-[var(--color-muted)]">Noch keine Mitarbeiter in dieser Gesellschaft.</div>
              ) : (
                <div className="divide-y divide-[var(--color-line-soft)]">
                  {emps.map((e) => (
                    <div key={e.id} className="px-5 py-2.5 flex items-center gap-3">
                      <Avatar e={e} size={34} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium truncate">{e.name}</div>
                        <div className="text-[12px] text-[var(--color-muted)] tnum">
                          {e.entitlement}{e.carryover ? `+${e.carryover}` : ''} Tage · {takenFor(e, absences)} genommen · <span className="font-medium text-[var(--color-ink-soft)]">{e.entitlement + e.carryover - takenFor(e, absences)} übrig</span>
                        </div>
                      </div>
                      {confirmId === e.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12.5px] text-[var(--color-muted)]">Löschen?</span>
                          <button onClick={() => { removeEmployee(e.id); setConfirmId(null) }} aria-label="Löschen bestätigen"
                            className="focusable p-1.5 rounded-lg bg-[var(--color-crit-bg)] text-[var(--color-crit)] hover:opacity-80"><Check size={15} /></button>
                          <button onClick={() => setConfirmId(null)} aria-label="Abbrechen"
                            className="focusable p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-line-soft)]"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDialog({ mode: 'edit', emp: e })} aria-label={`${e.name} bearbeiten`}
                            className="focusable p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"><Pencil size={15} /></button>
                          <button onClick={() => setConfirmId(e.id)} aria-label={`${e.name} löschen`}
                            className="focusable p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-crit-bg)] hover:text-[var(--color-crit)]"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {dialog && (
        <EmployeeDialog
          emp={dialog.emp}
          onClose={() => setDialog(null)}
          onSave={(v) => {
            if (dialog.mode === 'edit' && dialog.emp) updateEmployee(dialog.emp.id, v)
            else addEmployee(v)
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}

function EmployeeDialog({ emp, onClose, onSave }: {
  emp?: Employee
  onClose: () => void
  onSave: (v: EmployeeInput) => void
}) {
  const [name, setName] = useState(emp?.name ?? '')
  const [companyId, setCompanyId] = useState<CompanyId>(emp?.companyId ?? COMPANIES[0].id)
  const [entitlement, setEntitlement] = useState(emp?.entitlement ?? 30)
  const [carryover, setCarryover] = useState(emp?.carryover ?? 0)
  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'
  const valid = name.trim().length > 0

  return (
    <Modal open onClose={onClose} title={emp ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter anlegen'} width={480}>
      <div className="space-y-4">
        <div>
          <label htmlFor="emp-name" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Name</label>
          <input id="emp-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" autoFocus />
        </div>
        <div>
          <label htmlFor="emp-co" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Gesellschaft</label>
          <select id="emp-co" className={`${field} cursor-pointer`} value={companyId} onChange={(e) => setCompanyId(e.target.value as CompanyId)}>
            {COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.legalName}{c.country === 'CH' ? ' (Schweiz)' : ''}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="emp-ent" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Urlaubsanspruch / Jahr</label>
            <input id="emp-ent" type="number" min={0} max={60} className={field} value={entitlement}
              onChange={(e) => setEntitlement(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label htmlFor="emp-carry" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Übertrag Vorjahr</label>
            <input id="emp-carry" type="number" min={0} max={60} className={field} value={carryover}
              onChange={(e) => setCarryover(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="focusable h-10 px-4 rounded-lg text-[13px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]">Abbrechen</button>
          <button onClick={() => valid && onSave({ name, companyId, entitlement, carryover })} disabled={!valid}
            className="focusable inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-40 disabled:cursor-not-allowed">
            <UserPlus size={15} /> {emp ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
