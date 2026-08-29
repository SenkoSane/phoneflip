import { CoachAlerts } from '../components/CoachAlerts'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { jobIsClosed, jobRevenue, totals, type Period } from '../lib/calc'
import { euro, euroFlow, euroSigned, flowClass, phoneTitle, platformName } from '../lib/format'
import { jobTicketLabel, ticketLabel } from '../lib/id'
import { useStore } from '../store'
import { JOB_STATUSES, type JobStatus, type Phone, type PhoneStatus } from '../types'
import { euroClass } from '../ui'
import { JobStatusBadge, StatusBadge } from '../components/StatusBadge'
import { SaleModal } from '../components/SaleModal'

const PERIODS: Period[] = ['month', 'year', 'all']

export function Dashboard() {
  const t = useT()
  const { data } = useStore()
  const [period, setPeriod] = useState<Period>('all')
  const [saleFor, setSaleFor] = useState<Phone | null>(null)
  const stats = useMemo(
    () => totals(data.phones, data.equipment, period, data.repairJobs, data.stockParts),
    [data, period],
  )

  const byStatus = useMemo(() => {
    const counts: Record<PhoneStatus, number> = {
      kast: 0,
      bezig: 0,
      klaar: 0,
      te_koop: 0,
      verkocht: 0,
    }
    for (const p of data.phones) counts[p.status] += 1
    return counts
  }, [data.phones])

  const byJobStatus = useMemo(() => {
    const counts: Record<JobStatus, number> = {
      nieuw: 0,
      bezig: 0,
      klaar: 0,
      opgehaald: 0,
    }
    for (const j of data.repairJobs) counts[j.status] += 1
    return counts
  }, [data.repairJobs])

  const recent = [
    ...data.phones.map((p) => {
      const sold = p.status === 'verkocht'
      return {
        updatedAt: p.updatedAt,
        href: `/toestel/${p.id}`,
        title: phoneTitle(p.brand, p.model),
        type: sold ? t('dash.sale') : t('dash.buy'),
        direction: (sold ? 'in' : 'uit') as 'in' | 'uit',
        pending: false,
        meta: sold
          ? `${ticketLabel(p.ticketNr)} · ${t('books.via', { name: platformName(p.salePlatform) })}`
          : `${ticketLabel(p.ticketNr)} · ${t(`phone.${p.status}`)}`,
        amount: sold ? (p.salePrice ?? 0) : p.purchasePrice,
        sellPhone: p.status === 'te_koop' ? p : null,
      }
    }),
    ...data.repairJobs.map((j) => {
      const closed = jobIsClosed(j)
      return {
        updatedAt: j.updatedAt,
        href: `/reparatie/${j.id}`,
        title: j.customerName,
        type: t('dash.repair'),
        direction: 'in' as const,
        pending: !closed,
        meta: `${jobTicketLabel(j.ticketNr)} · ${t(`job.${j.status}`)}`,
        amount: jobRevenue(j),
        sellPhone: null as Phone | null,
      }
    }),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('dash.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('dash.shop')}</h2>
        </div>
        <div className="flex w-full max-w-full flex-wrap rounded-lg border border-white/10 bg-black/20 p-1 sm:w-auto">
          {PERIODS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`min-h-11 shrink-0 rounded-md px-3 py-1.5 text-xs ${
                period === id ? 'bg-white/10 text-white' : 'text-stone-400'
              }`}
            >
              {t(`period.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <CoachAlerts />

      {data.phones.length === 0 &&
      data.equipment.length === 0 &&
      data.equipmentWishlist.length === 0 &&
      data.repairJobs.length === 0 &&
      data.stockParts.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t('dash.cash')}
              value={euroSigned(stats.resultaat)}
              hint={t('dash.cashHint')}
              tone={euroClass(stats.resultaat)}
              large
            />
            <Stat
              label={t('dash.revenue')}
              value={euroFlow(stats.omzet, 'in')}
              hint={
                stats.afgerondeJobs > 0
                  ? t('dash.soldJobs', { sold: String(stats.verkocht), jobs: String(stats.afgerondeJobs) })
                  : t('dash.soldOnly', { sold: String(stats.verkocht) })
              }
              tone={flowClass('in', stats.omzet)}
            />
            <Stat
              label={t('dash.stock')}
              value={euro(stats.voorraad)}
              hint={
                stats.openTickets === 1
                  ? t('dash.stockOne')
                  : t('dash.stockMany', { n: String(stats.openTickets) })
              }
            />
            <Stat
              label={t('dash.margin')}
              value={euroSigned(stats.gerealiseerdeMarge)}
              hint={t('dash.marginHint')}
              tone={euroClass(stats.gerealiseerdeMarge)}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3">
            <Stat
              label={t('dash.repairRev')}
              value={euroFlow(stats.reparatieOmzet, 'in')}
              hint={t('dash.repairRevHint', { n: String(stats.afgerondeJobs) })}
              tone={flowClass('in', stats.reparatieOmzet)}
            />
            <Stat
              label={t('dash.repairProfit')}
              value={euroSigned(stats.reparatieWinst)}
              hint={t('dash.repairProfitHint')}
              tone={euroClass(stats.reparatieWinst)}
            />
            <Stat
              label={t('dash.custParts')}
              value={euroFlow(stats.reparatieOnderdelen, 'uit')}
              hint={t('dash.custPartsHint')}
              tone={flowClass('uit', stats.reparatieOnderdelen)}
            />
            {stats.gepland > 0 ? (
              <Stat
                label={t('dash.planned')}
                value={euro(stats.gepland)}
                hint={t('dash.plannedHint')}
              />
            ) : null}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="pf-surface rounded-2xl p-5 lg:col-span-2">
              <h3 className="text-sm font-medium text-stone-200">{t('dash.expenses')}</h3>
              <div className="mt-4 space-y-3">
                <Bar label={t('dash.barPhones')} amount={stats.inkoop} total={stats.kosten} />
                <Bar label={t('dash.barParts')} amount={stats.onderdelen} total={stats.kosten} />
                <Bar label={t('dash.barEq')} amount={stats.apparatuur} total={stats.kosten} />
                <Bar label={t('dash.barFees')} amount={stats.platform} total={stats.kosten} />
                <Bar label={t('dash.barShip')} amount={stats.verzending} total={stats.kosten} />
              </div>
              <p className={`mt-5 font-mono text-sm ${flowClass('uit', stats.kosten)}`}>
                {t('dash.totalCost', { amount: euroFlow(stats.kosten, 'uit') })}
              </p>
            </div>

            <div className="space-y-4">
              <div className="pf-surface rounded-2xl p-5">
                <h3 className="text-sm font-medium text-stone-200">{t('dash.tickets')}</h3>
                <ul className="mt-4 space-y-2">
                  {(Object.keys(byStatus) as PhoneStatus[]).map((s) => (
                    <li key={s} className="flex items-center justify-between text-sm">
                      <StatusBadge status={s} />
                      <span className="font-mono text-stone-300">{byStatus[s]}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/tickets"
                  className="mt-5 inline-block text-sm text-amber-400 hover:text-amber-300"
                >
                  {t('dash.openShop')}
                </Link>
              </div>
              <div className="pf-surface rounded-2xl p-5">
                <h3 className="text-sm font-medium text-stone-200">{t('dash.repairs')}</h3>
                <ul className="mt-4 space-y-2">
                  {JOB_STATUSES.map((s) => (
                    <li key={s} className="flex items-center justify-between text-sm">
                      <JobStatusBadge status={s} />
                      <span className="font-mono text-stone-300">{byJobStatus[s]}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/reparaties"
                  className="mt-5 inline-block text-sm text-amber-400 hover:text-amber-300"
                >
                  {t('dash.openRepairs')}
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-medium text-stone-300">{t('dash.recent')}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <Link to="/boekhouding" className="text-sm text-amber-400">
                  {t('dash.toBooks')}
                </Link>
                <Link to="/reparatie/nieuw" className="text-sm text-amber-400">
                  {t('dash.addJob')}
                </Link>
                <Link to="/toestel/nieuw" className="text-sm text-amber-400">
                  {t('dash.addPhone')}
                </Link>
              </div>
            </div>
            {recent.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-stone-500">
                {t('dash.noRecent')}
              </p>
            ) : (
              <div className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
                {recent.map((item) => (
                  <div
                    key={item.href}
                    className="flex items-start justify-between gap-2 bg-white/2 px-3 py-3 sm:items-center sm:gap-3 sm:px-4"
                  >
                    <Link to={item.href} className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-100">{item.title}</p>
                      <p className="truncate font-mono text-[11px] text-stone-500">
                        {item.type} · {item.meta}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <p
                        className={`money font-mono text-sm ${
                          item.pending ? 'text-stone-400' : flowClass(item.direction, item.amount)
                        }`}
                      >
                        {item.pending
                          ? euro(item.amount)
                          : euroFlow(item.amount, item.direction)}
                      </p>
                      {item.sellPhone && (
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-stone-950 hover:bg-emerald-400"
                          onClick={() => {
                            if (item.sellPhone) setSaleFor(item.sellPhone)
                          }}
                        >
                          {t('dash.soldBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {saleFor && <SaleModal phone={saleFor} onClose={() => setSaleFor(null)} />}
    </div>
  )
}

function EmptyState() {
  const t = useT()
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/3 px-6 py-16 text-center">
      <p className="font-display text-2xl text-stone-100">{t('dash.emptyTitle')}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">{t('dash.emptyBody')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          to="/toestel/nieuw"
          className="inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950"
        >
          {t('dash.emptyPhone')}
        </Link>
        <Link
          to="/reparatie/nieuw"
          className="inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm text-stone-200"
        >
          {t('dash.emptyJob')}
        </Link>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'text-stone-100',
  large,
}: {
  label: string
  value: string
  hint: string
  tone?: string
  large?: boolean
}) {
  return (
    <div className="pf-surface min-w-0 rounded-2xl p-4 sm:p-5">
      <p className="pf-muted text-xs uppercase tracking-[0.14em]">{label}</p>
      <p className={`money font-mono mt-2 overflow-x-auto text-lg sm:text-xl lg:text-2xl ${large ? 'xl:text-3xl' : ''} ${tone}`}>{value}</p>
      <p className="pf-muted mt-1 text-xs">{hint}</p>
    </div>
  )
}

function Bar({ label, amount, total }: { label: string; amount: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs text-stone-400">
        <span className="min-w-0 truncate">{label}</span>
        <span className={`money shrink-0 font-mono ${flowClass('uit', amount)}`}>{euroFlow(amount, 'uit')}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-amber-500/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
