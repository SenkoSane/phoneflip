import { useState } from 'react'
import { useT } from '../i18n'
import { phoneDeal } from '../lib/calc'
import { euro, platformName } from '../lib/format'
import { today } from '../lib/id'
import { useStore } from '../store'
import type { Phone, Platform } from '../types'
import { PLATFORMS } from '../types'
import { PhoneDealBreakdown } from './PhoneDeal'
import { EuroInput, Field, FormActions, Modal, Select, TextInput, euroClass, onSubmit } from '../ui'

export function SaleModal({
  phone,
  onClose,
}: {
  phone: Phone
  onClose: () => void
}) {
  const t = useT()
  const { recordSale } = useStore()
  const live = (phone.listings ?? []).filter((l) => l.active)
  const listed = live[0]
  const editing = phone.status === 'verkocht'
  const [salePlatform, setSalePlatform] = useState<Platform | ''>(
    phone.salePlatform ?? listed?.platform ?? '',
  )
  const [salePrice, setSalePrice] = useState(
    phone.salePrice ?? listed?.askingPrice ?? 0,
  )
  const [saleDate, setSaleDate] = useState(phone.saleDate ?? today())
  const [platformFee, setPlatformFee] = useState(phone.platformFee)
  const [shippingCost, setShippingCost] = useState(phone.shippingCost)
  const [customerName, setCustomerName] = useState(phone.customerName ?? '')

  const draft = { salePrice, platformFee, shippingCost }
  const deal = phoneDeal(phone, draft)
  const name = `${phone.brand} ${phone.model}`.trim()

  return (
    <Modal
      title={editing ? t('sale.edit', { name }) : t('sale.new', { name })}
      onClose={onClose}
    >
      <form
        onSubmit={onSubmit(() => {
          if (!salePlatform) return
          recordSale(phone.id, {
            salePrice,
            saleDate,
            salePlatform,
            platformFee,
            shippingCost,
            customerName: customerName.trim(),
          })
          onClose()
        })}
      >
        <Field label={t('sale.via')}>
          <Select
            required
            value={salePlatform}
            onChange={(e) => {
              const next = e.target.value as Platform | ''
              setSalePlatform(next)
              const match = live.find((l) => l.platform === next)
              if (match && phone.status !== 'verkocht') setSalePrice(match.askingPrice)
            }}
          >
            <option value="" disabled>
              {t('sale.choose')}
            </option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformName(p)}
                {live.some((l) => l.platform === p) ? ` ${t('sale.live')}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="mt-3">
          <Field label={t('sale.cust')}>
            <TextInput
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t('sale.custPh')}
            />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={t('sale.price')}>
            <EuroInput value={salePrice} onValue={setSalePrice} required />
          </Field>
          <Field label={t('common.date')}>
            <TextInput
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </Field>
          <Field label={t('sale.fees')}>
            <EuroInput value={platformFee} onValue={setPlatformFee} />
          </Field>
          <Field label={t('sale.ship')}>
            <EuroInput value={shippingCost} onValue={setShippingCost} />
          </Field>
        </div>
        <div className="mt-4">
          <PhoneDealBreakdown phone={phone} draft={draft} />
          <p className={`mt-2 text-center font-mono text-sm ${euroClass(deal.winst)}`}>
            {deal.winst >= 0 ? t('sale.profit') : t('sale.loss')} {euro(deal.winst)}
          </p>
        </div>
        <FormActions onCancel={onClose} submitLabel={editing ? t('common.save') : t('sale.sold')} />
      </form>
    </Modal>
  )
}
