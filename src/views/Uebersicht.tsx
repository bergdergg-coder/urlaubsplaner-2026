import { useMemo, useRef, useState } from 'react'
import { Printer, Plus, CalendarRange } from 'lucide-react'
import { Card, Avatar, CountryFlag, Meter, StatusBadge, PrintHeader } from '../components/ui/ui'
import { COMPANIES, COMPANY_MAP } from '../domain/seed'
import { roleGroupLabelOf } from '../domain/roles'
import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import { leaveAccount, absenceDays } from '../lib/leave'
import { ABSENCE_TYPE } from '../domain/absenceTypes'
import { formatRangeDE, formatDE, WEEKDAYS_SHORT_DE, MONTHS_SHORT_DE, yearDays, daysBetweenInclusive, iso, YEAR, YEAR_START, YEAR_END, TODAY } from '../lib/dates'
import { holidayFor } from '../domain/holidays'
import type { Absence, HolidayRegion } from '../domain/types'
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

  // Alle Abwesenheiten der Person (für die Liste); der Jahresverlauf nur Urlaub.
  const mine = absences
    .filter((a) => a.employeeId === e.id)
    .sort((a, b) => a.start.localeCompare(b.start))
  const myVacations = mine.filter((a) => a.type === 'vacation')
  // Tage je Nicht-Urlaubs-Art (für die Übersichts-Badges).
  const typeCounts = (['sick', 'homeoffice', 'special'] as const)
    .map((t) => ({ t, n: mine.filter((a) => a.type === t).reduce((s, a) => s + absenceDays(a, e), 0) }))
    .filter((x) => x.n > 0)

  const tiles: { label: string; value: string | number; sub?: string; tone?: 'accent' | 'ok' | 'warn' | 'crit' }[] = [
    { label: 'Jahresurlaub', value: acct.entitlementEffective, sub: acct.entitlementEffective !== acct.entitlement ? `anteilig von ${acct.entitlement}` : undefined },
    { label: 'Resturlaub Vorjahr', value: acct.carryover, sub: acct.carryoverLapsed ? `${acct.carryoverLapsed} verfallen am 31.03.` : undefined, tone: acct.carryoverLapsed ? 'warn' : undefined },
    { label: 'Verfügbar gesamt', value: acct.available, tone: 'accent' },
    { label: 'Genehmigt genommen', value: acct.approved },
    { label: 'Beantragt (offen)', value: acct.requested, tone: acct.requested > 0 ? 'warn' : undefined },
    { label: 'Verbleibend', value: acct.remaining, tone: acct.remaining < 0 ? 'crit' : 'ok' },
  ]
  const toneColor: Record<string, string> = {
    // Firmenfarbe als große Zahl abdunkeln (sonst zu kontrastarm, v.a. GmbH-Grün auf Weiß).
    accent: `color-mix(in srgb, ${c.accent} 68%, var(--color-ink))`,
    ok: 'var(--color-ok)', warn: 'var(--color-warn)', crit: 'var(--color-crit)',
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[940px] mx-auto">
      {/* Steuerleiste (nicht im Druck) */}
      <div className="no-print flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Urlaubsübersicht pro Person</h2>
          <p className="text-[13px] text-[var(--color-muted)] mt-0.5">
            {isEmployee ? 'Eigene Urlaube, Resturlaub und der Status der eigenen Anträge.' : 'Resturlaubskonto und Anträge einer Person.'}
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
          <button onClick={() => printElement(ref.current, 'portrait')}
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

        {/* Genommener Urlaub im Jahresverlauf */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[14px] font-semibold flex items-center gap-1.5"><CalendarRange size={16} className="text-[var(--color-muted)]" /> Urlaub im Jahresverlauf {YEAR}</h3>
            <div className="flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: c.accent }} /> genommen</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-2.5 rounded-sm border border-dashed bg-white" style={{ borderColor: c.accent }} /> Antrag</span>
            </div>
          </div>
          <YearTaken absences={myVacations} color={c.accent} region={c.holidayRegion} />
        </div>

        {/* Abwesenheiten & Anträge */}
        <h3 className="text-[14px] font-semibold mb-2 flex items-center gap-1.5 flex-wrap">
          <CalendarRange size={16} className="text-[var(--color-muted)]" /> Abwesenheiten &amp; Anträge {YEAR}
          {typeCounts.map(({ t, n }) => (
            <span key={t} className="text-[11.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: ABSENCE_TYPE[t].bg, color: ABSENCE_TYPE[t].color }}>{n} Tag{n === 1 ? '' : 'e'} {ABSENCE_TYPE[t].label}</span>
          ))}
        </h3>
        {mine.length === 0 ? (
          <div className="text-[13px] text-[var(--color-muted)] py-4">Noch keine Urlaube oder Anträge erfasst.</div>
        ) : (
          <div className="border border-[var(--color-line)] rounded-xl overflow-hidden divide-y divide-[var(--color-line-soft)]">
            {mine.map((a) => {
              const days = absenceDays(a, e)
              const at = a.type ?? 'vacation'
              const isVac = at === 'vacation'
              const tm = ABSENCE_TYPE[at]
              return (
                <div key={a.id} className="px-3.5 py-2.5 flex items-center gap-3 text-[13px]">
                  {!isVac && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tm.color }} title={tm.label} />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.halfDayStart ? '½ Tag · ' : ''}{formatRangeDE(a.start, a.end)}</div>
                    {a.note && <div className="text-[12px] text-[var(--color-muted)] italic truncate">{a.note}</div>}
                    {a.decidedBy && <div className="text-[11px] text-[var(--color-faint)]">Bearbeitet von {a.decidedBy}{a.decidedAt ? ` · ${formatDE(a.decidedAt, { year: false })}` : ''}</div>}
                  </div>
                  <span className="tnum text-[var(--color-muted)] shrink-0">{days} Tag{days === 1 ? '' : 'e'}</span>
                  {isVac
                    ? <StatusBadge status={a.status} />
                    : <span className="inline-flex items-center text-[11.5px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* Kompakter Jahresverlauf: zeigt, WANN im Jahr Urlaub genommen wurde (in der
   Firmenfarbe), mit Monatsrastern und Heute-Markierung. Anträge gestrichelt. */
function YearTaken({ absences, color, region }: { absences: Absence[]; color: string; region: HolidayRegion }) {
  const days = yearDays()
  const total = days.length
  const dayIdx = (d: string) => Math.max(0, Math.min(total - 1, daysBetweenInclusive(YEAR_START, d).length - 1))
  const segs = absences
    .filter((a) => a.type === 'vacation' && a.status !== 'rejected' && a.end >= YEAR_START && a.start <= YEAR_END)
    .map((a) => {
      const s = a.start < YEAR_START ? YEAR_START : a.start
      const en = a.end > YEAR_END ? YEAR_END : a.end
      const si = dayIdx(s), ei = dayIdx(en)
      return { id: a.id, left: (si / total) * 100, width: ((ei - si + 1) / total) * 100, requested: a.status === 'requested', label: formatRangeDE(a.start, a.end) }
    })
  const months = Array.from({ length: 12 }, (_, m) => ({ label: MONTHS_SHORT_DE[m], left: (dayIdx(iso(YEAR, m + 1, 1)) / total) * 100 }))
  const todayLeft = TODAY >= YEAR_START && TODAY <= YEAR_END ? (dayIdx(TODAY) / total) * 100 : -1
  // Feiertage gemäß der Region der Person (BW oder CH) – neutrale Ticks, über den Balken sichtbar.
  const holiMarks = days.map((d, i) => ({ i, h: holidayFor(d, region) })).filter((x) => x.h).map((x) => (x.i / total) * 100)
  return (
    <div>
      <div className="relative h-3.5 mb-1 text-[9.5px] text-[var(--color-faint)]">
        {months.map((m) => <span key={m.label} className="absolute leading-none" style={{ left: `${m.left}%` }}>{m.label}</span>)}
      </div>
      <div className="relative h-7 rounded-md bg-[var(--color-canvas)] border border-[var(--color-line)] overflow-hidden">
        {months.map((m, i) => i === 0 ? null : <div key={m.label} className="absolute top-0 bottom-0 w-px bg-[var(--color-line)]" style={{ left: `${m.left}%` }} />)}
        {segs.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--color-faint)]">Noch kein Urlaub erfasst</div>}
        {segs.map((s) => (
          <div key={s.id} title={s.label} className="absolute top-1.5 bottom-1.5 rounded-[3px]"
            style={{ left: `${s.left}%`, width: `max(3px, ${s.width}%)`,
              background: s.requested ? `color-mix(in srgb, ${color} 18%, white)` : color,
              border: s.requested ? `1px dashed ${color}` : 'none' }} />
        ))}
        {/* Feiertags-Ticks NACH den Segmenten, damit sie auch über Urlaubsbalken sichtbar bleiben. */}
        {holiMarks.map((l, i) => <div key={`h${i}`} className="absolute top-0 h-1.5 w-px z-[5] bg-[var(--color-faint)]" style={{ left: `${l}%` }} title="Feiertag" />)}
        {todayLeft >= 0 && <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: `${todayLeft}%`, background: 'var(--color-info)' }} title="Heute" />}
      </div>
    </div>
  )
}
