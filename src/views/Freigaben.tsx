import { Check, X, Inbox, MessageSquare } from 'lucide-react'
import { Card, Avatar, CountryFlag, StatusBadge } from '../components/ui/ui'
import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import { COMPANY_MAP } from '../domain/seed'
import { formatRangeDE, formatDE } from '../lib/dates'
import { absenceDays } from '../lib/leave'

export function Freigaben() {
  const { absences, employeeMap, approveAbsence, rejectAbsence } = useData()
  const { scopeCompanies, account, perms } = useAuth()
  const decider = account?.label

  const inScope = (empId: string) => {
    const emp = employeeMap[empId]
    return emp && scopeCompanies.includes(emp.companyId)
  }
  const pending = absences
    .filter((a) => a.status === 'requested' && inScope(a.employeeId))
    .sort((a, b) => a.start.localeCompare(b.start))
  // Zuletzt entschiedene Anträge (genehmigt/abgelehnt mit Bearbeiter) als Verlauf.
  const decided = absences
    .filter((a) => (a.status === 'rejected' || (a.status === 'approved' && a.decidedAt)) && inScope(a.employeeId))
    .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
    .slice(0, 8)

  if (!perms.approve) {
    return (
      <div className="px-6 py-5 max-w-3xl mx-auto">
        <Card><div className="py-8 text-center text-[14px] text-[var(--color-muted)]">Keine Berechtigung für Freigaben.</div></Card>
      </div>
    )
  }

  return (
    <div className="px-6 py-5 max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="text-[17px] font-semibold tracking-tight">Freigaben</h2>
        <p className="text-[13px] text-[var(--color-muted)] mt-0.5">Offene Urlaubsanträge prüfen — genehmigen oder ablehnen.</p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center text-center py-10">
            <Inbox size={26} className="text-[var(--color-faint)] mb-3" />
            <p className="text-[14px] font-medium text-[var(--color-ink-soft)]">Keine offenen Anträge</p>
            <p className="text-[13px] text-[var(--color-muted)] mt-1 max-w-sm">
              Neue Anträge entstehen, wenn ein Mitarbeiter Urlaub beantragt oder beim Eintragen „Als Antrag" gewählt wird.
            </p>
          </div>
        </Card>
      ) : (
        <Card pad={false}>
          <div className="divide-y divide-[var(--color-line)]">
            {pending.map((a) => {
              const e = employeeMap[a.employeeId]
              const c = COMPANY_MAP[e.companyId]
              const days = absenceDays(a, e)
              return (
                <div key={a.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar e={e} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.accent }} title={c.name} />
                        <span className="truncate">{e.name}</span> <CountryFlag country={c.country} />
                      </div>
                      <div className="text-[13px] text-[var(--color-ink-soft)]">
                        {a.halfDayStart ? '½ Tag · ' : ''}{formatRangeDE(a.start, a.end)}
                        <span className="text-[var(--color-muted)]"> · {c.name} · <b className="tnum text-[var(--color-ink-soft)]">{days}</b> Urlaubstag{days === 1 ? '' : 'e'}</span>
                      </div>
                      {a.note && (
                        <div className="text-[12.5px] text-[var(--color-muted)] mt-1 flex items-start gap-1.5">
                          <MessageSquare size={13} className="mt-0.5 shrink-0" /> <span className="italic break-words">{a.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button onClick={() => approveAbsence(a.id, decider)}
                      className="focusable inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--color-ok)] text-white text-[13px] font-semibold hover:opacity-90">
                      <Check size={16} /> Genehmigen
                    </button>
                    <button onClick={() => rejectAbsence(a.id, decider)}
                      className="focusable inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--color-line)] text-[var(--color-ink-soft)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
                      <X size={16} /> Ablehnen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {decided.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[13px] font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Zuletzt entschieden</h3>
          <Card pad={false}>
            <div className="divide-y divide-[var(--color-line-soft)]">
              {decided.map((a) => {
                const e = employeeMap[a.employeeId]
                return (
                  <div key={a.id} className="px-5 py-2.5 flex items-center gap-3 text-[13px]">
                    <Avatar e={e} size={30} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{e.name}</span>
                      <span className="text-[var(--color-muted)]"> · {formatRangeDE(a.start, a.end)}</span>
                    </div>
                    {a.decidedBy && <span className="text-[11.5px] text-[var(--color-faint)] hidden sm:inline">{a.decidedBy}{a.decidedAt ? ` · ${formatDE(a.decidedAt, { year: false })}` : ''}</span>}
                    <StatusBadge status={a.status} />
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
