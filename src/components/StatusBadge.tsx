import { useT } from '../i18n'
import type { JobKind, JobStatus, PhoneStatus, QuoteStatus } from '../types'

const tone: Record<PhoneStatus, string> = {
  kast: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  bezig: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  klaar: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  te_koop: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  verkocht: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
}

const jobTone: Record<JobStatus, string> = {
  nieuw: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  bezig: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  klaar: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  opgehaald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
}

export function StatusBadge({ status }: { status: PhoneStatus }) {
  const t = useT()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone[status]}`}
    >
      {t(`status.phone.${status}`)}
    </span>
  )
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const t = useT()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${jobTone[status]}`}
    >
      {t(`status.job.${status}`)}
    </span>
  )
}

export function JobKindBadge({ kind }: { kind: JobKind }) {
  const t = useT()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        kind === 'vriend'
          ? 'bg-amber-500/10 text-amber-200 ring-amber-500/25'
          : 'bg-stone-500/15 text-stone-300 ring-stone-500/30'
      }`}
    >
      {t(`status.kind.${kind}`)}
    </span>
  )
}

const quoteTone: Record<QuoteStatus, string> = {
  open: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  geaccepteerd: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  afgewezen: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const t = useT()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${quoteTone[status]}`}
    >
      {t(`status.quote.${status}`)}
    </span>
  )
}

export const COLUMN_ACCENT: Record<PhoneStatus, string> = {
  kast: 'border-slate-500/40',
  bezig: 'border-amber-500/40',
  klaar: 'border-sky-500/40',
  te_koop: 'border-violet-500/40',
  verkocht: 'border-emerald-500/40',
}

export const JOB_COLUMN_ACCENT: Record<JobStatus, string> = {
  nieuw: 'border-slate-500/40',
  bezig: 'border-amber-500/40',
  klaar: 'border-sky-500/40',
  opgehaald: 'border-emerald-500/40',
}
