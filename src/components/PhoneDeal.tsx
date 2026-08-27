import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import {
  jobMargin,
  jobPartsCost,
  jobRevenue,
  phoneDeal,
  type PhoneDeal,
} from '../lib/calc'
import { euro, niceDate, partLabel, phoneTitle, platformName } from '../lib/format'
import { jobTicketLabel, ticketLabel } from '../lib/id'
import { useStore } from '../store'
import type { Phone, Repair, RepairJob } from '../types'
import { WorkNotesView } from './WorkNotes'
import { JobPdfButtons } from './JobPdfButtons'
import { ConfirmDialog, euroClass, GhostButton, Modal } from '../ui'

function DealRows({ deal }: { deal: PhoneDeal }) {
  const t = useT()
  return (
    <dl className="space-y-1.5 text-sm">
      <Row label={t('deal.buy')} value={euro(deal.inkoop)} />
      <Row label={t('deal.parts')} value={euro(deal.onderdelen)} />
      <Row label={t('deal.fees')} value={euro(deal.platform)} />
      <Row label={t('deal.ship')} value={euro(deal.verzending)} />
      <Row label={t('deal.cost')} value={euro(deal.kosten)} strong />
      <Row label={t('deal.sale')} value={euro(deal.omzet)} />
      <Row
        label={t('deal.pnl')}
        value={euro(deal.winst)}
        tone={euroClass(deal.winst)}
        strong
      />
    </dl>
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

function PartsList({ parts }: { parts: Repair[] }) {
  const t = useT()
  if (parts.length === 0) {
    return <p className="text-sm text-stone-500">{t('deal.noParts')}</p>
  }
  return (
    <ul className="divide-y divide-white/8">
      {parts.map((r) => (
        <li key={r.id} className="py-2">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-stone-100">{partLabel(r.name)}</p>
              <p className="text-xs text-stone-500">
                {t(`status.repair.${r.status}`)}
                {r.supplier ? ` · ${r.supplier}` : ''}
                {r.fromStockId ? ` · ${t('deal.fromStock')}` : ''}
                {r.date ? ` · ${niceDate(r.date)}` : ''}
              </p>
              {r.notes && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-stone-400">{r.notes}</p>
              )}
            </div>
            <span className="money shrink-0 font-mono text-sm text-stone-300">{euro(r.cost)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function PhoneDealBreakdown({
  phone,
  draft,
}: {
  phone: Phone
  draft?: { salePrice: number; platformFee: number; shippingCost: number }
}) {
  const t = useT()
  const deal = phoneDeal(phone, draft)
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('deal.profitOn')}</p>
      <div className="mt-2">
        <DealRows deal={deal} />
      </div>
    </div>
  )
}

export function PhoneDealModal({
  phone,
  onClose,
  onEditSale,
}: {
  phone: Phone
  onClose: () => void
  onEditSale?: () => void
}) {
  const t = useT()
  const { deletePhone, voidSale } = useStore()
  const navigate = useNavigate()
  const deal = phoneDeal(phone)
  const via = phone.salePlatform ? platformName(phone.salePlatform) : null
  const sold = phone.status === 'verkocht'
  const [ask, setAsk] = useState<'delete' | 'void' | null>(null)

  return (
    <>
    <Modal title={t('deal.phoneTitle', { name: phoneTitle(phone.brand, phone.model) })} onClose={onClose} wide>
      <p className="font-mono text-[11px] text-amber-500/80">{ticketLabel(phone.ticketNr)}</p>
      {phone.customerName ? (
        <p className="mt-1 truncate text-sm text-stone-300">{t('pdet.customer', { name: phone.customerName })}</p>
      ) : null}
      <p className="mt-1 text-sm text-stone-300">
        {sold ? (via ? t('deal.soldVia', { name: via }) : t('deal.sold')) : t('deal.notSold')}
        {phone.saleDate ? ` · ${niceDate(phone.saleDate)}` : ''}
      </p>
      {sold && (
        <>
          <p className="mt-3 break-words text-xs text-stone-500">
            {t('deal.math', {
              sale: euro(deal.omzet),
              buy: euro(deal.inkoop),
              parts: euro(deal.onderdelen),
              fees: euro(deal.platform),
              ship: euro(deal.verzending),
            })}
          </p>
          <p className={`money mt-1 font-mono text-lg ${euroClass(deal.winst)}`}>
            {deal.winst >= 0 ? t('sale.profit') : t('sale.loss')} {euro(deal.winst)}
          </p>
        </>
      )}

      <div className="mt-4">
        <DealRows deal={deal} />
      </div>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('deal.parts')}</p>
        <div className="mt-1">
          <PartsList parts={phone.repairs} />
        </div>
      </div>

      <div className="mt-4">
        <WorkNotesView
          damage={phone.damage}
          todo={phone.todo}
          workDone={phone.workDone}
          notes={phone.notes}
          showEmpty
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {sold && onEditSale && (
          <GhostButton type="button" onClick={onEditSale}>
            {t('pdet.editSale')}
          </GhostButton>
        )}
        {sold && (
          <GhostButton type="button" onClick={() => setAsk('void')}>
            {t('pdet.voidSale')}
          </GhostButton>
        )}
        <Link to={`/toestel/${phone.id}/bewerken`}>
          <GhostButton type="button">{t('common.edit')}</GhostButton>
        </Link>
        <GhostButton
          type="button"
          className="text-rose-300"
          onClick={() => setAsk('delete')}
        >
          {t('common.delete')}
        </GhostButton>
        <GhostButton type="button" onClick={onClose}>
          {t('deal.close')}
        </GhostButton>
      </div>
    </Modal>
    {ask === 'void' && (
      <ConfirmDialog
        title={t('pdet.voidTitle')}
        body={t('pdet.voidBody')}
        confirmLabel={t('pdet.voidOk')}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          voidSale(phone.id)
          setAsk(null)
        }}
      />
    )}
    {ask === 'delete' && (
      <ConfirmDialog
        title={t('phone.deleteTitle')}
        body={t('deal.phoneDelBody')}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          deletePhone(phone.id)
          onClose()
          navigate('/boekhouding')
        }}
      />
    )}
    </>
  )
}

