import { useState } from 'react'
import { useT } from '../i18n'
import { SupplierBanner } from '../components/SupplierLinks'
import { euro, euroFlow, flowClass, niceDate } from '../lib/format'
import { today, uid } from '../lib/id'
import { useStore } from '../store'
import { EQUIPMENT_CATEGORIES, type EquipmentItem, type EquipmentWish } from '../types'
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

export function Equipment() {
  const t = useT()
  const { data, upsertEquipment, setEquipmentStock, deleteEquipment, upsertWish, deleteWish, buyWish } =
    useStore()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<EquipmentItem | null>(null)
  const [wishOpen, setWishOpen] = useState(false)
  const [editWish, setEditWish] = useState<EquipmentWish | null>(null)
  const [buying, setBuying] = useState<EquipmentWish | null>(null)
  const [pending, setPending] = useState<
    | { type: 'equipment'; id: string; name: string }
    | { type: 'wish'; id: string }
    | null
  >(null)

  const owned = data.equipment.filter((e) => e.stockStatus !== 'op')
  const restock = data.equipment.filter((e) => e.stockStatus === 'op')
  const total = data.equipment.filter((e) => !e.alreadyExpensed).reduce((s, e) => s + e.cost, 0)
  const wishTotal = data.equipmentWishlist.reduce((s, w) => s + w.estimatedPrice, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
            {t('eq.kicker')}
          </p>
          <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('eq.title')}</h2>
          <p className="mt-1 text-sm text-stone-400">{t('eq.intro')}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <GhostButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              setEditWish(null)
              setWishOpen(true)
            }}
          >
            {t('eq.addWish')}
          </GhostButton>
          <PrimaryButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              setEdit(null)
              setOpen(true)
            }}
          >
            {t('eq.add')}
          </PrimaryButton>
        </div>
      </div>

      <SupplierBanner hintKey="sup.toolsHint" />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-sm font-medium text-stone-200">{t('eq.owned')}</h3>
          <p className={`money shrink-0 font-mono text-xs ${flowClass('uit', total)}`}>
            {t('eq.inResult', { amount: euroFlow(total, 'uit') })}
          </p>
        </div>
        {owned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-stone-500">
            {t('eq.emptyOwned')}
          </p>
        ) : (
          <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
            {[...owned]
              .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
              .map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 bg-white/2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
                >
                  <button
                    type="button"
                    className="min-h-11 min-w-0 flex-1 text-left"
                    onClick={() => {
                      setEdit(item)
                      setOpen(true)
                    }}
                  >
                    <p className="truncate text-sm text-stone-100">{item.name}</p>
                    <p className="truncate text-xs text-stone-500">
                      {t(`eq.cat.${item.category}`)} · {niceDate(item.purchaseDate)}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <span className={`money shrink-0 font-mono text-sm ${flowClass('uit', item.cost)}`}>
                      {item.alreadyExpensed ? euro(item.cost) : euroFlow(item.cost, 'uit')}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={t('eq.restockAria', { name: item.name })}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/10 text-lg text-stone-300 hover:bg-white/10 hover:text-amber-300"
                        onClick={() => setEquipmentStock(item.id, 'op')}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label={t('eq.delAria', { name: item.name })}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg text-rose-300 hover:bg-white/10"
                        onClick={() => setPending({ type: 'equipment', id: item.id, name: item.name })}
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
        <h3 className="text-sm font-medium text-stone-200">{t('eq.need')}</h3>
        {restock.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-stone-500">
            {t('eq.emptyNeed')}
          </p>
        ) : (
          <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
            {restock.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 bg-white/2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <button
                  type="button"
                  className="min-h-11 min-w-0 flex-1 text-left"
                  onClick={() => {
                    setEdit(item)
                    setOpen(true)
                  }}
                >
                  <p className="truncate text-sm text-stone-100">{item.name}</p>
                  <p className="truncate text-xs text-stone-500">{t(`eq.cat.${item.category}`)} · {t('eq.out')}</p>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className={`money shrink-0 font-mono text-sm ${flowClass('uit', item.cost)}`}>
                    {item.alreadyExpensed ? euro(item.cost) : euroFlow(item.cost, 'uit')}
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-lg bg-amber-500 px-3 text-sm font-semibold text-stone-950"
                    onClick={() => setEquipmentStock(item.id, 'op_voorraad')}
                  >
                    {t('eq.ownedBtn')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('eq.delAria', { name: item.name })}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg text-rose-300 hover:bg-white/10"
                    onClick={() => setPending({ type: 'equipment', id: item.id, name: item.name })}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-sm font-medium text-stone-200">{t('eq.wish')}</h3>
          <p className="font-mono text-xs text-stone-500">
            {t('eq.wishMeta', { amount: euro(wishTotal) })}
          </p>
        </div>
        {data.equipmentWishlist.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-stone-500">
            {t('eq.emptyWish')}
          </p>
        ) : (
          <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8">
            {[...data.equipmentWishlist]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-white/2 px-4 py-3"
                >
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => {
                      setEditWish(item)
                      setWishOpen(true)
                    }}
                  >
                    <p className="truncate text-sm text-stone-100">{item.name}</p>
                    <p className="truncate text-xs text-stone-500">
                      {t('eq.toBuy')} · {t(`eq.cat.${item.category}`)}
                      {item.url ? ` · ${shopLabel(item.url)}` : ''}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="money font-mono text-sm text-stone-300">
                      {euro(item.estimatedPrice)}
                    </span>
                    {item.url && isHttpUrl(item.url) && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400"
                      >
                        {t('eq.shop')}
                      </a>
                    )}
                    <PrimaryButton
                      type="button"
                      className="px-2 py-1 text-xs"
                      onClick={() => setBuying(item)}
                    >
                      {t('eq.bought')}
                    </PrimaryButton>
                    <GhostButton
                      type="button"
                      className="px-2 py-1 text-xs text-rose-300"
                      onClick={() => setPending({ type: 'wish', id: item.id })}
                    >
                      ×
                    </GhostButton>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {open && (
        <EquipmentModal
          initial={edit}
          onClose={() => setOpen(false)}
          onSave={(item) => {
            upsertEquipment(item)
            setOpen(false)
          }}
        />
      )}
      {wishOpen && (
        <WishModal
          initial={editWish}
          onClose={() => setWishOpen(false)}
          onSave={(item) => {
            upsertWish(item)
            setWishOpen(false)
          }}
        />
      )}
      {buying && (
        <BuyWishModal
          wish={buying}
          onClose={() => setBuying(null)}
          onSave={(purchase) => {
            buyWish(buying.id, purchase)
            setBuying(null)
          }}
        />
      )}
      {pending?.type === 'equipment' && (
        <ConfirmDialog
          title={t('eq.delTitle')}
          body={t('eq.delBody', { name: pending.name })}
          onClose={() => setPending(null)}
          onConfirm={() => {
            deleteEquipment(pending.id)
            setPending(null)
          }}
        />
      )}
      {pending?.type === 'wish' && (
        <ConfirmDialog
          title={t('eq.wishDelTitle')}
          body={t('eq.wishDelBody')}
          onClose={() => setPending(null)}
          onConfirm={() => {
            deleteWish(pending.id)
            setPending(null)
          }}
        />
      )}
    </div>
  )
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function shopLabel(value: string): string {
  if (!isHttpUrl(value)) return value
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}

function withEquipmentCost(
  prev: EquipmentItem | null,
  next: {
    id: string
    name: string
    cost: number
    purchaseDate: string
    category: string
    notes: string
  },
): EquipmentItem {
  const purchases = prev?.purchases ?? []
  let nextPurchases
  if (purchases.length <= 1) {
    nextPurchases = [
      {
        id: purchases[0]?.id ?? uid(),
        cost: next.cost,
        date: next.purchaseDate,
        qty: purchases[0]?.qty ?? 1,
        alreadyExpensed: purchases[0]?.alreadyExpensed ?? prev?.alreadyExpensed,
        notes: purchases[0]?.notes,
      },
    ]
  } else {
    const others = purchases.slice(0, -1).reduce((sum, p) => sum + p.cost, 0)
    const last = purchases[purchases.length - 1]
    nextPurchases = [
      ...purchases.slice(0, -1),
      { ...last, cost: Math.max(0, next.cost - others) },
    ]
  }
  return {
    ...prev,
    ...next,
    alreadyExpensed: prev?.alreadyExpensed,
    stockStatus: prev?.stockStatus ?? 'op_voorraad',
    purchases: nextPurchases,
    updatedAt: new Date().toISOString(),
  }
}

function EquipmentModal({
  initial,
  onClose,
  onSave,
}: {
  initial: EquipmentItem | null
  onClose: () => void
  onSave: (item: EquipmentItem) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [cost, setCost] = useState(initial?.cost ?? 0)
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? today())
  const [category, setCategory] = useState(initial?.category ?? 'Gereedschap')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const t = useT()

  return (
    <Modal title={initial ? t('eq.edit') : t('eq.addItem')} onClose={onClose}>
      <form
        onSubmit={onSubmit(() => {
          const savedName = name.trim()
          if (!savedName) return
          onSave(
            withEquipmentCost(initial, {
              id: initial?.id ?? uid(),
              name: savedName,
              cost,
              purchaseDate,
              category,
              notes,
            }),
          )
        })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('eq.name')}>
            <TextInput
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('eq.namePh')}
            />
          </Field>
          <Field label={t('eq.price')}>
            <EuroInput value={cost} onValue={setCost} />
          </Field>
          <Field label={t('eq.cat')}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`eq.cat.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.date')}>
            <TextInput
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
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

function WishModal({
  initial,
  onClose,
  onSave,
}: {
  initial: EquipmentWish | null
  onClose: () => void
  onSave: (item: EquipmentWish) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [estimatedPrice, setEstimatedPrice] = useState(initial?.estimatedPrice ?? 0)
  const [category, setCategory] = useState(initial?.category ?? 'Gereedschap')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const t = useT()

  return (
    <Modal title={initial ? t('eq.editWish') : t('eq.onWish')} onClose={onClose}>
      <form
        onSubmit={onSubmit(() =>
          onSave({
            id: initial?.id ?? uid(),
            name,
            estimatedPrice,
            category,
            notes,
            url,
            status: 'te_kopen',
            createdAt: initial?.createdAt ?? new Date().toISOString(),
          }),
        )}
      >
        <p className="mb-3 text-xs text-stone-500">{t('eq.wishHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('eq.name')}>
            <TextInput
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('eq.wishNamePh')}
            />
          </Field>
          <Field label={t('eq.est')}>
            <EuroInput value={estimatedPrice} onValue={setEstimatedPrice} />
          </Field>
          <Field label={t('eq.cat')}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`eq.cat.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('eq.shopLink')}>
            <TextInput
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('eq.shopPh')}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={t('common.notes')}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <FormActions onCancel={onClose} submitLabel={t('eq.keep')} />
      </form>
    </Modal>
  )
}

function BuyWishModal({
  wish,
  onClose,
  onSave,
}: {
  wish: EquipmentWish
  onClose: () => void
  onSave: (purchase: { cost: number; purchaseDate: string }) => void
}) {
  const [cost, setCost] = useState(wish.estimatedPrice)
  const [purchaseDate, setPurchaseDate] = useState(today())
  const t = useT()

  return (
    <Modal title={t('eq.bought')} onClose={onClose}>
      <form onSubmit={onSubmit(() => onSave({ cost, purchaseDate }))}>
        <p className="mb-3 text-sm text-stone-300">{wish.name}</p>
        <p className="mb-3 text-xs text-stone-500">{t('eq.boughtHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('eq.paid')}>
            <EuroInput value={cost} onValue={setCost} />
          </Field>
          <Field label={t('eq.buyDate')}>
            <TextInput
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </Field>
        </div>
        <FormActions onCancel={onClose} submitLabel={t('eq.toOwned')} />
      </form>
    </Modal>
  )
}
