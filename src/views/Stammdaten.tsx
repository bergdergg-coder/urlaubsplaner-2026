import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, UserPlus, Upload, FileDown, KeyRound, ShieldCheck, Database, Download } from 'lucide-react'
import { Card, Avatar, CountryFlag, Modal } from '../components/ui/ui'
import { COMPANIES, COMPANY_MAP, DEPARTMENTS } from '../domain/seed'
import { roleGroupLabelOf } from '../domain/roles'
import { useData, type EmployeeInput } from '../store/data'
import { useAuth, type AccountRole, type Account } from '../store/auth'
import { leaveAccount, effectiveEntitlement, isPartTime } from '../lib/leave'
import { WEEKDAYS_SHORT_DE } from '../lib/dates'
import { parseImportFile, importTemplateCsv, type ImportRow } from '../lib/importer'
import { downloadText } from '../lib/csv'
import type { CompanyId, Department, Employee } from '../domain/types'

export function Stammdaten() {
  const { employees, absences, addEmployee, updateEmployee, removeEmployee } = useData()
  const { scopeCompanies, isSuper, perms, canEditEmployee } = useAuth()
  const [dialog, setDialog] = useState<null | { mode: 'add' | 'edit'; emp?: Employee }>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const companies = COMPANIES.filter((c) => scopeCompanies.includes(c.id))

  return (
    <div className="px-6 py-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Stammdaten</h2>
          <p className="text-[13px] text-[var(--color-muted)] mt-0.5">Mitarbeiter anlegen, ändern, Urlaube importieren und Zugänge pflegen.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadText('Urlaub-Importvorlage.csv', importTemplateCsv())}
            className="focusable inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]" title="Beispiel-Vorlage (CSV) herunterladen">
            <FileDown size={15} /> Vorlage
          </button>
          <button onClick={() => setImporting(true)}
            className="focusable inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
            <Upload size={15} /> Importieren
          </button>
          <button onClick={() => setDialog({ mode: 'add' })}
            className="focusable inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] transition-colors shadow-sm">
            <Plus size={16} /> Mitarbeiter
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {companies.map((c) => {
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
                  {emps.map((e) => {
                    const acct = leaveAccount(e, absences)
                    const affected = absences.filter((a) => a.employeeId === e.id).length
                    return (
                    <div key={e.id} className="px-5 py-2.5 flex items-center gap-3">
                      <Avatar e={e} size={34} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-medium flex items-center gap-2 min-w-0">
                          <span className="truncate" title={e.name}>{e.name}</span>
                          <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[var(--color-muted)]">{roleGroupLabelOf(e)}</span>
                          {isPartTime(e) && <span className="shrink-0 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-info-bg)] text-[var(--color-info)]">Teilzeit</span>}
                        </div>
                        <div className="text-[12px] text-[var(--color-muted)] tnum">
                          {acct.available} Tage{acct.entitlementEffective !== acct.entitlement ? ` (anteilig)` : ''} · {acct.approved} genommen{acct.requested ? ` · ${acct.requested} beantragt` : ''}{acct.carryoverLapsed ? ` · ${acct.carryoverLapsed} verfallen` : ''} · <span className="font-medium" style={{ color: acct.remaining < 0 ? 'var(--color-crit)' : 'var(--color-ink-soft)' }}>{acct.remaining} übrig</span>
                        </div>
                      </div>
                      {canEditEmployee(e) && (confirmId === e.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12.5px] text-[var(--color-muted)]">{affected > 0 ? `Mit ${affected} Urlaub${affected === 1 ? '' : 'en'} löschen?` : 'Löschen?'}</span>
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
                      ))}
                    </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {perms.manageAccounts && <AccountsCard />}
      {perms.configure && <BackupCard />}

      {dialog && (
        <EmployeeDialog emp={dialog.emp} scope={scopeCompanies} isSuper={isSuper}
          onClose={() => setDialog(null)}
          onSave={(v) => {
            if (dialog.mode === 'edit' && dialog.emp) updateEmployee(dialog.emp.id, v)
            else addEmployee(v)
            setDialog(null)
          }} />
      )}

      {importing && <ImportDialog scope={scopeCompanies} isSuper={isSuper} onClose={() => setImporting(false)} />}
    </div>
  )
}

function EmployeeDialog({ emp, scope, isSuper, onClose, onSave }: {
  emp?: Employee; scope: CompanyId[]; isSuper: boolean
  onClose: () => void; onSave: (v: EmployeeInput) => void
}) {
  const [name, setName] = useState(emp?.name ?? '')
  const [companyId, setCompanyId] = useState<CompanyId>(emp?.companyId ?? scope[0])
  const [department, setDepartment] = useState<Department>(emp?.department ?? 'Verwaltung')
  const [jobTitle, setJobTitle] = useState(emp?.jobTitle ?? '')
  const [entitlement, setEntitlement] = useState(emp?.entitlement ?? 30)
  const [carryover, setCarryover] = useState(emp?.carryover ?? 0)
  const [isManagement, setIsManagement] = useState(emp?.isManagement ?? false)
  const [isKeyRole, setIsKeyRole] = useState(emp?.isKeyRole ?? false)
  const [days, setDays] = useState<number[]>(emp?.workdays && emp.workdays.length ? emp.workdays : [0, 1, 2, 3, 4])
  const [entryDate, setEntryDate] = useState(emp?.entryDate ?? '')
  const [exitDate, setExitDate] = useState(emp?.exitDate ?? '')
  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'
  const datesValid = !(entryDate && exitDate && exitDate < entryDate)
  const valid = name.trim().length > 0 && days.length > 0 && datesValid
  const selectable = COMPANIES.filter((c) => scope.includes(c.id))
  const toggleDay = (i: number) => setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort((a, b) => a - b))
  const fullTime = days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))
  const workdaysOut = fullTime ? undefined : days
  const previewEmp = { entitlement, carryover, workdays: workdaysOut, entryDate: entryDate || undefined, exitDate: exitDate || undefined } as Employee
  const effEnt = effectiveEntitlement(previewEmp)
  const proRata = (entryDate || exitDate) && effEnt !== entitlement

  return (
    <Modal open onClose={onClose} title={emp ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter anlegen'} width={520}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="emp-name" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Name</label>
            <input id="emp-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" autoFocus />
          </div>
          <div>
            <label htmlFor="emp-co" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Gesellschaft</label>
            {isSuper ? (
              <select id="emp-co" className={`${field} cursor-pointer`} value={companyId} onChange={(e) => setCompanyId(e.target.value as CompanyId)}>
                {selectable.map((c) => <option key={c.id} value={c.id}>{c.name}{c.country === 'CH' ? ' (CH)' : ''}</option>)}
              </select>
            ) : (
              <div className="flex items-center gap-1.5 h-10 px-3 rounded-lg bg-[var(--color-canvas)] text-[14px]">
                {COMPANY_MAP[companyId].name} <CountryFlag country={COMPANY_MAP[companyId].country} />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="emp-dep" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Abteilung</label>
            <select id="emp-dep" className={`${field} cursor-pointer`} value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="emp-job" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Funktion <span className="text-[var(--color-faint)] font-normal">(optional)</span></label>
            <input id="emp-job" className={field} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="z. B. Projektleiter" />
          </div>
          <div>
            <label htmlFor="emp-ent" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Urlaubsanspruch / Jahr</label>
            <input id="emp-ent" type="number" min={0} max={60} className={field} value={entitlement}
              onChange={(e) => setEntitlement(Math.min(60, Math.max(0, Number(e.target.value) || 0)))} />
          </div>
          <div>
            <label htmlFor="emp-carry" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Resturlaub Vorjahr</label>
            <input id="emp-carry" type="number" min={-60} max={60} step={0.5} className={field} value={carryover}
              onChange={(e) => setCarryover(Math.min(60, Math.max(-60, Number(e.target.value) || 0)))} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-0.5">
          <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
            <input type="checkbox" checked={isManagement} onChange={(e) => setIsManagement(e.target.checked)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
            Geschäftsführung
          </label>
          <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
            <input type="checkbox" checked={isKeyRole} onChange={(e) => setIsKeyRole(e.target.checked)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
            Kader / Schlüsselrolle
          </label>
        </div>

        {/* Arbeitstage (Teilzeit) */}
        <div>
          <label className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Arbeitstage <span className="text-[var(--color-faint)] font-normal">(für Teilzeit anpassen)</span></label>
          <div className="flex gap-1">
            {WEEKDAYS_SHORT_DE.map((lbl, i) => (
              <button key={lbl} type="button" onClick={() => toggleDay(i)} aria-pressed={days.includes(i)}
                className="focusable h-9 flex-1 rounded-lg border text-[12.5px] font-medium transition-colors"
                style={{
                  borderColor: days.includes(i) ? 'var(--color-ww-red)' : 'var(--color-line)',
                  background: days.includes(i) ? 'var(--color-ww-red-50)' : 'white',
                  color: days.includes(i) ? 'var(--color-ww-red-700)' : 'var(--color-muted)',
                }}>{lbl}</button>
            ))}
          </div>
          <p className="text-[11px] mt-1" style={{ color: days.length === 0 ? 'var(--color-crit)' : 'var(--color-faint)' }}>
            {days.length === 0 ? 'Mindestens ein Arbeitstag erforderlich.'
              : fullTime ? 'Vollzeit (Mo–Fr).' : `Teilzeit: ${days.map((d) => WEEKDAYS_SHORT_DE[d]).join(', ')} (${days.length} Tage/Woche).`}
          </p>
        </div>

        {/* Ein-/Austritt (für anteiligen Anspruch) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="emp-entry" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Eintritt <span className="text-[var(--color-faint)] font-normal">(optional)</span></label>
            <input id="emp-entry" type="date" className={field} value={entryDate} max={exitDate || undefined} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="emp-exit" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Austritt <span className="text-[var(--color-faint)] font-normal">(optional)</span></label>
            <input id="emp-exit" type="date" className={field} value={exitDate} min={entryDate || undefined} onChange={(e) => setExitDate(e.target.value)} />
          </div>
        </div>
        {!datesValid && <div className="text-[11.5px] text-[var(--color-crit)] -mt-2">Austritt darf nicht vor dem Eintritt liegen.</div>}

        {proRata && (
          <div className="text-[12px] text-[var(--color-ink-soft)] bg-[var(--color-canvas)] rounded-lg px-3 py-2">
            Anteiliger Jahresanspruch: <b className="tnum">{effEnt}</b> von {entitlement} Tagen (unterjährig).
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="focusable h-10 px-4 rounded-lg text-[13px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]">Abbrechen</button>
          <button onClick={() => valid && onSave({ name, companyId, department, jobTitle, entitlement, carryover, isManagement, isKeyRole, workdays: workdaysOut, entryDate: entryDate || undefined, exitDate: exitDate || undefined })} disabled={!valid}
            className="focusable inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-40 disabled:cursor-not-allowed">
            <UserPlus size={15} /> {emp ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---- Zugangsverwaltung — Admins/Firmenadmins legen Logins an & löschen ----- */
function AccountsCard() {
  const { employees } = useData()
  const { accounts, account, createAccount, removeAccount, restoreRemovedAccounts, removedAccountCount, scopeCompanies, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inScopeAccounts = accounts.filter((a) =>
    isAdmin || (a.companyId && scopeCompanies.includes(a.companyId)))
  const adminCount = accounts.filter((a) => a.role === 'admin').length

  const roleLabel: Record<AccountRole, string> = {
    admin: 'Administrator', company_manager: 'Firmenadministrator', employee: 'Mitarbeiter',
  }

  function doRemove(id: string) {
    const res = removeAccount(id)
    setConfirmId(null)
    setError(res.ok ? null : res.error ?? 'Löschen nicht möglich.')
  }

  return (
    <Card className="mt-5" pad={false}>
      <div className="px-5 py-3 border-b border-[var(--color-line)] flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold flex items-center gap-2"><KeyRound size={16} className="text-[var(--color-muted)]" /> Zugänge &amp; Rollen</span>
        <button onClick={() => setOpen(true)}
          className="focusable inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--color-ink)] text-white text-[12.5px] font-semibold hover:opacity-90">
          <Plus size={14} /> Zugang anlegen
        </button>
      </div>
      {error && <div className="mx-5 mt-3 text-[12.5px] text-[var(--color-crit)] bg-[var(--color-crit-bg)] rounded-lg px-3 py-2">{error}</div>}
      <div className="divide-y divide-[var(--color-line-soft)]">
        {inScopeAccounts.map((a) => {
          const isActive = a.id === account?.id
          const isLastAdmin = a.role === 'admin' && adminCount <= 1
          const locked = isActive || isLastAdmin
          return (
            <div key={a.id} className="px-5 py-2.5 flex items-center gap-3 text-[13px]">
              <ShieldCheck size={16} className={a.role === 'admin' ? 'text-[var(--color-ww-red)]' : 'text-[var(--color-faint)]'} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.label}</div>
                <div className="text-[11.5px] text-[var(--color-muted)]">{a.sub}</div>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]">{roleLabel[a.role]}</span>
              {confirmId === a.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-[var(--color-muted)]">Löschen?</span>
                  <button onClick={() => doRemove(a.id)} aria-label="Löschen bestätigen"
                    className="focusable p-1.5 rounded-lg bg-[var(--color-crit-bg)] text-[var(--color-crit)] hover:opacity-80"><Check size={15} /></button>
                  <button onClick={() => setConfirmId(null)} aria-label="Abbrechen"
                    className="focusable p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-line-soft)]"><X size={15} /></button>
                </div>
              ) : locked ? (
                <span className="text-[10.5px] text-[var(--color-faint)] px-1" title={isActive ? 'Aktuell angemeldet' : 'Letzter Administrator'}>
                  {isActive ? 'aktiv' : 'letzter Admin'}
                </span>
              ) : (
                <button onClick={() => { setError(null); setConfirmId(a.id) }} aria-label={`Zugang ${a.label} entfernen`}
                  className="focusable p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-crit-bg)] hover:text-[var(--color-crit)]"><Trash2 size={14} /></button>
              )}
            </div>
          )
        })}
      </div>
      {isAdmin && removedAccountCount > 0 && (
        <div className="px-5 py-2.5 border-t border-[var(--color-line-soft)]">
          <button onClick={() => { restoreRemovedAccounts(); setError(null) }}
            className="focusable text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)] underline underline-offset-2">
            {removedAccountCount === 1 ? '1 gelöschten Demo-Zugang' : `${removedAccountCount} gelöschte Demo-Zugänge`} wiederherstellen
          </button>
        </div>
      )}
      {open && <NewAccountDialog employees={employees} accounts={accounts} scope={scopeCompanies} isAdmin={isAdmin}
        onClose={() => setOpen(false)} onCreate={createAccount} />}
    </Card>
  )
}

function NewAccountDialog({ employees, accounts, scope, isAdmin, onClose, onCreate }: {
  employees: Employee[]
  accounts: Account[]
  scope: CompanyId[]
  isAdmin: boolean
  onClose: () => void
  onCreate: (input: { employeeId: string; companyId: CompanyId; role: AccountRole; label: string; password: string }) => { ok: boolean; error?: string }
}) {
  // Mitarbeiter mit bestehendem Zugang ausblenden (ein Zugang pro Person).
  const taken = new Set(accounts.map((a) => a.employeeId).filter(Boolean))
  const inScope = employees.filter((e) => scope.includes(e.companyId) && !taken.has(e.id))
  const [employeeId, setEmployeeId] = useState(inScope[0]?.id ?? '')
  const [role, setRole] = useState<AccountRole>('employee')
  const [password, setPassword] = useState('123')
  const [error, setError] = useState<string | null>(null)
  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'
  const roles: AccountRole[] = isAdmin ? ['employee', 'company_manager', 'admin'] : ['employee']
  const roleLabel: Record<AccountRole, string> = {
    admin: 'Administrator (alle Firmen)', company_manager: 'Firmenadministrator', employee: 'Mitarbeiter (nur eigene Urlaube)',
  }

  function submit() {
    const emp = employees.find((e) => e.id === employeeId)
    if (!emp) { setError('Bitte einen Mitarbeiter wählen.'); return }
    const res = onCreate({ employeeId, companyId: emp.companyId, role, label: emp.name, password })
    if (res.ok) onClose(); else setError(res.error ?? 'Fehler beim Anlegen.')
  }

  return (
    <Modal open onClose={onClose} title="Zugang anlegen" width={460}>
      <div className="space-y-4">
        <p className="text-[12.5px] text-[var(--color-muted)]">
          Erstellt ein Login für einen Mitarbeiter. Mitarbeiter-Zugänge sehen nur die eigenen Urlaube,
          Firmenadministratoren ihre Gesellschaft, Administratoren die gesamte Gruppe.
        </p>
        <div>
          <label htmlFor="acc-emp" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Mitarbeiter</label>
          {inScope.length === 0 ? (
            <div className="text-[12.5px] text-[var(--color-muted)] bg-[var(--color-canvas)] rounded-lg px-3 py-2">Alle Mitarbeiter im Bereich haben bereits einen Zugang.</div>
          ) : (
            <select id="acc-emp" className={`${field} cursor-pointer`} value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setError(null) }}>
              {COMPANIES.filter((c) => scope.includes(c.id)).map((c) => {
                const emps = inScope.filter((e) => e.companyId === c.id)
                return emps.length === 0 ? null : (
                  <optgroup key={c.id} label={c.name}>
                    {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          )}
        </div>
        <div>
          <label htmlFor="acc-role" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Rolle</label>
          <select id="acc-role" className={`${field} cursor-pointer`} value={role} onChange={(e) => setRole(e.target.value as AccountRole)}>
            {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="acc-pw" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Passwort</label>
          <input id="acc-pw" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-[11px] text-[var(--color-faint)] mt-1">Demo-Speicherung im Browser — keine echte Benutzerverwaltung.</p>
        </div>
        {error && <div className="text-[12.5px] text-[var(--color-crit)] bg-[var(--color-crit-bg)] rounded-lg px-3 py-2">{error}</div>}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="focusable h-10 px-4 rounded-lg text-[13px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]">Abbrechen</button>
          <button onClick={submit} disabled={inScope.length === 0 || !password.trim()}
            className="focusable inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-40 disabled:cursor-not-allowed">
            <KeyRound size={15} /> Zugang anlegen
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ImportDialog({ scope, isSuper, onClose }: { scope: CompanyId[]; isSuper: boolean; onClose: () => void }) {
  const { employees, importVacations } = useData()
  const [companyId, setCompanyId] = useState<CompanyId>(scope[0])
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ employeesAdded: number; absencesAdded: number } | null>(null)
  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'
  const selectable = COMPANIES.filter((c) => scope.includes(c.id))

  const newCount = useMemo(() => {
    if (!rows) return 0
    const existing = new Set(employees.filter((e) => e.companyId === companyId).map((e) => e.name.trim().toLowerCase()))
    const names = new Set(rows.map((r) => r.name.trim().toLowerCase()))
    let n = 0; names.forEach((nm) => { if (!existing.has(nm)) n++ })
    return n
  }, [rows, employees, companyId])

  async function onFile(file: File) {
    setError(null); setRows(null); setDone(null)
    try {
      const res = await parseImportFile(file)
      if (!res.rows.length) {
        setError(res.skipped > 0
          ? 'Alle Zeilen hatten ungültige/leere Datumswerte (erwartet: TT.MM.JJJJ).'
          : 'Keine gültigen Zeilen gefunden. Erwartet werden Spalten „Mitarbeiter", „Von", „Bis".')
        return
      }
      setRows(res.rows); setSkipped(res.skipped)
    } catch {
      setError('Datei konnte nicht gelesen werden (.xlsx oder .csv).')
    }
  }

  return (
    <Modal open onClose={onClose} title="Urlaube importieren" width={520}>
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--color-ink-soft)]">
          Excel/CSV mit Spalten <b>Mitarbeiter · Von · Bis</b> (optional <b>Halbtag</b>). Fehlende Mitarbeiter werden automatisch angelegt.
        </p>

        <div>
          <label htmlFor="imp-co" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Gesellschaft</label>
          {isSuper ? (
            <select id="imp-co" className={`${field} cursor-pointer`} value={companyId} onChange={(e) => setCompanyId(e.target.value as CompanyId)}>
              {selectable.map((c) => <option key={c.id} value={c.id}>{c.legalName}{c.country === 'CH' ? ' (Schweiz)' : ''}</option>)}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 h-10 px-3 rounded-lg bg-[var(--color-canvas)] text-[14px]">{COMPANY_MAP[companyId].legalName} <CountryFlag country={COMPANY_MAP[companyId].country} /></div>
          )}
        </div>

        <div>
          <label htmlFor="imp-file" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Datei (.xlsx / .csv)</label>
          <input id="imp-file" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = '' }}
            className="block w-full text-[13px] file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--color-ww-red-50)] file:text-[var(--color-ww-red-700)] file:font-medium file:cursor-pointer" />
        </div>

        {error && <div className="text-[12.5px] text-[var(--color-crit)] bg-[var(--color-crit-bg)] rounded-lg px-3 py-2">{error}</div>}

        {rows && !done && (
          <div className="text-[12.5px] text-[var(--color-ink-soft)] bg-[var(--color-canvas)] rounded-lg px-3 py-2">
            <b>{rows.length}</b> Urlaube erkannt · <b>{newCount}</b> neue Mitarbeiter werden angelegt{skipped ? ` · ${skipped} Zeilen ohne gültiges Datum übersprungen` : ''}.
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--color-ok)] bg-[var(--color-ok-bg)] rounded-lg px-3 py-2">
            <Check size={16} /> {done.absencesAdded} Urlaube importiert · {done.employeesAdded} Mitarbeiter neu angelegt.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="focusable h-10 px-4 rounded-lg text-[13px] font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]">{done ? 'Schließen' : 'Abbrechen'}</button>
          {!done && (
            <button disabled={!rows} onClick={() => rows && setDone(importVacations(companyId, rows))}
              className="focusable inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-40 disabled:cursor-not-allowed">
              <Upload size={15} /> Importieren
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ---- Datensicherung — Export/Import des gesamten Bestands (nur Admin) ------- */
function BackupCard() {
  const { employees, absences, replaceAll } = useData()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function exportAll() {
    const payload = { format: 'ww-urlaubsplaner-backup', version: 1, exportedAt: new Date().toISOString(), employees, absences }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadText(`Urlaubsplaner-Sicherung_${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
    setMsg({ ok: true, text: `Sicherung erstellt: ${employees.length} Mitarbeiter · ${absences.length} Einträge.` })
  }

  async function importAll(file: File) {
    setMsg(null)
    try {
      const data = JSON.parse(await file.text())
      const emps = Array.isArray(data) ? data : data.employees
      const abs = Array.isArray(data) ? [] : (data.absences ?? [])
      const res = replaceAll(emps, abs)
      setMsg(res.ok
        ? { ok: true, text: `Wiederhergestellt: ${emps.length} Mitarbeiter · ${abs.length} Einträge.` }
        : { ok: false, text: res.error ?? 'Wiederherstellung fehlgeschlagen.' })
    } catch {
      setMsg({ ok: false, text: 'Datei konnte nicht gelesen werden (erwartet: .json-Sicherung).' })
    }
  }

  return (
    <Card className="mt-5" pad={false}>
      <div className="px-5 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
        <Database size={16} className="text-[var(--color-muted)]" />
        <span className="text-[14px] font-semibold">Datensicherung</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-[12.5px] text-[var(--color-muted)]">
          Sichert alle Mitarbeiter und Urlaube/Krankmeldungen als Datei und stellt sie wieder her.
          Die Daten liegen sonst nur im Browser — mit einer Sicherung gehen sie nicht verloren.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportAll}
            className="focusable inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--color-ink)] text-white text-[13px] font-semibold hover:opacity-90">
            <Download size={15} /> Alle Daten sichern (JSON)
          </button>
          <label className="focusable inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)] cursor-pointer">
            <Upload size={15} /> Aus Sicherung wiederherstellen
            <input type="file" accept=".json,application/json" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) importAll(e.target.files[0]); e.target.value = '' }} />
          </label>
        </div>
        {msg && (
          <div className="text-[12.5px] rounded-lg px-3 py-2 flex items-center gap-2"
            style={{ background: msg.ok ? 'var(--color-ok-bg)' : 'var(--color-crit-bg)', color: msg.ok ? 'var(--color-ok)' : 'var(--color-crit)' }}>
            {msg.ok ? <Check size={15} /> : <X size={15} />} {msg.text}
          </div>
        )}
        <p className="text-[11px] text-[var(--color-faint)]">Wiederherstellen ersetzt den gesamten aktuellen Bestand. Zugänge/Logins sind nicht enthalten.</p>
      </div>
    </Card>
  )
}
