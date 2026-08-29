import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { aiParseListing, aiParsePhoto, fileToJpegDataUrl, readOpenAiKey } from '../lib/ai'
import {
  DEFECTS,
  HARD_SKIPS,
  type HardSkip,
  buyAdvice,
  compareOffer,
  parseListingText,
  suggestedLabor,
  type BuyAdvice,
} from '../lib/dealCoach'
import { IPHONES, parseStorage, type DefectId } from '../data/marktwaarde'
import { euro } from '../lib/format'
import { GhostButton, PrimaryButton, TextArea } from '../ui'
import { MessagesTeaser } from './MessagesTeaser'
import { SupplierStrip } from './SupplierLinks'

export type CoachDraft = {
  brand?: string
  model: string
  storage?: string
  damage?: string
  todo?: string
  purchasePrice?: number
}

export function BuyCoach({
  model,
  storage,
  defects,
  skips,
  offer,
  onDefects,
  onSkips,
  onStorage,
  onApply,
}: {
  model: string
  storage?: string
  defects: DefectId[]
  skips: HardSkip[]
  offer: number
  onDefects: (next: DefectId[]) => void
  onSkips: (next: HardSkip[]) => void
  onStorage?: (next: string) => void
  onApply: (draft: CoachDraft & { defects: DefectId[]; skips: HardSkip[] }) => void
}) {
  const t = useT()
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState<'paste' | 'photo' | null>(null)
  const [err, setErr] = useState('')
  const advice = buyAdvice({ model, storage, defects, skips })
  const cmp = compareOffer(offer, advice)
  const storageRows = advice.row ? IPHONES.filter((p) => p.id === advice.row!.id) : []

  function toggleDefect(id: DefectId) {
    onDefects(defects.includes(id) ? defects.filter((d) => d !== id) : [...defects, id])
  }
  function toggleSkip(id: HardSkip) {
    onSkips(skips.includes(id) ? skips.filter((d) => d !== id) : [...skips, id])
  }

  async function applyPaste() {
    setErr('')
    const local = parseListingText(paste)
    let damage = local.notes
    let todo = local.defects.map((d) => t(`mw.${d}`)).join(', ')
    let brand = local.brand
    let modelOut = local.model
    let storage = local.storage
    let nextDef = local.defects
    let nextSkip = local.skips
    if (readOpenAiKey()) {
      setBusy('paste')
      try {
        const ai = await aiParseListing(paste)
        if (ai.brand) brand = ai.brand
        if (ai.model) modelOut = ai.model
        if (ai.storage) storage = parseStorage(ai.storage) ?? ai.storage
        if (ai.damage) damage = ai.damage
        if (ai.todo) todo = ai.todo
        if (Array.isArray(ai.defects)) {
          nextDef = ai.defects.filter((d): d is DefectId => DEFECTS.includes(d as DefectId))
        }
        if (Array.isArray(ai.skips)) {
          nextSkip = ai.skips.filter((d): d is HardSkip => (HARD_SKIPS as readonly string[]).includes(d))
        }
      } catch {
        /* local parse is enough */
      } finally {
        setBusy(null)
      }
    }
    onDefects(nextDef)
    onSkips(nextSkip)
    onApply({
      brand,
      model: modelOut,
      storage,
      damage,
      todo,
      purchasePrice: local.price ?? undefined,
      defects: nextDef,
      skips: nextSkip,
    })
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setErr('')
    if (!readOpenAiKey()) {
      setErr(t('coach.needKey'))
      return
    }
    setBusy('photo')
    try {
      const dataUrl = await fileToJpegDataUrl(file)
      const ai = await aiParsePhoto(dataUrl)
      const nextDef = (ai.defects ?? []).filter((d): d is DefectId => DEFECTS.includes(d as DefectId))
      const nextSkip = (ai.skips ?? []).filter((d): d is HardSkip =>
        (HARD_SKIPS as readonly string[]).includes(d),
      )
      onDefects(nextDef)
      onSkips(nextSkip)
      onApply({
        model: ai.model || model,
        storage: parseStorage(ai.storage) ?? ai.storage,
        damage: ai.damage,
        todo: ai.todo,
        defects: nextDef,
        skips: nextSkip,
      })
    } catch {
      setErr(t('coach.aiFail'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
      <div>
        <p className="text-sm font-medium text-stone-100">{t('coach.buyTitle')}</p>
        <p className="mt-1 text-xs text-stone-500">{t('coach.buyHint')}</p>
      </div>

      {storageRows.length > 0 && onStorage ? (
        <FieldChips label={t('mw.storage')}>
          {storageRows.map((v) => (
            <Chip
              key={v.storage}
              on={advice.row?.storage === v.storage}
              onClick={() => onStorage(v.storage)}
            >
              {v.storage}
            </Chip>
          ))}
        </FieldChips>
      ) : null}

      <FieldChips label={t('coach.defects')}>
        {DEFECTS.map((id) => (
          <Chip key={id} on={defects.includes(id)} onClick={() => toggleDefect(id)}>
            {t(`mw.${id}`)}
          </Chip>
        ))}
      </FieldChips>

      <FieldChips label={t('coach.skips')}>
        {HARD_SKIPS.map((id) => (
          <Chip key={id} danger on={skips.includes(id)} onClick={() => toggleSkip(id)}>
            {t(`coach.${id}`)}
          </Chip>
        ))}
      </FieldChips>

      <AdviceCard advice={advice} offer={offer} cmp={cmp} />

      <MessagesTeaser model={model} max={advice.max} skip={advice.verdict === 'skip'} />

      <div className="min-w-0 space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
          {t('coach.pasteLabel')}
        </p>
        <TextArea
          rows={3}
          className="w-full"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={t('coach.pastePh')}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <PrimaryButton
          type="button"
          className="w-full sm:w-auto"
          disabled={!paste.trim() || busy !== null}
          onClick={() => void applyPaste()}
        >
          {busy === 'paste' ? t('coach.working') : t('coach.pasteGo')}
        </PrimaryButton>
        <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-stone-200 sm:w-auto">
          {busy === 'photo' ? t('coach.working') : t('coach.photo')}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0]
              void onPhoto(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {err ? <p className="text-sm text-rose-400">{err}</p> : null}
      <SupplierStrip model={model} defects={defects} />
      <p className="text-[11px] text-stone-500">
        {t('coach.imeiHint')}{' '}
        <Link to="/imei" className="text-amber-400">
          {t('nav.imei')}
        </Link>
      </p>
    </div>
  )
}

export function RepairCoach({
  model,
  defects,
  skips,
  kind,
  onDefects,
  onSkips,
  onLabor,
}: {
  model: string
  defects: DefectId[]
  skips: HardSkip[]
  kind?: 'klant' | 'vriend'
  onDefects: (next: DefectId[]) => void
  onSkips: (next: HardSkip[]) => void
  onLabor: (n: number) => void
}) {
  const t = useT()
  const labor = suggestedLabor({ model, defects, skips, kind })
  return (
    <div className="min-w-0 max-w-full space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
      <p className="text-sm font-medium text-stone-100">{t('coach.jobTitle')}</p>
      <p className="text-xs text-stone-500">{t('coach.jobHint')}</p>
      <FieldChips label={t('coach.defects')}>
        {DEFECTS.map((id) => (
          <Chip
            key={id}
            on={defects.includes(id)}
            onClick={() =>
              onDefects(defects.includes(id) ? defects.filter((d) => d !== id) : [...defects, id])
            }
          >
            {t(`mw.${id}`)}
          </Chip>
        ))}
      </FieldChips>
      <FieldChips label={t('coach.skips')}>
        {HARD_SKIPS.map((id) => (
          <Chip
            key={id}
            danger
            on={skips.includes(id)}
            onClick={() =>
              onSkips(skips.includes(id) ? skips.filter((d) => d !== id) : [...skips, id])
            }
          >
            {t(`coach.${id}`)}
          </Chip>
        ))}
      </FieldChips>
      {labor.reasonKeys.map((k) => (
        <p key={k} className="text-xs text-stone-400">
          {t(k)}
        </p>
      ))}
      {labor.difficulty === 'skip' ? (
        <p className="text-sm text-rose-300">{t('coach.jobSkip')}</p>
      ) : (
        <GhostButton type="button" className="w-full sm:w-auto" onClick={() => onLabor(labor.labor)}>
          {t('coach.setLabor', { amount: euro(labor.labor) })}
        </GhostButton>
      )}
      <SupplierStrip model={model} defects={defects} />
    </div>
  )
}

function FieldChips({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <div className="flex min-w-0 flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  on,
  danger,
  onClick,
  children,
}: {
  on: boolean
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${
        on
          ? danger
            ? 'bg-rose-500 text-stone-50'
            : 'bg-amber-500 text-stone-950'
          : 'border border-white/10 bg-white/5 text-stone-200'
      }`}
    >
      {children}
    </button>
  )
}

function AdviceCard({
  advice,
  offer,
  cmp,
}: {
  advice: BuyAdvice
  offer: number
  cmp: ReturnType<typeof compareOffer>
}) {
  const t = useT()
  const tone =
    advice.verdict === 'skip' || cmp === 'over'
      ? 'border-rose-500/30 bg-rose-500/10'
      : advice.verdict === 'tight' || advice.difficulty === 'hard'
        ? 'border-amber-500/30 bg-black/20'
        : 'border-emerald-500/25 bg-emerald-500/10'
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{t('coach.maxLabel')}</p>
          {advice.row ? (
            <p className="mt-0.5 truncate text-[11px] text-stone-500">
              {advice.row.model} · {advice.row.storage}
            </p>
          ) : null}
          <p className="money mt-1 font-mono text-2xl text-stone-50">
            {advice.max != null ? euro(advice.max) : t('coach.skip')}
          </p>
          {advice.sheetMax != null && advice.max != null ? (
            <p className="mt-1 text-[11px] text-stone-500">
              {t('coach.sheetMax', { amount: euro(advice.sheetMax) })}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-xs font-medium text-stone-300">{t(`coach.diff.${advice.difficulty}`)}</p>
      </div>
      {advice.askFast != null ? (
        <p className="money mt-2 text-xs text-stone-400">
          {t('coach.askAfter', { fast: euro(advice.askFast), clean: euro(advice.askClean ?? advice.askFast) })}
        </p>
      ) : null}
      {cmp === 'over' ? <p className="mt-2 text-sm text-rose-300">{t('coach.offerOver')}</p> : null}
      {cmp === 'under' && offer > 0 ? (
        <p className="mt-2 text-sm text-emerald-300">{t('coach.offerOk')}</p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {advice.reasonKeys.map((k) => (
          <li key={k} className="text-xs text-stone-400">
            {t(k)}
          </li>
        ))}
      </ul>
    </div>
  )
}
