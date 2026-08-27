import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { euro, euroFlow, flowClass, niceDate, partLabel, phoneTitle } from '../lib/format'
import { jobTicketLabel, ticketLabel, today, uid } from '../lib/id'
import { useStore } from '../store'
import {
  PART_OTHER,
  STOCK_STATUSES,
  type Repair,
  type RepairJob,
  type Phone,
  type StockPart,
  type StockStatus,
} from '../types'
import {
  ConfirmDialog,
  EuroInput,
  Field,
  FormActions,
  GhostButton,
  Modal,
  PrimaryButton,
  Select,
  TextArea,
  TextInput,
  onSubmit,
} from '../ui'
import { PartWatFields, partSelectValue, resolvePartName } from '../components/PartWatFields'
import { PartEditModal } from '../components/PartEditModal'
import { SupplierBanner } from '../components/SupplierLinks'

export function Parts() {
  const t = useT()
  const { data, upsertStock, deleteStock, assignStock, setRepairs, setJobParts } = useStore()
  const [stockOpen, setStockOpen] = useState(false)
  const [editStock, setEditStock] = useState<StockPart | null>(null)
  const [assigning, setAssigning] = useState<StockPart | null>(null)
  const [pendingStockId, setPendingStockId] = useState<string | null>(null)
  const [editNested, setEditNested] = useState<{
    kind: 'phone' | 'job'
    parentId: string
    repair: Repair
  } | null>(null)

  const nested = [
    ...data.phones.flatMap((p) =>
      (p.repairs ?? []).map((r) => ({
        id: r.id,
        kind: 'phone' as const,
        parentId: p.id,
        repair: r,
        name: r.name,
        cost: r.cost,
        date: r.date,
        supplier: r.supplier,
        statusLabel: r.fromStockId
          ? t('parts.fromStock', { status: t(`repair.${r.status}`) })
          : t(`repair.${r.status}`),
        href: `/toestel/${p.id}`,
        title: phoneTitle(p.brand, p.model),
        ticket: ticketLabel(p.ticketNr),
        fromStock: Boolean(r.fromStockId),
      })),
    ),
    ...data.repairJobs.flatMap((j) =>
      (j.parts ?? []).map((r) => ({
        id: r.id,
        kind: 'job' as const,
        parentId: j.id,
        repair: r,
        name: r.name,
        cost: r.cost,
        date: r.date,
        supplier: r.supplier,
        statusLabel: r.fromStockId
          ? t('parts.fromStock', { status: t(`repair.${r.status}`) })
          : t(`repair.${r.status}`),
        href: `/reparatie/${j.id}`,
        title: j.customerName,
        ticket: jobTicketLabel(j.ticketNr),
        fromStock: Boolean(r.fromStockId),
      })),
    ),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const available = data.stockParts.filter((s) => s.status !== 'gebruikt' && s.qty > 0)
  const stockTotal = data.stockParts.reduce((s, p) => s + p.cost, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('parts.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('parts.title')}</h2>
          <p className="mt-1 text-sm text-stone-400">{t('parts.intro')}</p>
        </div>
        <PrimaryButton
          type="button"
          className="w-full sm:w-auto"
          onClick={() => {
            setEditStock(null)
            setStockOpen(true)
          }}
        >
          {t('parts.add')}
        </PrimaryButton>
      </div>

      <SupplierBanner hintKey="sup.shopBanner" />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-medium text-stone-200">{t('parts.stock')}</h3>
          <p className={`money font-mono text-xs ${flowClass('uit', stockTotal)}`}>
            {t('parts.stockMeta', { n: String(available.length), amount: euroFlow(stockTotal, 'uit') })}
          </p>
        </div>
        {data.stockParts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-stone-500">
            {t('parts.emptyStock')}
          </p>
        ) : (
          <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
            {[...data.stockParts]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((item) => (
                <li key={item.id} className="bg-white/2 px-3 py-3 sm:px-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="min-h-11 text-left text-sm text-stone-100 hover:text-amber-300"
                        onClick={() => {
                          setEditStock(item)
                          setStockOpen(true)
                        }}
                      >
                        {partLabel(item.name)}
                      </button>
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {t(`stock.${item.status}`)}
                        {` · ${item.qty}×`}
                        {item.supplier ? ` · ${item.supplier}` : ''}
                        {` · ${niceDate(item.date)}`}
                      </p>
                      <AssignedHint item={item} phones={data.phones} jobs={data.repairJobs} />
                      {item.notes && (
                        <p className="mt-1 truncate text-xs text-stone-500">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <p className={`money font-mono text-sm ${flowClass('uit', item.cost)}`}>
                        {euroFlow(item.cost, 'uit')}
                      </p>
                      {item.status !== 'gebruikt' && item.qty > 0 && (
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center text-sm text-amber-400"
                          onClick={() => setAssigning(item)}
                        >
                          {t('parts.assign')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center text-stone-500 hover:text-rose-400"
                        onClick={() => setPendingStockId(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-200">{t('parts.onTickets')}</h3>
        {nested.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-stone-500">
            {t('parts.emptyNested')}
          </p>
        ) : (
          <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
            {nested.map((row) => (
              <li key={row.id} className="bg-white/2 px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="min-h-11 text-left text-sm text-stone-100 hover:text-amber-300"
                      onClick={() =>
                        setEditNested({ kind: row.kind, parentId: row.parentId, repair: row.repair })
                      }
                    >
                      {partLabel(row.name)}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      <Link to={row.href} className="text-amber-400 hover:underline">
                        {row.title}
                      </Link>
                      {` · ${row.ticket} · ${row.statusLabel}`}
                      {row.supplier ? ` · ${row.supplier}` : ''}
                      {` · ${niceDate(row.date)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {row.fromStock ? (
                      <p className="money font-mono text-sm text-stone-400">{euro(row.cost)}</p>
                    ) : (
                      <p className={`money font-mono text-sm ${flowClass('uit', row.cost)}`}>
                        {euroFlow(row.cost, 'uit')}
                      </p>
                    )}
                    {row.fromStock && (
                      <p className="text-[10px] text-stone-500">{t('parts.already')}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editNested && (
        <PartEditModal
          repair={editNested.repair}
          onClose={() => setEditNested(null)}
          onSave={(next) => {
            if (editNested.kind === 'phone') {
              const phone = data.phones.find((p) => p.id === editNested.parentId)
              if (phone) {
                setRepairs(
                  phone.id,
                  (phone.repairs ?? []).map((x) => (x.id === next.id ? next : x)),
                )
              }
            } else {
              const job = data.repairJobs.find((j) => j.id === editNested.parentId)
              if (job) {
                setJobParts(
                  job.id,
                  (job.parts ?? []).map((x) => (x.id === next.id ? next : x)),
                )
              }
            }
            setEditNested(null)
          }}
        />
      )}
      {stockOpen && (
        <StockModal
          initial={editStock}
          onClose={() => setStockOpen(false)}
          onSave={(item) => {
            upsertStock(item)
            setStockOpen(false)
          }}
        />
      )}
      {assigning && (
        <AssignTargetModal
          phones={data.phones}
          jobs={data.repairJobs}
          onClose={() => setAssigning(null)}
          onAssign={(target) => {
            assignStock(assigning.id, target)
            setAssigning(null)
          }}
        />
      )}
      {pendingStockId && (
        <ConfirmDialog
          title={t('parts.delTitle')}
          body={t('parts.delBody')}
          onClose={() => setPendingStockId(null)}
          onConfirm={() => {
            deleteStock(pendingStockId)
            setPendingStockId(null)
          }}
        />
      )}
    </div>
  )
}

function AssignedHint({
  item,
  phones,
  jobs,
}: {
  item: StockPart
  phones: Phone[]
  jobs: RepairJob[]
}) {
  if (!item.assignedId || !item.assignedKind) return null
  if (item.assignedKind === 'phone') {
    const phone = phones.find((p) => p.id === item.assignedId)
    if (!phone) return null
    return (
      <p className="text-[10px] text-stone-500">
        {ticketLabel(phone.ticketNr)} · {phoneTitle(phone.brand, phone.model)}
      </p>
    )
  }
  const job = jobs.find((j) => j.id === item.assignedId)
  if (!job) return null
  return (
    <p className="text-[10px] text-stone-500">
      {jobTicketLabel(job.ticketNr)} · {job.customerName}
    </p>
  )
}

function StockModal({
  initial,
  onClose,
  onSave,
}: {
  initial: StockPart | null
  onClose: () => void
  onSave: (item: StockPart) => void
}) {
  const [name, setName] = useState(() => partSelectValue(initial?.name ?? ''))
  const [customName, setCustomName] = useState(() => {
    const saved = initial?.name ?? ''
    return partSelectValue(saved) === PART_OTHER ? saved : ''
  })
  const [cost, setCost] = useState(initial?.cost ?? 0)
  const [supplier, setSupplier] = useState(initial?.supplier ?? '')
  const [date, setDate] = useState(initial?.date ?? today())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [qty, setQty] = useState(initial?.qty ?? 1)
  const [status, setStatus] = useState<StockStatus>(initial?.status ?? 'op_voorraad')
  const t = useT()

  return (
    <Modal title={initial ? t('parts.edit') : t('parts.new')} onClose={onClose}>
      <form
        onSubmit={onSubmit(() => {
          const savedName = resolvePartName(name, customName)
          if (!savedName) return
          onSave({
            id: initial?.id ?? uid(),
            name: savedName,
            cost,
            supplier,
            date,
            notes,
            qty: initial?.status === 'gebruikt' ? Math.max(0, qty) : Math.max(1, qty || 1),
            status: initial?.status === 'gebruikt' ? 'gebruikt' : status,
            assignedKind: initial?.assignedKind ?? null,
            assignedId: initial?.assignedId ?? null,
            alreadyExpensed: initial?.alreadyExpensed,
          })
        })}
      >
        <p className="mb-3 text-xs text-stone-500">{t('parts.hint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PartWatFields
            selectValue={name}
            customName={customName}
            onSelect={setName}
            onCustomName={setCustomName}
          />
          <Field label={t('parts.totalPrice')}>
            <EuroInput value={cost} onValue={setCost} />
          </Field>
          <Field label={t('parts.qty')}>
            <TextInput
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label={t('parts.status')}>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StockStatus)}
              disabled={initial?.status === 'gebruikt'}
            >
              {STOCK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`stock.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('parts.supplier')}>
            <TextInput
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={t('parts.supplierPh')}
            />
          </Field>
          <Field label={t('common.date')}>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={t('common.notes')}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <FormActions onCancel={onClose} cancelLabel={t('common.back')} submitLabel={t('common.save')} />
      </form>
    </Modal>
  )
}

function AssignTargetModal({
  phones,
  jobs,
  onClose,
  onAssign,
}: {
  phones: Phone[]
  jobs: RepairJob[]
  onClose: () => void
  onAssign: (target: { kind: 'phone' | 'job'; id: string }) => void
}) {
  const t = useT()
  const openPhones = phones.filter((p) => p.status !== 'verkocht')
  const openJobs = jobs.filter((j) => j.status !== 'opgehaald')

  return (
    <Modal title={t('parts.assignTitle')} onClose={onClose}>
      <p className="mb-3 text-xs text-stone-500">{t('parts.assignHint')}</p>
      {openPhones.length === 0 && openJobs.length === 0 ? (
        <p className="text-sm text-stone-400">{t('parts.noOpen')}</p>
      ) : (
        <div className="max-h-80 space-y-4 overflow-y-auto">
          {openPhones.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-stone-500">
                {t('parts.flips')}
              </p>
              <ul className="space-y-1">
                {openPhones.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => onAssign({ kind: 'phone', id: p.id })}
                    >
                      <span className="text-stone-100">{phoneTitle(p.brand, p.model)}</span>
                      <span className="ml-2 font-mono text-[11px] text-stone-500">
                        {ticketLabel(p.ticketNr)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {openJobs.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-stone-500">
                {t('parts.jobs')}
              </p>
              <ul className="space-y-1">
                {openJobs.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={() => onAssign({ kind: 'job', id: j.id })}
                    >
                      <span className="text-stone-100">{j.customerName}</span>
                      <span className="ml-2 text-stone-500">
                        {phoneTitle(j.brand, j.model)}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-stone-500">
                        {jobTicketLabel(j.ticketNr)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <GhostButton type="button" onClick={onClose}>
          {t('common.cancel')}
        </GhostButton>
      </div>
    </Modal>
  )
}

export function PickStockModal({
  parts,
  onClose,
  onPick,
}: {
  parts: StockPart[]
  onClose: () => void
  onPick: (id: string) => void
}) {
  const t = useT()
  const available = parts.filter((s) => s.status !== 'gebruikt' && s.qty > 0)

  return (
    <Modal title={t('parts.pick')} onClose={onClose}>
      {available.length === 0 ? (
        <p className="text-sm text-stone-400">{t('parts.noLoose')}</p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {available.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                onClick={() => onPick(s.id)}
              >
                <span className="min-w-0">
                  <span className="text-stone-100">{partLabel(s.name)}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {s.qty}× · {t(`stock.${s.status}`)}
                  </span>
                </span>
                <span className={`money shrink-0 font-mono ${flowClass('uit', s.cost)}`}>{euroFlow(s.cost, 'uit')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <GhostButton type="button" onClick={onClose}>
          {t('common.cancel')}
        </GhostButton>
      </div>
    </Modal>
  )
}
