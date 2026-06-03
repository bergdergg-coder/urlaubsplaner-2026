import { useMemo, useRef } from 'react'
import { Printer, Users, CalendarOff, Gauge, TriangleAlert, ArrowRight } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { Card, Kpi, SectionHeader, Avatar, Meter, CountryFlag, BrandWave } from '../components/ui/ui'
import type { Mode } from './Planner'
import { COMPANIES } from '../domain/seed'
import { useData } from '../store/data'
import { takenFor } from '../lib/leave'
import { printElement } from '../lib/print'
import type { CompanyId } from '../domain/types'
import { yearDays, MONTHS_SHORT_DE, iso, formatDE } from '../lib/dates'

export interface PlanTarget { month?: number; filter?: CompanyId | 'ALL'; mode?: Mode }

// Ab dieser Anzahl gleichzeitiger Urlaube gilt ein Tag als kritisch.
const CRITICAL = 6

export function Controlling({ onOpenPlan }: {
  onOpenPlan: (t: PlanTarget) => void
}) {
  const { employees, absences, employeeMap } = useData()
  const ref = useRef<HTMLDivElement>(null)
  const days = useMemo(() => yearDays(), [])
  const idx = useMemo(() => new Map(days.map((d, i) => [d, i])), [days])

  // Tageszählung gesamt + je Gesellschaft
  const { total, byCo } = useMemo(() => {
    const total = new Array(days.length).fill(0)
    const byCo: Record<CompanyId, number[]> = {
      WGV: new Array(days.length).fill(0), AG: new Array(days.length).fill(0), GMBH: new Array(days.length).fill(0),
    }
    for (const a of absences) {
      if (a.status === 'rejected') continue
      const emp = employeeMap[a.employeeId]
      if (!emp) continue
      const co = emp.companyId
      const s = idx.get(a.start), e = idx.get(a.end)
      if (s == null || e == null) continue
      for (let i = s; i <= e; i++) { total[i]++; byCo[co][i]++ }
    }
    return { total, byCo }
  }, [absences, days, idx, employeeMap])

  const takenTotal = useMemo(() => employees.reduce((s, e) => s + takenFor(e, absences), 0), [employees, absences])
  const entitlementTotal = employees.reduce((s, e) => s + e.entitlement + e.carryover, 0)
  const utilization = entitlementTotal > 0 ? Math.round((takenTotal / entitlementTotal) * 100) : 0

  const peakIdx = total.reduce((best, v, i) => (v > total[best] ? i : best), 0)
  const peak = { count: total[peakIdx], date: days[peakIdx] }

  // Engste Tage (gut verteilt)
  const tightest = useMemo(() => {
    const order = total.map((c, i) => ({ i, c })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c)
    const picked: { i: number; c: number }[] = []
    for (const o of order) {
      if (picked.length >= 6) break
      if (picked.some((p) => Math.abs(p.i - o.i) <= 3)) continue
      picked.push(o)
    }
    return picked.sort((a, b) => a.i - b.i).map(({ i, c }) => {
      const d = days[i]
      const who = absences.filter((a) => a.status !== 'rejected' && a.start <= d && a.end >= d).map((a) => a.employeeId)
      return { date: d, count: c, who: [...new Set(who)] }
    })
  }, [total, days, absences])

  const monthOf = (d: string) => parseInt(d.slice(5, 7)) - 1

  return (
    <div className="px-6 py-5">
      <div ref={ref}>
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl text-white mb-5"
          style={{ background: 'linear-gradient(120deg, var(--color-ww-red-700), var(--color-ww-red), var(--color-ww-red-600))', boxShadow: 'var(--shadow-card)' }}>
          <div className="relative z-10 px-6 pt-6 pb-12 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center bg-white rounded-xl h-12 w-12 shrink-0"><img src={logoUrl} className="h-7 w-auto" alt="WW" /></span>
              <div>
                <div className="text-[13px] font-medium text-white/80">WW Controlling · Gesamtübersicht</div>
                <h2 className="text-[23px] font-semibold tracking-tight mt-0.5">Würzburger Gruppe 2026</h2>
                <p className="text-[13px] text-white/85 mt-1">Alle Gesellschaften · Deutschland & Schweiz auf einen Blick</p>
              </div>
            </div>
            <button onClick={() => printElement(ref.current)}
              className="focusable no-print inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold backdrop-blur transition-colors">
              <Printer size={15} /> Bericht drucken
            </button>
          </div>
          <BrandWave className="absolute bottom-0 left-0 w-full h-[40px] z-0" color="var(--color-canvas)" />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Kpi label="Mitarbeiter" value={employees.length} icon={<Users size={18} />} hint={`${COMPANIES.length} Gesellschaften · DE + CH`} />
          <Kpi label="Urlaubstage genommen" value={takenTotal} icon={<CalendarOff size={18} />} hint={`von ${entitlementTotal} möglichen`} />
          <Kpi label="Ø Auslastung" value={`${utilization}%`} icon={<Gauge size={18} />} tone={utilization > 75 ? 'warn' : 'neutral'} hint="des Jahresanspruchs" />
          <Kpi label="Spitzentag" value={peak.count} icon={<TriangleAlert size={18} />} tone={peak.count >= CRITICAL ? 'red' : peak.count >= 4 ? 'warn' : 'neutral'} hint={formatDE(peak.date)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Heatmap */}
          <Card className="xl:col-span-2">
            <SectionHeader title="Urlaubsdichte 2026" sub="Wie viele gleichzeitig im Urlaub — je dunkler, desto enger" />
            <YearHeat days={days} total={total} idx={idx} onPick={(d) => onOpenPlan({ month: monthOf(d), mode: 'month' })} />
          </Card>

          {/* Gesellschaften */}
          <Card>
            <SectionHeader title="Gesellschaften" sub="Auslastung & Spitzen" />
            <div className="space-y-3">
              {COMPANIES.map((c) => {
                const emps = employees.filter((e) => e.companyId === c.id)
                const taken = emps.reduce((s, e) => s + takenFor(e, absences), 0)
                const maxc = Math.max(0, ...byCo[c.id])
                const ent = emps.reduce((s, e) => s + e.entitlement + e.carryover, 0)
                return (
                  <button key={c.id} onClick={() => onOpenPlan({ filter: c.id, mode: 'month' })}
                    className="focusable w-full text-left p-3 rounded-xl border border-[var(--color-line)] hover:border-[var(--color-ww-red-100)] hover:bg-[var(--color-ww-red-50)]/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13.5px] font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.accent }} />{c.name} <CountryFlag country={c.country} />
                      </span>
                      <span className="text-[12px] text-[var(--color-muted)] tnum">max. {maxc} gleichzeitig im Urlaub</span>
                    </div>
                    <div className="mt-2"><Meter value={taken} max={ent} color={c.accent} /></div>
                    <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[var(--color-muted)] tnum">
                      <span>{emps.length} Mitarbeiter · {c.location}</span><span>{taken}/{ent} Tage</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Engste Tage */}
        <Card className="mt-5">
          <SectionHeader title="Engste Zeitpunkte im Jahr" sub="Tage mit den meisten gleichzeitigen Urlauben — Klick öffnet den Monat"
            right={<button onClick={() => onOpenPlan({ mode: 'year' })} className="no-print text-[12.5px] font-medium text-[var(--color-ww-red)] inline-flex items-center gap-1">Jahresplan <ArrowRight size={14} /></button>} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tightest.map((t) => (
              <button key={t.date} onClick={() => onOpenPlan({ month: monthOf(t.date), mode: 'month' })}
                className="focusable text-left p-3 rounded-xl border border-[var(--color-line)] hover:bg-[var(--color-line-soft)]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">{formatDE(t.date, { weekday: true })}</span>
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full tnum"
                    style={{ background: t.count >= CRITICAL ? 'var(--color-crit-bg)' : 'var(--color-warn-bg)', color: t.count >= CRITICAL ? 'var(--color-crit)' : 'var(--color-warn)' }}>{t.count} im Urlaub</span>
                </div>
                <div className="flex -space-x-2 mt-2">
                  {t.who.filter((id) => employeeMap[id]).slice(0, 8).map((id) => <span key={id} className="ring-2 ring-white rounded-full"><Avatar e={employeeMap[id]} size={24} /></span>)}
                  {t.who.length > 8 && <span className="ring-2 ring-white w-6 h-6 rounded-full bg-[var(--color-line-soft)] text-[10px] font-semibold flex items-center justify-center text-[var(--color-muted)]">+{t.who.length - 8}</span>}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function YearHeat({ days, total, idx, onPick }: {
  days: string[]; total: number[]; idx: Map<string, number>; onPick: (d: string) => void
}) {
  const CW = 15, GAP = 3
  const color = (n: number) => {
    const ramp = ['transparent', '#e2efe2', '#cfe6cf', '#fbe9c0', '#f6cf8f', '#eea96a', '#e07a5f']
    return ramp[Math.min(n, ramp.length - 1)]
  }
  return (
    <div className="overflow-x-auto print-expand">
      <div className="inline-block">
        {Array.from({ length: 12 }, (_, m) => {
          const dim = new Date(2026, m + 1, 0).getDate()
          return (
            <div key={m} className="flex items-center" style={{ marginBottom: GAP }}>
              <div className="w-9 text-[10.5px] text-[var(--color-faint)] font-medium shrink-0">{MONTHS_SHORT_DE[m]}</div>
              <div className="flex" style={{ gap: GAP }}>
                {Array.from({ length: 31 }, (_, d) => {
                  if (d >= dim) return <div key={d} style={{ width: CW, height: CW }} />
                  const date = iso(2026, m + 1, d + 1)
                  const i = idx.get(date)
                  const n = i == null ? 0 : total[i]
                  const label = `${formatDE(date)} · ${n} im Urlaub`
                  return (
                    <button key={d} onClick={() => onPick(date)} title={label} aria-label={label}
                      className="focusable rounded-[3px] hover:ring-2 hover:ring-[var(--color-ink)]/20 transition-all"
                      style={{ width: CW, height: CW, background: color(n) }} />
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="flex items-center gap-1.5 mt-2 ml-9 text-[11px] text-[var(--color-muted)]">
          weniger
          {['#e2efe2', '#cfe6cf', '#fbe9c0', '#f6cf8f', '#e07a5f'].map((c) => <span key={c} aria-hidden className="w-3.5 h-3.5 rounded-[3px]" style={{ background: c }} />)}
          mehr
        </div>
      </div>
    </div>
  )
}
