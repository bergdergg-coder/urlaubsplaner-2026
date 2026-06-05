import { useState } from 'react'
import { LogIn, Lock } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { BrandWave } from '../components/ui/ui'
import { useAuth } from '../store/auth'

export function Login() {
  const { login, loginOptions } = useAuth()
  const [accountId, setAccountId] = useState(loginOptions[0]?.id ?? '')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (!login(accountId, pw)) { setError(true); setPw('') }
  }
  const field = 'w-full h-11 px-3 rounded-lg border border-[var(--color-line)] bg-white text-[14px] focusable'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-canvas)]">
      <div className="w-full max-w-[400px]">
        <div className="card overflow-hidden">
          {/* Markenkopf */}
          <div className="relative bg-[var(--color-ww-red)] text-white px-6 pt-6 pb-10">
            <div className="relative z-10 flex items-center gap-3">
              <span className="inline-flex items-center justify-center bg-white rounded-xl h-11 w-11"><img src={logoUrl} className="h-7 w-auto" alt="Würzburger Gruppe" /></span>
              <div>
                <div className="text-[16px] font-semibold leading-tight">Würzburger Gruppe</div>
                <div className="text-[12.5px] text-white/85">Urlaubsplanung 2026</div>
              </div>
            </div>
            <BrandWave className="absolute bottom-0 left-0 w-full h-[28px] z-0" color="var(--color-card)" />
          </div>

          <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <div>
              <label htmlFor="acc" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Zugang</label>
              <select id="acc" className={`${field} cursor-pointer`} value={accountId}
                onChange={(e) => { setAccountId(e.target.value); setError(false) }}>
                {loginOptions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <p className="text-[11.5px] text-[var(--color-muted)] mt-1.5">{loginOptions.find((a) => a.id === accountId)?.sub}</p>
            </div>

            <div>
              <label htmlFor="pw" className="block text-[12.5px] font-medium text-[var(--color-ink-soft)] mb-1.5">Passwort</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
                <input id="pw" name="password" type="password" autoComplete="current-password" className={`${field} pl-9`} value={pw} autoFocus
                  aria-invalid={error || undefined} aria-describedby={error ? 'pw-error' : undefined}
                  onChange={(e) => { setPw(e.target.value); setError(false) }} placeholder="••••" />
              </div>
              {error && <p id="pw-error" role="alert" className="text-[12px] text-[var(--color-crit)] mt-1.5">Falsches Passwort.</p>}
            </div>

            <button type="submit"
              className="focusable w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-lg bg-[var(--color-ww-red)] text-white text-[14px] font-semibold hover:bg-[var(--color-ww-red-600)] transition-colors">
              <LogIn size={16} /> Anmelden
            </button>
          </form>
        </div>
        <p className="text-center text-[11.5px] text-[var(--color-muted)] mt-3">
          Demo-Zugänge: Administrator, Firmenadministrator und Mitarbeiter · Passwort überall: <strong>123</strong>
        </p>
      </div>
    </div>
  )
}