export function JobDealModal({
  job,
  onClose,
}: {
  job: RepairJob
  onClose: () => void
}) {
  const t = useT()
  const { deleteJob } = useStore()
  const navigate = useNavigate()
  const revenue = jobRevenue(job)
  const partsCost = jobPartsCost(job)
  const margin = jobMargin(job)
  const [askDelete, setAskDelete] = useState(false)

  return (
    <>
    <Modal title={t('deal.jobTitle', { name: job.customerName })} onClose={onClose} wide>
      <p className="font-mono text-[11px] text-amber-500/80">{jobTicketLabel(job.ticketNr)}</p>
      <p className="mt-1 text-sm text-stone-300">
        {t(`status.kind.${job.kind}`)} · {phoneTitle(job.brand, job.model)}
      </p>
      <p className={`mt-2 font-mono text-lg ${euroClass(margin)}`}>
        {margin >= 0 ? t('sale.profit') : t('sale.loss')} {euro(margin)}
      </p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <Row label={t('deal.charge')} value={euro(job.chargeParts)} />
        <Row label={t('deal.labor')} value={euro(job.laborCharge)} />
        <Row label={t('deal.pays')} value={euro(revenue)} strong />
        <Row label={t('deal.yourParts')} value={euro(partsCost)} />
        <Row
          label={t('deal.pnl')}
          value={euro(margin)}
          tone={euroClass(margin)}
          strong
        />
      </dl>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('deal.parts')}</p>
        <div className="mt-1">
          <PartsList parts={job.parts ?? []} />
        </div>
      </div>

      <div className="mt-4">
        <WorkNotesView
          damage={job.damage}
          todo={job.todo}
          workDone={job.workDone}
          notes={job.notes}
          showEmpty
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <JobPdfButtons job={job} />
        <Link to={`/reparatie/${job.id}/bewerken`}>
          <GhostButton type="button">{t('common.edit')}</GhostButton>
        </Link>
        <GhostButton
          type="button"
          className="text-rose-300"
          onClick={() => setAskDelete(true)}
        >
          {t('common.delete')}
        </GhostButton>
        <GhostButton type="button" onClick={onClose}>
          {t('deal.close')}
        </GhostButton>
      </div>
    </Modal>
    {askDelete && (
      <ConfirmDialog
        title={t('jdet.deleteTitle')}
        body={t('jdet.deleteBody')}
        onClose={() => setAskDelete(false)}
        onConfirm={() => {
          deleteJob(job.id)
          onClose()
          navigate('/boekhouding')
        }}
      />
    )}
    </>
  )
}
