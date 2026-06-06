import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Printer, X, CalendarPlus } from 'lucide-react'
import { CountryFlag, PrintHeader } from '../components/ui/ui'
import { OutlookExportDialog } from '../components/OutlookExportDialog'
import type { Absence, CompanyId } from '../domain/types'
import { COMPANIES } from '../domain/seed'
import { ABSENCE_TYPE } from '../domain/absenceTypes'
import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import { leaveAccount } from '../lib/leave'
import { downloadText } from '../lib/csv'
import { outlookIcs } from '../lib/ics'
import { loadExported, saveExported, vacationSig, vacationsOf, newVacations as pickNew } from '../lib/outlookExport'
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
  const { employees, absences, removeAbsence, employeeMap } = useData()
  const { scopeCompanies, isSuper } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)
  const [printReq, setPrintReq] = useState(false)
  const [outlookOpen, setOutlookOpen] = useState(false)
  const [exported, setExported] = useState<Set<string>>(() => loadExported())

  const cell = mode === 'month' ? 26 : 10
  const visibleDays = useMemo(() => {
    if (mode === 'year') return yearDays()
    const last = new Date(2026, month + 1, 0).getDate()
    return Array.from({ length: last }, (_, i) => iso(2026, month + 1, i + 1))
  }, [mode, month])
  const firstDay = visibleDays[0], lastDay = visibleDays[visibleDays.length - 1]
  const W = visibleDays.length * cell
  const dayIndex = useMemo(() => new Map(visibleDays.map((d, i) => [d, i])), [visibleDays])
  const todayIdx = dayIndex.get(TODAY) ?? -1

  const inScope = COMPANIES.filter((c) => scopeCompanies.includes(c.id))
  const effFilter = isSuper ? filter : 'ALL'
  const visibleCompanies = effFilter === 'ALL' ? inScope : inScope.filter((c) => c.id === effFilter)
  const visibleEmpIds = useMemo(() => {
    const companyIds = new Set(visibleCompanies.map((c) => c.id))
    return new Set(employees.filter((e) => companyIds.has(e.companyId)).map((e) => e.id))
  }, [visibleCompanies, employees])
  const isAway = (a: Absence) => a.status !== 'rejected' && !ABSENCE_TYPE[a.type ?? 'vacation'].present
  const todayCount = absences.filter((a) => isAway(a) && visibleEmpIds.has(a.employeeId) && a.start <= TODAY && a.end >= TODAY).length
  const awayCount = useMemo(() => visibleDays.map((d) =>
    absences.filter((a) => a.status !== 'rejected' && !ABSENCE_TYPE[a.type ?? 'vacation'].present && visibleEmpIds.has(a.employeeId) && a.start <= d && a.end >= d).length), [visibleDays, absences, visibleEmpIds])

  const offset = weekdayMon0(firstDay)
  const weekendStyle: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${5 * cell}px, rgba(17,17,20,0.035) ${5 * cell}px ${7 * cell}px)`,
    backgroundPositionX: `${-offset * cell}px`,
  }

  const monthMarks = useMemo(() => visibleDays.map((d, i) => ({ d, i }))
    .filter(({ d }) => d.endsWith('-01'))
    .map(({ d, i }) => ({ label: MONTHS_SHORT_DE[parseInt(d.slice(5, 7)) - 1], left: i * cell })), [visibleDays, cell])

  // Druck: erst Filter anwenden, dann drucken (Modus bleibt wie angezeigt — WYSIWYG).
  useEffect(() => {
    if (!printReq) return
    printElement(cardRef.current)
    setPrintReq(false)
  }, [printReq])
  function printCompany(cid: CompanyId) { setFilter(cid); setPrintReq(true) }
  function printAll() { setPrintReq(true) }

  // „Neue Urlaube"-Badge bezieht sich auf den GESAMTEN erlaubten Export-Bereich
  // (Scope), nicht nur auf die aktuelle Filteransicht — passend zum Export-Dialog.
  const scopeEmpIds = useMemo(() => {
    const ids = new Set<CompanyId>(scopeCompanies)
    return new Set(employees.filter((e) => ids.has(e.companyId)).map((e) => e.id))
  }, [employees, scopeCompanies])
  const scopeVacations = useMemo(
    () => vacationsOf(absences, (a) => scopeEmpIds.has(a.employeeId)),
    [absences, scopeEmpIds],
  )
  const pendingNew = useMemo(
    () => pickNew(scopeVacations, exported, employeeMap),
    [scopeVacations, exported, employeeMap],
  )
  // Resturlaubs-Konten einmal pro (employees, absences) berechnen statt je Render & Zeile.
  const accountByEmp = useMemo(
    () => new Map(employees.map((e) => [e.id, leaveAccount(e, absences)])),
    [employees, absences],
  )
  const isExported = (a: Absence) => exported.has(vacationSig(a, employeeMap[a.employeeId]?.name ?? a.employeeId))

  function markExported(list: Absence[]) {
    const next = new Set(exported)
    for (const a of list) next.add(vacationSig(a, employeeMap[a.employeeId]?.name ?? a.employeeId))
    setExported(next)
    saveExported(next)
  }
  function handleExport(list: Absence[], suffix: string) {
    if (!list.length) return
    downloadText(`Urlaub_WuerzburgerGruppe${suffix}_2026.ics`, outlookIcs(list, employeeMap, 'Urlaub Würzburger Gruppe 2026'), 'text/calendar;charset=utf-8')
    markExported(list)
  }
  function resetExportLog() {
    const empty = new Set<string>()
    setExported(empty)
    saveExported(empty)
  }

  return (
    <div className="px-6 py-5">
      <div ref={cardRef} className="card overflow-hidden">
        {/* Werkzeugleiste */}
        <div className="no-print flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-line)] flex-wrap">
          <div className="flex items-center gap-3">
            <div className="inline-flex p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
              {(['month', 'year'] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
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
            {isSuper && (
              <div className="inline-flex p-0.5 rounded-lg bg-[var(--color-line-soft)] border border-[var(--color-line)]">
                {([['ALL', 'Alle'], ['WGV', 'WGV'], ['AG', 'AG 🇨🇭'], ['GMBH', 'GmbH']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v}
                    className={`focusable px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-colors ${filter === v ? 'bg-white shadow-sm text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>{l}</button>
                ))}
              </div>
            )}
            <button onClick={() => setOutlookOpen(true)} title="Urlaube in den Outlook-Kalender übernehmen"
              className="focusable relative inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
              <CalendarPlus size={15} /> Outlook
              {pendingNew.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-ww-red)] text-white text-[11px] font-semibold tnum"
                  title={`${pendingNew.length} neue Urlaube seit dem letzten Export`}>{pendingNew.length}</span>
              )}
            </button>
            <button onClick={printAll}
              className="focusable inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[var(--color-line)] text-[13px] font-medium hover:bg-[var(--color-line-soft)]">
              <Printer size={15} /> Drucken
            </button>
          </div>
        </div>

        {/* Markenkopf nur für den Druck/PDF sichtbar (Logo + Würzburger Gruppe + Firmenfarbe) */}
        <div className="hidden print:block px-4 pt-3">
          <PrintHeader
            title={`Urlaubsplan · ${mode === 'month' ? `${MONTHS_DE[month]} 2026` : 'Gesamtjahr 2026'}`}
            company={visibleCompanies.length === 1 ? visibleCompanies[0] : undefined} />
        </div>

        {/* Druck-Legende — erklärt Farben/Muster im Ausdruck (auch in S/W nachvollziehbar).
            Urlaub wird in der Firmenfarbe dargestellt. */}
        <div className="hidden print:flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-[10px] text-[var(--color-ink-soft)]">
          <span className="font-medium">Urlaub:</span>
          {visibleCompanies.map((co) => (
            <span key={co.id} className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-2.5 rounded-sm" style={{ background: co.accent }} /> {co.name}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-2.5 rounded-sm border-[1.5px] border-dashed bg-white border-[var(--color-faint)]" /> Antrag (offen)</span>
          {(['sick', 'homeoffice', 'special'] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-2.5 rounded-sm" style={{ background: ABSENCE_TYPE[t].color }} /> {ABSENCE_TYPE[t].short}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-faint)' }} /> Feiertag</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3.5 h-2.5 rounded-sm" style={{ background: 'var(--color-canvas)', boxShadow: 'inset 0 0 0 1px var(--color-line)' }} /> Wochenende</span>
          <span className="inline-flex items-center gap-1.5">Zahl rechts = Resturlaub</span>
        </div>

        {/* Raster */}
        <div className="overflow-x-auto print-expand">
          {/* print-fit + --print-scale: skaliert das (im Jahr sehr breite) Raster im Druck auf Seitenbreite. */}
          <div className="relative print-fit" style={{ width: NAME_W + W, ['--print-scale' as string]: String(Math.min(1, 1010 / (NAME_W + W))) } as CSSProperties}>
            {/* Kopfzeile — top-0 (NICHT top-16): Der umgebende overflow-x-auto-Container
                (.print-expand) ist zugleich der vertikale Sticky-Bezugsrahmen. Ein
                top-Versatz schiebt die Kopfzeile dann um genau diesen Betrag nach unten —
                direkt über die erste Mitarbeiterzeile (z. B. Wolfgang Würzburger über
                Susanne), die dadurch am Bildschirm verdeckt wird (im Druck nicht, da
                .sticky → static). Mit top-0 bleibt die erste Zeile sichtbar. */}
            <div className="flex sticky top-0 z-20 bg-white border-b border-[var(--color-line)]">
              <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-[var(--color-line)] flex items-center justify-between px-4"
                style={{ width: NAME_W, height: mode === 'month' ? 40 : 30 }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-faint)]">Mitarbeiter</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-faint)]" title="Resturlaub in Tagen">Rest</span>
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
                        {hol && <div className="mx-auto mt-1 w-1 h-1 rounded-full" style={{ background: 'var(--color-faint)' }} />}
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
                  <div className="print-row flex bg-[var(--color-canvas)] border-b border-[var(--color-line)]" style={{ width: NAME_W + W }}>
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

                  {emps.length === 0 && (
                    <div className="print-row flex border-b border-[var(--color-line-soft)]">
                      <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-[var(--color-line)] flex items-center px-4" style={{ width: NAME_W, height: 30 }}>
                        <span className="text-[12px] text-[var(--color-faint)] italic">Keine Mitarbeiter</span>
                      </div>
                      <div style={{ width: W, height: 30 }} />
                    </div>
                  )}

                  {emps.map((e) => {
                    const rows = absences.filter((a) => a.employeeId === e.id && a.status !== 'rejected' && a.start <= lastDay && a.end >= firstDay)
                    const rem = accountByEmp.get(e.id)?.remaining ?? 0
                    return (
                      <div key={e.id} className="print-row flex border-b border-[var(--color-line-soft)] group">
                        <div className="shrink-0 sticky left-0 z-10 bg-white border-r border-[var(--color-line)] flex items-center justify-between gap-2 px-4 transition-colors group-hover:bg-[var(--color-line-soft)]/50" style={{ width: NAME_W, height: 30 }}>
                          <span className="text-[12.5px] font-medium truncate" title={e.name}>{e.name}</span>
                          <span className="text-[11px] tnum shrink-0" style={{ color: rem < 0 ? 'var(--color-crit)' : 'var(--color-faint)' }} title={`Resturlaub: ${rem} Tage`}>{rem}</span>
                        </div>
                        <div className="relative cursor-cell" style={{ width: W, height: 30, ...weekendStyle }}
                          onClick={(ev) => {
                            const rect = ev.currentTarget.getBoundingClientRect()
                            const di = Math.max(0, Math.min(visibleDays.length - 1, Math.floor((ev.clientX - rect.left) / cell)))
                            onCellClick(e.id, visibleDays[di])
                          }}>
                          {holidays.map(({ i }) => (
                            <div key={i} className="absolute top-0 h-full pointer-events-none" style={{ left: i * cell, width: cell, background: 'color-mix(in srgb, var(--color-ink) 5%, transparent)' }} />
                          ))}
                          {rows.map((a) => {
                            const s = a.start < firstDay ? firstDay : a.start
                            const en = a.end > lastDay ? lastDay : a.end
                            const si = dayIndex.get(s), ei = dayIndex.get(en)
                            if (si == null || ei == null) return null
                            const singleHalf = si === ei && a.halfDayStart
                            const w = singleHalf ? Math.max(8, Math.round(cell * 0.5)) : (ei - si + 1) * cell - 2
                            const requested = a.status === 'requested'
                            const at = a.type ?? 'vacation'
                            const isVac = at === 'vacation'
                            const tm = ABSENCE_TYPE[at]
                            const label = isVac ? (requested ? 'Antrag' : 'Urlaub') : tm.short
                            return (
                              <div key={a.id} role="button" tabIndex={0}
                                aria-label={`${e.name}: ${label} ${formatRangeDE(a.start, a.end)} – bearbeiten`}
                                title={`${e.name} · ${company.name} · ${isVac ? (requested ? 'Antrag (offen)' : (a.halfDayStart ? '½ Tag Urlaub' : 'Urlaub')) : tm.label}\n${formatRangeDE(a.start, a.end)}\nKlick/Enter zum Bearbeiten`}
                                onClick={(ev) => { ev.stopPropagation(); onEditAbsence(a) }}
                                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); onEditAbsence(a) } }}
                                className="focusable absolute rounded-[5px] flex items-center px-1.5 overflow-hidden cursor-pointer group/bar"
                                style={{ left: si * cell + 1, width: w, top: 5, height: 20,
                                  background: !isVac ? tm.color : (requested ? `color-mix(in srgb, ${company.accent} 18%, white)` : company.accent),
                                  border: (isVac && requested) ? `1.5px dashed ${company.accent}` : 'none',
                                  color: !isVac ? '#fff' : (requested ? `color-mix(in srgb, ${company.accent} 82%, black)` : company.accentText) }}>
                                {w > 40 && <span className="text-[10.5px] font-medium truncate">{a.halfDayStart ? '½ ' : ''}{label}</span>}
                                <button onClick={(ev) => { ev.stopPropagation(); removeAbsence(a.id) }}
                                  className="focusable no-print ml-auto opacity-0 group-hover/bar:opacity-100 focus-visible:opacity-100 shrink-0 rounded p-0.5 transition-opacity hover:bg-black/20" title="Entfernen" aria-label={`Urlaub von ${e.name} entfernen`}><X size={11} /></button>
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

            {/* „Heute"-Markierung */}
            {todayIdx >= 0 && (
              <div className="absolute top-0 bottom-0 pointer-events-none z-[6]" title="Heute"
                style={{ left: NAME_W + todayIdx * cell + Math.floor(cell / 2) - 1, width: 2, background: 'var(--color-info)' }} />
            )}
          </div>
        </div>
      </div>

      <p className="no-print text-[12px] text-[var(--color-faint)] mt-3 px-1">
        In eine Zeile klicken zum Eintragen · auf einen Balken klicken zum Bearbeiten oder mit ✕ entfernen.
      </p>

      <OutlookExportDialog
        open={outlookOpen}
        onClose={() => setOutlookOpen(false)}
        employees={employees}
        absences={absences}
        allowedCompanies={scopeCompanies}
        isExported={isExported}
        exportedCount={exported.size}
        onExport={handleExport}
        onResetLog={resetExportLog}
      />
    </div>
  )
}

function awayColor(n: number): string {
  const ramp = ['transparent', '#dde9da', '#c2e0bf', '#fbe6b8', '#f3c277', '#e89a52', '#dd6f4a']
  return ramp[Math.min(n, ramp.length - 1)]
}
