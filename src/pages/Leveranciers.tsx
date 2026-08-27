import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useT } from '../i18n'
import {
  GENS,
  SHOPS,
  TOOL_GROUPS,
  genFromModel,
  groupsFor,
  type Gen,
} from '../data/leveranciers'
import { LinkGroupCard, OutLink } from '../components/SupplierLinks'

export function Leveranciers() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const gen = useMemo(() => parseGen(params.get('m')), [params])

  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (!id) return
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [gen])

  function pick(next: Gen) {
    const p = new URLSearchParams(params)
    p.set('m', next)
    setParams(p, { replace: true })
  }

  const groups = groupsFor(gen)

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {t('sup.kicker')}
        </p>
        <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('sup.title')}</h2>
        <p className="mt-2 max-w-2xl break-words text-sm text-stone-400">{t('sup.intro')}</p>
      </div>

      <section className="min-w-0 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 sm:p-4 lg:p-5">
        <h3 className="text-sm font-medium text-stone-100">{t('sup.howTitle')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-stone-300">
          <li className="flex min-w-0 gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0 break-words">{t('sup.how1')}</span>
          </li>
          <li className="flex min-w-0 gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0 break-words">{t('sup.how2')}</span>
          </li>
          <li className="flex min-w-0 gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0 break-words">{t('sup.how3')}</span>
          </li>
          <li className="flex min-w-0 gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <span className="min-w-0 break-words">{t('sup.how4')}</span>
          </li>
        </ul>
      </section>

      <section className="min-w-0">
        <h3 className="font-display text-xl text-stone-50">{t('sup.shops')}</h3>
        <p className="mt-1 max-w-2xl break-words text-sm text-stone-400">{t('sup.shopsHint')}</p>
        <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHOPS.map((shop) => (
            <li
              key={shop.id}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg text-stone-50">{shop.name}</p>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-wider text-stone-500">
                  {shop.where}
                </p>
                <p className="mt-2 min-w-0 break-words text-sm text-stone-300">{t(shop.whenKey)}</p>
                {shop.warnKey ? (
                  <p className="mt-2 min-w-0 break-words text-xs text-amber-200/90">{t(shop.warnKey)}</p>
                ) : null}
              </div>
              <OutLink href={shop.href} pick={shop.id === 'fixje'}>
                {t('sup.openShop')}
              </OutLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0 space-y-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl text-stone-50">{t('sup.modelTitle')}</h3>
          <p className="mt-1 max-w-2xl break-words text-sm text-stone-400">{t('sup.modelHint')}</p>
        </div>
        <div className="grid min-w-0 grid-cols-4 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
          {GENS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pick(id)}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-2 text-sm font-medium lg:w-auto lg:px-3 ${
                gen === id ? 'bg-amber-500 text-stone-950' : 'border border-white/10 bg-white/5 text-stone-200'
              }`}
            >
              <span className="sm:hidden">{id}</span>
              <span className="hidden sm:inline">iPhone {id}</span>
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} id={group.id} className="scroll-mt-20">
              <LinkGroupCard group={group} />
            </div>
          ))}
        </div>
      </section>

      <div className="min-w-0 space-y-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl text-stone-50">{t('sup.toolsTitle')}</h3>
          <p className="mt-1 max-w-2xl break-words text-sm text-stone-400">{t('sup.toolsHint')}</p>
        </div>
        {TOOL_GROUPS.map((group) => (
          <LinkGroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}

function parseGen(raw: string | null): Gen {
  if (!raw) return '11'
  if ((GENS as readonly string[]).includes(raw)) return raw as Gen
  return genFromModel(raw) ?? '11'
}
