import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useT } from '../i18n'
import { BackLink, useSmartBack } from '../components/BackLink'
import { DocLinesEditor } from '../components/DocLinesEditor'
import { docLinesTotal, linesFromJobParts, receiptTableTotal } from '../lib/docs'
import { euro, phoneTitle } from '../lib/format'
import { jobTicketLabel, receiptLabel, today, uid } from '../lib/id'
import { useStore } from '../store'
import { BRANDS, type Receipt } from '../types'
import { ConfirmDialog, EuroInput, Field, GhostButton, PrimaryButton, Select, TextArea, TextInput, onSubmit } from '../ui'

export function ReceiptForm() {
  const t = useT()
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data, upsertReceipt, deleteReceipt } = useStore()
  const existing = id ? data.receipts.find((r) => r.id === id) : undefined
  const fromJobId = params.get('job')
  const fromJob = fromJobId ? data.repairJobs.find((j) => j.id === fromJobId) : undefined
  const fallback = '/bonnen'
  const goBack = useSmartBack(fallback)
  const [busy, setBusy] = useState(false)
  const [askDelete, setAskDelete] = useState(false)

  const [form, setForm] = useState<Omit<Receipt, 'id' | 'nr' | 'createdAt' | 'updatedAt'>>(() => {
    if (existing) {
      return {
        jobId: existing.jobId,
        customerName: existing.customerName,
        brand: existing.brand,
        model: existing.model,
        damage: existing.damage,
        workDone: existing.workDone,
        notes: existing.notes,
        lines: existing.lines,
        laborCharge:
          existing.laborCharge ||
          Math.max(0, Math.round((existing.paidTotal - docLinesTotal(existing.lines)) * 100) / 100),
        paidTotal: existing.paidTotal,
        paidAt: existing.paidAt,
      }
    }
    if (fromJob) {
      const lines = linesFromJobParts(fromJob)
      const laborCharge = fromJob.laborCharge
      return {
        jobId: fromJob.id,
        customerName: fromJob.customerName,
        brand: fromJob.brand,
        model: fromJob.model,
        damage: fromJob.damage ?? '',
        workDone: fromJob.workDone ?? '',
        notes: fromJob.notes ?? '',
        lines,
        laborCharge,
        paidTotal: docLinesTotal(lines) + laborCharge,
        paidAt: fromJob.paidAt || today(),
      }
    }
    return {
      jobId: null,
      customerName: '',
      brand: 'Apple',
      model: '',
      damage: '',
      workDone: '',
      notes: '',
      lines: [],
      laborCharge: 0,
      paidTotal: 0,
      paidAt: today(),
    }
  })

  const jobs = useMemo(() => data.repairJobs, [data.repairJobs])

  if (id && !existing) {
    return (
      <div className="space-y-3">
        <BackLink fallback={fallback} />
        <p className="text-stone-400">{t('receipts.notFound')}</p>
      </div>
    )
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function build(): Receipt {
    return {
      id: existing?.id ?? uid(),
      nr: existing?.nr ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...form,
    }
  }

  function save(andBack = true) {
    const receipt = upsertReceipt(build())
    if (!existing) navigate(`/bonnen/${receipt.id}`, { replace: true })
    else if (andBack) goBack()
    return receipt
  }

  const tableTotal = receiptTableTotal({ ...form, id: '', nr: 0, createdAt: '', updatedAt: '' })
  const linked = form.jobId ? data.repairJobs.find((j) => j.id === form.jobId) : null

  async function pdf() {
    const receipt = save(false)
    setBusy(true)
    try {
      const { downloadReceiptPdf } = await import('../lib/pdfDocs')
      await downloadReceiptPdf(receipt, data.workshop, linked)
    } catch {
      alert(t('receipts.pdfFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink fallback={fallback} />
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {existing ? receiptLabel(existing.nr) : t('receipts.new')}
        </p>
        <h2 className="font-display mt-1 break-words text-2xl text-stone-50 sm:text-3xl">
          {form.customerName || t('pdf.receipt')}
        </h2>
        <p className="mt-1 text-sm text-stone-400">
          {fromJob
            ? t('receipts.fromJob', {
                ticket: jobTicketLabel(fromJob.ticketNr),
                device: phoneTitle(fromJob.brand, fromJob.model),
              })
            : t('receipts.noInvoice')}
        </p>
      </div>

      <form onSubmit={onSubmit(() => save(true))} className="space-y-6 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.customer')}>
            <TextInput
              required
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder={t('rform.namePh')}
            />
          </Field>
          <Field label={t('receipts.paidOn')}>
            <TextInput type="date" value={form.paidAt} onChange={(e) => set('paidAt', e.target.value)} />
          </Field>
          <Field label={t('common.brand')}>
            <Select value={form.brand} onChange={(e) => set('brand', e.target.value)}>
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b === 'Overig' ? t('brand.Overig') : b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.model')}>
            <TextInput
              required
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
              placeholder={t('rform.modelPh')}
            />
          </Field>
          <Field label={t('receipts.linkJob')}>
            <Select
              value={form.jobId ?? ''}
              onChange={(e) => {
                const nextId = e.target.value || null
                const job = nextId ? data.repairJobs.find((j) => j.id === nextId) : undefined
                if (!job) {
                  set('jobId', null)
                  return
                }
                setForm((f) => {
                  const empty = !f.customerName && !f.model && f.lines.length === 0
                  if (!empty) return { ...f, jobId: job.id }
                  const lines = linesFromJobParts(job)
                  return {
                    ...f,
                    jobId: job.id,
                    customerName: job.customerName,
                    brand: job.brand,
                    model: job.model,
                    damage: job.damage ?? '',
                    workDone: job.workDone ?? '',
                    lines,
                    laborCharge: job.laborCharge,
                    paidTotal: docLinesTotal(lines) + job.laborCharge,
                    paidAt: job.paidAt || f.paidAt,
                  }
                })
              }}
            >
              <option value="">{t('receipts.standalone')}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {jobTicketLabel(j.ticketNr)} · {j.customerName}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('receipts.damage')}>
          <TextArea
            value={form.damage}
            onChange={(e) => set('damage', e.target.value)}
            placeholder={t('rform.damagePh')}
          />
        </Field>
        <Field label={t('receipts.work')}>
          <TextArea
            value={form.workDone}
            onChange={(e) => set('workDone', e.target.value)}
            placeholder={t('rform.workPh')}
          />
        </Field>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">{t('receipts.lines')}</p>
          <DocLinesEditor lines={form.lines} onChange={(lines) => set('lines', lines)} />
          <div className="flex min-w-0 items-stretch gap-2">
            <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-stone-200">
              {t('rform.labor')}
            </div>
            <div className="w-28 shrink-0 sm:w-32">
              <EuroInput value={form.laborCharge} onValue={(n) => set('laborCharge', n)} />
            </div>
            <span className="w-11 shrink-0" aria-hidden />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('receipts.paidAmount')}>
            <EuroInput value={form.paidTotal} onValue={(n) => set('paidTotal', n)} />
          </Field>
        </div>
        <p className="text-sm text-stone-400">
          {t('receipts.sumHint', { table: euro(tableTotal), paid: euro(form.paidTotal) })}
        </p>
        {tableTotal !== form.paidTotal ? (
          <button
            type="button"
            className="text-sm text-amber-400/90 underline-offset-2 hover:underline"
            onClick={() => set('paidTotal', tableTotal)}
          >
            {t('receipts.setPaid')}
          </button>
        ) : null}

        <Field label={t('common.notes')}>
          <TextArea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('rform.notesPh')}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <GhostButton type="button" className="w-full sm:w-auto" onClick={goBack}>
            {t('common.back')}
          </GhostButton>
          {existing ? (
            <GhostButton
              type="button"
              className="w-full text-rose-300 sm:w-auto"
              onClick={() => setAskDelete(true)}
            >
              {t('common.delete')}
            </GhostButton>
          ) : null}
          {linked ? (
            <Link to={`/reparatie/${linked.id}`}>
              <GhostButton type="button" className="w-full sm:w-auto">
                {t('quotes.toJob')}
              </GhostButton>
            </Link>
          ) : null}
          <GhostButton type="button" className="w-full sm:w-auto" disabled={busy} onClick={() => void pdf()}>
            {busy ? t('common.pdfBusy') : t('receipts.pdf')}
          </GhostButton>
          <PrimaryButton type="submit" className="w-full sm:w-auto">
            {t('common.save')}
          </PrimaryButton>
        </div>
      </form>
      {askDelete && existing && (
        <ConfirmDialog
          title={t('receipts.deleteTitle')}
          body={t('receipts.deleteBody')}
          onClose={() => setAskDelete(false)}
          onConfirm={() => {
            deleteReceipt(existing.id)
            navigate('/bonnen')
          }}
        />
      )}
    </div>
  )
}
