import { useState } from 'react'
import { useT } from '../i18n'
import {
  REPAIR_STATUSES,
  type Repair,
  type RepairStatus,
} from '../types'
import { EuroInput, Field, FormActions, Modal, Select, TextInput, onSubmit } from '../ui'

export function PartEditModal({
  repair,
  onClose,
  onSave,
}: {
  repair: Repair
  onClose: () => void
  onSave: (next: Repair) => void
}) {
  const t = useT()
  const [name, setName] = useState(repair.name)
  const [cost, setCost] = useState(repair.cost)
  const [supplier, setSupplier] = useState(repair.supplier)
  const [status, setStatus] = useState<RepairStatus>(repair.status)
  const [date, setDate] = useState(repair.date)

  return (
    <Modal title={t('mat.edit')} onClose={onClose}>
      <form
        onSubmit={onSubmit(() => {
          const savedName = name.trim()
          if (!savedName) return
          onSave({
            ...repair,
            name: savedName,
            cost,
            supplier: supplier.trim(),
            status,
            date,
          })
        })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('eq.name')}>
            <TextInput
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={t('eq.price')}>
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
        <FormActions onCancel={onClose} cancelLabel={t('common.back')} submitLabel={t('common.save')} />
      </form>
    </Modal>
  )
}
