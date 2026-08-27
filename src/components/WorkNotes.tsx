import { useState } from 'react'
import { useT } from '../i18n'
import { euro, niceDate, partLabel } from '../lib/format'
import { type Repair } from '../types'
import { Field, FormActions, Modal, TextArea, onSubmit } from '../ui'

export function IntakeFields({
  damage,
  todo,
  onChange,
}: {
  damage: string
  todo: string
  onChange: (next: { damage: string; todo: string }) => void
}) {
  const t = useT()
  return (
    <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div>
        <p className="text-sm font-medium text-stone-200">{t('work.intake')}</p>
        <p className="mt-0.5 text-xs text-stone-500">{t('work.intakeHint')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('work.damage')}>
          <TextArea
            value={damage}
            onChange={(e) => onChange({ damage: e.target.value, todo })}
            placeholder={t('work.damagePh')}
          />
        </Field>
        <Field label={t('work.todo')}>
          <TextArea
            value={todo}
            onChange={(e) => onChange({ damage, todo: e.target.value })}
            placeholder={t('work.todoPh')}
          />
        </Field>
      </div>
    </div>
  )
}

function NoteBlock({
  label,
  text,
  showEmpty,
  emptyLabel,
}: {
  label: string
  text: string
  showEmpty?: boolean
  emptyLabel: string
}) {
  const value = (text ?? '').trim()
  if (!value && !showEmpty) return null
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-stone-500">{label}</p>
      {value ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-300">{value}</p>
      ) : (
        <p className="mt-1 text-sm text-stone-600">{emptyLabel}</p>
      )}
    </div>
  )
}

export function WorkNotesView({
  damage,
  todo,
  workDone,
  notes,
  showEmpty = false,
  intakeOnly = false,
}: {
  damage: string
  todo: string
  workDone: string
  notes?: string
  showEmpty?: boolean
  intakeOnly?: boolean
}) {
  const t = useT()
  return (
    <div className="space-y-3">
      <NoteBlock label={t('work.damage')} text={damage} showEmpty={showEmpty} emptyLabel={t('work.empty')} />
      <NoteBlock label={t('work.todo')} text={todo} showEmpty={showEmpty} emptyLabel={t('work.empty')} />
      {!intakeOnly && (
        <NoteBlock label={t('work.done')} text={workDone} showEmpty={showEmpty} emptyLabel={t('work.empty')} />
      )}
      {!intakeOnly && notes?.trim() ? (
        <NoteBlock label={t('common.notes')} text={notes} emptyLabel={t('work.empty')} />
      ) : null}
    </div>
  )
}

export function IntakePreview({ damage, todo }: { damage: string; todo: string }) {
  const t = useT()
  const d = (damage ?? '').trim()
  const next = (todo ?? '').trim()
  if (!d && !next) return null
  return (
    <div className="mt-2 min-w-0 space-y-0.5">
      {d ? (
        <p className="truncate text-[11px] text-stone-400">
          <span className="text-stone-500">{t('work.damage')} </span>
          {d}
        </p>
      ) : null}
      {next ? (
        <p className="truncate text-[11px] text-stone-400">
          <span className="text-stone-500">{t('work.todo')} </span>
          {next}
        </p>
      ) : null}
    </div>
  )
}

export function PartsReadonly({ parts }: { parts: Repair[] }) {
  const t = useT()
  if (!parts || parts.length === 0) {
    return <p className="text-sm text-stone-500">{t('work.noParts')}</p>
  }
  return (
    <ul className="divide-y divide-white/8 rounded-lg border border-white/8">
      {parts.map((r) => (
        <li key={r.id} className="flex min-w-0 items-start justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-stone-100">{partLabel(r.name)}</p>
            <p className="truncate text-[11px] text-stone-500">
              {t(`repair.${r.status}`)}
              {r.supplier ? ` · ${r.supplier}` : ''}
              {r.fromStockId ? ` · ${t('work.fromStock')}` : ''}
              {r.date ? ` · ${niceDate(r.date)}` : ''}
            </p>
          </div>
          <p className="money shrink-0 font-mono text-sm text-stone-300">{euro(r.cost)}</p>
        </li>
      ))}
    </ul>
  )
}

export function MarkReadyModal({
  title,
  damage,
  todo,
  workDone,
  parts,
  onClose,
  onConfirm,
}: {
  title: string
  damage: string
  todo: string
  workDone: string
  parts: Repair[]
  onClose: () => void
  onConfirm: (workDone: string) => void
}) {
  const t = useT()
  const [done, setDone] = useState(workDone ?? '')

  return (
    <Modal title={title} onClose={onClose} wide>
      <p className="text-sm text-stone-400">{t('work.readyAsk')}</p>
      <div className="mt-3 rounded-xl border border-white/8 bg-black/20 p-3">
        <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('work.intake')}</p>
        <div className="mt-2">
          <WorkNotesView
            damage={damage ?? ''}
            todo={todo ?? ''}
            workDone=""
            intakeOnly
            showEmpty
          />
        </div>
      </div>
      <form
        className="mt-4"
        onSubmit={onSubmit(() => {
          onConfirm(done)
          onClose()
        })}
      >
        <Field label={t('work.doneLabel')}>
          <TextArea
            value={done}
            onChange={(e) => setDone(e.target.value)}
            placeholder={t('work.donePh')}
          />
        </Field>
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('work.parts')}</p>
          <div className="mt-2">
            <PartsReadonly parts={parts ?? []} />
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel={t('work.readyOk')} />
      </form>
    </Modal>
  )
}
