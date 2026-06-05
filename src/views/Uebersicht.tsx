import { useMemo, useRef, useState } from 'react'
import { Printer, Plus, CalendarRange } from 'lucide-react'
import { Card, Avatar, CountryFlag, Meter, StatusBadge, PrintHeader } from '../components/ui/ui'
import { COMPANIES, COMPANY_MAP } from '../domain/seed'
import { roleGroupLabelOf } from '../domain/roles'
import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import { leaveAccount, absenceDays } from '../lib/leave'
import { formatRangeDE, formatDE, WEEKDAYS_SHORT_DE } from '../lib/dates'
import { printElement } from '../lib/print'

/* Urlaubsübersicht je Person — Resturlaubskonto + Antragsliste.
   Für Verwalter mit Personenauswahl, für Mitarbeiter auf die eigene Person
   beschränkt (Self-Service: eigene Übersicht + Status der eigenen Anträge). */
export function Uebersicht({ onNewLeave }: { onNewLeave: (employeeId: string) => void }) {
  const { employees, absences } = useData()
  const { scopeCompanies, isEmployee, selfEmployeeId, canSeeEmployee } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  const selectable = useMemo(
    () => employees.filter((e) => canSeeEmployee(e)),
    [employees, canSeeEmployee],
  )
  const [personId, setPersonId] = useState(
    isEmployee && selfEmployeeId ? selfEmployeeId : (selectable[0]?.id ?? ''),
  )
  const e = employees.find((x) => x.id === personId) ?? selectable[0]
  if (!e) {
    return <div className="px-6 py-10 text-center text-[14px] text-[var(--color-muted)]">Keine Person verfügbar.</div>
  }
  const c = COMPANY_MAP[e.companyId]
  const acct = leaveAccount(e, absences)

  const mine = absences
    .filter((a) => a.employeeId === e.id && a.type === 'vacation')
    .sort((a, b) => a.start.localeCompare(b.start))

  const tiles: { label: string; value: string | number; sub?: string; tone?: 'accent' | 'ok' | 'warn' | 'crit' }[] = [
    { label: 'Jahresurlaub', value: acct.entitlementEffective, sub: acct.entitlementEffective !== acct.entitlement ? `anteilig von ${acct.entitlement}` : undefined },
    { label: 'Resturlaub Vorjahr', value: acct.carryover, sub: acct.carryoverLapsed ? `${acct.carryoverLapsed} verfallen am 31.03.` : undefined, tone: acct.carryoverLapsed ? 'warn' : undefined },
    { label: 'Verfügbar gesamt', value: acct.available, tone: 'accent' },
    { label: 'Genehmigt genommen', value: acct.approved },
    { label: 'Beantragt (offen)', value: acct.requested, tone: acct.requested > 0 ? 'warn' : undefined },
    { label: 'Verbleibend', value: acct.remaining, tone: acct.remaining < 0 ? 'crit' : 'ok' },
  ]
  const toneColor: Record<string, string> = {
    accent: c.accent, ok: 'var(--color-ok)', warn: 'var(--color-warn)', crit: 'var(--color-crit)',
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[940px] mx-auto">
      {/* Steuerleiste (nicht im Druck) */}
      <div className="no-print flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Urlaubsübersicht pro Person</h2>
          <p className="text-[13px] text-[var(--color-muted)] mt-0.5">
            {isEmployee ? 'Deine Urlaube, dein Resturlaub und der Status deiner Anträge.' : 'Resturlaubskonto und Anträge einer Person.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEmployee && selectable.length > 1 && (
            <select aria-label="Person" value={personId} onChange={(ev) => setPersonId(ev.target.value)}
              className="focusable h-9 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[13.5px] font-medium cursor-pointer max-w-[220px]">
              {COMPANIES.filter((co) => scopeCompanies.includes(co.id)).map((co) => (
                <optgroup key={co.id} label={co.name}>
                  {selectable.filter((x) => x.companyId === co.id).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <button onClick={() => onNewLeave(e.id)}
            className="focusable inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--color-ww-red)] text-white text-[13px] font-semibold hover:bg-[var(--color-ww-red-600)]">
            <Plus size={15} /> {isEmployee ? 'Urlaub beantragen' : 'Urlaub eintragen'}
          </button>
          <button onClick={() => printElement(ref.current)}
            className="focusable inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
            <Printer size={15} /> Drucken
          </button>
        </div>
      </div>

      {/* Druck-/PDF-Bereich */}
      <div ref={ref} className="card p-6">
        <PrintHeader title={`Urlaubsübersicht ${e.name}`} sub={c.legalName} company={c} />

        {/* Personenkopf mit Firmenfarbe */}
        <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-[var(--color-line)]"
          style={{ borderBottomColor: 'color-mix(in srgb, ' + c.accent + ' 35%, var(--color-line))' }}>
          <Avatar e={e} size={52} />
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-semibold leading-tight flex items-center gap-2 min-w-0"><span className="truncate">{e.name}</span> <CountryFlag country={c.country} /></div>
            <div className="text-[13.5px] text-[var(--color-muted)] flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.accent }} /> {c.name}
              </span>
              {e.jobTitle ? <span>· {e.jobTitle}</span> : null}
              <span>· {roleGroupLabelOf(e)}</span>
              {acct.partTime && <span>· Teilzeit ({acct.workdays.map((d) => WEEKDAYS_SHORT_DE[d]).join(', ')})</span>}
              {e.entryDate && <span>· Eintritt {formatDE(e.entryDate)}</span>}
              {e.exitDate && <span>· Austritt {formatDE(e.exitDate)}</span>}
            </div>
          </div>
        </div>

        {/* Resturlaubskonto */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-[var(--color-line)] px-3.5 py-3">
              <div className="text-[12px] text-[var(--color-muted)]">{t.label}</div>
              <div className="text-[26px] font-semibold tnum leading-none mt-1.5"
                style={{ color: t.tone ? toneColor[t.tone] : 'var(--color-ink)' }}>{t.value}</div>
              {t.sub && <div className="text-[10.5px] text-[var(--color-muted)] mt-1">{t.sub}</div>}
            </div>
          ))}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between text-[12.5px] text-[var(--color-muted)] mb-1.5">
            <span>Genommen {acct.approved} von {acct.available} Tagen</span>
            <span className="tnum">{acct.available > 0 ? Math.round((acct.approved / acct.available) * 100) : 0} %</span>
          </div>
          <Meter value={acct.approved} max={acct.available} color={c.accent} />
        </div>

        {/* Antrags-/Urlaubsliste */}
        <h3 className="text-[14px] font-semibold mb-2 flex items-center gap-1.5"><CalendarRange size={16} className="text-[var(--color-muted)]" /> Urlaube &amp; Anträge 2026</h3>
        {mine.length === 0 ? (
          <div className="text-[13px] text-[var(--color-muted)] py-4">Noch keine Urlaube oder Anträge erfasst.</div>
        ) : (
          <div className="border border-[var(--color-line)] rounded-xl overflow-hidden divide-y divide-[var(--color-line-soft)]">
            {mine.map((a) => {
              const days = absenceDays(a, e)
              return (
                <div key={a.id} className="px-3.5 py-2.5 flex items-center gap-3 text-[13px]">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.halfDayStart ? '½ Tag · ' : ''}{formatRangeDE(a.start, a.end)}</div>
                    {a.note && <div className="text-[12px] text-[var(--color-muted)] italic truncate">{a.note}</div>}
                    {a.decidedBy && <div className="text-[11px] text-[var(--color-faint)]">Bearbeitet von {a.decidedBy}{a.decidedAt ? ` · ${formatDE(a.decidedAt, { year: false })}` : ''}</div>}
                  </div>
                  <span className="tnum text-[var(--color-muted)] shrink-0">{days} Tag{days === 1 ? '' : 'e'}</span>
                  <StatusBadge status={a.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
