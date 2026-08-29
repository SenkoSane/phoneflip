import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { useT } from './i18n'
import { isEuroZero, parseEuro } from './lib/format'

export function euroClass(n: number): string {
  if (isEuroZero(n)) return 'pf-muted'
  if (n > 0) return 'text-emerald-400'
  return 'text-rose-400'
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="pf-muted text-xs font-medium uppercase tracking-[0.14em]">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full min-w-0 rounded-lg border border-[var(--pf-border-strong)] bg-[var(--pf-surface-inset)] px-3 py-2.5 text-base text-[var(--pf-fg)] outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-accent-border)] sm:py-2 sm:text-sm'

export function TextInput(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function TextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${inputClass} min-h-24 resize-y ${props.className ?? ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
  )
}

function formatEuroDraft(n: number): string {
  if (!Number.isFinite(n) || n === 0) return ''
  return n.toFixed(2).replace('.', ',')
}

export function EuroInput({
  value,
  onValue,
  ...rest
}: {
  value: number
  onValue: (n: number) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <TextInput
      {...rest}
      type="text"
      inputMode="decimal"
      value={focused ? draft : formatEuroDraft(value)}
      placeholder="0,00"
      onFocus={(e) => {
        setFocused(true)
        setDraft(value === 0 ? '' : formatEuroDraft(value))
        rest.onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,.\-]/g, '')
        setDraft(raw)
        onValue(parseEuro(raw))
      }}
      onBlur={(e) => {
        setFocused(false)
        setDraft('')
        rest.onBlur?.(e)
      }}
    />
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--pf-accent)] px-4 py-2 text-sm font-semibold text-[var(--pf-chip-accent-fg)] hover:brightness-110 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--pf-border-strong)] bg-[var(--pf-surface)] px-3 py-2 text-sm text-[var(--pf-subtle)] hover:bg-[var(--pf-surface-raised)] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  zClass = 'z-50',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  zClass?: string
}) {
  const headingId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby={headingId}
        className={`pf-surface-raised w-full min-w-0 ${wide ? 'max-w-xl' : 'max-w-lg'} max-h-[min(92dvh,52rem)] overflow-x-hidden overflow-y-auto rounded-t-xl p-4 sm:rounded-xl sm:p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={headingId} className="font-display min-w-0 text-lg break-words text-stone-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-stone-500 hover:text-stone-200"
          >
            Esc
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useT()
  return createPortal(
    <Modal title={title} onClose={onClose} zClass="z-[60]">
      <p className="text-sm leading-relaxed text-stone-300">{body}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <GhostButton type="button" className="w-full sm:w-auto" onClick={onClose}>
          {cancelLabel ?? t('common.cancel')}
        </GhostButton>
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 sm:w-auto"
          onClick={onConfirm}
        >
          {confirmLabel ?? t('common.delete')}
        </button>
      </div>
    </Modal>,
    document.body,
  )
}

export function FormActions({
  onCancel,
  submitLabel,
  cancelLabel,
}: {
  onCancel: () => void
  submitLabel: string
  cancelLabel?: string
}) {
  const t = useT()
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <GhostButton type="button" className="w-full sm:w-auto" onClick={onCancel}>
        {cancelLabel ?? t('common.cancel')}
      </GhostButton>
      <PrimaryButton type="submit" className="w-full sm:w-auto">
        {submitLabel}
      </PrimaryButton>
    </div>
  )
}

export function onSubmit(handler: () => void) {
  return (e: FormEvent) => {
    e.preventDefault()
    handler()
  }
}
