import { RepairCoach } from '../components/BuyCoach'
import type { DefectId } from '../data/marktwaarde'
import { type HardSkip, parseListingText } from '../lib/dealCoach'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useT } from '../i18n'
import { BackLink, useSmartBack } from '../components/BackLink'
import { DocLinesEditor } from '../components/DocLinesEditor'
import { QuoteStatusBadge } from '../components/StatusBadge'
import { docLinesTotal, linesFromJobParts, quoteTotal } from '../lib/docs'
import { euro, phoneTitle } from '../lib/format'
import { jobTicketLabel, quoteLabel, today, uid } from '../lib/id'
import { useStore } from '../store'
import {
  BRANDS,
  QUOTE_STATUSES,
  type Quote,
  type QuoteStatus,
} from '../types'
import { ConfirmDialog, EuroInput, Field, GhostButton, PrimaryButton, Select, TextArea, TextInput, onSubmit } from '../ui'

export function QuoteForm() {
  const t = useT()
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data, upsertQuote, deleteQuote, acceptQuote, receiptFromQuote } = useStore()
  const existing = id ? data.quotes.find((q) => q.id === id) : undefined
  const fromJobId = params.get('job')
  const fromJob = fromJobId ? data.repairJobs.find((j) => j.id === fromJobId) : undefined
  const fallback = '/offertes'
  const goBack = useSmartBack(fallback)
  const [busy, setBusy] = useState(false)
  const [askDelete, setAskDelete] = useState(false)

  const [form, setForm] = useState<Omit<Quote, 'id' | 'nr' | 'createdAt' | 'updatedAt'>>(() => {
    if (existing) {
      return {
        jobId: existing.jobId,
        acceptedJobId: existing.acceptedJobId,
        status: existing.status,
        customerName: existing.customerName,
        brand: existing.brand,
        model: existing.model,
        damage: existing.damage,
        todo: existing.todo,
        notes: existing.notes,
        lines: existing.lines,
        laborCharge: existing.laborCharge,
        date: existing.date,
      }
    }
    if (fromJob) {
      return {
        jobId: fromJob.id,
        acceptedJobId: null,
        status: 'open',
        customerName: fromJob.customerName,
        brand: fromJob.brand,
        model: fromJob.model,
        damage: fromJob.damage ?? '',
        todo: fromJob.todo ?? '',
        notes: fromJob.notes ?? '',
        lines: linesFromJobParts(fromJob),
        laborCharge: fromJob.laborCharge,
        date: today(),
      }
    }
    return {
      jobId: null,
      acceptedJobId: null,
      status: 'open',
      customerName: '',
      brand: 'Apple',
      model: '',
      damage: '',
      todo: '',
      notes: '',
      lines: [],
      laborCharge: 0,
      date: today(),
    }
  })

  const [defects, setDefects] = useState<DefectId[]>(
    () => parseListingText(`${existing?.damage ?? fromJob?.damage ?? ''} ${existing?.todo ?? fromJob?.todo ?? ''}`).defects,
  )
  const [skips, setSkips] = useState<HardSkip[]>(
    () => parseListingText(`${existing?.damage ?? fromJob?.damage ?? ''} ${existing?.todo ?? fromJob?.todo ?? ''}`).skips,
  )

  const openJobs = useMemo(
    () => data.repairJobs.filter((j) => j.status === 'nieuw' || j.status === 'bezig' || j.status === 'klaar'),
    [data.repairJobs],
  )

  if (id && !existing) {
    return (
      <div className="space-y-3">
        <BackLink fallback={fallback} />
        <p className="text-stone-400">{t('quotes.notFound')}</p>
      </div>
    )
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function build(): Quote {
    return {
      id: existing?.id ?? uid(),
      nr: existing?.nr ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...form,
    }
  }

  function save(andBack = true) {
    const quote = upsertQuote(build())
    if (!existing) navigate(`/offertes/${quote.id}`, { replace: true })
    else if (andBack) goBack()
    return quote
  }

  const draft = { ...form, id: existing?.id ?? '', nr: existing?.nr ?? 0, createdAt: '', updatedAt: '' }
  const total = quoteTotal(draft as Quote)
  const linked =
    (form.jobId && data.repairJobs.find((j) => j.id === form.jobId)) ||
    (form.acceptedJobId && data.repairJobs.find((j) => j.id === form.acceptedJobId)) ||
    null

  async function pdf() {
    const quote = save(false)
    setBusy(true)
    try {
      const { downloadQuotePdf } = await import('../lib/pdfDocs')
      await downloadQuotePdf(quote, data.workshop, linked)
    } catch {
      alert(t('quotes.pdfFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink fallback={fallback} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {existing ? quoteLabel(existing.nr) : t('quotes.new')}
          </p>
          <h2 className="font-display mt-1 break-words text-2xl text-stone-50 sm:text-3xl">
            {form.customerName || t('quotes.title')}
          </h2>
          <p className="mt-1 text-sm text-stone-400">
            {fromJob
              ? t('quotes.fromJob', {
                  ticket: jobTicketLabel(fromJob.ticketNr),
                  device: phoneTitle(fromJob.brand, fromJob.model),
                })
              : t('qform.loose')}
          </p>
        </div>
        {existing ? <QuoteStatusBadge status={form.status} /> : null}
      </div>

      <form onSubmit={onSubmit(() => save(true))} className="space-y-6 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.customer')}>
            <TextInput
              required
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder={t('qform.namePh')}
            />
          </Field>
          <Field label={t('common.date')}>
            <TextInput type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
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
              placeholder={t('qform.modelPh')}
            />
          </Field>
          <Field label={t('qform.status')}>
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value as QuoteStatus)}
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`quote.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('qform.job')}>
            <Select
              value={form.jobId ?? ''}
              onChange={(e) => set('jobId', e.target.value || null)}
            >
              <option value="">{t('quotes.standalone')}</option>
              {openJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {jobTicketLabel(j.ticketNr)} · {j.customerName}
                </option>
              ))}
              {form.jobId && !openJobs.some((j) => j.id === form.jobId) ? (
                <option value={form.jobId}>{t('qform.linked')}</option>
              ) : null}
            </Select>
          </Field>
        </div>

        <Field label={t('quotes.damage')}>
          <TextArea
            value={form.damage}
            onChange={(e) => set('damage', e.target.value)}
            placeholder={t('qform.damagePh')}
          />
        </Field>
        <Field label={t('quotes.todo')}>
          <TextArea
            value={form.todo}
            onChange={(e) => set('todo', e.target.value)}
            placeholder={t('qform.todoPh')}
          />
        </Field>

        <RepairCoach
          model={form.model}
          defects={defects}
          skips={skips}
          kind="klant"
          onDefects={setDefects}
          onSkips={setSkips}
          onLabor={(n) => set('laborCharge', n)}
        />

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
            {t('quotes.lines')}
          </p>
          <DocLinesEditor lines={form.lines} onChange={(lines) => set('lines', lines)} />
        </div>

        <Field label={t('qform.labor')}>
          <EuroInput value={form.laborCharge} onValue={(n) => set('laborCharge', n)} />
        </Field>

        <p className="money font-mono text-stone-100">
          {t('qform.total', { total: euro(total) })}
          <span className="ml-2 text-sm text-stone-500">
            {t('qform.totalHint', {
              parts: euro(docLinesTotal(form.lines)),
              labor: euro(form.laborCharge),
            })}
          </span>
        </p>

        <Field label={t('common.notes')}>
          <TextArea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('quotes.notesPh')}
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
          <GhostButton type="button" className="w-full sm:w-auto" disabled={busy} onClick={() => void pdf()}>
            {busy ? t('common.pdfBusy') : t('quotes.pdf')}
          </GhostButton>
          {form.status === 'geaccepteerd' && linked ? (
            <Link to={`/reparatie/${linked.id}`}>
              <GhostButton type="button" className="w-full sm:w-auto">
                {t('quotes.toJob')}
              </GhostButton>
            </Link>
          ) : form.status !== 'afgewezen' ? (
            <PrimaryButton
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                const quote = build()
                const next = acceptQuote(quote.id, quote)
                if (next) navigate(`/reparatie/${next}`)
              }}
            >
              {t('quotes.becomeJob')}
            </PrimaryButton>
          ) : null}
          <GhostButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              const quote = upsertQuote(build())
              const next = receiptFromQuote(quote.id, quote)
              if (next) navigate(`/bonnen/${next}`)
            }}
          >
            {t('quotes.becomeReceipt')}
          </GhostButton>
          <PrimaryButton type="submit" className="w-full sm:w-auto">
            {t('common.save')}
          </PrimaryButton>
        </div>
      </form>
      {askDelete && existing && (
        <ConfirmDialog
          title={t('quotes.deleteTitle')}
          body={t('quotes.deleteBody')}
          onClose={() => setAskDelete(false)}
          onConfirm={() => {
            deleteQuote(existing.id)
            navigate('/offertes')
          }}
        />
      )}
    </div>
  )
}
