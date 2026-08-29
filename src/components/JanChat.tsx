import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import {
  AiRequestError,
  aiJanChat,
  resolveOpenAiKey,
  type AiFailCode,
  type JanTurn,
} from '../lib/ai'
import { janShopFromData } from '../lib/janBriefing'
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
  const [hasKey, setHasKey] = useState(() => resolveOpenAiKey(workshopKey).startsWith('sk-'))
  const [errCode, setErrCode] = useState<AiFailCode | ''>('')

  useEffect(() => {
    saveChat(msgs)
  }, [msgs])

  useEffect(() => {
    setHasKey(resolveOpenAiKey(workshopKey).startsWith('sk-'))
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
    setErrCode('')
    try {
      const history: JanTurn[] = next.map((m) => ({ role: m.role, content: m.content }))
      const reply = await aiJanChat(history, workshopKey, janShopFromData(data))
      setMsgs((cur) => [...cur, { id: uid(), role: 'assistant', content: reply }])
    } catch (e) {
      const code: AiFailCode = e instanceof AiRequestError ? e.code : 'fail'
      setErrCode(code)
      setErr(
        code === 'no_key'
          ? t('jan.errorNoKey')
          : code === 'network'
            ? t('jan.errorNetwork')
            : code === 'auth'
              ? t('jan.errorAuth')
              : code === 'missing'
                ? t('jan.errorMissing')
                : t('jan.error'),
      )
    } finally {
      setBusy(false)
    }
  }

  function clearChat() {
    setMsgs([])
    setErr('')
    setErrCode('')
    saveChat([])
  }

  const fab = !open ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('jan.open')}
      className="pointer-events-auto fixed z-30 flex size-12 items-center justify-center rounded-full bg-[var(--pf-accent)] text-[13px] font-bold leading-none text-[var(--pf-chip-accent-fg)] right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:right-6 sm:bottom-8 lg:bottom-6"
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
        className="pf-surface-raised relative flex max-h-[min(28rem,62dvh)] w-full min-w-0 flex-col rounded-t-xl sm:mb-8 sm:mr-6 sm:max-h-[min(36rem,72dvh)] sm:w-[min(100%-3rem,28rem)] sm:rounded-xl lg:mb-6 lg:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-[var(--pf-border)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p id={titleId} className="truncate text-sm font-medium text-[var(--pf-fg)]">
              {t('jan.title')}
            </p>
            <p className="pf-muted truncate text-xs">{t('jan.hint')}</p>
          </div>
          {msgs.length > 0 ? (
            <button
              type="button"
              onClick={clearChat}
              className="pf-muted inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 text-xs hover:bg-[var(--pf-surface)] hover:text-[var(--pf-subtle)]"
            >
              {t('jan.clear')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="pf-muted inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-lg hover:bg-[var(--pf-surface)] hover:text-[var(--pf-fg)]"
            aria-label={t('jan.close')}
          >
            ×
          </button>
        </header>

        <div ref={listRef} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
          {msgs.length === 0 ? (
            <p className="pf-muted text-sm leading-relaxed">{t('jan.empty')}</p>
          ) : (
            <ul className="flex min-w-0 flex-col gap-2.5">
              {msgs.map((m) => (
                <li
                  key={m.id}
                  className={`flex min-w-0 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] min-w-0 rounded-xl px-3 py-2 text-sm leading-relaxed break-words ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-[var(--pf-accent-soft)] text-[var(--pf-fg)]'
                        : 'rounded-bl-md bg-[var(--pf-surface)] text-[var(--pf-subtle)]'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <p className="pf-accent-text mb-1 font-mono text-[10px] uppercase tracking-wider">
                        {t('jan.name')}
                      </p>
                    ) : null}
                    <p className="min-w-0 whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {busy ? <p className="pf-muted mt-2 text-xs">{t('jan.thinking')}</p> : null}
          {err ? (
            <p className="mt-2 text-sm text-rose-300">
              {err}
              {errCode === 'no_key' || errCode === 'auth' ? (
                <>
                  {' '}
                  <Link
                    to="/instellingen"
                    onClick={() => setOpen(false)}
                    className="underline underline-offset-2"
                  >
                    {t('nav.backup')}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          {!hasKey ? (
            <p className="pf-surface mt-3 rounded-xl px-3 py-2 text-sm text-[var(--pf-subtle)]">
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
          className="flex min-w-0 shrink-0 items-end gap-2 border-t border-[var(--pf-border)] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
            className="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-[var(--pf-border-strong)] bg-[var(--pf-surface-inset)] px-3 py-2.5 text-base text-[var(--pf-fg)] outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-accent-border)] sm:text-sm"
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
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--pf-accent)] px-3.5 text-sm font-semibold text-[var(--pf-chip-accent-fg)] hover:brightness-110 disabled:opacity-40"
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
