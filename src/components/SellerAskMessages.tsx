import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { euro } from '../lib/format'
import { CopyWaCard } from './CopyWaCard'

const MSG_IDS = ['begin', 'checks', 'offerMin', 'offerMax', 'parts', 'reject'] as const
type MsgId = (typeof MSG_IDS)[number]

function moneyOr(n: number | null | undefined, fallback: string): string {
  return n != null && n > 0 ? euro(n) : fallback
}

export function SellerAskMessages({
  model,
  min,
  max,
  parts,
  skip,
}: {
  model?: string
  min?: number | null
  max?: number | null
  parts?: number | null
  skip?: boolean
}) {
  const t = useT()
  const device = (model ?? '').trim() || t('buyask.deviceFallback')
  const minLabel = moneyOr(min, t('buyask.minFallback'))
  const maxLabel = moneyOr(max, t('buyask.maxFallback'))
  const partsLabel = moneyOr(parts, t('buyask.partsFallback'))

  function text(id: MsgId): string {
    return t(`buyask.m.${id}`, {
      model: device,
      min: minLabel,
      max: maxLabel,
      parts: partsLabel,
    })
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4">
      <h3 className="text-sm font-medium text-stone-100">{t('buyask.title')}</h3>
      <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t('buyask.intro')}</p>
      <p className="mt-2 text-xs text-stone-500">
        {t('buyask.imeiLink')}{' '}
        <Link to="/imei" className="text-amber-400 underline-offset-2 hover:underline">
          {t('nav.imei')}
        </Link>
      </p>

      {skip ? (
        <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {t('buyask.skipBanner')}
        </p>
      ) : null}

      <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
        {MSG_IDS.map((id) => (
          <CopyWaCard
            key={id}
            className={id === 'begin' || id === 'checks' ? 'sm:col-span-2' : undefined}
            title={t(`buyask.q.${id}`)}
            body={text(id)}
          />
        ))}
      </ul>
    </section>
  )
}
