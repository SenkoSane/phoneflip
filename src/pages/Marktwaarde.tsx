import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { localeFor, useT } from '../i18n'
import {
  MARKTWAARDE_UPDATED,
  defaultStorageFor,
  iphoneGroups,
  pickStorageRow,
  type BuyScenario,
  type EuroBand,
  type IphoneGenGroup,
  type IphoneMarkt,
  type IphoneVariantGroup,
  type MarktStorage,
  type MaxBuyCell,
  type PartBand,
} from '../data/marktwaarde'

const euro0 = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

function e(n: number): string {
  return euro0.format(n)
}

function band(b: EuroBand): string {
  return `${e(b.min)}–${e(b.max)}`
}

function partText(p: PartBand | null, na: string): { text: string; note?: string } {
  if (!p) return { text: na }
  const text = p.min === p.max ? e(p.min) : band(p)
  return { text, note: p.note }
}

function maxCell(
  cell: MaxBuyCell,
  labels: { or: string; unknown: string; skipTight: string },
): { text: string; note?: string; skip?: boolean } {
  switch (cell.kind) {
    case 'point':
      return { text: `~ ${e(cell.value)}`, note: cell.note }
    case 'band':
      return { text: `~ ${band(cell)}`, note: cell.note }
    case 'either':
      return { text: `~ ${e(cell.a)} ${labels.or} ${e(cell.b)}`, note: cell.note }
    case 'skip':
      return {
        text: cell.label === 'skip / te krap' ? labels.skipTight : cell.label,
        skip: true,
      }
    case 'unknown':
      return { text: labels.unknown, skip: true }
  }
}

function Sheet({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
      <h3 className="font-display text-xl text-stone-50">{title}</h3>
      {hint ? <p className="mt-1 max-w-2xl text-sm text-stone-400">{hint}</p> : null}
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  )
}

const DO_KEYS = ['mw.do1', 'mw.do2', 'mw.do3', 'mw.do4', 'mw.do5', 'mw.do6'] as const
const DONT_KEYS = ['mw.dont1', 'mw.dont2', 'mw.dont3', 'mw.dont4', 'mw.dont5', 'mw.dont6'] as const

const GROUPS = iphoneGroups()

type GenPick = { variantId: string; storage: MarktStorage }

function defaultPick(g: IphoneGenGroup): GenPick {
  const v = g.variants[0]!
  return { variantId: v.id, storage: defaultStorageFor(v.id) }
}

function variantOf(g: IphoneGenGroup, variantId: string): IphoneVariantGroup {
  return g.variants.find((v) => v.id === variantId) ?? g.variants[0]!
}

