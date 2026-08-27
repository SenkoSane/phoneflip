import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useT } from '../i18n'
import { phoneCost, phoneMargin, plannedPartsTotal, repairTotal, saleNet } from '../lib/calc'
import { condLabel, euro, niceDate, partLabel, phoneTitle, platformName } from '../lib/format'
import { ticketLabel } from '../lib/id'
import { useStore } from '../store'
import {
  PHONE_STATUSES,
  resolveLeftoverDest,
  type Repair,
} from '../types'
import { StatusBadge } from '../components/StatusBadge'
import { SaleModal } from '../components/SaleModal'
import { ListForSaleModal } from '../components/ListForSaleModal'
import { AgeBadge } from '../components/AgeBadge'
import { BackLink } from '../components/BackLink'
import { ListingAdButton } from '../components/ListingAdButton'
import { isStalePhone, phoneAgeDays } from '../lib/dealCoach'
import { defectsFromNotes } from '../data/leveranciers'
import { SupplierStrip } from '../components/SupplierLinks'
import { LeftoverSheet, MateriaalSheet, leftoverLoggedLabel, repairSourceLabel } from '../components/MateriaalSheet'
import { PartEditModal } from '../components/PartEditModal'
import { MarkReadyModal, WorkNotesView } from '../components/WorkNotes'
import { ConfirmDialog, GhostButton, euroClass } from '../ui'

