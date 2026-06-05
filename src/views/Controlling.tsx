import { useMemo, useRef } from 'react'
import { Printer, Users, CalendarOff, TriangleAlert, ArrowRight, Check } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { Card, CountryFlag, BrandWave } from '../components/ui/ui'
import type { Mode } from './Planner'
import { COMPANIES } from '../domain/seed'
import { useData } from '../store/data'
import { leaveAccount } from '../lib/leave'
import { printElement } from '../lib/print'
import type { CompanyId } from '../domain/types'
import { yearDays, formatDE } from '../lib/dates'

export interface PlanTarget { month?: number; filter?: CompanyId | 'ALL'; mode?: Mode }

// Ab so vielen gleichzeitigen Urlauben gilt ein Tag als kritisch (rot) bzw. angespannt (gelb).
const CRITICAL = 6
const WARN = 4

const nf = (n: number) => n.toLocaleString('de-DE')

export function Controlling({ onOpenPlan }: {
  onOpenPlan: (t: PlanTarget) => void
}) {
  const { employees, absences, employeeMap } = useData()
  const ref = useRef<HTMLDivElement>(null)
  const days = useMemo(() => yearDays(), [])
  const idx = useMemo(() => new Map(days.map((d, i) => [d, i])), [days])

  // Wie viele sind an jedem Tag gleichzeitig im Urlaub?
  const total = useMemo(() => {
    const total = new Array(days.length).fill(0)
    for (const a of absences) {
      if (a.status === 'rejected') continue
      if (!employeeMap[a.employeeId]) continue
      const s = idx.get(a.start), e = idx.get(a.end)
      if (s == null || e == null) continue
      for (let i = s; i <= e; i++) total[i]++
    }
    return total
  }, [absences, days, idx, employeeMap])

  // Konten je Mitarbeiter (anteiliger Anspruch, gültiger Übertrag, genommen).
  const accounts = useMemo(() => new Map(employees.map((e) => [e.id, leaveAccount(e, absences)])), [employees, absences])
  const takenTotal = useMemo(() => employees.reduce((s, e) => s + (accounts.get(e.id)?.approved ?? 0), 0), [employees, accounts])
  const entitlementTotal = employees.reduce((s, e) => s + (accounts.get(e.id)?.available ?? 0), 0)

  const monthOf = (d: string) => parseInt(d.slice(5, 7)) - 1

  // Engpässe: gut verteilte Tage mit besonders vielen gleichzeitigen Urlauben (ab WARN).
  const busyDays = useMemo(() => {
    const order = total.map((c, i) => ({ i, c })).filter((x) => x.c >= WARN).sort((a, b) => b.c - a.c)
    const picked: { i: number; c: number }[] = []
    for (const o of order) {
      if (picked.length >= 6) break
      if (picked.some((p) => Math.abs(p.i - o.i) <= 3)) continue
      picked.push(o)
    }
    return picked.sort((a, b) => a.i - b.i).map(({ i, c }) => ({ date: days[i], count: c }))
  }, [total, days])

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1100px] mx-auto">
      <div ref={ref}>
        {/* Kopf */}
        <div className="relative overflow-hidden rounded-2xl text-white mb-6"
          style={{ background: 'linear-gradient(120deg, var(--color-ww-red-700), var(--color-ww-red), var(--color-ww-red-600))', boxShadow: 'var(--shadow-card)' }}>
          <div className="relative z-10 px-6 pt-6 pb-12 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <span className="inline-flex items-center justify-center bg-white rounded-xl h-14 w-14 shrink-0"><img src={logoUrl} className="h-8 w-auto" alt="Würzburger Gruppe" /></span>
              <div>
                <h2 className="text-[26px] font-semibold tracking-tight leading-tight">Würzburger Gruppe 2026</h2>
                <p className="text-[15px] text-white/90 mt-1">Urlaub im Überblick – alle drei Firmen</p>
              </div>
            </div>
            <button onClick={() => printElement(ref.current)}
              className="focusable no-print inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[15px] font-semibold backdrop-blur transition-colors">
              <Printer size={18} /> Drucken
            </button>
          </div>
          <BrandWave className="absolute bottom-0 left-0 w-full h-[40px] z-0" color="var(--color-canvas)" />
        </div>

        {/* Zwei große Kennzahlen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink-soft)]">
              <Users size={20} className="text-[var(--color-ww-red)]" /> Mitarbeiter
            </div>
            <div className="mt-3 text-[44px] font-semibold leading-none tnum">{nf(employees.length)}</div>
            <div className="mt-3 text-[14.5px] text-[var(--color-muted)]">in {COMPANIES.length} Firmen · Deutschland &amp; Schweiz</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink-soft)]">
              <CalendarOff size={20} className="text-[var(--color-ww-red)]" /> Urlaubstage genommen
            </div>
            <div className="mt-3 text-[44px] font-semibold leading-none tnum">{nf(takenTotal)}</div>
            <div className="mt-3 text-[14.5px] text-[var(--color-muted)]">von {nf(entitlementTotal)} möglichen Tagen</div>
          </Card>
        </div>

        {/* Die drei Firmen */}
        <Card className="p-6 mb-6">
          <h3 className="text-[20px] font-semibold tracking-tight">Die drei Firmen</h3>
          <p className="text-[14.5px] text-[var(--color-muted)] mt-1 mb-4">Wie viel Urlaub ist schon genommen? Zum Öffnen anklicken.</p>
          <div className="space-y-3">
            {COMPANIES.map((c) => {
              const emps = employees.filter((e) => e.companyId === c.id)
              const taken = emps.reduce((s, e) => s + (accounts.get(e.id)?.approved ?? 0), 0)
              const ent = emps.reduce((s, e) => s + (accounts.get(e.id)?.available ?? 0), 0)
              const pct = ent > 0 ? Math.min(100, Math.round((taken / ent) * 100)) : 0
              return (
                <button key={c.id} onClick={() => onOpenPlan({ filter: c.id, mode: 'month' })}
                  className="focusable w-full text-left p-4 rounded-2xl border border-[var(--color-line)] hover:border-[var(--color-ww-red-100)] hover:bg-[var(--color-ww-red-50)]/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[18px] font-semibold flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: c.accent }} />{c.name} <CountryFlag country={c.country} />
                    </span>
                    <span className="text-[16px] font-semibold tnum text-[var(--color-ink-soft)]">{nf(taken)} / {nf(ent)} Tage</span>
                  </div>
                  <div className="mt-3 h-4 rounded-full bg-[var(--color-line-soft)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.accent }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[14px] text-[var(--color-muted)]">
                    <span>{emps.length} Mitarbeiter · {c.location}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--color-ink-soft)]">Öffnen <ArrowRight size={16} /></span>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Engpässe / Achtung */}
        <Card className="p-6">
          <h3 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <TriangleAlert size={20} className="text-[var(--color-warn)]" /> Wann sind viele gleichzeitig weg?
          </h3>
          <p className="text-[14.5px] text-[var(--color-muted)] mt-1 mb-4">Tage mit besonders vielen gleichzeitigen Urlauben – zum Öffnen anklicken.</p>
          {busyDays.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl text-[16px] font-medium"
              style={{ background: 'var(--color-ok-bg)', color: 'var(--color-ok)' }}>
              <Check size={22} className="shrink-0" /> Alles entspannt – an keinem Tag sind ungewöhnlich viele gleichzeitig im Urlaub.
            </div>
          ) : (
            <div className="space-y-2.5">
              {busyDays.map((d) => {
                const crit = d.count >= CRITICAL
                return (
                  <button key={d.date} onClick={() => onOpenPlan({ month: monthOf(d.date), mode: 'month', filter: 'ALL' })}
                    className="focusable w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--color-line)] hover:bg-[var(--color-line-soft)]/60 transition-colors">
                    <span className="text-[17px] font-semibold">{formatDE(d.date, { weekday: true, year: false })}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[15px] font-semibold px-3 py-1 rounded-full tnum"
                        style={{ background: crit ? 'var(--color-crit-bg)' : 'var(--color-warn-bg)', color: crit ? 'var(--color-crit)' : 'var(--color-warn)' }}>
                        {d.count} Personen
                      </span>
                      <ArrowRight size={18} className="text-[var(--color-muted)]" />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Klare Hauptaktion */}
        <div className="mt-6 no-print">
          <button onClick={() => onOpenPlan({ mode: 'year' })}
            className="focusable w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-[var(--color-ww-red)] text-white text-[17px] font-semibold hover:bg-[var(--color-ww-red-600)] transition-colors shadow-sm">
            <ArrowRight size={20} /> Ganzen Urlaubsplan öffnen
          </button>
        </div>
      </div>
    </div>
  )
}
