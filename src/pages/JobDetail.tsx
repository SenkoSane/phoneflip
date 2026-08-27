import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useT } from '../i18n'
import { jobMargin, jobPartsCost, jobRevenue, plannedPartsTotal } from '../lib/calc'
import { quoteTotal } from '../lib/docs'
import { euro, niceDate, partLabel, phoneTitle } from '../lib/format'
import { jobTicketLabel, quoteLabel, receiptLabel } from '../lib/id'
import { useStore } from '../store'
import {
  JOB_STATUSES,
  resolveLeftoverDest,
  type Repair,
} from '../types'
import { JobKindBadge, JobStatusBadge } from '../components/StatusBadge'
import { needsJobSettle, PickupModal } from '../components/PickupModal'
import { BackLink } from '../components/BackLink'
import { MarkReadyModal, WorkNotesView } from '../components/WorkNotes'
import { LeftoverSheet, MateriaalSheet, leftoverLoggedLabel, repairSourceLabel } from '../components/MateriaalSheet'
import { PartEditModal } from '../components/PartEditModal'
import { JobPdfButtons } from '../components/JobPdfButtons'
import { defectsFromNotes } from '../data/leveranciers'
import { SupplierStrip } from '../components/SupplierLinks'
import {
  ConfirmDialog,
  EuroInput,
  Field,
  GhostButton,
  PrimaryButton,
  euroClass,
} from '../ui'

