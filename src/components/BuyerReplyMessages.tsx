import { useT } from '../i18n'
import { useStore } from '../store'
import { CopyWaCard } from './CopyWaCard'

const GENERIC_IDS = ['still', 'price', 'pickup', 'battery', 'faceid', 'screenOk', 'screenAfter'] as const

export function BuyerReplyMessages({
  ask,
  aftermarket,
}: {
  ask?: string
  aftermarket?: boolean
}) {
  const t = useT()
  const { data } = useStore()
  const city = data.workshop?.city?.trim() || t('sell.cityFallback')
  const askLabel = ask?.trim() || t('msg.askPh')

  const ids =
    aftermarket === undefined
      ? GENERIC_IDS
      : ([
          'still',
          'price',
          'pickup',
          'battery',
          'faceid',
          aftermarket ? 'screenAfter' : 'screenOk',
        ] as const)

  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4">
      <h3 className="text-sm font-medium text-stone-100">{t('sell.buyersToggle')}</h3>
      <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t('msg.sellHint')}</p>
      <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {ids.map((id) => {
          const qKey = `sell.q.${id}`
          const body =
            id === 'screenAfter'
              ? t('sell.reply.screenAfter')
              : id === 'screenOk'
                ? t('sell.reply.screenOk')
                : t(`sell.reply.${id}`, { city, ask: askLabel })
          return <CopyWaCard key={id} title={t(qKey)} body={body} />
        })}
      </ul>
    </section>
  )
}
