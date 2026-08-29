import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BuyCoach } from '../components/BuyCoach'
import { BackLink, useSmartBack } from '../components/BackLink'
import { IntakeFields, MarkReadyModal } from '../components/WorkNotes'
import type { DefectId } from '../data/marktwaarde'
import { type HardSkip, parseListingText } from '../lib/dealCoach'
import { useT } from '../i18n'
import { useStore, blankPhoneFields } from '../store'
import {
  BRANDS,
  CONDITIONS,
  PHONE_STATUSES,
  STORAGE_OPTIONS,
  type Phone,
  type PhoneStatus,
} from '../types'
import { EuroInput, Field, GhostButton, PrimaryButton, Select, TextArea, TextInput, onSubmit } from '../ui'

export function PhoneForm() {
  const t = useT()
  const { id } = useParams()
  const { data, addPhone, updatePhone } = useStore()
  const existing = id ? data.phones.find((p) => p.id === id) : undefined
  const fallback = existing ? `/toestel/${existing.id}` : '/tickets'
  const goBack = useSmartBack(fallback)
  const [readyOpen, setReadyOpen] = useState(false)
  const [form, setForm] = useState(() =>
    existing
      ? {
          brand: existing.brand,
          model: existing.model,
          storage: existing.storage,
          color: existing.color,
          imei: existing.imei,
          condition: existing.condition,
          notes: existing.notes,
          damage: existing.damage ?? '',
          todo: existing.todo ?? '',
          workDone: existing.workDone ?? '',
          purchasePrice: existing.purchasePrice,
          purchaseDate: existing.purchaseDate,
          purchaseSource: existing.purchaseSource,
          customerName: existing.customerName ?? '',
          status: existing.status,
        }
      : blankPhoneFields(),
  )
  const [defects, setDefects] = useState<DefectId[]>(
    () => parseListingText(`${existing?.damage ?? ''} ${existing?.todo ?? ''}`).defects,
  )
  const [skips, setSkips] = useState<HardSkip[]>(
    () => parseListingText(`${existing?.damage ?? ''} ${existing?.todo ?? ''}`).skips,
  )

  if (id && !existing) {
    return (
      <div className="space-y-3">
        <BackLink fallback="/tickets" />
        <p className="text-stone-400">{t('pform.notFound')}</p>
      </div>
    )
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function save() {
    if (existing) {
      const next: Phone = { ...existing, ...form }
      updatePhone(next)
      goBack()
      return
    }
    addPhone({
      ...blankPhoneFields(),
      ...form,
      salePrice: null,
      saleDate: null,
      salePlatform: null,
      platformFee: 0,
      shippingCost: 0,
    })
    goBack()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink fallback={fallback} />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {existing ? t('pform.edit') : t('pform.new')}
        </p>
        <h2 className="font-display mt-1 break-words text-2xl text-stone-50 sm:text-3xl">
          {existing ? `${existing.brand} ${existing.model}` : t('pform.titleNew')}
        </h2>
      </div>

      <form onSubmit={onSubmit(save)} className="space-y-6 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
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
              placeholder={t('pform.modelPh')}
            />
          </Field>
          <Field label={t('pform.storage')}>
            <Select value={form.storage} onChange={(e) => set('storage', e.target.value)}>
              <option value="">—</option>
              {STORAGE_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('pform.color')}>
            <TextInput value={form.color} onChange={(e) => set('color', e.target.value)} />
          </Field>
          <Field label={t('nav.imei')}>
            <TextInput value={form.imei} onChange={(e) => set('imei', e.target.value)} />
          </Field>
          <Field label={t('pform.condition')}>
            <Select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {t(`cond.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <BuyCoach
          model={form.model}
          storage={form.storage}
          defects={defects}
          skips={skips}
          offer={form.purchasePrice}
          onDefects={setDefects}
          onSkips={setSkips}
          onStorage={(s) => set('storage', s)}
          onApply={(draft) => {
            setForm((f) => ({
              ...f,
              brand: draft.brand || f.brand,
              model: draft.model || f.model,
              storage: draft.storage || f.storage,
              damage: draft.damage ?? f.damage,
              todo: draft.todo ?? f.todo,
              purchasePrice: draft.purchasePrice ?? f.purchasePrice,
            }))
            setDefects(draft.defects)
            setSkips(draft.skips)
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('pform.buyPrice')}>
            <EuroInput value={form.purchasePrice} onValue={(n) => set('purchasePrice', n)} />
          </Field>
          <Field label={t('pform.buyDate')}>
            <TextInput
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
            />
          </Field>
          <Field label={t('pform.buyVia')}>
            <TextInput
              value={form.purchaseSource}
              onChange={(e) => set('purchaseSource', e.target.value)}
              placeholder={t('pform.buyViaPh')}
            />
          </Field>
          <Field label={t('common.customer')}>
            <TextInput
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder={t('pform.custPh')}
            />
          </Field>
        </div>

        <Field label={t('pform.status')}>
          <Select
            value={form.status}
            onChange={(e) => {
              const s = e.target.value as PhoneStatus
              if (s === 'klaar') {
                setReadyOpen(true)
                return
              }
              set('status', s)
            }}
          >
            {PHONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`phone.${s}`)}
              </option>
            ))}
          </Select>
        </Field>

        <IntakeFields
          damage={form.damage ?? ''}
          todo={form.todo ?? ''}
          onChange={({ damage, todo }) => setForm((f) => ({ ...f, damage, todo }))}
        />

        <Field label={t('common.notes')}>
          <TextArea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('pform.notesPh')}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GhostButton type="button" className="w-full sm:w-auto" onClick={goBack}>
            {t('common.cancel')}
          </GhostButton>
          <PrimaryButton type="submit" className="w-full sm:w-auto">
            {existing ? t('common.save') : t('pform.create')}
          </PrimaryButton>
        </div>
      </form>
      {readyOpen && (
        <MarkReadyModal
          title={t('pform.readyTitle', {
            name: `${form.brand} ${form.model}`.trim() || t('common.device'),
          })}
          damage={form.damage ?? ''}
          todo={form.todo ?? ''}
          workDone={form.workDone ?? ''}
          parts={existing?.repairs ?? []}
          onClose={() => setReadyOpen(false)}
          onConfirm={(workDone) => {
            setForm((f) => ({ ...f, workDone, status: 'klaar' }))
          }}
        />
      )}
    </div>
  )
}
