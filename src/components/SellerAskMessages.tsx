import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { euro } from '../lib/format'
import { useStore } from '../store'
import { CopyWaCard } from './CopyWaCard'

const GROUPS = [
  { id: 'check', ids: ['still', 'pack', 'battery', 'housing', 'ids', 'findmy', 'functions'] },
  { id: 'deal', ids: ['offer', 'hold'] },
  { id: 'no', ids: ['noPhotos', 'noIcloud', 'noWater', 'noFaceid', 'thanksNo'] },
] as const

type GroupId = (typeof GROUPS)[number]['id']
type MsgId = (typeof GROUPS)[number]['ids'][number]

export function SellerAskMessages({
  model,
  max,
  skip,
}: {
  model?: string
  max?: number | null
  skip?: boolean
}) {
  const t = useT()
  const { data } = useStore()
  const [openId, setOpenId] = useState<GroupId | null>(skip ? 'no' : 'check')
  const city = data.workshop?.city?.trim() || t('sell.cityFallback')
  const maxLabel = max != null && max > 0 ? euro(max) : t('buyask.maxFallback')
  const device = (model ?? '').trim() || t('buyask.deviceFallback')

  useEffect(() => {
    setOpenId(skip ? 'no' : 'check')
  }, [skip])

  function text(id: MsgId): string {
    return t(`buyask.m.${id}`, { city, max: maxLabel, model: device })
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4">
      <h3 className="text-sm font-medium text-stone-100">{t('buyask.title')}</h3>
      <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t('buyask.intro')}</p>

      <ul className="mt-3 space-y-1.5 text-sm text-stone-300">
        {(['must1', 'must2', 'must3', 'must4', 'must5', 'must6'] as const).map((k) => (
          <li key={k} className="flex min-w-0 gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0 break-words">{t(`buyask.${k}`)}</span>
          </li>
        ))}
      </ul>
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

      <div className="mt-4 space-y-3">
        {GROUPS.map((g) => (
          <div key={g.id} className="min-w-0 rounded-xl border border-white/8 bg-black/20">
            <button
              type="button"
              onClick={() => setOpenId((cur) => (cur === g.id ? null : g.id))}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-medium text-stone-100"
            >
              {t(`buyask.g.${g.id}`)}
              <span className="shrink-0 text-stone-500">{openId === g.id ? '−' : '+'}</span>
            </button>
            {openId === g.id ? (
              <ul className="grid min-w-0 grid-cols-1 gap-3 border-t border-white/8 p-3 md:grid-cols-2">
                {g.ids.map((id) => (
                  <CopyWaCard key={id} title={t(`buyask.q.${id}`)} body={text(id)} />
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
