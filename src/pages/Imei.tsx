import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, useT } from '../i18n'
import { checkImei, type ImeiCheck } from '../lib/imei'
import { Field, GhostButton, PrimaryButton, onSubmit } from '../ui'
import { MessagesTeaser } from '../components/MessagesTeaser'

const APPLE_COVERAGE = 'https://checkcoverage.apple.com/'
const APPLE_ACTIVATION_LOCK_NL = 'https://support.apple.com/nl-nl/108794'
const APPLE_ACTIVATION_LOCK_EN = 'https://support.apple.com/108794'
const CHECKLIST_KEY = 'phoneflip.imeiBuyChecklist.v1'

const CHECK_IDS = [
  'luhn',
  'match',
  'apple',
  'icloud',
  'blacklist',
  'biometrics',
  'screen',
  'faceid-screen',
  'battery',
  'hardware',
  'housing',
  'water',
  'charge',
  'seller',
  'price',
] as const

type CheckId = (typeof CHECK_IDS)[number]

function shownImei(result: Extract<ImeiCheck, { kind: 'result' }>): string {
  return result.from14 ? result.imei : result.digits.slice(0, 15)
}

function loadChecklist(): Partial<Record<CheckId, boolean>> {
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Partial<Record<CheckId, boolean>> = {}
    for (const id of CHECK_IDS) {
      if ((parsed as Record<string, unknown>)[id] === true) out[id] = true
    }
    return out
  } catch {
    return {}
  }
}

