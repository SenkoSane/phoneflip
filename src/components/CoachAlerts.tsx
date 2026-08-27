import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { dashboardAlerts, jobSnit, soldSnit } from '../lib/dealCoach'
import { euro, euroSigned } from '../lib/format'
import { useStore } from '../store'
import { euroClass } from '../ui'

export function CoachAlerts() {
  const t = useT()
  const { data } = useStore()
  const alerts = dashboardAlerts(data.phones, data.repairJobs, data.quotes ?? [])
  const snit = soldSnit(data.phones)
  const jobs = jobSnit(data.repairJobs)

  if (alerts.length === 0 && !snit && !jobs) {
    return (
      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 sm:p-5">
        <h3 className="text-sm font-medium text-stone-100">{t('coach.dashTitle')}</h3>
        <p className="mt-1 text-sm text-stone-400">{t('coach.dashEmpty')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      {(snit || jobs) && (
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
          {snit ? (
            <div className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{t('coach.snitPhones')}</p>
              <p className={`money mt-2 font-mono text-xl ${euroClass(snit.avg)}`}>{euroSigned(snit.avg)}</p>
              <p className="mt-1 text-xs text-stone-500">{t('coach.snitN', { n: snit.n })}</p>
            </div>
          ) : null}
          {jobs ? (
            <div className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{t('coach.snitJobs')}</p>
              <p className={`money mt-2 font-mono text-xl ${euroClass(jobs.avg)}`}>{euroSigned(jobs.avg)}</p>
              <p className="mt-1 text-xs text-stone-500">{t('coach.snitN', { n: jobs.n })}</p>
            </div>
          ) : null}
        </div>
      )}
      {alerts.length > 0 ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 p-4 sm:p-5">
          <h3 className="text-sm font-medium text-stone-100">{t('coach.alertsTitle')}</h3>
          <p className="mt-1 text-xs text-stone-500">{t('coach.alertsHint')}</p>
          <ul className="mt-3 space-y-2">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  to={a.href}
                  className="flex min-h-11 min-w-0 flex-col gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-stone-100">{a.title}</span>
                    <span className="block truncate text-[11px] text-stone-500">
                      {t(a.metaKey, a.metaVars)}
                    </span>
                  </span>
                  <span className="money shrink-0 font-mono text-sm text-rose-200">{euro(a.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
