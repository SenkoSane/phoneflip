import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'
import { totals } from '../lib/calc'
import { euroSigned } from '../lib/format'
import { useStore } from '../store'
import { useSync } from './SyncProvider'
import { euroClass } from '../ui'

export function Layout({ children }: { children: ReactNode }) {
  const t = useT()
  const { data } = useStore()
  const sync = useSync()
  const links = [
    { to: '/', label: t('nav.overview') },
    { to: '/boekhouding', label: t('nav.books') },
    { to: '/tickets', label: t('nav.shop') },
    { to: '/imei', label: t('nav.imei') },
    { to: '/berichten', label: t('nav.messages') },
    { to: '/reparaties', label: t('nav.repairs') },
    { to: '/marktwaarde', label: t('nav.market') },
    { to: '/leveranciers', label: t('nav.suppliers') },
    { to: '/onderdelen', label: t('nav.parts') },
    { to: '/apparatuur', label: t('nav.equipment') },
    { to: '/instellingen', label: t('nav.backup') },
  ]
  const cash = totals(
    data.phones ?? [],
    data.equipment ?? [],
    'all',
    data.repairJobs ?? [],
    data.stockParts ?? [],
  )
  const open = (data.phones ?? []).filter((p) => p.status !== 'verkocht').length
  const openJobs = (data.repairJobs ?? []).filter(
    (j) => j.status !== 'klaar' && j.status !== 'opgehaald',
  ).length

  return (
    <div className="min-h-svh max-w-full overflow-x-hidden bg-stone-950 text-stone-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,154,80,0.08),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-svh w-full min-w-0 max-w-[1760px]">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/8 px-4 py-6 lg:flex">
          <div className="px-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-500/80">
              Phone flip
            </p>
            <h1 className="font-display mt-1 text-xl text-stone-100">Tracker</h1>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-white/10 text-stone-50'
                      : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/toestel/nieuw"
            className="mt-6 rounded-lg bg-amber-500 px-3 py-2.5 text-center text-sm font-semibold text-stone-950 hover:bg-amber-400"
          >
            {t('nav.newPhone')}
          </NavLink>
          <NavLink
            to="/reparatie/nieuw"
            className="mt-2 rounded-lg border border-white/10 px-3 py-2.5 text-center text-sm text-stone-200 hover:bg-white/5"
          >
            {t('nav.newRepair')}
          </NavLink>

          <div className="mt-auto min-w-0 space-y-3 rounded-xl border border-white/8 bg-white/3 p-3">
            <p className="text-[11px] uppercase tracking-wider text-stone-500">
              {t('nav.cashResult')}
            </p>
            <p className={`money font-mono text-lg ${euroClass(cash.resultaat)}`}>
              {euroSigned(cash.resultaat)}
            </p>
            <p className="text-xs text-stone-500">
              {t('nav.openTickets', { n: open })}
              {openJobs > 0 ? ` · ${t('nav.openRepairs', { n: openJobs })}` : ''}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-w-0 max-w-full items-center gap-2 border-b border-white/8 px-3 py-2 sm:px-4 lg:hidden">
            <p className="font-display min-w-0 shrink truncate text-stone-100">PhoneFlip</p>
            <p className={`money ml-auto shrink-0 font-mono text-sm ${euroClass(cash.resultaat)}`}>
              {euroSigned(cash.resultaat)}
            </p>
            <NavLink
              to="/reparatie/nieuw"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-white/15 px-2.5 text-xs text-stone-200"
            >
              {t('nav.newRepairShort')}
            </NavLink>
            <NavLink
              to="/toestel/nieuw"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-amber-500 px-2.5 text-xs font-semibold text-stone-950"
            >
              {t('nav.newPhoneShort')}
            </NavLink>
          </header>
          <nav className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-white/8 px-2 py-2 sm:px-3 lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm ${
                    isActive ? 'bg-white/10 text-white' : 'text-stone-400'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
            {sync.configured && !sync.code && !sync.pendingCode ? (
              <NavLink
                to="/instellingen"
                className="mb-4 flex min-h-11 items-center rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm text-amber-100"
              >
                {t('nav.syncBanner')}
              </NavLink>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