function ResultCard({ result }: { result: Extract<ImeiCheck, { kind: 'result' }> }) {
  const t = useT()
  const ok = result.checksumOk
  const shown = shownImei(result)
  const shownCheck = shown.slice(14)
  return (
    <section
      className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${
        ok
          ? 'border-emerald-500/25 bg-emerald-500/8'
          : 'border-rose-500/25 bg-rose-500/8'
      }`}
    >
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.2em] ${
          ok ? 'text-emerald-400/90' : 'text-rose-400/90'
        }`}
      >
        {ok ? t('imei.luhnOk') : t('imei.luhnBad')}
      </p>
      <p
        className={`font-display mt-1 text-3xl sm:text-4xl ${
          ok ? 'text-emerald-200' : 'text-rose-200'
        }`}
      >
        {ok ? t('imei.valid') : t('imei.invalid')}
      </p>

      <p className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xl tracking-[0.08em] text-stone-50 sm:text-2xl">
        <span className="min-w-0 break-all">{shown.slice(0, 8)}</span>
        <span className="min-w-0 break-all">{shown.slice(8, 14)}</span>
        <span className={`shrink-0 ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{shownCheck}</span>
      </p>
      <p className="mt-1 flex min-w-0 flex-wrap gap-x-3 text-[11px] uppercase tracking-wider text-stone-500">
        <span>{t('imei.tac')}</span>
        <span>{t('imei.serial')}</span>
        <span>{t('imei.checkD')}</span>
      </p>

      {result.from14 ? (
        <p className="mt-3 min-w-0 text-sm text-stone-400">
          {result.imeisv
            ? t('imei.from16')
            : t('imei.from14', { imei: result.imei })}
        </p>
      ) : null}
      {!ok ? (
        <p className="mt-3 text-sm text-rose-200/90">{t('imei.luhnFail')}</p>
      ) : null}
    </section>
  )
}

function AppleLink({
  href,
  children,
  primary,
}: {
  href: string
  children: string
  primary?: boolean
}) {
  const cls = primary
    ? 'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 sm:w-auto'
    : 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10 sm:w-auto'
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  )
}

export function Imei() {
  const { t, lang } = useI18n()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<ImeiCheck | null>(null)
  const [copied, setCopied] = useState(false)
  const [checks, setChecks] = useState<Partial<Record<CheckId, boolean>>>(loadChecklist)

  const readyImei = result?.kind === 'result' ? shownImei(result) : ''

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checks))
  }, [checks])

  useEffect(() => {
    if (result?.kind !== 'result') return
    setChecks((prev) => ({ ...prev, luhn: result.checksumOk }))
  }, [result])

  function run() {
    setCopied(false)
    setResult(checkImei(value))
  }

  async function copyImei() {
    if (!readyImei) return
    try {
      await navigator.clipboard.writeText(readyImei)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const doneCount = CHECK_IDS.filter((id) => checks[id]).length

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {t('imei.kicker')}
        </p>
        <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('imei.title')}</h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-400">{t('imei.hint')}</p>
      </div>

      <MessagesTeaser />

      <form
        onSubmit={onSubmit(run)}
        className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5"
      >
        <Field label={t('imei.title')}>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              name="imei"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              maxLength={24}
              placeholder={t('imei.ph')}
              className="min-h-12 w-full min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-lg tracking-[0.12em] text-stone-100 outline-none placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-stone-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 sm:text-xl"
            />
            <PrimaryButton type="submit" className="w-full shrink-0 sm:w-auto sm:px-8">
              {t('imei.check')}
            </PrimaryButton>
          </div>
        </Field>
      </form>

      {result?.kind === 'empty' ? (
        <p className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-stone-400">
          {t('imei.empty')}
        </p>
      ) : null}

      {result?.kind === 'bad_length' ? (
        <p className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-100">
          {result.length < 14 ? t('imei.short') : t('imei.long')}{' '}
          {result.length === 1
            ? t('imei.nowOne', { n: String(result.length) })
            : t('imei.nowMany', { n: String(result.length) })}
          {result.digits ? (
            <>
              {' '}
              (
              <span className="break-all font-mono text-rose-50/90">{result.digits}</span>)
            </>
          ) : null}
          .
        </p>
      ) : null}

      {result?.kind === 'result' ? <ResultCard result={result} /> : null}

      {result?.kind === 'result' ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
            <h3 className="font-display text-xl text-stone-50">{t('imei.build')}</h3>
            <ul className="mt-3 space-y-3 text-sm text-stone-300">
              <li className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('imei.tac8')}</p>
                <p className="break-all font-mono text-stone-100">{result.tac}</p>
                <p className="mt-1 text-stone-400">{t('imei.tacHint')}</p>
              </li>
              <li className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-stone-500">
                  {t('imei.serial6')}
                </p>
                <p className="break-all font-mono text-stone-100">{result.serial}</p>
                <p className="mt-1 text-stone-400">{t('imei.serialHint')}</p>
              </li>
              <li className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-stone-500">
                  {t('imei.check1')}
                </p>
                <p className="font-mono text-stone-100">{result.checkDigit}</p>
                <p className="mt-1 text-stone-400">
                  {result.from14
                    ? t('imei.checkHint', { n: result.checkDigit })
                    : t('imei.checkHintTyped', {
                        calc: result.checkDigit,
                        typed: result.digits.slice(14, 15),
                      })}
                  {!result.checksumOk ? t('imei.mismatch') : ''}
                </p>
              </li>
            </ul>
          </section>

          <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
            <h3 className="font-display text-xl text-stone-50">{t('imei.model')}</h3>
            <p className="mt-1 text-xs text-stone-500">{t('imei.modelHint')}</p>
            {result.modelHint ? (
              <p className="mt-4 font-display text-2xl text-amber-200">{result.modelHint}</p>
            ) : (
              <p className="mt-4 text-stone-200">{t('imei.unknownModel', { tac: result.tac })}</p>
            )}
            <p className="mt-3 text-sm text-stone-400">{t('imei.modelNote')}</p>
          </section>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400/90">
            {t('imei.official')}
          </p>
          <h3 className="font-display mt-1 text-xl text-stone-50">{t('imei.coverage')}</h3>
          <p className="mt-2 text-sm text-stone-300">{t('imei.coverageBody')}</p>
          {readyImei ? (
            <p className="mt-3 min-w-0 break-all font-mono text-sm tracking-wider text-stone-100">
              {readyImei}
            </p>
          ) : (
            <p className="mt-3 text-sm text-stone-400">{t('imei.coverageEmpty')}</p>
          )}
          <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <AppleLink href={APPLE_COVERAGE} primary>
              {t('imei.openApple')}
            </AppleLink>
            <GhostButton
              type="button"
              className="w-full sm:w-auto"
              disabled={!readyImei}
              onClick={() => void copyImei()}
            >
              {copied ? t('imei.copied') : t('imei.copy')}
            </GhostButton>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
            {t('imei.official')}
          </p>
          <h3 className="font-display mt-1 text-xl text-stone-50">{t('imei.lock')}</h3>
          <p className="mt-2 text-sm text-stone-300">{t('imei.lockBody')}</p>
          <p className="mt-2 text-sm text-stone-400">{t('imei.lockMore')}</p>
          <div className="mt-4">
            <AppleLink href={lang === 'en' ? APPLE_ACTIVATION_LOCK_EN : APPLE_ACTIVATION_LOCK_NL}>
              {t('imei.lockLink')}
            </AppleLink>
          </div>
        </section>
      </div>

      <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
              {t('imei.used')}
            </p>
            <h3 className="font-display mt-1 text-xl text-stone-50 sm:text-2xl">{t('imei.buyTitle')}</h3>
            <p className="mt-2 max-w-2xl text-sm text-stone-400">{t('imei.beforeHint')}</p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className="text-sm text-stone-400">
              <span className="font-mono text-stone-200">
                {doneCount}/{CHECK_IDS.length}
              </span>{' '}
              {t('imei.done')}
            </p>
            <GhostButton type="button" className="w-full sm:w-auto" onClick={() => setChecks({})}>
              {t('imei.reset')}
            </GhostButton>
          </div>
        </div>

        <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {CHECK_IDS.map((id) => {
            const on = Boolean(checks[id])
            return (
              <li key={id} className="min-w-0">
                <label
                  className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 sm:p-4 ${
                    on
                      ? 'border-emerald-500/25 bg-emerald-500/8'
                      : 'border-white/8 bg-black/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setChecks((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                    className="mt-1 size-5 shrink-0 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-500/40"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-100">
                      {t(`check.${id}.title`)}
                    </span>
                    <span className="mt-1 block text-sm text-stone-400">
                      {id === 'price' ? (
                        <>
                          {t('check.price.before')}
                          <Link
                            to="/marktwaarde"
                            className="text-amber-400/90 underline-offset-2 hover:underline"
                          >
                            {t('check.price.link')}
                          </Link>
                          {t('check.price.after')}
                        </>
                      ) : (
                        t(`check.${id}.detail`)
                      )}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
        <h3 className="font-display text-xl text-stone-50">{t('imei.where')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-stone-300">
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0">{t('imei.where1')}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0">{t('imei.where2')}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0">{t('imei.where3')}</span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-stone-400">{t('imei.whereNote')}</p>
      </section>
    </div>
  )
}
