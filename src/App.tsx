import { useState, type ReactNode } from 'react'
import { CalendarRange, Plus, LogOut, Users, Inbox, UserRound } from 'lucide-react'
import logoUrl from './assets/logo.png'
import { Planner, type Mode } from './views/Planner'
import { Controlling, type PlanTarget } from './views/Controlling'
import { Stammdaten } from './views/Stammdaten'
import { Freigaben } from './views/Freigaben'
import { Uebersicht } from './views/Uebersicht'
import { Login } from './views/Login'
import { AddDialog, type Draft } from './components/AddDialog'
import { useData } from './store/data'
import { useAuth } from './store/auth'
import type { CompanyId } from './domain/types'
import { TODAY } from './lib/dates'

type Page = 'plan' | 'uebersicht' | 'controlling' | 'freigaben' | 'stammdaten'

export default function App() {
  const { account, isAdmin, isManager, isEmployee, selfEmployeeId, scopeCompanies, perms, logout } = useAuth()
  const { employees, absences } = useData()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [mode, setMode] = useState<Mode>('month')
  const [month, setMonth] = useState(Number(TODAY.slice(5, 7)) - 1)
  const [filter, setFilter] = useState<CompanyId | 'ALL'>('ALL')

  const defaultPage: Page = isEmployee ? 'uebersicht' : 'plan'
  const [page, setPage] = useState<Page>(defaultPage)

  if (!account) return <Login />

  // Sichtbare Seiten je nach Rolle/Recht.
  const allowed = new Set<Page>(['uebersicht'])
  if (isManager) { allowed.add('plan'); allowed.add('freigaben'); allowed.add('stammdaten') }
  if (perms.configure) allowed.add('controlling')
  const effPage: Page = allowed.has(page) ? page : defaultPage

  function openPlan(t: PlanTarget) {
    if (t.mode) setMode(t.mode)
    if (t.month != null) setMonth(t.month)
    if (t.filter) setFilter(t.filter)
    setPage('plan')
  }

  // Ziel für „Urlaub eintragen/beantragen".
  const firstScopeEmp = employees.find((e) => scopeCompanies.includes(e.companyId))
  const newLeaveTarget = isEmployee ? selfEmployeeId : firstScopeEmp?.id
  function openNewLeave(employeeId: string) { setDraft({ employeeId, start: TODAY, end: TODAY }) }

  // Offene Anträge im eigenen Verantwortungsbereich (für Freigaben-Badge).
  const scopeEmpIds = new Set(employees.filter((e) => scopeCompanies.includes(e.companyId)).map((e) => e.id))
  const pendingCount = perms.approve
    ? absences.filter((a) => a.status === 'requested' && scopeEmpIds.has(a.employeeId)).length
    : 0

  const tabs: { id: Page; label: string; icon: ReactNode; badge?: number }[] = [
    ...(isManager ? [{ id: 'plan' as Page, label: 'Urlaubsplan', icon: <CalendarRange size={16} /> }] : []),
    { id: 'uebersicht', label: isEmployee ? 'Meine Urlaube' : 'Pro Person', icon: <UserRound size={16} /> },
    ...(perms.configure ? [{ id: 'controlling' as Page, label: 'WW Controlling', icon: <img src={logoUrl} className="h-4 w-auto" alt="" /> }] : []),
    ...(isManager ? [{ id: 'freigaben' as Page, label: 'Freigaben', icon: <Inbox size={16} />, badge: pendingCount }] : []),
    ...(isManager ? [{ id: 'stammdaten' as Page, label: 'Stammdaten', icon: <Users size={16} /> }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--color-line)] px-6 h-16 flex items-center gap-4">
        <img src={logoUrl} alt="Würzburger" className="h-9 w-auto" />
        <div className="hidden md:block leading-tight mr-2">
          <div className="text-[15px] font-semibold tracking-tight">Urlaubsplan 2026</div>
          <div className="text-[11.5px] text-[var(--color-muted)] -mt-0.5">Würzburger Gruppe</div>
        </div>

        <nav aria-label="Ansicht" className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setPage(t.id)} aria-current={effPage === t.id ? 'page' : undefined}
              className={`focusable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                effPage === t.id ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
              {t.icon}<span className="hidden sm:inline">{t.label}</span>
              {t.badge ? <span className="text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full bg-[var(--color-ww-red)] text-white tnum">{t.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2 pr-1 border-r border-[var(--color-line)] mr-1">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-[12.5px] font-medium">{account.label}</div>
            <div className="text-[11px] text-[var(--color-muted)]">{isAdmin ? 'Alle Gesellschaften' : account.sub}</div>
          </div>
          <button type="button" onClick={logout} title="Abmelden" aria-label="Abmelden"
            className="focusable p-2 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-line-soft)] hover:text-[var(--color-ink)]"><LogOut size={16} /></button>
        </div>

        <button disabled={!newLeaveTarget}
          onClick={() => newLeaveTarget && openNewLeave(newLeaveTarget)}
          className="focusable shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] transition-colors shadow-sm disabled:opacity-40">
          <Plus size={16} /> <span className="hidden sm:inline">{isEmployee ? 'Urlaub beantragen' : 'Urlaub eintragen'}</span>
        </button>
      </header>

      <main className="flex-1">
        {effPage === 'plan' && (
          <Planner onCellClick={(employeeId, date) => setDraft({ employeeId, start: date, end: date })}
            onEditAbsence={(a) => setDraft({ id: a.id, employeeId: a.employeeId, start: a.start, end: a.end, halfDay: !!a.halfDayStart, status: a.status === 'requested' ? 'requested' : 'approved', note: a.note })}
            mode={mode} setMode={setMode} month={month} setMonth={setMonth} filter={filter} setFilter={setFilter} />
        )}
        {effPage === 'uebersicht' && <Uebersicht onNewLeave={openNewLeave} />}
        {effPage === 'controlling' && <Controlling onOpenPlan={openPlan} />}
        {effPage === 'freigaben' && <Freigaben />}
        {effPage === 'stammdaten' && <Stammdaten />}
      </main>

      {draft && <AddDialog draft={draft} onClose={() => setDraft(null)} />}
    </div>
  )
}
