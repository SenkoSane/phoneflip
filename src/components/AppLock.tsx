import { useState, type FormEvent, type ReactNode } from 'react'
import { useT } from '../i18n'
import { isSessionUnlocked, tryUnlock } from '../lib/gate'
import { PrimaryButton, TextInput } from '../ui'

export function AppLock({ children }: { children: ReactNode }) {
  const t = useT()
  const [unlocked, setUnlocked] = useState(() => isSessionUnlocked())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (unlocked) return children

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fromForm = new FormData(e.currentTarget).get('password')
    const value = typeof fromForm === 'string' ? fromForm : password
    setError('')
    try {
      const ok = await Promise.resolve(tryUnlock(value))
      if (!ok) {
        setError(t('lock.wrong'))
        setPassword('')
        return
      }
      setUnlocked(true)
    } catch {
      setError(t('lock.checkFail'))
    }
  }

  return (
    <div className="flex min-h-svh max-w-full items-center justify-center bg-stone-950 px-4 text-stone-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,154,80,0.08),_transparent_55%)]" />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm space-y-5 rounded-2xl border border-white/8 bg-white/3 p-5 sm:p-6"
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            Phone flip
          </p>
          <h1 className="font-display mt-1 text-2xl text-stone-50">Tracker</h1>
          <p className="mt-2 text-sm text-stone-400">{t('lock.prompt')}</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
            {t('lock.password')}
          </span>
          <TextInput
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError('')
            }}
          />
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <PrimaryButton type="submit" className="w-full">
          {t('lock.open')}
        </PrimaryButton>
      </form>
    </div>
  )
}
