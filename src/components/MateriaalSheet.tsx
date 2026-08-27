import { useState } from 'react'
import { tr, useT } from '../i18n'
import { euro, euroFlow, flowClass, partLabel } from '../lib/format'
import { today, uid } from '../lib/id'
import { useStore } from '../store'
import {
  REPAIR_STATUSES,
  type EquipmentItem,
  type Repair,
  type RepairStatus,
  type StockPart,
} from '../types'
import { PartWatFields, resolvePartName } from './PartWatFields'
import {
  EuroInput,
  Field,
  FormActions,
  GhostButton,
  Modal,
  Select,
  TextInput,
  onSubmit,
} from '../ui'

type Tab = 'voorraad' | 'apparatuur' | 'nieuw'

export function repairSourceLabel(r: Repair): string {
  if (r.fromEquipmentId) return tr('mat.fromEq')
  if (r.fromStockId) return tr('mat.fromStock')
  return ''
}

export function leftoverLoggedLabel(r: Repair): string {
  if (r.leftoverDest === 'stock') return tr('mat.alsoStock')
  if (r.leftoverDest === 'equipment') return tr('mat.alsoEq')
  return ''
}

export function LeftoverSheet({
  name,
  onClose,
  onPick,
}: {
  name: string
  onClose: () => void
  onPick: (dest: 'stock' | 'equipment') => void
}) {
  const t = useT()
  return (
    <Modal title={t('mat.left')} onClose={onClose}>
      <p className="text-sm text-stone-300">{t('mat.leftBody', { name })}</p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-stone-950"
          onClick={() => onPick('stock')}
        >
          {t('mat.toStock')}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-stone-100"
          onClick={() => onPick('equipment')}
        >
          {t('mat.toEq')}
        </button>
        <GhostButton type="button" className="w-full" onClick={onClose}>
          {t('common.back')}
        </GhostButton>
      </div>
    </Modal>
  )
}

export function MateriaalSheet({
  target,
  onClose,
  onBought,
}: {
  target: { kind: 'phone' | 'job'; id: string }
  onClose: () => void
  onBought: (repair: Repair) => void
}) {
  const t = useT()
  const { data, assignStock, assignEquipment } = useStore()
  const [tab, setTab] = useState<Tab>('voorraad')
  const stock = data.stockParts.filter((s) => s.status !== 'gebruikt' && s.qty > 0)
  const tabs = [
    ['voorraad', t('mat.tabStock')],
    ['apparatuur', t('mat.tabEq')],
    ['nieuw', t('mat.tabNew')],
  ] as const

  return (
    <Modal title={t('mat.assign')} onClose={onClose} wide>
      <p className="mb-3 text-xs text-stone-500">{t('mat.assignHint')}</p>
      <div className="mb-4 flex flex-wrap rounded-lg border border-white/10 bg-black/20 p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`min-h-11 flex-1 rounded-md px-3 text-xs ${
              tab === id ? 'bg-white/10 text-white' : 'text-stone-400'
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'voorraad' && (
        <StockTab
          items={stock}
          onPick={(id) => {
            assignStock(id, target)
            onClose()
          }}
        />
      )}
      {tab === 'apparatuur' && (
        <EquipmentTab
          items={data.equipment.filter((e) => e.stockStatus !== 'op')}
          onPick={(id) => {
            assignEquipment(id, target)
            onClose()
          }}
        />
      )}
      {tab === 'nieuw' && (
        <NewBuyForm
          costLabel={target.kind === 'job' ? t('mat.yourCost') : t('mat.cost')}
          onCancel={onClose}
          onSave={(repair) => {
            onBought(repair)
            onClose()
          }}
        />
      )}
    </Modal>
  )
}

function StockTab({
  items,
  onPick,
}: {
  items: StockPart[]
  onPick: (id: string) => void
}) {
  const t = useT()
  if (items.length === 0) {
    return <p className="text-sm text-stone-400">{t('mat.emptyStock')}</p>
  }
  return (
    <ul className="max-h-80 space-y-1 overflow-y-auto">
      {items.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
            onClick={() => onPick(s.id)}
          >
            <span className="min-w-0">
              <span className="text-stone-100">{partLabel(s.name)}</span>
              <span className="ml-2 text-xs text-stone-500">
                {s.qty}× · {t(`status.stock.${s.status}`)}
                {s.alreadyExpensed ? ` · ${t('mat.already')}` : ''}
              </span>
            </span>
            <span
              className={`money shrink-0 font-mono ${s.alreadyExpensed ? 'text-stone-500' : flowClass('uit', s.cost)}`}
            >
              {s.alreadyExpensed ? euro(s.cost) : euroFlow(s.cost, 'uit')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function EquipmentTab({
  items,
  onPick,
}: {
  items: EquipmentItem[]
  onPick: (id: string) => void
}) {
  const t = useT()
  if (items.length === 0) {
    return <p className="text-sm text-stone-400">{t('mat.emptyEq')}</p>
  }
  return (
    <ul className="max-h-80 space-y-1 overflow-y-auto">
      {items.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
            onClick={() => onPick(e.id)}
          >
            <span className="min-w-0">
              <span className="text-stone-100">{e.name}</span>
              <span className="ml-2 text-xs text-stone-500">
                {t(`eq.cat.${e.category}`)} · {t('mat.reuse')}
              </span>
            </span>
            <span className="money shrink-0 font-mono text-stone-400">{euro(0)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function NewBuyForm({
  costLabel,
  onCancel,
  onSave,
}: {
  costLabel: string
  onCancel: () => void
  onSave: (r: Repair) => void
}) {
  const t = useT()
  const [name, setName] = useState('Scherm')
  const [customName, setCustomName] = useState('')
  const [cost, setCost] = useState(0)
  const [supplier, setSupplier] = useState('')
  const [status, setStatus] = useState<RepairStatus>('besteld')
  const [date, setDate] = useState(today())

  return (
    <form
      onSubmit={onSubmit(() => {
        const savedName = resolvePartName(name, customName)
        if (!savedName) return
        onSave({
          id: uid(),
          name: savedName,
          cost,
          supplier,
          status,
          date,
          notes: '',
        })
      })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <PartWatFields
          selectValue={name}
          customName={customName}
          onSelect={setName}
          onCustomName={setCustomName}
        />
        <Field label={costLabel}>
          <EuroInput value={cost} onValue={setCost} />
        </Field>
        <Field label={t('mat.supplier')}>
          <TextInput
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder={t('mat.supplierPh')}
          />
        </Field>
        <Field label={t('mat.status')}>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as RepairStatus)}
          >
            {REPAIR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`repair.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('common.date')}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} submitLabel={t('mat.add')} />
    </form>
  )
}
