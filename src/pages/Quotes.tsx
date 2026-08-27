import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { quoteAgeDays, isStaleQuote } from '../lib/dealCoach'
import { quoteTotal } from '../lib/docs'
import { euro, phoneTitle } from '../lib/format'
import { quoteLabel } from '../lib/id'
import { useStore } from '../store'
import { AgeBadge } from '../components/AgeBadge'
import { QuoteStatusBadge } from '../components/StatusBadge'
import { ServiceTabs } from '../components/ServiceTabs'
import { ConfirmDialog, GhostButton, PrimaryButton } from '../ui'

export function Quotes() {
  const t = useT()
  const { data, deleteQuote, acceptQuote, receiptFromQuote } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const quotes = [...(data.quotes ?? [])].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

  async function pdf(id: string) {
    const quote = data.quotes.find((q) => q.id === id)
    if (!quote) return
    setBusy(id)
    try {
      const job =
        (quote.jobId && data.repairJobs.find((j) => j.id === quote.jobId)) ||
        (quote.acceptedJobId && data.repairJobs.find((j) => j.id === quote.acceptedJobId)) ||
        null
      const { downloadQuotePdf } = await import('../lib/pdfDocs')
      await downloadQuotePdf(quote, data.workshop, job)
    } catch {
      alert(t('quotes.pdfFail'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('quotes.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('quotes.title')}</h2>
          <p className="mt-1 text-sm text-stone-400">{t('quotes.hint')}</p>
        </div>
        <Link
          to="/offertes/nieuw"
          className="inline-flex min-h-11 items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950"
        >
          {t('quotes.add')}
        </Link>
      </div>

      <ServiceTabs />

      {quotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/3 px-6 py-16 text-center">
          <p className="font-display text-2xl text-stone-100">{t('quotes.empty')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">{t('quotes.emptyHint')}</p>
          <Link
            to="/offertes/nieuw"
            className="mt-6 inline-flex min-h-11 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950"
          >
            {t('quotes.first')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => {
            const total = quoteTotal(quote)
            const jobId = quote.acceptedJobId || quote.jobId
            return (
              <li
                key={quote.id}
                className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-[11px] text-amber-500/80">{quoteLabel(quote.nr)}</p>
                    <QuoteStatusBadge status={quote.status} />
                    {quote.status === 'open' ? (
                      <AgeBadge days={quoteAgeDays(quote)} stale={isStaleQuote(quote)} />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-stone-100">{quote.customerName || t('common.nameless')}</p>
                  <p className="truncate text-sm text-stone-400">
                    {phoneTitle(quote.brand, quote.model)}
                  </p>
                </div>
                <p className="money shrink-0 font-mono text-stone-100">{euro(total)}</p>
                <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
                  <Link to={`/offertes/${quote.id}`}>
                    <GhostButton type="button">{t('common.edit')}</GhostButton>
                  </Link>
                  <GhostButton
                    type="button"
                    disabled={busy === quote.id}
                    onClick={() => void pdf(quote.id)}
                  >
                    {busy === quote.id ? t('common.pdfBusy') : t('quotes.pdf')}
                  </GhostButton>
                  {quote.status === 'open' ? (
                    <PrimaryButton
                      type="button"
                      onClick={() => {
                        const next = acceptQuote(quote.id)
                        if (next) navigate(`/reparatie/${next}`)
                      }}
                    >
                      {t('quotes.becomeJob')}
                    </PrimaryButton>
                  ) : jobId ? (
                    <Link to={`/reparatie/${jobId}`}>
                      <GhostButton type="button">{t('quotes.toJob')}</GhostButton>
                    </Link>
                  ) : null}
                  <GhostButton
                    type="button"
                    onClick={() => {
                      const next = receiptFromQuote(quote.id)
                      if (next) navigate(`/bonnen/${next}`)
                    }}
                  >
                    {t('quotes.becomeReceipt')}
                  </GhostButton>
                  <GhostButton
                    type="button"
                    className="text-rose-300"
                    onClick={() => setPendingId(quote.id)}
                  >
                    {t('common.delete')}
                  </GhostButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {pendingId && (
        <ConfirmDialog
          title={t('quotes.deleteTitle')}
          body={t('quotes.deleteBody')}
          onClose={() => setPendingId(null)}
          onConfirm={() => {
            deleteQuote(pendingId)
            setPendingId(null)
          }}
        />
      )}
    </div>
  )
}
