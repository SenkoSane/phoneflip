import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'
import { totals } from '../lib/calc'
import { euroSigned } from '../lib/format'
import { useStore } from '../store'
import { JanChat } from './JanChat'
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
    <div className="min-h-svh max-w-full overflow-x-hidden bg-[var(--pf-bg)] text-[var(--pf-fg)]">
      <div className="relative mx-auto flex min-h-svh w-full min-w-0 max-w-[1760px]">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--pf-border)] px-4 py-6 lg:flex">
          <div className="px-2">
            <p className="pf-accent-text font-mono text-[10px] uppercase tracking-[0.2em]">
              Phone flip
            </p>
            <h1 className="font-display mt-1 text-xl text-[var(--pf-fg)]">Tracker</h1>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm ${
                    isActive
                      ? 'bg-[var(--pf-surface-raised)] text-[var(--pf-fg)]'
                      : 'pf-muted hover:bg-[var(--pf-surface)] hover:text-[var(--pf-subtle)]'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/toestel/nieuw"
            className="mt-6 rounded-lg bg-[var(--pf-accent)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--pf-chip-accent-fg)] hover:brightness-110"
          >
            {t('nav.newPhone')}
          </NavLink>
          <NavLink
            to="/reparatie/nieuw"
            className="mt-2 rounded-lg border border-[var(--pf-border-strong)] px-3 py-2.5 text-center text-sm text-[var(--pf-subtle)] hover:bg-[var(--pf-surface)]"
          >
            {t('nav.newRepair')}
          </NavLink>

          <div className="pf-surface-raised mt-auto min-w-0 space-y-3 rounded-xl p-3.5">
            <p className="pf-muted text-xs uppercase tracking-wider">
              {t('nav.cashResult')}
            </p>
            <p className={`money font-mono text-lg ${euroClass(cash.resultaat)}`}>
              {euroSigned(cash.resultaat)}
            </p>
            <p className="pf-muted text-xs leading-relaxed">
              {t('nav.openTickets', { n: open })}
              {openJobs > 0 ? ` · ${t('nav.openRepairs', { n: openJobs })}` : ''}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-w-0 max-w-full items-center gap-2 border-b border-[var(--pf-border)] px-3 py-2 sm:px-4 lg:hidden">
            <p className="font-display min-w-0 shrink truncate text-[var(--pf-fg)]">PhoneFlip</p>
            <p className={`money ml-auto shrink-0 font-mono text-sm ${euroClass(cash.resultaat)}`}>
              {euroSigned(cash.resultaat)}
            </p>
            <NavLink
              to="/reparatie/nieuw"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-[var(--pf-border-strong)] px-2.5 text-xs text-[var(--pf-subtle)]"
            >
              {t('nav.newRepairShort')}
            </NavLink>
            <NavLink
              to="/toestel/nieuw"
              className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-[var(--pf-accent)] px-2.5 text-xs font-semibold text-[var(--pf-chip-accent-fg)]"
            >
              {t('nav.newPhoneShort')}
            </NavLink>
          </header>
          <nav className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-[var(--pf-border)] px-2 py-2 sm:px-3 lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm ${
                    isActive
                      ? 'bg-[var(--pf-surface-raised)] text-[var(--pf-fg)]'
                      : 'pf-muted'
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
                className="pf-surface-raised mb-4 flex min-h-11 items-center rounded-xl px-3 text-sm text-[var(--pf-subtle)]"
              >
                {t('nav.syncBanner')}
              </NavLink>
            ) : null}
            {children}
          </main>
        </div>
      </div>
      <JanChat />
    </div>
  )
}
