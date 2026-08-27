import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { aiJanChat, readOpenAiKey, type JanTurn } from '../lib/ai'
import { uid } from '../lib/id'
import { useStore } from '../store'

const CHAT_KEY = 'phoneflip.jan.chat'
const MAX_STORE = 80

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

function loadChat(): Msg[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is Msg =>
        !!m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        typeof m.id === 'string',
    )
  } catch {
    return []
  }
}

function saveChat(msgs: Msg[]) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-MAX_STORE)))
  } catch {
    /* ignore */
  }
}

export function JanChat() {
  const t = useT()
  const { data } = useStore()
  const titleId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>(loadChat)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const workshopKey = data.workshop?.openaiKey?.trim() ?? ''
  const [hasKey, setHasKey] = useState(() => Boolean(readOpenAiKey() || workshopKey))

  useEffect(() => {
    saveChat(msgs)
  }, [msgs])

  useEffect(() => {
    setHasKey(Boolean(readOpenAiKey() || workshopKey))
  }, [open, workshopKey])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [open, msgs, busy])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function send() {
    const text = draft.trim()
    if (!text || busy || !hasKey) return
    const user: Msg = { id: uid(), role: 'user', content: text }
    const next = [...msgs, user]
    setMsgs(next)
    setDraft('')
    setBusy(true)
    setErr('')
    try {
      const history: JanTurn[] = next.map((m) => ({ role: m.role, content: m.content }))
      const reply = await aiJanChat(history)
      setMsgs((cur) => [
        ...cur,
        { id: uid(), role: 'assistant', content: reply || t('jan.error') },
      ])
    } catch {
      setErr(t('jan.error'))
    } finally {
      setBusy(false)
    }
  }

  function clearChat() {
    setMsgs([])
    setErr('')
    saveChat([])
  }

  const fab = !open ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('jan.open')}
      className="pointer-events-auto fixed z-30 flex size-12 items-center justify-center rounded-full bg-amber-500 text-[13px] font-bold leading-none text-stone-950 shadow-lg shadow-black/40 hover:bg-amber-400 right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:right-6 sm:bottom-8 lg:bottom-6"
    >
      J
    </button>
  ) : null

  const sheet = open ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 sm:bg-black/35"
        aria-label={t('jan.close')}
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(28rem,62dvh)] w-full min-w-0 flex-col rounded-t-2xl border border-white/10 bg-stone-900 shadow-2xl sm:mb-8 sm:mr-6 sm:max-h-[min(36rem,72dvh)] sm:w-[min(100%-3rem,28rem)] sm:rounded-2xl lg:mb-6 lg:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-white/8 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p id={titleId} className="truncate text-sm font-medium text-stone-100">
              {t('jan.title')}
            </p>
            <p className="truncate text-[11px] text-stone-500">{t('jan.hint')}</p>
          </div>
          {msgs.length > 0 ? (
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 text-xs text-stone-400 hover:bg-white/5 hover:text-stone-200"
            >
              {t('jan.clear')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-lg text-stone-400 hover:bg-white/5 hover:text-stone-100"
            aria-label={t('jan.close')}
          >
            ×
          </button>
        </header>

        <div ref={listRef} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
          {msgs.length === 0 ? (
            <p className="text-sm leading-relaxed text-stone-400">{t('jan.empty')}</p>
          ) : (
            <ul className="flex min-w-0 flex-col gap-2.5">
              {msgs.map((m) => (
                <li
                  key={m.id}
                  className={`flex min-w-0 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] min-w-0 rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-amber-500/20 text-stone-100'
                        : 'rounded-bl-md bg-white/8 text-stone-200'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber-500/80">
                        {t('jan.name')}
                      </p>
                    ) : null}
                    <p className="min-w-0 whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {busy ? <p className="mt-2 text-xs text-stone-500">{t('jan.thinking')}</p> : null}
          {err ? <p className="mt-2 text-sm text-rose-300">{err}</p> : null}
          {!hasKey ? (
            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {t('jan.needKey')}{' '}
              <Link
                to="/instellingen"
                onClick={() => setOpen(false)}
                className="underline underline-offset-2"
              >
                {t('nav.backup')}
              </Link>
            </p>
          ) : null}
        </div>

        <form
          className="flex min-w-0 shrink-0 items-end gap-2 border-t border-white/8 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('jan.placeholder')}
            disabled={!hasKey || busy}
            className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-stone-100 outline-none placeholder:text-stone-600 focus:border-amber-500/50 sm:text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <button
            type="submit"
            disabled={!hasKey || busy || !draft.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 px-3.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-40"
          >
            {t('jan.send')}
          </button>
        </form>
      </div>
    </div>
  ) : null

  return createPortal(
    <>
      {fab}
      {sheet}
    </>,
    document.body,
  )
}