export function Marktwaarde() {
  const t = useT()
  const updated = new Date(`${MARKTWAARDE_UPDATED}T12:00:00`)
  const updatedLabel = updated.toLocaleDateString(localeFor(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const cellLabels = {
    or: t('mw.or'),
    unknown: t('mw.unknown'),
    skipTight: t('mw.skipTight'),
  }
  const [pick, setPick] = useState<Record<number, GenPick>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.gen, defaultPick(g)])),
  )

  function rowOf(g: IphoneGenGroup): IphoneMarkt {
    const p = pick[g.gen] ?? defaultPick(g)
    const variant = variantOf(g, p.variantId)
    return pickStorageRow(variant.rows, p.storage)
  }

  function setVariant(gen: number, variantId: string) {
    setPick((prev) => {
      const g = GROUPS.find((x) => x.gen === gen)!
      const variant = variantOf(g, variantId)
      const wanted = prev[gen]?.storage ?? defaultStorageFor(variantId)
      const row = pickStorageRow(variant.rows, wanted)
      return { ...prev, [gen]: { variantId, storage: row.storage } }
    })
  }

  function setStorage(gen: number, storage: MarktStorage) {
    setPick((prev) => {
      const g = GROUPS.find((x) => x.gen === gen)!
      const cur = prev[gen] ?? defaultPick(g)
      return { ...prev, [gen]: { ...cur, storage } }
    })
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {t('mw.kicker')}
        </p>
        <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('mw.title')}</h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-400">
          {t('mw.intro', { date: updatedLabel })}
        </p>
        <Link
          to="/leveranciers"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-amber-500/25 px-3 text-sm text-amber-400 sm:w-auto sm:justify-start sm:border-0 sm:px-0"
        >
          {t('sup.buyThis')}
        </Link>
      </div>

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 sm:p-5">
        <h3 className="text-sm font-medium text-stone-100">{t('coach.mwTitle')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-stone-300">
          <li>{t('coach.mw1')}</li>
          <li>{t('coach.mw2')}</li>
          <li>{t('coach.mw3')}</li>
          <li>{t('coach.mw4')}</li>
        </ul>
      </section>

      <Sheet title={t('mw.bestTitle')} hint={t('mw.bestHint')}>
        <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {GROUPS.map((g) => {
            const row = rowOf(g)
            const p = pick[g.gen] ?? defaultPick(g)
            const variant = variantOf(g, p.variantId)
            const best = maxCell(row.bestBuy.cell, cellLabels)
            const label = row.bestBuy.scenarioIds
              .map((id) => {
                const key = `mw.sc.${id}`
                const s = t(key)
                return s === key ? id : s
              })
              .filter(Boolean)
              .join(' / ') || row.bestBuy.label
            return (
              <li key={g.gen} className="min-w-0 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                <a
                  href={`#mw-${g.gen}`}
                  className="flex min-h-11 min-w-0 items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-stone-100">
                      {g.title}
                    </span>
                    <span className="block truncate text-[11px] text-stone-500">
                      {variant.label} · {row.storage} · {label}
                    </span>
                  </span>
                  <span className="money shrink-0 text-base text-amber-200">{best.text}</span>
                </a>
                <VariantChips
                  variants={g.variants}
                  value={p.variantId}
                  onChange={(id) => setVariant(g.gen, id)}
                />
                <StorageChips
                  rows={variant.rows}
                  value={row.storage}
                  onChange={(s) => setStorage(g.gen, s)}
                />
              </li>
            )
          })}
        </ul>
      </Sheet>

      <div>
        <h3 className="font-display text-xl text-stone-50">{t('mw.buyTitle')}</h3>
        <p className="mt-1 max-w-2xl text-sm text-stone-400">{t('mw.buyHint')}</p>
        <p className="mt-1 max-w-2xl text-sm text-stone-500">{t('mw.storageHint')}</p>
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {GROUPS.map((g) => {
            const p = pick[g.gen] ?? defaultPick(g)
            const variant = variantOf(g, p.variantId)
            return (
              <ModelCard
                key={g.gen}
                group={g}
                row={rowOf(g)}
                variantId={p.variantId}
                storageRows={variant.rows}
                onVariant={(id) => setVariant(g.gen, id)}
                onStorage={(s) => setStorage(g.gen, s)}
              />
            )
          })}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
          <h3 className="font-display text-xl text-stone-50">{t('mw.do')}</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-300">
            {DO_KEYS.map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="min-w-0">{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-5">
          <h3 className="font-display text-xl text-stone-50">{t('mw.skip')}</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-300">
            {DONT_KEYS.map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-400" />
                <span className="min-w-0">{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function VariantChips({
  variants,
  value,
  onChange,
}: {
  variants: IphoneVariantGroup[]
  value: string
  onChange: (id: string) => void
}) {
  if (variants.length <= 1) return null
  return (
    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
      {variants.map((v) => {
        const on = v.id === value
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v.id)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium ${
              on
                ? 'bg-stone-100 text-stone-950'
                : 'border border-white/10 bg-white/5 text-stone-200'
            }`}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

function StorageChips({
  rows,
  value,
  onChange,
}: {
  rows: IphoneMarkt[]
  value: MarktStorage
  onChange: (s: MarktStorage) => void
}) {
  return (
    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
      {rows.map((r) => {
        const on = r.storage === value
        return (
          <button
            key={r.storage}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(r.storage)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium ${
              on
                ? 'bg-amber-500 text-stone-950'
                : 'border border-white/10 bg-white/5 text-stone-200'
            }`}
          >
            {r.storage}
          </button>
        )
      })}
    </div>
  )
}

function ModelCard({
  group,
  row,
  variantId,
  storageRows,
  onVariant,
  onStorage,
}: {
  group: IphoneGenGroup
  row: IphoneMarkt
  variantId: string
  storageRows: IphoneMarkt[]
  onVariant: (id: string) => void
  onStorage: (s: MarktStorage) => void
}) {
  const t = useT()
  const cellLabels = {
    or: t('mw.or'),
    unknown: t('mw.unknown'),
    skipTight: t('mw.skipTight'),
  }
  const scherm = partText(row.parts.scherm, t('mw.na'))
  const accu = partText(row.parts.accu, t('mw.na'))
  const poort = partText(row.parts.laadpoort, t('mw.na'))
  const cam = partText(row.parts.camera, t('mw.na'))
  const best = maxCell(row.bestBuy.cell, cellLabels)
  const bestIds = new Set(row.bestBuy.scenarioIds)
  const bestLabel =
    row.bestBuy.scenarioIds
      .map((id) => {
        const key = `mw.sc.${id}`
        const s = t(key)
        return s === key ? id : s
      })
      .filter(Boolean)
      .join(' / ') || row.bestBuy.label

  return (
    <article
      id={`mw-${group.gen}`}
      className="flex min-w-0 scroll-mt-20 flex-col rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5"
    >
      <header className="min-w-0">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h4 className="font-display min-w-0 truncate text-lg text-stone-50">{group.title}</h4>
          <p className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-stone-500">
            {row.model} · {row.storage}
          </p>
        </div>
        <VariantChips variants={group.variants} value={variantId} onChange={onVariant} />
        <StorageChips rows={storageRows} value={row.storage} onChange={onStorage} />
      </header>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
        <Stat
          label={t('mw.working')}
          value={band(row.prive)}
          hint={t('mw.reken', { n: e(row.prive.rekenwaarde) })}
        />
        <Stat
          label={t('mw.cosmetic')}
          value={band(row.lichtHuis)}
          hint={t('mw.reken', { n: e(row.lichtHuis.rekenwaarde) })}
        />
      </div>

      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-500/90">
              {t('mw.bestBuy')}
            </p>
            <p className="mt-0.5 truncate text-sm text-stone-200">{bestLabel}</p>
          </div>
          <p className="money shrink-0 text-lg text-amber-200">{best.text}</p>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-stone-500">{t('mw.bestAim')}</p>
      </div>

      <div className="mt-4 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
          {t('mw.parts')}
        </p>
        <ul className="mt-2 grid min-w-0 grid-cols-2 gap-2">
          <PartChip label={t('mw.scherm')} cell={scherm} href={`/leveranciers?m=${row.id}#scherm`} />
          <PartChip label={t('mw.accu')} cell={accu} href={`/leveranciers?m=${row.id}#accu`} />
          <PartChip label={t('mw.laadpoort')} cell={poort} href={`/leveranciers?m=${row.id}#laadpoort`} />
          <PartChip label={t('mw.camera')} cell={cam} href={`/leveranciers?m=${row.id}#camera`} />
        </ul>
        <Link
          to={`/leveranciers?m=${row.id}`}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-amber-500/25 px-3 text-sm text-amber-400 sm:w-auto sm:justify-start sm:border-0 sm:px-0"
        >
          {t('sup.buyThis')}
        </Link>
      </div>

      <div className="mt-4 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
          {t('mw.single')}
        </p>
        <ScenarioList
          scenarios={row.scenarios.filter((s) => s.defects.length === 1)}
          bestIds={bestIds}
        />
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
          {t('mw.combo')}
        </p>
        <ScenarioList
          scenarios={row.scenarios.filter((s) => s.defects.length > 1)}
          bestIds={bestIds}
        />
      </div>
    </article>
  )
}

function ScenarioList({
  scenarios,
  bestIds,
}: {
  scenarios: BuyScenario[]
  bestIds: Set<string>
}) {
  const t = useT()
  const cellLabels = {
    or: t('mw.or'),
    unknown: t('mw.unknown'),
    skipTight: t('mw.skipTight'),
  }
  return (
    <ul className="mt-1 min-w-0 divide-y divide-white/6">
      {scenarios.map((s) => {
        const cell = maxCell(s.buy, cellLabels)
        const isBest = bestIds.has(s.id)
        const sc = t(`mw.sc.${s.id}`)
        return (
          <li
            key={s.id}
            className={`flex min-h-11 min-w-0 items-center justify-between gap-3 py-2 ${
              isBest ? 'rounded-lg bg-amber-500/10 px-2' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-stone-200">
                {sc === `mw.sc.${s.id}` ? s.label : sc}
                {isBest ? (
                  <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
                    {t('mw.best')}
                  </span>
                ) : null}
              </p>
              {cell.note ? (
                <p className="line-clamp-2 text-[11px] text-stone-500">{cell.note}</p>
              ) : s.huis ? (
                <p className="truncate text-[11px] text-stone-600">{t('mw.afterFix')}</p>
              ) : null}
            </div>
            <p
              className={`money shrink-0 text-sm ${
                cell.skip ? 'text-stone-500' : isBest ? 'text-amber-200' : 'text-stone-100'
              }`}
            >
              {cell.text}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
      <p className="text-[11px] leading-tight uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="money mt-1 text-sm text-stone-100">{value}</p>
      <p className="mt-0.5 text-[11px] text-amber-200/80">{hint}</p>
    </div>
  )
}

function PartChip({
  label,
  cell,
  href,
}: {
  label: string
  cell: { text: string; note?: string }
  href?: string
}) {
  const inner = (
    <>
      <p className="truncate text-[11px] uppercase tracking-wider text-stone-500">{label}</p>
      <p className="money mt-0.5 text-sm text-stone-100">{cell.text}</p>
      {cell.note ? (
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-stone-600">{cell.note}</p>
      ) : null}
    </>
  )
  return (
    <li className="min-w-0 rounded-lg border border-white/8 bg-black/20 px-2.5 py-2">
      {href ? (
        <Link to={href} className="block min-h-11 min-w-0">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  )
}
