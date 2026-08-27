import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { euro, phoneTitle } from '../lib/format'
import { receiptLabel } from '../lib/id'
import { useStore } from '../store'
import { ServiceTabs } from '../components/ServiceTabs'
import { ConfirmDialog, GhostButton } from '../ui'

export function Receipts() {
  const t = useT()
  const { data, deleteReceipt } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const receipts = [...(data.receipts ?? [])].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

  async function pdf(id: string) {
    const receipt = data.receipts.find((r) => r.id === id)
    if (!receipt) return
    setBusy(id)
    try {
      const job = receipt.jobId ? data.repairJobs.find((j) => j.id === receipt.jobId) : null
      const { downloadReceiptPdf } = await import('../lib/pdfDocs')
      await downloadReceiptPdf(receipt, data.workshop, job)
    } catch {
      alert(t('receipts.pdfFail'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('receipts.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('receipts.title')}</h2>
          <p className="mt-1 text-sm text-stone-400">{t('receipts.hint')}</p>
        </div>
        <Link
          to="/bonnen/nieuw"
          className="inline-flex min-h-11 items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950"
        >
          {t('receipts.add')}
        </Link>
      </div>

      <ServiceTabs />

      {receipts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/3 px-6 py-16 text-center">
          <p className="font-display text-2xl text-stone-100">{t('receipts.empty')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">{t('receipts.emptyHint')}</p>
          <Link
            to="/bonnen/nieuw"
            className="mt-6 inline-flex min-h-11 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950"
          >
            {t('receipts.first')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {receipts.map((receipt) => (
            <li
              key={receipt.id}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-amber-500/80">{receiptLabel(receipt.nr)}</p>
                <p className="mt-1 truncate text-stone-100">{receipt.customerName || t('common.nameless')}</p>
                <p className="truncate text-sm text-stone-400">
                  {phoneTitle(receipt.brand, receipt.model)}
                </p>
              </div>
              <p className="money shrink-0 font-mono text-stone-100">{euro(receipt.paidTotal)}</p>
              <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
                <Link to={`/bonnen/${receipt.id}`}>
                  <GhostButton type="button">{t('common.edit')}</GhostButton>
                </Link>
                <GhostButton
                  type="button"
                  disabled={busy === receipt.id}
                  onClick={() => void pdf(receipt.id)}
                >
                  {busy === receipt.id ? t('common.pdfBusy') : t('receipts.pdf')}
                </GhostButton>
                {receipt.jobId ? (
                  <Link to={`/reparatie/${receipt.jobId}`}>
                    <GhostButton type="button">{t('quotes.toJob')}</GhostButton>
                  </Link>
                ) : null}
                <GhostButton
                  type="button"
                  className="text-rose-300"
                  onClick={() => setPendingId(receipt.id)}
                >
                  {t('common.delete')}
                </GhostButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pendingId && (
        <ConfirmDialog
          title={t('receipts.deleteTitle')}
          body={t('receipts.deleteBody')}
          onClose={() => setPendingId(null)}
          onConfirm={() => {
            deleteReceipt(pendingId)
            setPendingId(null)
          }}
        />
      )}
    </div>
  )
}
