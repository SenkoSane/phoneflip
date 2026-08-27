import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import {
  ledger,
  totals,
  withRunningSaldo,
  type LedgerCategory,
  type LedgerDirection,
  type LedgerEntry,
  type Period,
} from '../lib/calc'
import { euroFlow, euroSigned, flowClass, niceDate, phoneTitle, platformName } from '../lib/format'
import { jobTicketLabel, ticketLabel } from '../lib/id'
import { useStore } from '../store'
import { type Phone, type RepairJob } from '../types'
import { euroClass } from '../ui'
import { JobDealModal, PhoneDealModal } from '../components/PhoneDeal'
import { SaleModal } from '../components/SaleModal'

const PERIODS: Period[] = ['month', 'year', 'all']
const FLOWS: Array<'all' | LedgerDirection> = ['all', 'in', 'uit']

const IN_CATS: LedgerCategory[] = ['verkoop_telefoon', 'klantreparatie']
const OUT_CATS: LedgerCategory[] = [
  'inkoop_telefoon',
  'onderdelen',
  'apparatuur',
  'platform',
  'verzending',
]

export function Books() {
  const t = useT()
  const { data } = useStore()
  const [period, setPeriod] = useState<Period>('all')
  const [flow, setFlow] = useState<'all' | LedgerDirection>('all')
  const [inspectPhone, setInspectPhone] = useState<Phone | null>(null)
  const [inspectJob, setInspectJob] = useState<RepairJob | null>(null)
  const [editSale, setEditSale] = useState<Phone | null>(null)

  const livePhone = inspectPhone
    ? (data.phones.find((p) => p.id === inspectPhone.id) ?? null)
    : null
  const liveJob = inspectJob
    ? (data.repairJobs.find((j) => j.id === inspectJob.id) ?? null)
    : null
  const liveSale = editSale
    ? (data.phones.find((p) => p.id === editSale.id) ?? null)
    : null

  const stats = useMemo(
    () => totals(data.phones, data.equipment, period, data.repairJobs, data.stockParts),
    [data, period],
  )

  const rows = useMemo(() => {
    const all = ledger(data.phones, data.equipment, data.repairJobs, data.stockParts, period)
    const withSaldo = withRunningSaldo(all)
    const filtered = flow === 'all' ? withSaldo : withSaldo.filter((e) => e.direction === flow)
    return [...filtered].reverse()
  }, [data, period, flow])

  const byCategory = useMemo(() => {
    const all = ledger(data.phones, data.equipment, data.repairJobs, data.stockParts, period)
    const sums = {} as Record<LedgerCategory, number>
    for (const e of all) sums[e.category] = (sums[e.category] ?? 0) + e.amount
    return sums
  }, [data, period])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('books.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('books.title')}</h2>
          <p className="mt-1 max-w-xl text-sm text-stone-400">{t('books.intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap rounded-lg border border-white/10 bg-black/20 p-1">
            {PERIODS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`min-h-11 rounded-md px-3 py-1.5 text-xs ${
                  period === id ? 'bg-white/10 text-white' : 'text-stone-400'
                }`}
              >
                {t(`period.${id}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap rounded-lg border border-white/10 bg-black/20 p-1">
            {FLOWS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFlow(id)}
                className={`min-h-11 rounded-md px-3 py-1.5 text-xs ${
                  flow === id ? 'bg-white/10 text-white' : 'text-stone-400'
                }`}
              >
                {t(`flow.${id === 'uit' ? 'out' : id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-3">
        <Stat
          label={t('books.in')}
          value={euroFlow(stats.omzet, 'in')}
          hint={t('books.inHint')}
          tone={flowClass('in', stats.omzet)}
        />
        <Stat
          label={t('books.out')}
          value={euroFlow(stats.kosten, 'uit')}
          hint={t('books.outHint')}
          tone={flowClass('uit', stats.kosten)}
        />
        <Stat
          label={t('books.saldo')}
          value={euroSigned(stats.resultaat)}
          hint={t('books.saldoHint')}
          tone={euroClass(stats.resultaat)}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryCard title={t('books.from')} cats={IN_CATS} sums={byCategory} direction="in" />
        <CategoryCard title={t('books.to')} cats={OUT_CATS} sums={byCategory} direction="uit" />
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-stone-500">
          {t('books.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
          {rows.map((row) => {
            const clickable = canInspect(row)
            const copy = ledgerCopy(row, data.phones, data.repairJobs, t)
            return (
              <li key={row.id} className="bg-white/2 px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          row.direction === 'in'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {t(`ledger.${row.category}`)}
                      </span>
                      <p className="min-w-0 break-words text-sm text-stone-100">{copy.title}</p>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-stone-500">{copy.meta}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <p className={`money font-mono text-sm ${flowClass(row.direction, row.amount)}`}>
                      {euroFlow(row.amount, row.direction)}
                    </p>
                    {clickable && (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center rounded-md border border-white/15 px-3 py-1 text-[11px] text-stone-200 hover:bg-white/10"
                        onClick={() => {
                          if (row.phoneId) {
                            const phone = data.phones.find((p) => p.id === row.phoneId)
                            if (phone) setInspectPhone(phone)
                            return
                          }
                          if (row.jobId) {
                            const job = data.repairJobs.find((j) => j.id === row.jobId)
                            if (job) setInspectJob(job)
                          }
                        }}
                      >
                        {t('books.overview')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {livePhone && (
        <PhoneDealModal
          phone={livePhone}
          onClose={() => setInspectPhone(null)}
          onEditSale={() => setEditSale(livePhone)}
        />
      )}
      {liveJob && <JobDealModal job={liveJob} onClose={() => setInspectJob(null)} />}
      {liveSale && <SaleModal phone={liveSale} onClose={() => setEditSale(null)} />}
    </div>
  )
}

function canInspect(row: LedgerEntry): boolean {
  return Boolean(row.phoneId || row.jobId)
}

function ledgerCopy(
  row: LedgerEntry,
  phones: Phone[],
  jobs: RepairJob[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): { title: string; meta: string } {
  const phone = row.phoneId ? phones.find((p) => p.id === row.phoneId) : undefined
  const job = row.jobId ? jobs.find((j) => j.id === row.jobId) : undefined
  const meta: string[] = [niceDate(row.date)]

  if (phone) {
    meta.push(ticketLabel(phone.ticketNr))
    if (row.category === 'verkoop_telefoon' && phone.salePlatform) {
      meta.push(t('books.via', { name: platformName(phone.salePlatform) }))
    }
  }
  if (job) meta.push(jobTicketLabel(job.ticketNr))

  let title = row.description
    .replace(/^(Inkoop|Verkoop|Reparatie|Apparatuur|Voorraad|Platformkosten|Verzending)\s+/u, '')
    .trim()

  if (row.category === 'onderdelen') {
    title = title.split(' · ')[0]?.trim() || title
  } else if (phone) {
    title = phoneTitle(phone.brand, phone.model)
  } else if (job) {
    title = job.customerName
  }

  return { title, meta: meta.join(' · ') }
}

function Stat({
  label,
  value,
  hint,
  tone = 'text-stone-100',
}: {
  label: string
  value: string
  hint: string
  tone?: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className={`money mt-2 overflow-x-auto font-mono text-lg sm:text-xl lg:text-2xl ${tone}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  )
}

function CategoryCard({
  title,
  cats,
  sums,
  direction,
}: {
  title: string
  cats: LedgerCategory[]
  sums: Partial<Record<LedgerCategory, number>>
  direction: LedgerDirection
}) {
  const t = useT()
  const total = cats.reduce((s, c) => s + (sums[c] ?? 0), 0)
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
      <h3 className="text-sm font-medium text-stone-300">{title}</h3>
      <ul className="mt-4 space-y-3">
        {cats.map((c) => {
          const amount = sums[c] ?? 0
          const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0
          return (
            <li key={c}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-stone-400">{t(`ledger.${c}`)}</span>
                <span className={`money shrink-0 font-mono ${flowClass(direction, amount)}`}>
                  {euroFlow(amount, direction)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full ${
                    direction === 'in' ? 'bg-emerald-500/70' : 'bg-rose-400/70'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className={`money mt-4 font-mono text-sm ${flowClass(direction, total)}`}>
        {t('books.total', { amount: euroFlow(total, direction) })}
      </p>
    </div>
  )
}
