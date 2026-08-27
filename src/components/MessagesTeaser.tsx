import { Link } from 'react-router-dom'
import { useT } from '../i18n'

export function MessagesTeaser({
  side = 'kopen',
  model,
  max,
  skip,
}: {
  side?: 'kopen' | 'verkopen'
  model?: string
  max?: number | null
  skip?: boolean
}) {
  const t = useT()
  const q = new URLSearchParams()
  q.set('kant', side)
  if (model?.trim()) q.set('model', model.trim())
  if (max != null && max > 0) q.set('max', String(Math.round(max)))
  if (skip) q.set('skip', '1')

  return (
    <Link
      to={`/berichten?${q.toString()}`}
      className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-stone-100">
          {side === 'verkopen' ? t('msg.tabSell') : t('buyask.title')}
        </span>
        <span className="mt-0.5 block min-w-0 break-words text-sm text-stone-400">
          {side === 'verkopen' ? t('msg.teaserSell') : t('msg.teaser')}
        </span>
        {skip ? (
          <span className="mt-1 block text-sm text-rose-200">{t('buyask.skipBanner')}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-sm font-medium text-amber-400">{t('msg.teaserGo')}</span>
    </Link>
  )
}
