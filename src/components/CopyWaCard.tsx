import { useState } from 'react'
import { useT } from '../i18n'
import { GhostButton } from '../ui'

export function CopyWaCard({ title, body }: { title: string; body: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
    } catch {
      window.prompt(t('common.copy'), body)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function shareWa() {
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <li className="min-w-0 rounded-xl border border-white/10 bg-white/3 p-3">
      <p className="text-sm font-medium text-stone-100">{title}</p>
      <p className="mt-2 min-w-0 break-words text-sm text-stone-300">{body}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <GhostButton type="button" className="w-full" onClick={() => void copy()}>
          {copied ? t('common.copied') : t('common.copy')}
        </GhostButton>
        <GhostButton type="button" className="w-full" onClick={shareWa}>
          {t('sell.wa')}
        </GhostButton>
      </div>
    </li>
  )
}
