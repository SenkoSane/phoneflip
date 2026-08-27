import { useState } from 'react'
import { useT } from '../i18n'
import { phoneCost, repairTotal } from '../lib/calc'
import { suggestedAskForPhone } from '../lib/dealCoach'
import { condLabel, euro, euroSigned, phoneTitle, platformName } from '../lib/format'
import { ticketLabel, today, uid } from '../lib/id'
import { useStore } from '../store'
import {
  PLATFORMS,
  type Phone,
  type Platform,
} from '../types'
import { EuroInput, Field, FormActions, Modal, TextInput, euroClass, onSubmit } from '../ui'
import { PartsReadonly, WorkNotesView } from './WorkNotes'

type Row = {
  on: boolean
  askingPrice: number
  url: string
}

function emptyRows(phone: Phone, fallback: number): Record<Platform, Row> {
  const rows = {} as Record<Platform, Row>
  const listings = phone.listings ?? []
  const anyLive = listings.some((l) => l.active)
  for (const p of PLATFORMS) {
    const existing = listings.find((l) => l.active && l.platform === p)
    rows[p] = {
      on: Boolean(existing) || (!anyLive && p === 'marktplaats'),
      askingPrice: existing?.askingPrice ?? fallback,
      url: existing?.url ?? '',
    }
  }
  return rows
}

export function ListForSaleModal({
  phone,
  onClose,
  onListed,
  suggestedAsk,
}: {
  phone: Phone
  onClose: () => void
  onListed?: () => void
  suggestedAsk?: number
}) {
  const t = useT()
  const { listPhone } = useStore()
  const kosten = phoneCost(phone)
  const parts = repairTotal(phone)
  const market = suggestedAskForPhone(phone)
  const seed =
    (phone.listings ?? []).find((l) => l.active)?.askingPrice ??
    suggestedAsk ??
    market.ask
  const [shared, setShared] = useState(seed)
  const [rows, setRows] = useState(() => emptyRows(phone, seed))

  const selected = PLATFORMS.filter((p) => rows[p].on)
  const ask = selected.length
    ? Math.max(...selected.map((p) => rows[p].askingPrice))
    : shared
  const marge = ask - kosten

  function setRow(platform: Platform, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }))
  }

  function setSharedPrice(n: number) {
    setShared(n)
    setRows((prev) => {
      const next = { ...prev }
      for (const p of PLATFORMS) {
        if (next[p].on) next[p] = { ...next[p], askingPrice: n }
      }
      return next
    })
  }

  return (
    <Modal title={t('list.title', { name: phoneTitle(phone.brand, phone.model) })} onClose={onClose} wide>
      <p className="font-mono text-[11px] text-amber-500/80">{ticketLabel(phone.ticketNr)}</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <OverviewRow
          label={t('list.device')}
          value={`${phoneTitle(phone.brand, phone.model)}${phone.storage ? ` · ${phone.storage}` : ''}${phone.color ? ` · ${phone.color}` : ''}`}
        />
        {phone.customerName ? <OverviewRow label={t('common.customer')} value={phone.customerName} /> : null}
        {phone.imei ? <OverviewRow label={t('nav.imei')} value={phone.imei} mono /> : null}
        {phone.condition ? <OverviewRow label={t('list.condition')} value={condLabel(phone.condition)} /> : null}
        <OverviewRow label={t('list.buy')} value={euro(phone.purchasePrice)} money />
      </dl>

      <div className="mt-4 space-y-4">
        <WorkNotesView
          damage={phone.damage}
          todo={phone.todo}
          workDone={phone.workDone}
          notes={phone.notes}
          showEmpty
        />
        <div>
          <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('list.parts')}</p>
          <div className="mt-2">
            <PartsReadonly parts={phone.repairs} />
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <OverviewRow label={t('list.parts')} value={euro(parts)} money />
        <OverviewRow label={t('list.inDevice')} value={euro(kosten)} money strong />
      </dl>

      <form
        className="mt-5"
        onSubmit={onSubmit(() => {
          const listings = selected
            .filter((p) => rows[p].askingPrice > 0)
            .map((p) => ({
              id: uid(),
              platform: p,
              askingPrice: rows[p].askingPrice,
              url: rows[p].url,
              listedAt: today(),
              active: true,
            }))
          if (listings.length === 0) return
          listPhone(phone.id, listings)
          onListed?.()
          onClose()
        })}
      >
        <Field label={t('list.ask')}>
          <EuroInput value={shared} onValue={setSharedPrice} />
        </Field>
        <p className="mt-1 text-[11px] text-stone-500">
          {market.fromMarket
            ? t('coach.askHintMarket', { ask: euro(market.ask), floor: euro(market.floor) })
            : t('coach.askHintCost', { ask: euro(market.ask), floor: euro(market.floor) })}
        </p>
        {ask < market.floor ? (
          <p className="mt-2 text-sm text-rose-300">{t('coach.askBelowFloor')}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-stone-500">{t('list.askHint')}</p>
        <ul className="mt-3 space-y-2">
          {PLATFORMS.map((p) => {
            const row = rows[p]
            return (
              <li key={p} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={row.on}
                    onChange={(e) => {
                      const on = e.target.checked
                      setRow(p, {
                        on,
                        askingPrice: on && row.askingPrice <= 0 ? shared : row.askingPrice,
                      })
                    }}
                    className="size-4 accent-amber-500"
                  />
                  <span className="text-sm font-medium text-stone-100">{platformName(p)}</span>
                </label>
                {row.on && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Field label={t('list.askOne')}>
                      <EuroInput
                        value={row.askingPrice}
                        onValue={(n) => setRow(p, { askingPrice: n })}
                      />
                    </Field>
                    <Field label={t('list.link')}>
                      <TextInput
                        value={row.url}
                        onChange={(e) => setRow(p, { url: e.target.value })}
                        placeholder="https://…"
                      />
                    </Field>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className={`money mt-4 text-center font-mono text-sm ${euroClass(marge)}`}>
          {t('list.margin', { amount: euroSigned(marge) })}
          <span className="block text-[11px] font-sans font-normal text-stone-500">
            {t('list.marginHint')}
          </span>
        </p>
        <FormActions
          onCancel={onClose}
          submitLabel={
            selected.length > 1 ? t('list.submitN', { n: selected.length }) : t('list.submit')
          }
        />
      </form>
    </Modal>
  )
}

function OverviewRow({
  label,
  value,
  strong,
  money,
  mono,
}: {
  label: string
  value: string
  strong?: boolean
  money?: boolean
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-stone-500">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right ${money ? 'money' : ''} ${
          mono ? 'font-mono text-xs' : ''
        } ${strong ? 'text-stone-100' : 'text-stone-300'}`}
      >
        {value}
      </dd>
    </div>
  )
}
