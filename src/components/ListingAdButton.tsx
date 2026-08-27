import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import type { Phone } from '../types'

export function ListingAdButton({ phone }: { phone: Phone }) {
  const t = useT()
  return (
    <Link
      to={`/toestel/${phone.id}/verkopen`}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-200 transition hover:bg-white/10 sm:w-auto"
    >
      {t('sell.open')}
    </Link>
  )
}
