import { useState } from 'react'
import { useT } from '../i18n'
import { useSync } from './SyncProvider'
import { GhostButton, PrimaryButton, TextInput } from '../ui'

export function DeviceSync() {
  const t = useT()
  const sync = useSync()
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)

  if (!sync.configured) {
    return (
      <div className="relative z-40 space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-medium text-stone-200">{t('sync.title')}</h3>
        <p className="text-sm text-stone-400">{t('sync.unconfigured')}</p>
        <p className="text-sm text-stone-400">{t('sync.aiKey')}</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-400">
          <li>{t('sync.step1')}</li>
          <li>{t('sync.step2')}</li>
          <li>
            {t('sync.step3')}
            <code className="mt-1 block break-all rounded-lg bg-black/30 p-2 font-mono text-[11px] text-stone-300">
              {`{"rules":{"phoneflip":{"$code":{".read":true,".write":true}}}}`}
            </code>
          </li>
          <li>{t('sync.step4')}</li>
          <li>{t('sync.step5')}</li>
        </ol>
      </div>
    )
  }

  const shown = sync.code ?? sync.pendingCode

  return (
    <div className="relative z-40 space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-stone-200">{t('sync.title')}</h3>
        <p className="text-xs text-stone-500">{t(`sync.${sync.status}`)}</p>
      </div>
      <p className="text-sm text-stone-400">{t('sync.hint')}</p>
      <p className="text-sm text-stone-400">{t('sync.aiKey')}</p>

      {shown ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('sync.yourCode')}</p>
          <p className="font-display mt-1 break-all text-3xl tracking-[0.2em] text-stone-50">
            {shown}
          </p>
          <GhostButton
            type="button"
            className="mt-3"
            onClick={() => {
              void navigator.clipboard.writeText(shown)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? t('sync.copied') : t('sync.copy')}
          </GhostButton>
        </div>
      ) : null}

      {sync.error ? <p className="text-sm text-rose-400">{sync.error}</p> : null}

      {sync.pendingCode ? (
        <div className="space-y-2">
          <p className="text-sm text-amber-200">{t('sync.conflict')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void sync.resolveConflict('cloud')}
            >
              {t('sync.useCloud')}
            </PrimaryButton>
            <GhostButton
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void sync.resolveConflict('local')}
            >
              {t('sync.useLocal')}
            </GhostButton>
            <GhostButton type="button" className="w-full sm:w-auto" onClick={sync.cancelConflict}>
              {t('common.cancel')}
            </GhostButton>
          </div>
        </div>
      ) : sync.code ? (
        <GhostButton type="button" className="w-full sm:w-auto" onClick={sync.disconnect}>
          {t('sync.unlink')}
        </GhostButton>
      ) : (
        <div className="space-y-3">
          <PrimaryButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void sync.createAndLink()}
          >
            {t('sync.newCode')}
          </PrimaryButton>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('sync.existingCode')}
              </span>
              <TextInput
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder={t('sync.codePh')}
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </label>
            <GhostButton
              type="button"
              className="w-full sm:w-auto"
              disabled={!input.trim()}
              onClick={() => void sync.connect(input)}
            >
              {t('sync.link')}
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  )
}
