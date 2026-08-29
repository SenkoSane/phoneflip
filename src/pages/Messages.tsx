import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BuyerReplyMessages } from '../components/BuyerReplyMessages'
import { CopyWaCard } from '../components/CopyWaCard'
import { SellerAskMessages } from '../components/SellerAskMessages'
import { useT } from '../i18n'
import { aiPolishChat, readOpenAiKey } from '../lib/ai'
import { GhostButton, TextArea, TextInput } from '../ui'

type Kant = 'kopen' | 'verkopen'

function parsePositive(text: string): number | null {
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function Messages() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const kant: Kant = params.get('kant') === 'verkopen' ? 'verkopen' : 'kopen'
  const skip = params.get('skip') === '1'
  const [name, setName] = useState(() => params.get('name') ?? '')
  const [model, setModel] = useState(() => params.get('model') ?? '')
  const [defect, setDefect] = useState(() => params.get('defect') ?? '')
  const [minText, setMinText] = useState(() => params.get('min') ?? '')
  const [midText, setMidText] = useState(() => params.get('mid') ?? '')
  const [maxText, setMaxText] = useState(() => params.get('max') ?? '')
  const [draft, setDraft] = useState('')
  const [polished, setPolished] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const hasKey = Boolean(readOpenAiKey())

  const min = useMemo(() => parsePositive(minText), [minText])
  const mid = useMemo(() => parsePositive(midText), [midText])
  const max = useMemo(() => parsePositive(maxText), [maxText])

  function setKant(next: Kant) {
    const q = new URLSearchParams(params)
    q.set('kant', next)
    setParams(q, { replace: true })
  }

  async function polish() {
    const text = draft.trim()
    if (!text) return
    setBusy(true)
    setErr('')
    try {
      setPolished(await aiPolishChat(text))
    } catch {
      setErr(t('coach.aiFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {t('msg.kicker')}
        </p>
        <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('msg.title')}</h2>
        <p className="mt-2 max-w-2xl min-w-0 break-words text-sm text-stone-400">{t('msg.intro')}</p>
        <p className="mt-1 text-xs text-stone-500">{t('jan.fromMsg')}</p>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2">
        {(['kopen', 'verkopen'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setKant(id)}
            className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 text-sm font-medium ${
              kant === id ? 'bg-amber-500 text-stone-950' : 'bg-white/5 text-stone-300'
            }`}
          >
            {id === 'kopen' ? t('msg.tabBuy') : t('msg.tabSell')}
          </button>
        ))}
      </div>

      {kant === 'kopen' ? (
        <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('msg.nameLabel')}
              </span>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('msg.namePh')}
              />
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('common.model')}
              </span>
              <TextInput
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t('buyask.deviceFallback')}
              />
            </label>
            <label className="block min-w-0 space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('msg.defectLabel')}
              </span>
              <TextInput
                value={defect}
                onChange={(e) => setDefect(e.target.value)}
                placeholder={t('msg.defectPh')}
              />
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('msg.minLabel')}
              </span>
              <TextInput
                inputMode="decimal"
                value={minText}
                onChange={(e) => setMinText(e.target.value)}
                placeholder={t('msg.askPh')}
              />
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('msg.midLabel')}
              </span>
              <TextInput
                inputMode="decimal"
                value={midText}
                onChange={(e) => setMidText(e.target.value)}
                placeholder={t('msg.askPh')}
              />
            </label>
            <label className="block min-w-0 space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                {t('msg.maxLabel')}
              </span>
              <TextInput
                inputMode="decimal"
                value={maxText}
                onChange={(e) => setMaxText(e.target.value)}
                placeholder={t('msg.askPh')}
              />
            </label>
          </div>
          <SellerAskMessages
            name={name}
            model={model}
            defect={defect}
            min={min}
            mid={mid}
            max={max}
            skip={skip}
          />
          <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-3 sm:p-4">
            <h3 className="text-sm font-medium text-stone-100">{t('msg.aiTitle')}</h3>
            <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t('msg.aiHint')}</p>
            <TextArea
              rows={4}
              className="mt-3 w-full"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('msg.aiPh')}
            />
            <GhostButton
              type="button"
              className="mt-3 w-full sm:w-auto"
              disabled={busy || !draft.trim() || !hasKey}
              onClick={() => void polish()}
            >
              {busy ? t('coach.working') : t('msg.aiGo')}
            </GhostButton>
            {!hasKey ? (
              <p className="mt-2 text-xs text-stone-500">
                {t('sell.needKey')}{' '}
                <Link to="/instellingen" className="text-amber-400 underline-offset-2 hover:underline">
                  {t('nav.backup')}
                </Link>
              </p>
            ) : null}
            {err ? <p className="mt-2 text-sm text-rose-300">{err}</p> : null}
            {polished ? (
              <ul className="mt-3 grid min-w-0 grid-cols-1">
                <CopyWaCard title={t('msg.aiGo')} body={polished} />
              </ul>
            ) : null}
          </section>
        </div>
      ) : (
        <BuyerReplyMessages />
      )}
    </div>
  )
}
