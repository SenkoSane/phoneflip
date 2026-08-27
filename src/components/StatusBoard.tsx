import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../i18n'

export type StatusBoardColumn<S extends string> = {
  id: S
  label: string
  count: number
  accent: string
}

const BOARD_MQ = '(min-width: 1024px)'

function useWideBoard() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(BOARD_MQ).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(BOARD_MQ)
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return wide
}

export function StatusBoard<S extends string>({
  columns,
  tabs = columns,
  activeId,
  onActiveId,
  dragging,
  onDrop,
  renderColumn,
  sink,
}: {
  columns: StatusBoardColumn<S>[]
  tabs?: StatusBoardColumn<S>[]
  activeId: S
  onActiveId: (id: S) => void
  dragging: boolean
  onDrop: (id: S) => void
  renderColumn: (id: S, opts: { draggable: boolean }) => ReactNode
  sink?: () => ReactNode
}) {
  const wide = useWideBoard()
  const active = tabs.find((c) => c.id === activeId) ?? tabs[0]

  if (!wide) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <div className="flex w-full min-w-0 max-w-full flex-wrap gap-1.5">
          {tabs.map((col) => {
            const on = col.id === active.id
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onActiveId(col.id)}
                className={`flex min-h-11 min-w-0 flex-1 basis-[calc(50%-0.2rem)] items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium ${
                  on
                    ? 'bg-white/12 text-stone-50 ring-1 ring-white/20'
                    : 'bg-white/4 text-stone-400'
                }`}
              >
                <span className="min-w-0 truncate">{col.label}</span>
                <span className="font-mono shrink-0 text-[10px] text-stone-500">{col.count}</span>
              </button>
            )
          })}
        </div>
        {active && (
          <section className="mt-3 w-full min-w-0 rounded-2xl border border-white/8 bg-white/2 p-3">
            <div
              className={`mb-3 flex items-center justify-between border-l-2 pl-2 ${active.accent}`}
            >
              <h3 className="min-w-0 truncate text-sm font-medium text-stone-200">
                {active.label}
              </h3>
              <span className="font-mono shrink-0 text-xs text-stone-500">{active.count}</span>
            </div>
            <div className="space-y-2">{renderColumn(active.id, { draggable: false })}</div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="w-full min-w-0">
      <div className={`kanban-scroller flex ${dragging ? 'ring-1 ring-amber-500/10' : ''}`}>
        {columns.map((col) => (
          <section
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
            className={`kanban-col rounded-2xl border border-white/8 bg-white/2 p-3 ${
              dragging ? 'ring-1 ring-amber-500/20' : ''
            }`}
          >
            <div
              className={`mb-3 flex items-center justify-between border-l-2 pl-2 ${col.accent}`}
            >
              <h3 className="min-w-0 truncate text-sm font-medium text-stone-200">{col.label}</h3>
              <span className="font-mono shrink-0 text-xs text-stone-500">{col.count}</span>
            </div>
            <div className="space-y-2">{renderColumn(col.id, { draggable: true })}</div>
          </section>
        ))}
        {sink ? <div className="kanban-sink flex">{sink()}</div> : null}
      </div>
    </div>
  )
}

export function BoardEmpty() {
  const t = useT()
  return <p className="px-2 py-8 text-center text-xs text-stone-600">{t('board.empty')}</p>
}

export function BoardSink({
  label,
  hint,
  dragging,
  onDrop,
}: {
  label: string
  hint: string
  dragging: boolean
  onDrop: () => void
}) {
  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={`flex h-full min-h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-3 py-5 text-center ${
        dragging
          ? 'border-emerald-400/60 bg-emerald-500/10'
          : 'border-white/15 bg-white/2'
      }`}
    >
      <p className="text-sm font-medium text-stone-100">{label}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </section>
  )
}
