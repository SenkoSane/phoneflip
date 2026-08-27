import { useT } from '../i18n'
import { euro } from '../lib/format'

export function AgeBadge({ days, stale }: { days: number; stale: boolean }) {
  const t = useT()
  if (days < 1) return null
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        stale
          ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
          : 'bg-white/5 text-stone-400 ring-white/10'
      }`}
    >
      {t('coach.days', { n: days })}
    </span>
  )
}

export function LockedCash({ amount }: { amount: number }) {
  const t = useT()
  if (!(amount > 0)) return null
  return (
    <p className="money mt-1 text-[11px] text-stone-500">
      {t('coach.locked', { amount: euro(amount) })}
    </p>
  )
}
