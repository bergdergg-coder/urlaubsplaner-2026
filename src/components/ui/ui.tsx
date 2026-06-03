import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Country, Employee } from '../../domain/types'

/* ---- Avatar --------------------------------------------------------------- */
export function Avatar({ e, size = 34 }: { e: Employee; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: `hsl(${e.hue} 42% 93%)`,
        color: `hsl(${e.hue} 38% 32%)`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
      }}
      title={e.name}
    >
      {e.initials}
    </span>
  )
}

/* ---- Country flag --------------------------------------------------------- */
export function CountryFlag({ country }: { country: Country }) {
  const map: Record<Country, { flag: string; label: string }> = {
    DE: { flag: '🇩🇪', label: 'Deutschland' },
    CH: { flag: '🇨🇭', label: 'Schweiz' },
  }
  const c = map[country]
  return <span title={c.label} aria-label={c.label}>{c.flag}</span>
}

/* ---- Card ----------------------------------------------------------------- */
export function Card({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`card ${pad ? 'p-5' : ''} ${className}`}>{children}</div>
}

export function SectionHeader({ title, sub, right, icon }: { title: string; sub?: string; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-2.5">
        {icon && <div className="mt-0.5 text-[var(--color-muted)]">{icon}</div>}
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</h3>
          {sub && <p className="text-[13px] text-[var(--color-muted)] mt-0.5">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

/* ---- KPI ------------------------------------------------------------------ */
export function Kpi({ label, value, hint, tone = 'neutral', icon }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: 'neutral' | 'red' | 'ok' | 'warn'; icon?: ReactNode
}) {
  const accent: Record<string, string> = {
    neutral: 'var(--color-ink)', red: 'var(--color-ww-red)', ok: 'var(--color-ok)', warn: 'var(--color-warn)',
  }
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--color-muted)]">{label}</span>
        {icon && <span className="text-[var(--color-faint)]">{icon}</span>}
      </div>
      <div className="mt-2 text-[30px] font-semibold tnum leading-none" style={{ color: accent[tone] }}>{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-[var(--color-muted)]">{hint}</div>}
    </Card>
  )
}

/* ---- Progress / meter ----------------------------------------------------- */
export function Meter({ value, max, color = 'var(--color-ww-red)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 rounded-full bg-[var(--color-line-soft)] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

/* ---- Modal ---------------------------------------------------------------- */
export function Modal({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-[rgba(20,20,24,0.42)] backdrop-blur-[2px] anim-fade"
      onClick={onClose}>
      <div className="card anim-pop w-full mt-[6vh]" style={{ maxWidth: width, boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
          <h3 id="modal-title" className="text-[15px] font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Schließen" className="focusable p-1.5 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-line-soft)]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ---- Brand wave (modernisierter weißer Wellenbogen) ----------------------- */
export function BrandWave({ className = '', color = 'var(--color-canvas)', flip = false }: { className?: string; color?: string; flip?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden
      style={{ transform: flip ? 'scaleY(-1)' : undefined }}>
      <path d="M0,64 C320,120 520,8 760,40 C1000,72 1180,128 1440,72 L1440,120 L0,120 Z" fill={color} />
    </svg>
  )
}
