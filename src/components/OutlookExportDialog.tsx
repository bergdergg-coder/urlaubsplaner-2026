import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Users, Building2, Tags, UserRound } from 'lucide-react'
import { Modal } from './ui/ui'
import type { Absence, CompanyId, Employee, RoleGroup } from '../domain/types'
import { COMPANIES, COMPANY_MAP } from '../domain/seed'
import { ROLE_GROUP_ORDER, ROLE_GROUP_LABEL, roleGroupOf } from '../domain/roles'
import { selectedVacations, type ExportMode, type ExportSelection } from '../lib/exportFilter'

/* Outlook-Export mit Filter. Der Nutzer wählt, WELCHE Urlaube exportiert
   werden: alle, eine Firma, eine Funktionsgruppe (GF/Kader/Verwaltung/
   Mitarbeiter) oder individuell ausgewählte Personen — optional nur neue. */
export function OutlookExportDialog({
  open, onClose, employees, absences, allowedCompanies, isExported, exportedCount, onExport, onResetLog,
}: {
  open: boolean
  onClose: () => void
  employees: Employee[]
  absences: Absence[]
  allowedCompanies: CompanyId[]
  isExported: (a: Absence) => boolean
  exportedCount: number
  onExport: (list: Absence[], suffix: string) => void
  onResetLog: () => void
}) {
  const companies = COMPANIES.filter((c) => allowedCompanies.includes(c.id))
  const [mode, setMode] = useState<ExportMode>('all')
  const [companyId, setCompanyId] = useState<CompanyId>(companies[0]?.id ?? 'WGV')
  const [groups, setGroups] = useState<Set<RoleGroup>>(new Set(['management', 'kader']))
  const [persons, setPersons] = useState<Set<string>>(new Set())
  const [onlyNew, setOnlyNew] = useState(false)

  // Auswahl beim Öffnen zurücksetzen (sonst bleibt der letzte Stand „hängen").
  useEffect(() => {
    if (open) { setMode('all'); setOnlyNew(false); setPersons(new Set()); setGroups(new Set(['management', 'kader'])) }
  }, [open])

  const inScope = useMemo(
    () => employees.filter((e) => allowedCompanies.includes(e.companyId)),
    [employees, allowedCompanies],
  )

  const selection: ExportSelection = useMemo(() => {
    switch (mode) {
      case 'company': return { mode, companyId }
      case 'roleGroup': return { mode, roleGroups: [...groups] }
      case 'persons': return { mode, employeeIds: [...persons] }
      default: return { mode: 'all' }
    }
  }, [mode, companyId, groups, persons])

  const list = useMemo(() => {
    const base = selectedVacations(absences, employees, selection, allowedCompanies)
    return onlyNew ? base.filter((a) => !isExported(a)) : base
  }, [absences, employees, selection, allowedCompanies, onlyNew, isExported])

  const newCount = useMemo(() => list.filter((a) => !isExported(a)).length, [list, isExported])

  function suffixFor(): string {
    if (mode === 'company') return `_${COMPANY_MAP[companyId].name.replace(/\s+/g, '')}`
    if (mode === 'roleGroup') return `_${ROLE_GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ROLE_GROUP_LABEL[g]).join('-')}`
    if (mode === 'persons') return `_Auswahl`
    return ''
  }

  const toggleGroup = (g: RoleGroup) => setGroups((prev) => {
    const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n
  })
  const togglePerson = (id: string) => setPersons((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const tabs: { id: ExportMode; label: string; icon: typeof Users }[] = [
    { id: 'all', label: 'Alle', icon: Users },
    { id: 'company', label: 'Nach Gesellschaft', icon: Building2 },
    { id: 'roleGroup', label: 'Nach Rolle', icon: Tags },
    { id: 'persons', label: 'Personen', icon: UserRound },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Urlaube nach Outlook exportieren" width={560}>
      <div className="space-y-4 text-[13.5px] text-[var(--color-ink-soft)]">
        <p className="text-[13px] text-[var(--color-muted)]">
          Lädt die gewählten Urlaube als Kalenderdatei (<code className="text-[12px]">.ics</code>) zum Import in Outlook.
          Die Termine werden <b>hinzugefügt</b> – der bestehende Kalender bleibt erhalten.
        </p>

        {/* Filtermodus */}
        <div className="inline-flex flex-wrap p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setMode(t.id)} aria-pressed={mode === t.id}
              className={`focusable inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${mode === t.id ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Modus-spezifische Auswahl */}
        {mode === 'company' && (
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <button key={c.id} onClick={() => setCompanyId(c.id)} aria-pressed={companyId === c.id}
                className="focusable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
                style={{
                  borderColor: companyId === c.id ? c.accent : 'var(--color-line)',
                  background: companyId === c.id ? c.accentSoft : 'white',
                }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.accent }} /> {c.name}
              </button>
            ))}
          </div>
        )}

        {mode === 'roleGroup' && (
          <div className="flex flex-wrap gap-2">
            {ROLE_GROUP_ORDER.map((g) => (
              <label key={g} className="focusable inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-line)] text-[13px] font-medium cursor-pointer select-none"
                style={{ background: groups.has(g) ? 'var(--color-ww-red-50)' : 'white', borderColor: groups.has(g) ? 'var(--color-ww-red-100)' : 'var(--color-line)' }}>
                <input type="checkbox" checked={groups.has(g)} onChange={() => toggleGroup(g)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
                {ROLE_GROUP_LABEL[g]}
              </label>
            ))}
          </div>
        )}

        {mode === 'persons' && (
          <div className="border border-[var(--color-line)] rounded-lg max-h-[230px] overflow-y-auto divide-y divide-[var(--color-line-soft)]">
            {companies.map((c) => {
              const emps = inScope.filter((e) => e.companyId === c.id)
              if (!emps.length) return null
              const allSel = emps.every((e) => persons.has(e.id))
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-canvas)] sticky top-0">
                    <span className="text-[12px] font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.accent }} /> {c.name}</span>
                    <button onClick={() => setPersons((prev) => {
                      const n = new Set(prev); emps.forEach((e) => allSel ? n.delete(e.id) : n.add(e.id)); return n
                    })} className="focusable text-[11.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)] underline underline-offset-2">
                      {allSel ? 'keine' : 'alle'}
                    </button>
                  </div>
                  {emps.map((e) => (
                    <label key={e.id} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-line-soft)]">
                      <input type="checkbox" checked={persons.has(e.id)} onChange={() => togglePerson(e.id)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
                      <span className="text-[13px]">{e.name}</span>
                      <span className="text-[11.5px] text-[var(--color-faint)] ml-auto">{ROLE_GROUP_LABEL[roleGroupOf(e)]}</span>
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Nur neue */}
        <label className="flex items-center gap-2.5 text-[13px] cursor-pointer select-none">
          <input type="checkbox" checked={onlyNew} onChange={(ev) => setOnlyNew(ev.target.checked)} className="w-4 h-4 accent-[var(--color-ww-red)]" />
          Nur neue Urlaube seit dem letzten Export
        </label>

        {/* Zusammenfassung + Aktion */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-canvas)] px-3.5 py-3">
          <div className="text-[13px]">
            <b className="tnum">{list.length}</b> {list.length === 1 ? 'Urlaub' : 'Urlaube'} ausgewählt
            {!onlyNew && newCount !== list.length ? <span className="text-[var(--color-muted)]"> · {newCount} neu</span> : null}
          </div>
          <button onClick={() => { onExport(list, suffixFor()); }} disabled={list.length === 0}
            className="focusable inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] disabled:opacity-30 disabled:cursor-not-allowed">
            <CalendarPlus size={15} /> Exportieren
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-[var(--color-faint)]">In Outlook über „Kalender → Aus Datei hinzufügen" importieren.</span>
          <button onClick={onResetLog} disabled={exportedCount === 0}
            className="focusable shrink-0 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)] underline underline-offset-2 disabled:opacity-30 disabled:no-underline">
            Merker zurücksetzen
          </button>
        </div>
      </div>
    </Modal>
  )
}
