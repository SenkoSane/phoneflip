import { NavLink } from 'react-router-dom'
import { useT } from '../i18n'

export function ServiceTabs() {
  const t = useT()
  const tabs = [
    { to: '/reparaties', label: t('nav.repairs'), end: true },
    { to: '/offertes', label: t('nav.quotes'), end: false },
    { to: '/bonnen', label: t('nav.receipts'), end: false },
  ]
  return (
    <nav className="flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm ${
              isActive ? 'bg-white/10 text-stone-50' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
