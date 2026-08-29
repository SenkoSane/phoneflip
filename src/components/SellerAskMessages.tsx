import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { CopyWaCard } from './CopyWaCard'

/** Marktplaats stappenplan: kort eerst, checks daarna, dan bodden. */
const MSG_IDS = [
  'contact',
  'checks',
  'clarify',
  'offer1',
  'offer2',
  'offerMax',
  'deal',
  'track',
  'reminder',
  'reject',
] as const

type MsgId = (typeof MSG_IDS)[number]

const WIDE: MsgId[] = ['contact', 'checks', 'clarify', 'offer1', 'offer2', 'offerMax', 'deal', 'track', 'reminder']

function moneyOr(n: number | null | undefined, fallback: string): string {
  return n != null && n > 0 ? String(Math.round(n)) : fallback
}

export function SellerAskMessages({
  name,
  model,
  defect,
  min,
  mid,
  max,
  skip,
}: {
  name?: string
  model?: string
  defect?: string
  min?: number | null
  mid?: number | null
  max?: number | null
  skip?: boolean
}) {
  const t = useT()
  const nameBit = (name ?? '').trim() ? ` ${(name ?? '').trim()}` : ''
  const device = (model ?? '').trim() || t('buyask.deviceFallback')
  const defectLabel = (defect ?? '').trim() || t('buyask.defectFallback')
  const minLabel = moneyOr(min, t('buyask.minFallback'))
  const midLabel = moneyOr(mid, t('buyask.midFallback'))
  const maxLabel = moneyOr(max, t('buyask.maxFallback'))

  function text(id: MsgId): string {
    return t(`buyask.m.${id}`, {
      name: nameBit,
      model: device,
      defect: defectLabel,
      min: minLabel,
      mid: midLabel,
      max: maxLabel,
    })
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4">
      <h3 className="text-sm font-medium text-stone-100">{t('buyask.title')}</h3>
      <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t('buyask.intro')}</p>
      <p className="mt-2 text-xs text-stone-500">{t('buyask.noFirst')}</p>
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
            className={WIDE.includes(id) ? 'sm:col-span-2' : undefined}
            title={t(`buyask.q.${id}`)}
            body={text(id)}
          />
        ))}
      </ul>
    </section>
  )
}
