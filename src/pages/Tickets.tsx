import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { AgeBadge, LockedCash } from '../components/AgeBadge'
import { isStalePhone, phoneAgeDays } from '../lib/dealCoach'
import { phoneCost, repairTotal } from '../lib/calc'
import { euroFlow, flowClass, phoneTitle, platformName } from '../lib/format'
import { ticketLabel } from '../lib/id'
import { useStore } from '../store'
import { type Phone, type PhoneStatus } from '../types'
import { COLUMN_ACCENT } from '../components/StatusBadge'
import { BoardEmpty, StatusBoard } from '../components/StatusBoard'
import { SaleModal } from '../components/SaleModal'
import {
  IntakePreview,
  MarkReadyModal,
} from '../components/WorkNotes'

const BOARD: PhoneStatus[] = ['kast', 'bezig', 'klaar', 'te_koop']

const MARKET_SOURCE =
  /marktplaats|vinted|facebook|whatsapp|instagram|ali|refurbed|bol\.com|amazon|mediamarkt|coolblue/i

function personSource(source: string) {
  const s = source.trim()
  return s.length > 0 && !MARKET_SOURCE.test(s)
}

export function Tickets() {
  const t = useT()
  const navigate = useNavigate()
  const { data, setStatus, updatePhone } = useStore()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<PhoneStatus>('kast')
  const [saleFor, setSaleFor] = useState<Phone | null>(null)
  const [readyFor, setReadyFor] = useState<Phone | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  const query = q.trim().toLowerCase()
  const filtered = data.phones.filter((p) => {
    if (p.status === 'verkocht') return false
    if (!query) return true
    const hay =
      `${p.brand} ${p.model} ${p.imei} ${p.color} ${p.customerName} ${p.purchaseSource} ${p.damage} ${p.todo} ${p.workDone} ${ticketLabel(p.ticketNr)}`.toLowerCase()
    return hay.includes(query)
  })

  const columns = BOARD.map((status) => ({
    id: status,
    label: t(`phone.${status}`),
    count: filtered.filter((p) => p.status === status).length,
    accent: COLUMN_ACCENT[status],
  }))

  function dropOn(status: PhoneStatus) {
    if (!dragging) return
    if (status === 'verkocht') {
      setDragging(null)
      return
    }
    if (status === 'te_koop') {
      const phone = data.phones.find((p) => p.id === dragging)
      setDragging(null)
      if (phone && phone.status !== 'te_koop') navigate(`/toestel/${phone.id}/verkopen`)
      return
    }
    if (status === 'klaar') {
      const phone = data.phones.find((p) => p.id === dragging)
      setDragging(null)
      if (phone) setReadyFor(phone)
      return
    }
    setStatus(dragging, status)
    setDragging(null)
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('tickets.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('tickets.title')}</h2>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('tickets.search')}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-base outline-none focus:border-amber-500/40 sm:max-w-56 sm:flex-none sm:text-sm"
          />
          <Link
            to="/toestel/nieuw"
            className="inline-flex min-h-11 items-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950"
          >
            {t('tickets.add')}
          </Link>
        </div>
      </div>

      <StatusBoard
        columns={columns}
        activeId={tab}
        onActiveId={setTab}
        dragging={!!dragging}
        onDrop={dropOn}
        renderColumn={(status, { draggable }) => {
          const phones = filtered.filter((p) => p.status === status)
          if (phones.length === 0) return <BoardEmpty />
          return phones.map((phone) => (
            <TicketCard
              key={phone.id}
              phone={phone}
              draggable={draggable}
              onDragStart={() => setDragging(phone.id)}
              onDragEnd={() => setDragging(null)}
              onSold={() => setSaleFor(phone)}
              onUnlist={() => setStatus(phone.id, 'klaar')}
              onList={() => navigate(`/toestel/${phone.id}/verkopen`)}
              onReady={() => setReadyFor(phone)}
            />
          ))
        }}
      />

      <p className="text-xs text-stone-500">
        {t('tickets.soldIn')}{' '}
        <Link to="/boekhouding" className="text-amber-400/90 underline-offset-2 hover:underline">
          {t('nav.books')}
        </Link>
        .
      </p>

      {saleFor && <SaleModal phone={saleFor} onClose={() => setSaleFor(null)} />}
      {readyFor && (
        <MarkReadyModal
          title={t('tickets.readyTitle', { name: phoneTitle(readyFor.brand, readyFor.model) })}
          damage={readyFor.damage ?? ''}
          todo={readyFor.todo ?? ''}
          workDone={readyFor.workDone ?? ''}
          parts={readyFor.repairs ?? []}
          onClose={() => setReadyFor(null)}
          onConfirm={(workDone) => {
            updatePhone({ ...readyFor, workDone })
            setStatus(readyFor.id, 'klaar')
          }}
        />
      )}
    </div>
  )
}

function TicketCard({
  phone,
  draggable,
  onDragStart,
  onDragEnd,
  onSold,
  onUnlist,
  onList,
  onReady,
}: {
  phone: Phone
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onSold: () => void
  onUnlist: () => void
  onList: () => void
  onReady: () => void
}) {
  const t = useT()
  const parts = repairTotal(phone)
  const listed = (phone.listings ?? []).filter((l) => l.active)
  const inkoopPersoon = personSource(phone.purchaseSource)
  const forSale = phone.status === 'te_koop'

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`ticket-card rounded-xl border bg-stone-900/80 p-3 ${
        isStalePhone(phone) ? 'border-rose-500/35' : 'border-white/10'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <Link to={`/toestel/${phone.id}`} className="min-w-0">
          <p className="font-mono text-[10px] text-amber-500/80">{ticketLabel(phone.ticketNr)}</p>
          <h4 className="truncate text-sm font-medium text-stone-100">
            {phoneTitle(phone.brand, phone.model)}
          </h4>
          {phone.customerName ? (
            <p className="truncate text-xs text-stone-300">
              {t('tickets.customer', { name: phone.customerName })}
            </p>
          ) : null}
          <p className="truncate text-xs text-stone-500">
            {[phone.storage, phone.color].filter(Boolean).join(' · ') || '—'}
            {inkoopPersoon ? ` · ${t('tickets.from', { name: phone.purchaseSource })}` : ''}
          </p>
          <IntakePreview damage={phone.damage} todo={phone.todo} />
        </Link>
        <AgeBadge days={phoneAgeDays(phone)} stale={isStalePhone(phone)} />
      </div>
      <div className="mt-3 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">{t('tickets.costParts')}</p>
          <p className={`money font-mono text-sm ${flowClass('uit', phoneCost(phone))}`}>
            {euroFlow(phoneCost(phone), 'uit')}
          </p>
          <LockedCash amount={phoneCost(phone)} />
        </div>
        {parts > 0 && (
          <p className={`money shrink-0 text-[11px] ${flowClass('uit', parts)}`}>
            {t('tickets.partAmt', { amount: euroFlow(parts, 'uit') })}
          </p>
        )}
      </div>
      {listed.length > 0 && (
        <p className="mt-2 truncate text-[11px] text-violet-300">
          {t('tickets.online', { list: listed.map((l) => platformName(l.platform)).join(' · ') })}
        </p>
      )}
      {phone.status === 'klaar' && listed.length === 0 && (
        <p className="mt-2 text-[11px] text-sky-300">{t('tickets.readyUnlisted')}</p>
      )}
      {(phone.status === 'kast' || phone.status === 'bezig') && (
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
          {t('tickets.markReady')}
        </button>
      )}
      {forSale && (
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            draggable={false}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSold()
            }}
            className="min-h-11 w-full rounded-md bg-emerald-500 py-1.5 text-xs font-semibold text-stone-950 hover:bg-emerald-400"
          >
            {t('tickets.sold')}
          </button>
          <button
            type="button"
            draggable={false}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onList()
            }}
            className="min-h-11 w-full rounded-md border border-white/15 bg-white/5 py-1.5 text-xs font-medium text-stone-200 hover:bg-white/10"
          >
            {t('sell.open')}
          </button>
          <button
            type="button"
            draggable={false}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onUnlist()
            }}
            className="min-h-11 w-full rounded-md border border-white/15 bg-white/5 py-1.5 text-xs font-medium text-stone-200 hover:bg-white/10"
          >
            {t('tickets.unlist')}
          </button>
        </div>
      )}
      {phone.status === 'klaar' && (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onList()
          }}
          className="mt-3 min-h-11 w-full rounded-md border border-white/15 bg-white/5 py-1.5 text-xs font-medium text-stone-200 hover:bg-white/10"
        >
          {t('tickets.list')}
        </button>
      )}
    </article>
  )
}
