import { useState } from 'react'
import { useT } from '../i18n'
import { jobMargin, jobPartsCost, jobRevenue } from '../lib/calc'
import { euro } from '../lib/format'
import { today } from '../lib/id'
import { useStore } from '../store'
import type { RepairJob } from '../types'
import { EuroInput, Field, FormActions, Modal, euroClass, onSubmit, TextInput } from '../ui'

export function needsJobSettle(job: RepairJob) {
  return jobRevenue(job) <= 0
}

export function PickupModal({
  job,
  onClose,
}: {
  job: RepairJob
  onClose: () => void
}) {
  const t = useT()
  const { updateJob } = useStore()
  const partsCost = jobPartsCost(job)
  const [laborCharge, setLaborCharge] = useState(job.laborCharge)
  const [chargeParts, setChargeParts] = useState(
    job.chargeParts > 0 ? job.chargeParts : partsCost,
  )
  const [paidAt, setPaidAt] = useState(today())

  const draft = { ...job, laborCharge, chargeParts }
  const revenue = jobRevenue(draft)
  const margin = jobMargin(draft)

  return (
    <Modal title={t('pick.title', { name: job.customerName || t('nav.repairs') })} onClose={onClose}>
      <p className="text-sm text-stone-400">{t('pick.hint')}</p>
      <form
        className="mt-4"
        onSubmit={onSubmit(() => {
          updateJob({
            ...job,
            laborCharge,
            chargeParts,
            status: 'opgehaald',
            paidAt,
            dateDone: job.dateDone || paidAt,
          })
          onClose()
        })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('jdet.labor')}>
            <EuroInput value={laborCharge} onValue={setLaborCharge} />
          </Field>
          <Field label={t('jdet.charge')}>
            <EuroInput value={chargeParts} onValue={setChargeParts} />
          </Field>
          <Field label={t('pick.date')}>
            <TextInput type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 space-y-1 text-center">
          <p className="font-mono text-sm text-stone-300">{t('pick.pays', { amount: euro(revenue) })}</p>
          <p className={`money font-mono text-sm ${euroClass(margin)}`}>
            {margin >= 0 ? t('sale.profit') : t('sale.loss')} {euro(margin)}
          </p>
        </div>
        <FormActions onCancel={onClose} submitLabel={t('pick.ok')} />
      </form>
    </Modal>
  )
}
