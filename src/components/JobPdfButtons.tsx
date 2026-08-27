import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import type { RepairJob } from '../types'
import { GhostButton } from '../ui'

export function JobPdfButtons({ job, className = '' }: { job: RepairJob; className?: string }) {
  const t = useT()
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Link to={`/offertes/nieuw?job=${job.id}`}>
        <GhostButton type="button">{t('pdfBtn.quote')}</GhostButton>
      </Link>
      <Link to={`/bonnen/nieuw?job=${job.id}`}>
        <GhostButton type="button">{t('pdfBtn.receipt')}</GhostButton>
      </Link>
    </div>
  )
}
