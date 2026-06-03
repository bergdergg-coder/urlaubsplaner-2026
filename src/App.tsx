import { useState, type ReactNode } from 'react'
import { CalendarRange, Plus, Users } from 'lucide-react'
import logoUrl from './assets/logo.png'
import { Planner, type Mode } from './views/Planner'
import { Controlling, type PlanTarget } from './views/Controlling'
import { Stammdaten } from './views/Stammdaten'
import { AddDialog, type Draft } from './components/AddDialog'
import { useData } from './store/data'
import type { CompanyId } from './domain/types'
import { TODAY } from './lib/dates'

type Page = 'plan' | 'controlling' | 'stammdaten'

export default function App() {
  const { employees } = useData()
  const [page, setPage] = useState<Page>('plan')
  const [draft, setDraft] = useState<Draft | null>(null)

  // Planungs-Steuerung (zentral, damit das Dashboard hineinspringen kann)
  const [mode, setMode] = useState<Mode>('month')
  const [month, setMonth] = useState(5)
  const [filter, setFilter] = useState<CompanyId | 'ALL'>('ALL')

  function openPlan(t: PlanTarget) {
    if (t.mode) setMode(t.mode)
    if (t.month != null) setMonth(t.month)
    if (t.filter) setFilter(t.filter)
    setPage('plan')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Kopfleiste */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-[var(--color-line)] px-6 h-16 flex items-center gap-4">
        <img src={logoUrl} alt="Würzburger" className="h-9 w-auto" />
        <div className="hidden sm:block leading-tight mr-2">
          <div className="text-[15px] font-semibold tracking-tight">Urlaubsplan 2026</div>
          <div className="text-[11.5px] text-[var(--color-muted)] -mt-0.5">Würzburger Gruppe</div>
        </div>

        <nav aria-label="Ansicht" className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
          <Tab active={page === 'plan'} onClick={() => setPage('plan')} icon={<CalendarRange size={16} />}>Urlaubsplan</Tab>
          <Tab active={page === 'controlling'} onClick={() => setPage('controlling')}
            icon={<img src={logoUrl} className="h-4 w-auto" alt="" />}>WW Controlling</Tab>
          <Tab active={page === 'stammdaten'} onClick={() => setPage('stammdaten')} icon={<Users size={16} />}>Stammdaten</Tab>
        </nav>

        <div className="flex-1" />
        <button onClick={() => employees[0] && setDraft({ employeeId: employees[0].id, start: TODAY, end: TODAY })}
          disabled={employees.length === 0}
          className="focusable shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)] transition-colors shadow-sm disabled:opacity-40">
          <Plus size={16} /> Urlaub eintragen
        </button>
      </header>

      <main className="flex-1">
        {page === 'plan' && (
          <Planner onCellClick={(employeeId, date) => setDraft({ employeeId, start: date, end: date })}
            onEditAbsence={(a) => setDraft({ id: a.id, employeeId: a.employeeId, start: a.start, end: a.end, halfDay: !!a.halfDayStart })}
            mode={mode} setMode={setMode} month={month} setMonth={setMonth} filter={filter} setFilter={setFilter} />
        )}
        {page === 'controlling' && <Controlling onOpenPlan={openPlan} />}
        {page === 'stammdaten' && <Stammdaten />}
      </main>

      {draft && <AddDialog draft={draft} onClose={() => setDraft(null)} />}
    </div>
  )
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`focusable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
        active ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
      {icon}{children}
    </button>
  )
}