export function JobDetail() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, setJobStatus, setJobParts, updateJob, deleteJob, returnLeftover } = useStore()
  const job = data.repairJobs.find((j) => j.id === id)
  const [materiaalOpen, setMateriaalOpen] = useState(false)
  const [leftover, setLeftover] = useState<Repair | null>(null)
  const [editPart, setEditPart] = useState<Repair | null>(null)
  const [pickupOpen, setPickupOpen] = useState(false)
  const [readyOpen, setReadyOpen] = useState(false)
  const [askDeleteJob, setAskDeleteJob] = useState(false)
  const [askDeletePartId, setAskDeletePartId] = useState<string | null>(null)

  if (!job) {
    return (
      <div className="space-y-3">
        <BackLink fallback="/reparaties" />
        <p className="text-stone-400">{t('jform.notFound')}</p>
      </div>
    )
  }

  const current = job
  const partsCost = jobPartsCost(current)
  const planned = plannedPartsTotal(current.parts)
  const revenue = jobRevenue(current)
  const margin = jobMargin(current)

  function patchCharges(patch: { laborCharge?: number; chargeParts?: number }) {
    updateJob({ ...current, ...patch })
  }

  return (
    <div className="space-y-6">
      <BackLink fallback="/reparaties" />
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-amber-500/80">{jobTicketLabel(job.ticketNr)}</p>
          <h2 className="font-display mt-1 break-words text-2xl text-stone-50 sm:text-3xl">{job.customerName}</h2>
          <p className="mt-1 text-sm text-stone-400">
            {phoneTitle(job.brand, job.model)}
            {' · '}
            {t('jdet.inOn', { date: niceDate(job.dateIn) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JobKindBadge kind={job.kind} />
          <Link to={`/reparatie/${job.id}/bewerken`}>
            <GhostButton type="button">{t('common.edit')}</GhostButton>
          </Link>
          <JobPdfButtons job={job} />
          {job.status !== 'opgehaald' && (
            <PrimaryButton
              type="button"
              onClick={() => {
                if (needsJobSettle(job)) setPickupOpen(true)
                else setJobStatus(job.id, 'opgehaald')
              }}
            >
              {t('jdet.pickedPaid')}
            </PrimaryButton>
          )}
        </div>
      </div>

      <JobDocs jobId={job.id} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-stone-200">{t('jdet.status')}</h3>
              <JobStatusBadge status={job.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              {JOB_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s === 'klaar') {
                      setReadyOpen(true)
                      return
                    }
                    if (s === 'opgehaald') {
                      if (needsJobSettle(job)) setPickupOpen(true)
                      else setJobStatus(job.id, 'opgehaald')
                      return
                    }
                    setJobStatus(job.id, s)
                  }}
                  className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs ring-1 ${
                    job.status === s
                      ? 'bg-white/10 text-white ring-white/20'
                      : 'text-stone-400 ring-white/10 hover:bg-white/5'
                  }`}
                >
                  {t(`job.${s}`)}
                </button>
              ))}
            </div>
            {job.dateDone && (
              <p className="mt-3 text-xs text-stone-500">{t('jdet.readyOn', { date: niceDate(job.dateDone) })}</p>
            )}
            {job.paidAt && (
              <p className="text-xs text-stone-500">{t('jdet.paidOn', { date: niceDate(job.paidAt) })}</p>
            )}
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-medium text-stone-200">{t('jdet.work')}</h3>
            <div className="mt-3">
              <WorkNotesView
                damage={job.damage ?? ''}
                todo={job.todo ?? ''}
                workDone={job.workDone ?? ''}
                notes={job.notes}
                showEmpty
              />
            </div>
          </section>

          <SupplierStrip
            model={job.model}
            defects={defectsFromNotes({
              todo: job.todo,
              damage: job.damage,
              parts: job.parts,
            })}
          />

          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-stone-200">{t('jdet.parts')}</h3>
              <button
                type="button"
                onClick={() => setMateriaalOpen(true)}
                className="min-h-11 text-sm text-amber-400"
              >
                {t('jdet.assign')}
              </button>
            </div>
            {(job.parts ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">{t('jdet.noParts')}</p>
            ) : (
              <ul className="divide-y divide-white/8">
                {(job.parts ?? []).map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="min-h-11 min-w-0 flex-1 text-left"
                      onClick={() => setEditPart(r)}
                    >
                      <p className="truncate text-sm text-stone-100">{partLabel(r.name)}</p>
                      <p className="truncate text-xs text-stone-500">
                        {[
                          repairSourceLabel(r),
                          leftoverLoggedLabel(r),
                          t(`repair.${r.status}`),
                          r.supplier,
                          niceDate(r.date),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="money shrink-0 font-mono text-sm">{euro(r.cost)}</span>
                      {!r.leftoverDest && (
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center text-sm text-amber-400"
                          onClick={() => {
                            const dest = resolveLeftoverDest(r)
                            if (dest) {
                              returnLeftover({ kind: 'job', id: job.id }, r.id, dest)
                            } else {
                              setLeftover(r)
                            }
                          }}
                        >
                          {t('pdet.leftover')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center px-2 text-sm text-rose-300"
                        onClick={() => setAskDeletePartId(r.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-medium text-stone-200">{t('jdet.pays')}</h3>
            <p className="mt-1 text-xs text-stone-500">{t('jdet.paysHint')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label={t('jdet.charge')}>
                <EuroInput
                  value={job.chargeParts}
                  onValue={(n) => patchCharges({ chargeParts: n })}
                />
              </Field>
              <Field label={t('jdet.labor')}>
                <EuroInput
                  value={job.laborCharge}
                  onValue={(n) => patchCharges({ laborCharge: n })}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <GhostButton
                type="button"
                className="px-2 py-1 text-xs"
                onClick={() => patchCharges({ chargeParts: partsCost })}
              >
                {t('jdet.chargeCost')}
              </GhostButton>
              <GhostButton
                type="button"
                className="px-2 py-1 text-xs"
                onClick={() => patchCharges({ chargeParts: 0 })}
              >
                {t('jdet.noCharge')}
              </GhostButton>
            </div>
            {partsCost > 0 && job.chargeParts === 0 && (
              <p className="mt-3 text-xs text-amber-400/90">{t('jdet.friend')}</p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-medium text-stone-200">{t('jdet.result')}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={t('jdet.charge')} value={euro(job.chargeParts)} />
              <Row label={t('jdet.laborPrice')} value={euro(job.laborCharge)} />
              <Row label={t('jdet.paysLabel')} value={euro(revenue)} strong />
              <Row label={t('jdet.yourParts')} value={euro(partsCost)} />
              {planned > 0 ? <Row label={t('jdet.planned')} value={euro(planned)} /> : null}
              <Row
                label={t('jdet.pnl')}
                value={euro(margin)}
                tone={euroClass(margin)}
                strong
              />
            </dl>
            {(job.status === 'klaar' || job.status === 'opgehaald') && (
              <p className="mt-4 text-xs text-stone-500">{t('jdet.countsClosed')}</p>
            )}
            {job.status !== 'klaar' && job.status !== 'opgehaald' && (
              <p className="mt-4 text-xs text-stone-500">{t('jdet.countsOpen')}</p>
            )}
          </div>

          {(job.status === 'nieuw' || job.status === 'bezig') && (
            <PrimaryButton
              type="button"
              className="w-full"
              onClick={() => setReadyOpen(true)}
            >
              {t('jdet.markReady')}
            </PrimaryButton>
          )}

          <GhostButton
            type="button"
            className="w-full text-rose-300"
            onClick={() => setAskDeleteJob(true)}
          >
            {t('jobDetail.deleteTicket')}
          </GhostButton>
        </aside>
      </div>

      {pickupOpen && (
        <PickupModal job={job} onClose={() => setPickupOpen(false)} />
      )}
      {readyOpen && (
        <MarkReadyModal
          title={t('jobs.readyTitle', { name: job.customerName || t('jobs.repairFallback') })}
          damage={job.damage ?? ''}
          todo={job.todo ?? ''}
          workDone={job.workDone ?? ''}
          parts={job.parts ?? []}
          onClose={() => setReadyOpen(false)}
          onConfirm={(workDone) => {
            updateJob({ ...job, workDone, status: 'klaar' })
          }}
        />
      )}
      {materiaalOpen && (
        <MateriaalSheet
          target={{ kind: 'job', id: job.id }}
          onClose={() => setMateriaalOpen(false)}
          onBought={(repair) => {
            setJobParts(job.id, [...(job.parts ?? []), repair])
            if (job.status === 'nieuw') setJobStatus(job.id, 'bezig')
          }}
        />
      )}
      {editPart && (
        <PartEditModal
          repair={editPart}
          onClose={() => setEditPart(null)}
          onSave={(next) => {
            setJobParts(
              job.id,
              (job.parts ?? []).map((x) => (x.id === next.id ? next : x)),
            )
            setEditPart(null)
          }}
        />
      )}
      {leftover && (
        <LeftoverSheet
          name={leftover.name}
          onClose={() => setLeftover(null)}
          onPick={(dest) => {
            returnLeftover({ kind: 'job', id: job.id }, leftover.id, dest)
            setLeftover(null)
          }}
        />
      )}
      {askDeleteJob && (
        <ConfirmDialog
          title={t('jobDetail.deleteTitle')}
          body={t('jobDetail.deleteBody')}
          onClose={() => setAskDeleteJob(false)}
          onConfirm={() => {
            deleteJob(job.id)
            navigate('/reparaties')
          }}
        />
      )}
      {askDeletePartId && (
        <ConfirmDialog
          title={t('jobDetail.partDelete')}
          body={t('jobDetail.partDeleteBody')}
          onClose={() => setAskDeletePartId(null)}
          onConfirm={() => {
            setJobParts(
              job.id,
              (job.parts ?? []).filter((x) => x.id !== askDeletePartId),
            )
            setAskDeletePartId(null)
          }}
        />
      )}
    </div>
  )
}

function JobDocs({ jobId }: { jobId: string }) {
  const t = useT()
  const { data, receiptFromQuote } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const job = data.repairJobs.find((j) => j.id === jobId) ?? null
  const quotes = (data.quotes ?? []).filter((q) => q.jobId === jobId || q.acceptedJobId === jobId)
  const receipts = (data.receipts ?? []).filter((r) => r.jobId === jobId)
  if (quotes.length === 0 && receipts.length === 0) return null

  async function pdfQuote(id: string) {
    const quote = quotes.find((q) => q.id === id)
    if (!quote) return
    setBusy(id)
    try {
      const { downloadQuotePdf } = await import('../lib/pdfDocs')
      await downloadQuotePdf(quote, data.workshop, job)
    } catch {
      alert(t('jdet.pdfFail'))
    } finally {
      setBusy(null)
    }
  }

  async function pdfReceipt(id: string) {
    const receipt = receipts.find((r) => r.id === id)
    if (!receipt) return
    setBusy(id)
    try {
      const { downloadReceiptPdf } = await import('../lib/pdfDocs')
      await downloadReceiptPdf(receipt, data.workshop, job)
    } catch {
      alert(t('jdet.pdfFail'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
      <h3 className="text-sm font-medium text-stone-200">{t('jobDetail.docs')}</h3>
      <ul className="mt-3 space-y-2">
        {quotes.map((q) => (
          <li key={q.id} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-stone-300">
              {t('jdet.quote', { nr: quoteLabel(q.nr), status: t(`quote.${q.status}`) })}
            </p>
            <p className="money shrink-0 font-mono text-sm text-stone-100">{euro(quoteTotal(q))}</p>
            <div className="flex min-w-0 flex-wrap gap-2">
              <Link to={`/offertes/${q.id}`} className="inline-flex min-h-11 items-center text-sm text-amber-400/90">
                {t('jdet.open')}
              </Link>
              <GhostButton
                type="button"
                disabled={busy === q.id}
                onClick={() => void pdfQuote(q.id)}
              >
                {busy === q.id ? t('common.pdfBusy') : t('common.pdf')}
              </GhostButton>
              <GhostButton
                type="button"
                onClick={() => {
                  const next = receiptFromQuote(q.id)
                  if (next) navigate(`/bonnen/${next}`)
                }}
              >
                {t('quotes.becomeReceipt')}
              </GhostButton>
            </div>
          </li>
        ))}
        {receipts.map((r) => (
          <li key={r.id} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-stone-300">{t('jdet.receipt', { nr: receiptLabel(r.nr) })}</p>
            <p className="money shrink-0 font-mono text-sm text-stone-100">{euro(r.paidTotal)}</p>
            <div className="flex min-w-0 flex-wrap gap-2">
              <Link to={`/bonnen/${r.id}`} className="inline-flex min-h-11 items-center text-sm text-amber-400/90">
                {t('jdet.open')}
              </Link>
              <GhostButton
                type="button"
                disabled={busy === r.id}
                onClick={() => void pdfReceipt(r.id)}
              >
                {busy === r.id ? t('common.pdfBusy') : t('common.pdf')}
              </GhostButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: string
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="min-w-0 text-stone-500">{label}</dt>
      <dd className={`money shrink-0 font-mono ${strong ? 'text-stone-100' : 'text-stone-300'} ${tone ?? ''}`}>
        {value}
      </dd>
    </div>
  )
}
