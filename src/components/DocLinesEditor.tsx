import { useT } from '../i18n'
import { uid } from '../lib/id'
import type { DocLine } from '../types'
import { EuroInput, TextInput } from '../ui'

export function DocLinesEditor({
  lines,
  onChange,
}: {
  lines: DocLine[]
  onChange: (lines: DocLine[]) => void
}) {
  const t = useT()
  function setLine(id: string, patch: Partial<DocLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div key={line.id} className="flex min-w-0 items-stretch gap-2">
          <TextInput
            className="min-w-0 flex-1"
            value={line.name}
            placeholder={t('doc.linePh')}
            onChange={(e) => setLine(line.id, { name: e.target.value })}
          />
          <div className="w-28 shrink-0 sm:w-32">
            <EuroInput value={line.amount} onValue={(n) => setLine(line.id, { amount: n })} />
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-stone-400 hover:bg-white/5 hover:text-rose-300"
            onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
            aria-label={t('doc.remove')}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-lg border border-dashed border-white/15 px-3 text-sm text-stone-300 hover:bg-white/5"
        onClick={() => onChange([...lines, { id: uid(), name: '', amount: 0 }])}
      >
        {t('doc.add')}
      </button>
    </div>
  )
}
