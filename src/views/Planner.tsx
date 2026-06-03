import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Printer, X } from 'lucide-react'
import { CountryFlag } from '../components/ui/ui'
import type { Absence, CompanyId } from '../domain/types'
import { COMPANIES } from '../domain/seed'
import { useData } from '../store/data'
import { takenFor } from '../lib/leave'
import { TYPE_COLOR } from '../lib/labels'
import { holidayFor } from '../domain/holidays'
import {
  MONTHS_DE, MONTHS_SHORT_DE, WEEKDAYS_SHORT_DE, iso, isWeekend, weekdayMon0, yearDays,
  formatRangeDE, formatDE, TODAY,
} from '../lib/dates'
import { printElement } from '../lib/print'

export type Mode = 'month' | 'year'
const NAME_W = 188

export function Planner({ onCellClick, onEditAbsence, mode, setMode, month, setMonth, filter, setFilter }: {
  onCellClick: (employeeId: string, date: string) => void
  onEditAbsence: (a: Absence) => void
  mode: Mode
  setMode: (m: Mode) => void
  month: number
  setMonth: (updater: number | ((m: number) => number)) => void
  filter: CompanyId | 'ALL'
  setFilter: (f: CompanyId | 'ALL') => void
}) {
  const { employees, absences, removeAbsence } = useData()
  const cardRef = useRef<HTMLDivElement>(null)
  const [printReq, setPrintReq] = useState(false)

  const cell = mode === 'month' ? 26 : 10
  const visibleDays = useMemo(() => {
    if (mode === 'year') return yearDays()
    const last = new Date(2026, month + 1, 0).getDate()
    return Array.from({ length: last }, (_, i) => iso(2026, month + 1, i + 1))
  }, [mode, month])
  const firstDay = visibleDays[0], lastDay = visibleDays[visibleDays.length - 1]
  const W = visibleDays.length * cell
  const dayIndex = useMemo(() => new Map(visibleDays.map((d, i) => [d, i])), [visibleDays])

  const visibleCompanies = COMPANIES.filter((c) => filter === 'ALL' || c.id === filter)
  const visibleEmpIds = useMemo(() => {
    const companyIds = new Set(visibleCompanies.map((c) => c.id))
    return new Set(employees.filter((e) => companyIds.has(e.companyId)).map((e) => e.id))
  }, [visibleCompanies, employees])
  const awayCount = useMemo(() => visibleDays.map((d) =>
    absences.filter((a) => a.status !== 'rejected' && visibleEmpIds.has(a.employeeId) && a.start <= d && a.end >= d).length), [visibleDays, absences, visibleEmpIds])

  const offset = weekdayMon0(firstDay)
  const weekendStyle: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${5 * cell}px, rgba(17,17,20,0.035) ${5 * cell}px ${7 * cell}px)`,
    backgroundPositionX: `${-offset * cell}px`,
  }

  const monthMarks = useMemo(() => visibleDays.map((d, i) => ({ d, i }))
    .filter(({ d }) => d.endsWith('-01'))
    .map(({ d, i }) => ({ label: MONTHS_SHORT_DE[parseInt(d.slice(5, 7)) - 1], left: i * cell })), [visibleDays, cell])

  // Druck: erst Filter/Modus anwenden, dann drucken
  useEffect(() => {
    if (!printReq) return
    printElement(cardRef.current)
    setPrintReq(false)
  }, [printReq])
  function printCompany(cid: CompanyId) { setMode('month'); setFilter(cid); setPrintReq(true) }
  function printAll() { setMode('month'); setPrintReq(true) }

  const todayCount = absences.filter((a) => a.status !== 'rejected' && a.start <= TODAY && a.end >= TODAY).length

  return (
    <div className="px-6 py-5">
      <div ref={cardRef} className="card overflow-hidden">
        {/* Werkzeugleiste */}
        <div className="no-print flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-line)] flex-wrap">
          <div className="flex items-center gap-3">
            <div className="inline-flex p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
              {(['month', 'year'] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`focusable px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${mode === m ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                  {m === 'month' ? 'Monat' : 'Jahr'}
                </button>
              ))}
            </div>
            {mode === 'month' && (
              <div className="flex items-center gap-1">
                <button onClick={() => setMonth((m) => Math.max(0, m - 1))} disabled={month === 0}
                  title="Vorheriger Monat" aria-label="Vorheriger Monat"
                  className="focusable p-1.5 rounded-lg hover:bg-[var(--color-line-soft)] disabled:opacity-30"><ChevronLeft size={18} /></button>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Monat"
                  className="focusable h-8 px-2 rounded-lg border border-[var(--color-line)] bg-white text-[13.5px] font-medium cursor-pointer">
                  {MONTHS_DE.map((mn, i) => <option key={mn} value={i}>{mn} 2026</option>)}
                </select>
                <button onClick={() => setMonth((m) => Math.min(11, m + 1))} disabled={month === 11}
                  title="Nächster Monat" aria-label="Nächster Monat"
                  className="focusable p-1.5 rounded-lg hover:bg-[var(--color-line-soft)] disabled:opacity-30"><ChevronRight size={18} /></button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12.5px] text-[var(--color-muted)]"><b className="tnum text-[var(--color-ink)]">{todayCount}</b> heute im Urlaub</span>
            <div className="inline-flex p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
              {([['ALL', 'Alle'], ['WGV', 'WGV'], ['AG', 'AG 🇨🇭'], ['GMBH', 'GmbH']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`focusable px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors ${filter === v ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>{l}</button>
              ))}
            </div>
            <button onClick={printAll}
              className="focusable inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
              <Printer size={15} /> Drucken
            </button>
          </div>
        </div>

        {/* Titel nur für den Druck sichtbar */}
        <div className="hidden print:block px-4 py-2 text-[14px] font-semibold">
          Urlaubsplan 2026 · {mode === 'month' ? MONTHS_DE[month] : 'Gesamtjahr'}{filter !== 'ALL' ? ` · ${COMPANIES.find((c) => c.id === filter)!.name}` : ''}
        </div>

        {/* Raster */}
        <div className="overflow-x-auto print-expand">
          <div style={{ width: NAME_W + W }}>
            {/* Kopfzeile */}
            <div className="flex sticky top-16 z-20 bg-white border-b border-[var(--color-line)]">
              <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-[var(--color-line)] flex items-center px-4"
                style={{ width: NAME_W, height: mode === 'month' ? 40 : 30 }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-faint)]">Mitarbeiter</span>
              </div>
              {mode === 'month' ? (
                <div className="flex" style={{ width: W }}>
                  {visibleDays.map((d) => {
                    const we = isWeekend(d)
                    const hol = holidayFor(d, 'BW') || holidayFor(d, 'CH')
                    return (
                      <div key={d} className="text-center border-r border-[var(--color-line-soft)] py-1"
                        style={{ width: cell, background: we ? 'var(--color-canvas)' : undefined }} title={hol?.name}>
                        <div className="text-[9.5px] text-[var(--color-faint)] leading-none">{WEEKDAYS_SHORT_DE[weekdayMon0(d)]}</div>
                        <div className={`text-[12px] tnum leading-none mt-1 ${we ? 'text-[var(--color-faint)]' : 'font-medium'}`}>{parseInt(d.slice(8))}</div>
                        {hol && <div className="mx-auto mt-1 w-1 h-1 rounded-full" style={{ background: 'var(--color-ww-red)' }} />}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="relative" style={{ width: W, height: 30 }}>
                  {monthMarks.map((m) => (
                    <div key={m.label} className="absolute top-0 h-full flex items-center border-l border-[var(--color-line-soft)] pl-1" style={{ left: m.left }}>
                      <span className="text-[11px] font-medium text-[var(--color-muted)]">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gesellschaften */}
            {visibleCompanies.map((company) => {
              const emps = employees.filter((e) => e.companyId === company.id)
              const holidays = visibleDays.map((d, i) => ({ i, h: holidayFor(d, company.holidayRegion) })).filter((x) => x.h)
              return (
                <div key={company.id}>
                  <div className="flex bg-[var(--color-canvas)] border-b border-[var(--color-line)]" style={{ width: NAME_W + W }}>
                    <div className="shrink-0 sticky left-0 z-10 bg-[var(--color-canvas)] flex items-center gap-1.5 px-4" style={{ width: NAME_W, height: 28 }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: company.accent }} />
                      <span className="text-[12px] font-semibold">{company.name}</span>
                      <CountryFlag country={company.country} />
                      <span className="text-[11px] text-[var(--color-faint)]">· {emps.length}</span>
                      <button onClick={() => printCompany(company.id)} title={`${company.name} drucken`} aria-label={`${company.name} drucken`}
                        className="no-print ml-1 p-1 rounded text-[var(--color-faint)] hover:text-[var(--color-ink)] hover:bg-white"><Printer size={13} /></button>
                    </div>
                    <div style={{ width: W, height: 28 }} />
                  </div>

                  {emps.map((e) => {
                    const rows = absences.filter((a) => a.employeeId === e.id && a.status !== 'rejected' && a.start <= lastDay && a.end >= firstDay)
                    const rem = e.entitlement + e.carryover - takenFor(e, absences)
                    return (
                      <div key={e.id} className="flex border-b border-[var(--color-line-soft)] group">
                        <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-[var(--color-line)] flex items-center justify-between gap-2 px-4 transition-colors group-hover:bg-[var(--color-line-soft)]/50" style={{ width: NAME_W, height: 30 }}>
                          <span className="text-[12.5px] font-medium truncate" title={e.name}>{e.name}</span>
                          <span className="text-[11px] tnum text-[var(--color-faint)] shrink-0" title={`Resturlaub: ${rem} von ${e.entitlement + e.carryover} Tagen`}>{rem}</span>
                        </div>
                        <div className="relative cursor-cell" style={{ width: W, height: 30, ...weekendStyle }}
                          onClick={(ev) => {
                            const rect = ev.currentTarget.getBoundingClientRect()
                            const di = Math.max(0, Math.min(visibleDays.length - 1, Math.floor((ev.clientX - rect.left) / cell)))
                            onCellClick(e.id, visibleDays[di])
                          }}>
                          {holidays.map(({ i }) => (
                            <div key={i} className="absolute top-0 h-full pointer-events-none" style={{ left: i * cell, width: cell, background: 'color-mix(in srgb, var(--color-ww-red) 6%, transparent)' }} />
                          ))}
                          {rows.map((a) => {
                            const s = a.start < firstDay ? firstDay : a.start
                            const en = a.end > lastDay ? lastDay : a.end
                            const si = dayIndex.get(s), ei = dayIndex.get(en)
                            if (si == null || ei == null) return null
                            const w = (ei - si + 1) * cell - 2
                            return (
                              <div key={a.id} title={`${e.name} · ${a.halfDayStart || a.halfDayEnd ? '½ Tag ' : ''}Urlaub\n${formatRangeDE(a.start, a.end)}\nKlick zum Bearbeiten`}
                                onClick={(ev) => { ev.stopPropagation(); onEditAbsence(a) }}
                                className="absolute rounded-[5px] flex items-center px-1.5 overflow-hidden cursor-pointer group/bar"
                                style={{ left: si * cell + 1, width: w, top: 5, height: 20, background: TYPE_COLOR.vacation, color: 'white' }}>
                                {w > 40 && <span className="text-[10.5px] font-medium truncate">{a.halfDayStart || a.halfDayEnd ? '½ ' : ''}Urlaub</span>}
                                {w > 40 && (
                                  <button onClick={(ev) => { ev.stopPropagation(); removeAbsence(a.id) }}
                                    className="no-print ml-auto opacity-0 group-hover/bar:opacity-100 shrink-0 rounded p-0.5 transition-opacity hover:bg-black/20" title="Entfernen" aria-label="Urlaub entfernen"><X size={11} /></button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Summenzeile */}
            <div className="flex bg-white border-t-2 border-[var(--color-line)]">
              <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-[var(--color-line)] flex items-center px-4" style={{ width: NAME_W, height: 26 }}>
                <span className="text-[11px] font-semibold text-[var(--color-muted)]">Gleichzeitig im Urlaub</span>
              </div>
              <div className="flex" style={{ width: W, height: 26 }}>
                {visibleDays.map((d, i) => (
                  <div key={d} title={`${formatDE(d, { weekday: true })} · ${awayCount[i]} im Urlaub`}
                    className="flex items-center justify-center" style={{ width: cell, background: awayColor(awayCount[i]) }}>
                    {mode === 'month' && awayCount[i] > 0 && <span className="text-[10px] tnum font-semibold text-[var(--color-ink-soft)]">{awayCount[i]}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="no-print text-[12px] text-[var(--color-faint)] mt-3 px-1">
        In eine Zeile klicken zum Eintragen · auf einen Balken zeigen und ✕ zum Entfernen · 🖨 je Gesellschaft druckt diesen Bereich · Würzburger AG = Schweiz (eigene Feiertage).
      </p>
    </div>
  )
}

function awayColor(n: number): string {
  const ramp = ['transparent', '#dde9da', '#c2e0bf', '#fbe6b8', '#f3c277', '#e89a52', '#dd6f4a']
  return ramp[Math.min(n, ramp.length - 1)]
}
