import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { AgeBadge } from '../components/AgeBadge'
import { isStaleJob, jobAgeDays } from '../lib/dealCoach'
import { jobIsClosed, jobMargin, jobPartsCost, jobRevenue } from '../lib/calc'
import { euro, euroFlow, euroSigned, flowClass, phoneTitle } from '../lib/format'
import { jobTicketLabel } from '../lib/id'
import { useStore } from '../store'
import { type JobStatus, type RepairJob } from '../types'
import { JOB_COLUMN_ACCENT, JobKindBadge } from '../components/StatusBadge'
import { BoardEmpty, BoardSink, StatusBoard } from '../components/StatusBoard'
import { ServiceTabs } from '../components/ServiceTabs'
import { needsJobSettle, PickupModal } from '../components/PickupModal'
import {
  IntakePreview,
  MarkReadyModal,
} from '../components/WorkNotes'
import { euroClass } from '../ui'

const BOARD: JobStatus[] = ['nieuw', 'bezig', 'klaar']

export function Jobs() {
  const t = useT()
  const { data, setJobStatus, updateJob } = useStore()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<JobStatus>('nieuw')
  const [dragging, setDragging] = useState<string | null>(null)
  const [pickupFor, setPickupFor] = useState<RepairJob | null>(null)
  const [readyFor, setReadyFor] = useState<RepairJob | null>(null)

  const query = q.trim().toLowerCase()
  const filtered = data.repairJobs.filter((j) => {
    if (j.status === 'opgehaald') return false
    if (!query) return true
    const hay =
      `${j.customerName} ${j.brand} ${j.model} ${jobTicketLabel(j.ticketNr)} ${j.kind} ${j.damage} ${j.todo} ${j.workDone}`.toLowerCase()
    return hay.includes(query)
  })

  const columns = BOARD.map((status) => ({
    id: status,
    label: t(`job.${status}`),
    count: filtered.filter((j) => j.status === status).length,
    accent: JOB_COLUMN_ACCENT[status],
  }))

  function requestPickup(job: RepairJob) {
    if (needsJobSettle(job)) {
      setPickupFor(job)
      return
    }
    setJobStatus(job.id, 'opgehaald')
  }

  function dropOn(status: JobStatus) {
    if (!dragging) return
    if (status === 'opgehaald') {
      const job = data.repairJobs.find((j) => j.id === dragging)
      setDragging(null)
      if (job) requestPickup(job)
      return
    }
    if (status === 'klaar') {
      const job = data.repairJobs.find((j) => j.id === dragging)
      setDragging(null)
      if (job) setReadyFor(job)
      return
    }
    setJobStatus(dragging, status)
    setDragging(null)
  }

  function dropOnSink() {
    if (!dragging) return
    const job = data.repairJobs.find((j) => j.id === dragging)
    setDragging(null)
    if (job) requestPickup(job)
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('jobs.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('jobs.title')}</h2>
          <p className="mt-1 text-sm text-stone-400">{t('jobs.intro')}</p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('jobs.search')}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-base outline-none focus:border-amber-500/40 sm:max-w-56 sm:flex-none sm:text-sm"
          />
          <Link
            to="/reparatie/nieuw"
            className="inline-flex min-h-11 items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950"
          >
            {t('jobs.add')}
          </Link>
        </div>
      </div>

      <ServiceTabs />

      {data.repairJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/3 px-6 py-16 text-center">
          <p className="font-display text-2xl text-stone-100">{t('jobs.emptyTitle')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">{t('jobs.emptyBody')}</p>
          <Link
            to="/reparatie/nieuw"
            className="mt-6 inline-flex min-h-11 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950"
          >
            {t('jobs.first')}
          </Link>
        </div>
      ) : (
        <>
          <StatusBoard
            columns={columns}
            activeId={tab}
            onActiveId={setTab}
            dragging={!!dragging}
            onDrop={dropOn}
            renderColumn={(status, { draggable }) => {
              const jobs = filtered.filter((j) => j.status === status)
              if (jobs.length === 0) return <BoardEmpty />
              return jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  draggable={draggable}
                  onDragStart={() => setDragging(job.id)}
                  onDragEnd={() => setDragging(null)}
                  onPickup={() => requestPickup(job)}
                  onReady={() => setReadyFor(job)}
                />
              ))
            }}
            sink={() => (
              <BoardSink
                label={t('jobs.sink')}
                hint={t('jobs.sinkHint')}
                dragging={!!dragging}
                onDrop={dropOnSink}
              />
            )}
          />
          <p className="text-xs text-stone-500">
            {t('jobs.pickedIn')}{' '}
            <Link to="/boekhouding" className="text-amber-400/90 underline-offset-2 hover:underline">
              {t('nav.books')}
            </Link>
            .
          </p>
          {pickupFor && (
            <PickupModal job={pickupFor} onClose={() => setPickupFor(null)} />
          )}
          {readyFor && (
            <MarkReadyModal
              title={t('jobs.readyTitle', { name: readyFor.customerName || t('jobs.repairFallback') })}
              damage={readyFor.damage ?? ''}
              todo={readyFor.todo ?? ''}
              workDone={readyFor.workDone ?? ''}
              parts={readyFor.parts ?? []}
              onClose={() => setReadyFor(null)}
              onConfirm={(workDone) => {
                updateJob({ ...readyFor, workDone, status: 'klaar' })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

function JobCard({
  job,
  draggable,
  onDragStart,
  onDragEnd,
  onPickup,
  onReady,
}: {
  job: RepairJob
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onPickup: () => void
  onReady: () => void
}) {
  const t = useT()
  const parts = jobPartsCost(job)
  const revenue = jobRevenue(job)
  const margin = jobMargin(job)
  const closed = jobIsClosed(job)

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`ticket-card rounded-xl border bg-stone-900/80 p-3 ${
        isStaleJob(job) ? 'border-rose-500/35' : 'border-white/10'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <Link to={`/reparatie/${job.id}`} className="min-w-0">
          <p className="font-mono text-[10px] text-amber-500/80">
            {jobTicketLabel(job.ticketNr)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-stone-500">{t('jobs.customer')}</p>
          <h4 className="truncate text-sm font-medium text-stone-100">
            {job.customerName || t('jobs.nameless')}
          </h4>
          <p className="truncate text-xs text-stone-500">
            {phoneTitle(job.brand, job.model) || '—'}
          </p>
          <IntakePreview damage={job.damage} todo={job.todo} />
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <JobKindBadge kind={job.kind} />
          <AgeBadge days={jobAgeDays(job)} stale={isStaleJob(job)} />
        </div>
      </div>
      <div className="mt-3 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">
            {closed ? t('jobs.paysClosed') : t('jobs.paysOpen')}
          </p>
          <p className={`money font-mono text-sm ${closed ? flowClass('in', revenue) : 'text-stone-400'}`}>
            {closed ? euroFlow(revenue, 'in') : euro(revenue)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">{t('jobs.profit')}</p>
          <p className={`money font-mono text-sm ${euroClass(margin)}`}>{euroSigned(margin)}</p>
        </div>
      </div>
      {parts > 0 && (
        <p className={`money mt-2 text-[11px] ${flowClass('uit', parts)}`}>
          {t('jobs.partAmt', { amount: euroFlow(parts, 'uit') })}
        </p>
      )}
      {(job.status === 'nieuw' || job.status === 'bezig') && (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onReady()
          }}
          className="mt-3 min-h-11 w-full rounded-md border border-white/15 bg-white/5 py-1.5 text-xs font-medium text-stone-200 hover:bg-white/10"
        >
          {t('jobs.markReady')}
        </button>
      )}
      {job.status === 'klaar' && (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onPickup()
          }}
          className="mt-3 min-h-11 w-full rounded-md bg-emerald-500 py-1.5 text-xs font-semibold text-stone-950 hover:bg-emerald-400"
        >
          {t('jobs.picked')}
        </button>
      )}
    </article>
  )
}
