import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { RepairCoach } from '../components/BuyCoach'
import { BackLink, useSmartBack } from '../components/BackLink'
import { IntakeFields, MarkReadyModal } from '../components/WorkNotes'
import type { DefectId } from '../data/marktwaarde'
import { type HardSkip, parseListingText } from '../lib/dealCoach'
import { useT } from '../i18n'
import { useStore, blankJobFields } from '../store'
import {
  BRANDS,
  JOB_KINDS,
  JOB_STATUSES,
  type JobKind,
  type JobStatus,
  type RepairJob,
} from '../types'
import { euro } from '../lib/format'
import { EuroInput, Field, GhostButton, PrimaryButton, Select, TextArea, TextInput, onSubmit } from '../ui'

export function JobForm() {
  const t = useT()
  const { id } = useParams()
  const { data, addJob, updateJob } = useStore()
  const existing = id ? data.repairJobs.find((j) => j.id === id) : undefined
  const fallback = existing ? `/reparatie/${existing.id}` : '/reparaties'
  const goBack = useSmartBack(fallback)
  const [readyOpen, setReadyOpen] = useState(false)
  const [form, setForm] = useState(() =>
    existing
      ? {
          customerName: existing.customerName,
          kind: existing.kind,
          brand: existing.brand,
          model: existing.model,
          notes: existing.notes,
          damage: existing.damage ?? '',
          todo: existing.todo ?? '',
          workDone: existing.workDone ?? '',
          status: existing.status,
          laborCharge: existing.laborCharge,
          chargeParts: existing.chargeParts,
          dateIn: existing.dateIn,
          dateDone: existing.dateDone,
          paidAt: existing.paidAt,
        }
      : blankJobFields(),
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
        <BackLink fallback="/reparaties" />
        <p className="text-stone-400">{t('jform.notFound')}</p>
      </div>
    )
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function save() {
    if (existing) {
      const next: RepairJob = { ...existing, ...form }
      updateJob(next)
      goBack()
      return
    }
    addJob({ ...blankJobFields(), ...form })
    goBack()
  }

  const klantTotaal = form.chargeParts + form.laborCharge

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink fallback={fallback} />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {existing ? t('jform.edit') : t('jform.new')}
        </p>
        <h2 className="font-display mt-1 break-words text-2xl text-stone-50 sm:text-3xl">
          {existing ? existing.customerName : t('jform.titleNew')}
        </h2>
        <p className="mt-1 text-sm text-stone-400">{t('jform.intro')}</p>
      </div>

      <form onSubmit={onSubmit(save)} className="space-y-6 rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('jform.name')}>
            <TextInput
              required
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              placeholder={t('jform.namePh')}
            />
          </Field>
          <Field label={t('jform.who')}>
            <Select
              value={form.kind}
              onChange={(e) => set('kind', e.target.value as JobKind)}
            >
              {JOB_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`job.${k}`)}
                </option>
              ))}
            </Select>
          </Field>
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
              placeholder={t('jform.modelPh')}
            />
          </Field>
          <Field label={t('jform.dateIn')}>
            <TextInput
              type="date"
              value={form.dateIn}
              onChange={(e) => set('dateIn', e.target.value)}
            />
          </Field>
          <Field label={t('jform.status')}>
            <Select
              value={form.status}
              onChange={(e) => {
                const s = e.target.value as JobStatus
                if (s === 'klaar') {
                  setReadyOpen(true)
                  return
                }
                set('status', s)
              }}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`job.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <RepairCoach
          model={form.model}
          defects={defects}
          skips={skips}
          kind={form.kind}
          onDefects={setDefects}
          onSkips={setSkips}
          onLabor={(n) => set('laborCharge', n)}
        />

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-stone-200">{t('jform.pays')}</p>
          <p className="mt-1 text-xs text-stone-500">{t('jform.paysHint')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={t('jform.charge')}>
              <EuroInput
                value={form.chargeParts}
                onValue={(n) => set('chargeParts', n)}
              />
            </Field>
            <Field label={t('jform.labor')}>
              <EuroInput
                value={form.laborCharge}
                onValue={(n) => set('laborCharge', n)}
              />
            </Field>
          </div>
          <p className="mt-3 font-mono text-sm text-stone-300">
            {t('jform.paysAmt', { amount: euro(klantTotaal) })}
          </p>
        </div>

        <IntakeFields
          damage={form.damage ?? ''}
          todo={form.todo ?? ''}
          onChange={({ damage, todo }) => setForm((f) => ({ ...f, damage, todo }))}
        />

        <Field label={t('common.notes')}>
          <TextArea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder={t('jform.notesPh')}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GhostButton type="button" className="w-full sm:w-auto" onClick={goBack}>
            {t('common.cancel')}
          </GhostButton>
          <PrimaryButton type="submit" className="w-full sm:w-auto">
            {existing ? t('common.save') : t('jform.create')}
          </PrimaryButton>
        </div>
      </form>
      {readyOpen && (
        <MarkReadyModal
          title={t('jobs.readyTitle', { name: form.customerName || t('jobs.repairFallback') })}
          damage={form.damage ?? ''}
          todo={form.todo ?? ''}
          workDone={form.workDone ?? ''}
          parts={existing?.parts ?? []}
          onClose={() => setReadyOpen(false)}
          onConfirm={(workDone) => {
            setForm((f) => ({ ...f, workDone, status: 'klaar' }))
          }}
        />
      )}
    </div>
  )
}