export function PhoneDetail() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, setStatus, setRepairs, setListings, deletePhone, voidSale, updatePhone, returnLeftover } =
    useStore()
  const phone = data.phones.find((p) => p.id === id)
  const [materiaalOpen, setMateriaalOpen] = useState(false)
  const [leftover, setLeftover] = useState<Repair | null>(null)
  const [editPart, setEditPart] = useState<Repair | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [saleOpen, setSaleOpen] = useState(false)
  const [readyOpen, setReadyOpen] = useState(false)
  const [askDeleteTicket, setAskDeleteTicket] = useState(false)
  const [askVoidSale, setAskVoidSale] = useState(false)
  const [askDeletePartId, setAskDeletePartId] = useState<string | null>(null)
  const [askDeleteListingId, setAskDeleteListingId] = useState<string | null>(null)

  if (!phone) {
    return (
      <div className="space-y-3">
        <BackLink fallback="/tickets" />
        <p className="text-stone-400">{t('pform.notFound')}</p>
      </div>
    )
  }

  const parts = repairTotal(phone)
  const planned = plannedPartsTotal(phone.repairs)
  const kosten = phoneCost(phone)
  const marge = phoneMargin(phone)

  return (
    <div className="space-y-6">
      <BackLink fallback="/tickets" />
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-amber-500/80">{ticketLabel(phone.ticketNr)}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="font-display min-w-0 break-words text-2xl text-stone-50 sm:text-3xl">
              {phoneTitle(phone.brand, phone.model)}
            </h2>
            {phone.status !== 'verkocht' ? (
              <AgeBadge days={phoneAgeDays(phone)} stale={isStalePhone(phone)} />
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm text-stone-300">
            {phone.customerName
              ? t('pdet.customer', { name: phone.customerName })
              : t('pdet.noCustomer')}
          </p>
          <p className="mt-1 text-sm text-stone-400">
            {[phone.storage, phone.color, condLabel(phone.condition)].filter(Boolean).join(' · ')}
            {phone.status === 'verkocht' && phone.salePlatform
              ? ` · ${t('pdet.soldVia', { name: platformName(phone.salePlatform) })}`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/toestel/${phone.id}/bewerken`}>
            <GhostButton type="button">{t('common.edit')}</GhostButton>
          </Link>
          <ListingAdButton phone={phone} />
          {phone.status === 'te_koop' ? (
            <button
              type="button"
              onClick={() => setSaleOpen(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-emerald-400"
            >
              {t('pdet.sold')}
            </button>
          ) : phone.status === 'klaar' ? (
            <Link
              to={`/toestel/${phone.id}/verkopen`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-violet-400"
            >
              {t('pdet.list')}
            </Link>
          ) : phone.status === 'verkocht' ? (
            <>
              <button
                type="button"
                onClick={() => setSaleOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm text-stone-200 hover:bg-white/10"
              >
                {t('pdet.editSale')}
              </button>
              <GhostButton type="button" onClick={() => setAskVoidSale(true)}>
                {t('pdet.voidSale')}
              </GhostButton>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-stone-200">{t('pdet.status')}</h3>
              <StatusBadge status={phone.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              {PHONE_STATUSES.filter((s) => s !== 'verkocht').map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s === 'klaar') {
                      setReadyOpen(true)
                      return
                    }
                    if (s === 'te_koop' && phone.status !== 'te_koop') {
                      navigate(`/toestel/${phone.id}/verkopen`)
                      return
                    }
                    setStatus(phone.id, s)
                  }}
                  className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs ring-1 ${
                    phone.status === s
                      ? 'bg-white/10 text-white ring-white/20'
                      : 'text-stone-400 ring-white/10 hover:bg-white/5'
                  }`}
                >
                  {t(`phone.${s}`)}
                </button>
              ))}
            </div>
            {phone.imei && (
              <p className="mt-4 break-all font-mono text-xs text-stone-500">IMEI {phone.imei}</p>
            )}
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-medium text-stone-200">{t('pdet.work')}</h3>
            <div className="mt-3">
              <WorkNotesView
                damage={phone.damage ?? ''}
                todo={phone.todo ?? ''}
                workDone={phone.workDone ?? ''}
                notes={phone.notes}
                showEmpty
              />
            </div>
          </section>

          <SupplierStrip
            model={phone.model}
            defects={defectsFromNotes({
              todo: phone.todo,
              damage: phone.damage,
              parts: phone.repairs,
            })}
          />

          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-stone-200">{t('pdet.parts')}</h3>
              <button
                type="button"
                onClick={() => setMateriaalOpen(true)}
                className="min-h-11 text-sm text-amber-400"
              >
                {t('pdet.assign')}
              </button>
            </div>
            {(phone.repairs ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">{t('pdet.noParts')}</p>
            ) : (
              <ul className="divide-y divide-white/8">
                {(phone.repairs ?? []).map((r) => (
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
                              returnLeftover({ kind: 'phone', id: phone.id }, r.id, dest)
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
            <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-stone-200">{t('pdet.listings')}</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/toestel/${phone.id}/verkopen`}
                  className="inline-flex min-h-11 items-center px-2 text-sm text-stone-300 hover:text-stone-100"
                >
                  {t('sell.open')}
                </Link>
                <button
                  type="button"
                  onClick={() => setListOpen(true)}
                  className="inline-flex min-h-11 items-center px-2 text-sm text-amber-400"
                >
                  {t('pdet.addList')}
                </button>
              </div>
            </div>
            {(phone.listings ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">{t('pdet.noList')}</p>
            ) : (
              <ul className="space-y-2">
                {(phone.listings ?? []).map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-stone-100">
                        {platformName(l.platform)} · {euro(l.askingPrice)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {l.active ? t('pdet.live') : t('pdet.offline')} · {niceDate(l.listedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.url && (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-400"
                        >
                          {t('common.open')}
                        </a>
                      )}
                      <button
                        type="button"
                        className="text-xs text-stone-400"
                        onClick={() =>
                          setListings(
                            phone.id,
                            (phone.listings ?? []).map((x) =>
                              x.id === l.id ? { ...x, active: !x.active } : x,
                            ),
                          )
                        }
                      >
                        {l.active ? t('pdet.offline') : t('pdet.live')}
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-500 hover:text-rose-400"
                        onClick={() => setAskDeleteListingId(l.id)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-medium text-stone-200">{t('pdet.costs')}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={t('pdet.buy')} value={euro(phone.purchasePrice)} />
              <Row label={t('pdet.partsPaid')} value={euro(parts)} />
              {planned > 0 ? (
                <Row label={t('pdet.planned')} value={euro(planned)} />
              ) : null}
              <Row label={t('pdet.inDevice')} value={euro(kosten)} strong />
              {phone.salePrice !== null && (
                <>
                  <Row label={t('pdet.sale')} value={euro(phone.salePrice)} />
                  <Row label={t('pdet.platform')} value={euro(phone.platformFee)} />
                  <Row label={t('pdet.ship')} value={euro(phone.shippingCost)} />
                  <Row label={t('pdet.net')} value={euro(saleNet(phone))} />
                  <Row
                    label={t('pdet.profit')}
                    value={euro(marge ?? 0)}
                    tone={euroClass(marge ?? 0)}
                    strong
                  />
                </>
              )}
            </dl>
            <p className="mt-4 text-xs text-stone-500">
              {t('pdet.boughtOn', { date: niceDate(phone.purchaseDate) })}
              {phone.purchaseSource ? ` ${t('books.via', { name: phone.purchaseSource })}` : ''}
            </p>
            {phone.saleDate && (
              <p className="text-xs text-stone-500">
                {t('pdet.soldOn', { date: niceDate(phone.saleDate) })}
                {phone.salePlatform ? ` ${t('books.via', { name: platformName(phone.salePlatform) })}` : ''}
              </p>
            )}
          </div>

          <GhostButton
            type="button"
            className="w-full text-rose-300"
            onClick={() => setAskDeleteTicket(true)}
          >
            {t('pdet.delete')}
          </GhostButton>
        </aside>
      </div>

      {materiaalOpen && (
        <MateriaalSheet
          target={{ kind: 'phone', id: phone.id }}
          onClose={() => setMateriaalOpen(false)}
          onBought={(repair) => {
            setRepairs(phone.id, [...(phone.repairs ?? []), repair])
            if (phone.status === 'kast') setStatus(phone.id, 'bezig')
          }}
        />
      )}
      {editPart && (
        <PartEditModal
          repair={editPart}
          onClose={() => setEditPart(null)}
          onSave={(next) => {
            setRepairs(
              phone.id,
              (phone.repairs ?? []).map((x) => (x.id === next.id ? next : x)),
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
            returnLeftover({ kind: 'phone', id: phone.id }, leftover.id, dest)
            setLeftover(null)
          }}
        />
      )}
      {listOpen && (
        <ListForSaleModal phone={phone} onClose={() => setListOpen(false)} />
      )}
      {saleOpen && <SaleModal phone={phone} onClose={() => setSaleOpen(false)} />}
      {readyOpen && (
        <MarkReadyModal
          title={t('tickets.readyTitle', { name: phoneTitle(phone.brand, phone.model) })}
          damage={phone.damage ?? ''}
          todo={phone.todo ?? ''}
          workDone={phone.workDone ?? ''}
          parts={phone.repairs ?? []}
          onClose={() => setReadyOpen(false)}
          onConfirm={(workDone) => {
            updatePhone({ ...phone, workDone })
            setStatus(phone.id, 'klaar')
          }}
        />
      )}
      {askDeleteTicket && (
        <ConfirmDialog
          title={t('phone.deleteTitle')}
          body={t('phone.deleteBody')}
          onClose={() => setAskDeleteTicket(false)}
          onConfirm={() => {
            deletePhone(phone.id)
            navigate('/tickets')
          }}
        />
      )}
      {askVoidSale && (
        <ConfirmDialog
          title={t('pdet.voidTitle')}
          body={t('pdet.voidBody')}
          confirmLabel={t('pdet.voidOk')}
          onClose={() => setAskVoidSale(false)}
          onConfirm={() => {
            voidSale(phone.id)
            setAskVoidSale(false)
          }}
        />
      )}
      {askDeletePartId && (
        <ConfirmDialog
          title={t('pdet.partDelTitle')}
          body={t('pdet.partDelBody')}
          onClose={() => setAskDeletePartId(null)}
          onConfirm={() => {
            setRepairs(
              phone.id,
              (phone.repairs ?? []).filter((x) => x.id !== askDeletePartId),
            )
            setAskDeletePartId(null)
          }}
        />
      )}
      {askDeleteListingId && (
        <ConfirmDialog
          title={t('pdet.listDelTitle')}
          body={t('pdet.listDelBody')}
          onClose={() => setAskDeleteListingId(null)}
          onConfirm={() => {
            setListings(
              phone.id,
              (phone.listings ?? []).filter((x) => x.id !== askDeleteListingId),
            )
            setAskDeleteListingId(null)
          }}
        />
      )}
    </div>
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
