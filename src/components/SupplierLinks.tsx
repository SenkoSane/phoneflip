import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import type { DefectId } from '../data/marktwaarde'
import {
  compactGroups,
  type ExtLink,
  type LinkGroup,
} from '../data/leveranciers'

export function OutLink({
  href,
  shop,
  children,
  pick,
  warn,
}: {
  href: string
  shop?: string
  children: React.ReactNode
  pick?: boolean
  warn?: boolean
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${
        pick
          ? 'bg-amber-500 text-stone-950'
          : warn
            ? 'border border-rose-500/30 bg-rose-500/10 text-stone-100'
            : 'border border-white/10 bg-white/5 text-stone-200 hover:bg-white/8'
      }`}
    >
      <span className="min-w-0 flex-1">
        {shop ? (
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] opacity-70">
            {shop}
          </span>
        ) : null}
        <span className="block break-words leading-snug">{children}</span>
      </span>
      <span className="shrink-0 self-center text-[11px] opacity-70">↗</span>
    </a>
  )
}

export function LinkGroupCard({ group }: { group: LinkGroup }) {
  const t = useT()
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4 lg:p-5">
      <h3 className="font-display min-w-0 break-words text-lg text-stone-50">{t(group.titleKey)}</h3>
      {group.hintKey ? (
        <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t(group.hintKey)}</p>
      ) : null}
      {group.warnKey ? (
        <p className="mt-2 min-w-0 break-words text-sm text-rose-300">{t(group.warnKey)}</p>
      ) : null}
      <ul className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.links.map((link) => (
          <li key={`${link.shop}-${link.href}-${link.labelKey}`} className="min-w-0">
            <ShopLinkRow link={link} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function compactLinks(links: ExtLink[]): ExtLink[] {
  const picks = links.filter((l) => l.pick)
  const rest = links.filter((l) => !l.pick)
  const merged = [...picks, ...rest]
  return merged
    .filter(
      (l, i, arr) => arr.findIndex((x) => x.href === l.href && x.labelKey === l.labelKey) === i,
    )
    .slice(0, 5)
}

function ShopLinkRow({ link }: { link: ExtLink }) {
  const t = useT()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <OutLink href={link.href} shop={link.shop} pick={link.pick} warn={link.warn}>
        {t(link.labelKey)}
      </OutLink>
      {link.noteKey ? (
        <p className="min-w-0 break-words px-1 text-[11px] text-stone-500">{t(link.noteKey)}</p>
      ) : null}
    </div>
  )
}

export function SupplierBanner({ hintKey }: { hintKey: string }) {
  const t = useT()
  return (
    <Link
      to="/leveranciers"
      className="flex min-h-11 min-w-0 flex-col gap-1 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
    >
      <span className="min-w-0 break-words">{t(hintKey)}</span>
      <span className="shrink-0 font-medium">{t('nav.suppliers')} →</span>
    </Link>
  )
}

export function SupplierStrip({
  model,
  defects,
}: {
  model: string
  defects?: DefectId[]
}) {
  const t = useT()
  const groups = compactGroups(model, defects ?? [])
  return (
    <section className="min-w-0 max-w-full space-y-3 overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-100">{t('sup.stripTitle')}</p>
          <p className="mt-1 break-words text-xs text-stone-500">{t('sup.stripHint')}</p>
        </div>
        <Link
          to={model ? `/leveranciers?m=${encodeURIComponent(model)}` : '/leveranciers'}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-amber-200 sm:w-auto"
        >
          {t('nav.suppliers')}
        </Link>
      </div>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="min-w-0">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
              {t(g.titleKey)}
            </p>
            {g.warnKey ? (
              <p className="mb-2 min-w-0 break-words text-xs text-rose-300">{t(g.warnKey)}</p>
            ) : null}
            <ul className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              {compactLinks(g.links).map((link) => (
                <li key={`${link.href}-${link.labelKey}`} className="min-w-0">
                  <ShopLinkRow link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
