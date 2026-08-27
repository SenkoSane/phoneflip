import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '../components/BackLink'
import { ListForSaleModal } from '../components/ListForSaleModal'
import { MessagesTeaser } from '../components/MessagesTeaser'
import { SlotExample } from '../components/sell/SlotExample'
import {
  LISTING_SLOTS,
  filledRequiredCount,
  nextSlotId,
  requiredSlots,
  slotStepLabel,
  slotUnlocked,
  type ListingSlotId,
  type PhotoMap,
} from '../data/listingSlots'
import { useI18n } from '../i18n'
import {
  aiListingAssist,
  aiPolishAd,
  aiReviewListingPhotos,
  fileToJpegDataUrl,
  readOpenAiKey,
} from '../lib/ai'
import { isStalePhone } from '../lib/dealCoach'
import { euro, phoneTitle, platformName } from '../lib/format'
import { ticketLabel } from '../lib/id'
import { loadListingPhotos, saveListingPhotos } from '../lib/listingPhotos'
import {
  BUYER_REPLY_IDS,
  aftermarketScreen,
  askForGrade,
  listingBody,
  listingTitle,
  photoSetReady,
  sellCheerKey,
  sellGradeFor,
  type BuyerReplyId,
  type SellStep,
} from '../lib/sellStudio'
import { useStore } from '../store'
import { GhostButton, PrimaryButton, TextInput } from '../ui'

export function SellStudio() {
  const { t, lang } = useI18n()
  const { id } = useParams()
  const { data, setListings } = useStore()
  const phone = data.phones.find((p) => p.id === id)
  const [photos, setPhotos] = useState<PhotoMap>({})
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState<SellStep>('photos')
  const [viewSlot, setViewSlot] = useState<ListingSlotId>('frontOn')
  const [pending, setPending] = useState<{ slot: ListingSlotId; dataUrl: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [cheer, setCheer] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [assistQ, setAssistQ] = useState('')
  const [assistA, setAssistA] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [buyersOpen, setBuyersOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const [checks, setChecks] = useState({ title: false, body: false, order: false })
  const [bodyOverride, setBodyOverride] = useState('')
  const inited = useRef(false)
  const filledRef = useRef(0)
  const cheerTimer = useRef<number>(0)

  useEffect(() => {
    if (!phone) return
    let cancel = false
    void loadListingPhotos(phone.id).then((next) => {
      if (cancel) return
      setPhotos(next)
      filledRef.current = filledRequiredCount(next)
      const nxt = nextSlotId(next)
      if (nxt) setViewSlot(nxt)
      setLoaded(true)
    })
    return () => {
      cancel = true
    }
  }, [phone?.id])

  useEffect(() => {
    if (!phone || !loaded) return
    void saveListingPhotos(phone.id, photos)
  }, [loaded, phone?.id, photos])

  useEffect(() => {
    if (!loaded || inited.current) return
    inited.current = true
    const listed = (phone?.listings ?? []).some((l) => l.active)
    if (listed) setStep('place')
    else if (photoSetReady(photos)) setStep('text')
  }, [loaded, phone?.listings, photos])

  useEffect(() => {
    const u =
      (phone?.listings ?? []).find((l) => l.platform === 'marktplaats' && l.url)?.url ??
      (phone?.listings ?? []).find((l) => l.url)?.url ??
      ''
    setLinkDraft(u)
  }, [phone?.listings])

  useEffect(() => {
    return () => window.clearTimeout(cheerTimer.current)
  }, [])

  if (!phone) {
    return (
      <div className="space-y-3">
        <BackLink fallback="/tickets" />
        <p className="text-stone-400">{t('pform.notFound')}</p>
      </div>
    )
  }

  const device = phone
  const city = data.workshop?.city ?? ''
  const gradeInfo = sellGradeFor(device)
  const grade = gradeInfo.grade
  const gradeWord = t(`sell.word.${grade}`)
  const { ask, floor } = askForGrade(device, grade)
  const aftermarket = aftermarketScreen(device)
  const title = listingTitle(device, grade, gradeWord)
  const draftBody = listingBody({ phone: device, city, grade, ask, title, aftermarket, lang })
  const body = bodyOverride || draftBody
  const need = requiredSlots().length
  const filled = filledRequiredCount(photos)
  const ready = photoSetReady(photos)
  const listed = (device.listings ?? []).some((l) => l.active)
  const nextId = nextSlotId(photos)
  const viewUnlocked = slotUnlocked(viewSlot, photos)
  const viewSrc = pending?.slot === viewSlot ? pending.dataUrl : photos[viewSlot]
  const viewMeta = slotStepLabel(viewSlot)
  const hasKey = Boolean(readOpenAiKey())

  async function copyText(kind: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt(t('common.copy'), text)
    }
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 2000)
  }

  function shareWa(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  function showCheer(nextFilled: number) {
    const key = sellCheerKey(nextFilled)
    if (!key) return
    setCheer(t(key))
    window.clearTimeout(cheerTimer.current)
    cheerTimer.current = window.setTimeout(() => setCheer(''), 4000)
  }

  async function onFile(slot: ListingSlotId, file: File | undefined) {
    if (!file) return
    setErr('')
    setBusy(true)
    try {
      const dataUrl = await fileToJpegDataUrl(file, 900, 0.65)
      setPending({ slot, dataUrl })
      setViewSlot(slot)
    } catch {
      setErr(t('sell.photoFail'))
    } finally {
      setBusy(false)
    }
  }

  function confirmPending() {
    if (!pending) return
    const slot = pending.slot
    const next = { ...photos, [slot]: pending.dataUrl }
    setPhotos(next)
    setPending(null)
    const f = filledRequiredCount(next)
    if (f > filledRef.current) showCheer(f)
    filledRef.current = f
    const nxt = nextSlotId(next)
    if (nxt) setViewSlot(nxt)
    else setViewSlot(slot)
  }

  function rejectPending() {
    setPending(null)
  }

  function clearSlot(slot: ListingSlotId) {
    setPhotos((prev) => {
      const next = { ...prev }
      delete next[slot]
      filledRef.current = filledRequiredCount(next)
      return next
    })
  }

  function skipDamage() {
    setStep('text')
  }

  function goSlot(id: ListingSlotId) {
    if (!slotUnlocked(id, photos)) return
    setViewSlot(id)
    setPending(null)
  }

  function replyText(rid: BuyerReplyId): string {
    const place = city || t('sell.cityFallback')
    if (rid === 'screen') return aftermarket ? t('sell.reply.screenAfter') : t('sell.reply.screenOk')
    if (rid === 'price') return t('sell.reply.price', { ask: euro(ask) })
    return t(`sell.reply.${rid}`, { city: place, ask: euro(ask) })
  }

  const facts = [
    `staat ${grade} (${gradeWord})`,
    `vraag ${euro(ask)}, niet onder ${euro(floor)}`,
    aftermarket ? 'scherm vervangen, niet Apple-origineel' : '',
    device.workDone ? `gedaan: ${device.workDone}` : '',
    device.damage ? `schade: ${device.damage}` : '',
    `foto-stap ${viewMeta.n}/7 ${t(`sell.slot.${viewSlot}`)}`,
  ]
    .filter(Boolean)
    .join('\n')

  async function askAssistant(question: string) {
    if (!hasKey) {
      setErr(t('sell.needKey'))
      return
    }
    const q = question.trim()
    if (!q) return
    setAiBusy(true)
    setErr('')
    try {
      const photo = viewSrc
        ? { title: t(`sell.slot.${viewSlot}`), dataUrl: viewSrc }
        : undefined
      setAssistA(
        await aiListingAssist({
          question: q,
          model: phoneTitle(device.brand, device.model),
          facts,
          photo: step === 'photos' ? photo : undefined,
        }),
      )
    } catch {
      setErr(t('coach.aiFail'))
    } finally {
      setAiBusy(false)
    }
  }

  async function checkPhoto() {
    const src = photos[viewSlot]
    if (!src || !hasKey) {
      setErr(t('sell.needKey'))
      return
    }
    setAiBusy(true)
    setErr('')
    try {
      const result = await aiReviewListingPhotos({
        model: phoneTitle(device.brand, device.model),
        photos: [
          {
            id: viewSlot,
            n: viewMeta.n,
            title: t(`sell.slot.${viewSlot}`),
            dataUrl: src,
          },
        ],
      })
      const tip = result.tips[0]?.tip || result.note
      setAssistA(tip || t('sell.assist.okPhoto'))
    } catch {
      setErr(t('coach.aiFail'))
    } finally {
      setAiBusy(false)
    }
  }

  async function polishBody() {
    if (!hasKey) {
      setErr(t('sell.needKey'))
      return
    }
    setAiBusy(true)
    setErr('')
    try {
      setBodyOverride(await aiPolishAd(draftBody))
    } catch {
      setErr(t('coach.aiFail'))
    } finally {
      setAiBusy(false)
    }
  }

  function saveLink() {
    const listings = device.listings ?? []
    if (listings.length === 0) return
    const target =
      listings.find((l) => l.platform === 'marktplaats') ?? listings.find((l) => l.active) ?? listings[0]
    setListings(
      device.id,
      listings.map((l) => (l.id === target.id ? { ...l, url: linkDraft.trim() } : l)),
    )
  }

  const coach = pending
    ? t('sell.coach.pending')
    : step === 'photos'
      ? ready
        ? t('sell.coach.photosReady')
        : t('sell.coach.photo', { n: viewMeta.n, total: viewMeta.of, name: t(`sell.slot.${viewSlot}`) })
      : step === 'text'
        ? city
          ? t('sell.coach.text')
          : t('sell.coach.city')
        : listed
          ? t('sell.coach.placeListed')
          : t('sell.coach.place')

  const priceCard = (
    <PriceCard
      grade={grade}
      gradeWord={gradeWord}
      ask={ask}
      floor={floor}
      reason={gradeInfo.reasonKeys.map((key) => t(key)).join(' ')}
      aftermarket={aftermarket}
    />
  )

  const assistant = (
    <AssistantCard
      line={coach}
      question={assistQ}
      answer={assistA}
      busy={aiBusy}
      hasKey={hasKey}
      startCollapsed={step === 'photos'}
      onQuestion={setAssistQ}
      onSend={() => void askAssistant(assistQ)}
      onCheckPhoto={step === 'photos' && photos[viewSlot] ? () => void checkPhoto() : undefined}
      onPolish={step === 'text' ? () => void polishBody() : undefined}
    />
  )

  return (
    <div
      className={`w-full min-w-0 max-w-full space-y-4 ${
        step === 'photos'
          ? 'pb-[max(8.5rem,calc(7.5rem+env(safe-area-inset-bottom)))] lg:pb-8'
          : 'pb-8'
      }`}
    >
      <BackLink fallback={`/toestel/${device.id}`} />

      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {t('sell.kicker')}
        </p>
        <h2 className="font-display mt-1 break-words text-2xl text-stone-50 sm:text-3xl">
          {phoneTitle(device.brand, device.model)}
        </h2>
        <p className="mt-1 truncate text-sm text-stone-400">
          {ticketLabel(device.ticketNr)}
          {[device.storage, device.color].filter(Boolean).map((bit) => ` · ${bit}`).join('')}
        </p>
      </div>

      <StepTabs
        step={step}
        ready={ready}
        onStep={setStep}
      />

      {grade === 'skip' ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {t(gradeInfo.reasonKeys[0] ?? 'sell.skipParts')}
        </p>
      ) : null}
      {isStalePhone(device) ? (
        <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t('sell.stale')}
        </p>
      ) : null}
      {cheer ? (
        <p className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {cheer}
        </p>
      ) : null}
      {err ? <p className="text-sm text-rose-300">{err}</p> : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">{priceCard}</div>
        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          {step === 'photos' ? (
            <PhotosPane
              photos={photos}
              viewSlot={viewSlot}
              viewSrc={viewSrc}
              viewUnlocked={viewUnlocked}
              pending={pending}
              busy={busy}
              filled={filled}
              need={need}
              ready={ready}
              nextId={nextId}
              onGo={goSlot}
              onFile={onFile}
              onConfirm={confirmPending}
              onReject={rejectPending}
              onClear={() => clearSlot(viewSlot)}
              onSkipDamage={skipDamage}
              onNextText={() => setStep('text')}
            />
          ) : null}

          {step === 'text' ? (
            <section className="min-w-0 space-y-3 rounded-2xl border border-white/8 bg-white/3 p-4">
              <h3 className="text-sm font-medium text-stone-200">{t('sell.copyHeading')}</h3>
              <p className="text-sm text-stone-400">{t('sell.copyHint')}</p>
              <CopyBlock
                label={t('sell.copyTitle')}
                text={title}
                copied={copied === 'title'}
                onCopy={() => {
                  void copyText('title', title)
                  setChecks((c) => ({ ...c, title: true }))
                }}
              />
              <CopyBlock
                label={t('sell.copyBody')}
                text={body}
                copied={copied === 'body'}
                onCopy={() => {
                  void copyText('body', body)
                  setChecks((c) => ({ ...c, body: true }))
                }}
              />
              <PrimaryButton type="button" className="w-full" onClick={() => setStep('place')}>
                {t('sell.nextPlace')}
              </PrimaryButton>
            </section>
          ) : null}

          {step === 'place' ? (
            <PlacePane
              listed={listed}
              listings={device.listings ?? []}
              title={title}
              body={body}
              linkDraft={linkDraft}
              checks={checks}
              buyersOpen={buyersOpen}
              copied={copied}
              onList={() => setListOpen(true)}
              onLink={setLinkDraft}
              onSaveLink={saveLink}
              onCheck={(key) => setChecks((c) => ({ ...c, [key]: true }))}
              onCopy={(kind, text, extra) => {
                void copyText(kind, text)
                extra?.()
              }}
              onWa={shareWa}
              onBuyers={() => setBuyersOpen((v) => !v)}
              replies={BUYER_REPLY_IDS.map((rid) => ({
                id: rid,
                q: t(`sell.q.${rid}`),
                text: replyText(rid),
              }))}
            />
          ) : null}
        </div>

        <div className="min-w-0 lg:sticky lg:top-4 lg:col-start-2 lg:row-start-2">{assistant}</div>
      </div>

      {step === 'photos' && !pending ? (
        <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 border-t border-white/10 bg-stone-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {ready ? (
            <PrimaryButton type="button" className="w-full" onClick={() => setStep('text')}>
              {t('sell.nextToText')}
            </PrimaryButton>
          ) : null}
          <SlotFileButtons
            busy={busy}
            filled={Boolean(photos[viewSlot])}
            disabled={!viewUnlocked}
            primary={!ready}
            onFile={(file) => void onFile(viewSlot, file)}
          />
        </div>
      ) : null}

      {listOpen ? (
        <ListForSaleModal
          phone={device}
          suggestedAsk={ask}
          onClose={() => setListOpen(false)}
          onListed={() => {
            setStep('place')
            setBuyersOpen(true)
          }}
        />
      ) : null}
    </div>
  )
}

function StepTabs({
  step,
  ready,
  onStep,
}: {
  step: SellStep
  ready: boolean
  onStep: (s: SellStep) => void
}) {
  const { t } = useI18n()
  const tabs: { id: SellStep; n: number; lock: boolean }[] = [
    { id: 'photos', n: 1, lock: false },
    { id: 'text', n: 2, lock: !ready },
    { id: 'place', n: 3, lock: !ready },
  ]
  return (
    <ol className="grid min-w-0 grid-cols-3 gap-2">
      {tabs.map((tab) => (
        <li key={tab.id}>
          <button
            type="button"
            disabled={tab.lock}
            onClick={() => onStep(tab.id)}
            className={`flex min-h-11 w-full min-w-0 flex-col items-center justify-center rounded-xl px-2 text-center text-xs ring-1 ${
              step === tab.id
                ? 'bg-amber-500 text-stone-950 ring-amber-400'
                : tab.lock
                  ? 'text-stone-600 ring-white/10'
                  : 'text-stone-300 ring-white/15 hover:bg-white/5'
            }`}
          >
            <span className="font-mono text-[11px]">{tab.n}</span>
            <span className="truncate">{t(`sell.tab.${tab.id}`)}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function PriceCard({
  grade,
  gradeWord,
  ask,
  floor,
  reason,
  aftermarket,
}: {
  grade: string
  gradeWord: string
  ask: number
  floor: number
  reason: string
  aftermarket: boolean
}) {
  const { t } = useI18n()
  return (
    <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4">
      <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('sell.askTitle')}</p>
      <p className="money mt-1 font-mono text-2xl text-stone-50">{euro(ask)}</p>
      <p className="mt-1 text-sm text-stone-300">
        {grade === 'skip' ? t('sell.grade.skip') : t('sell.grade', { grade, word: gradeWord })}
      </p>
      <p className="mt-2 min-w-0 break-words text-sm text-stone-400">{t('sell.askPlain', { ask: euro(ask), floor: euro(floor) })}</p>
      <p className="mt-1 min-w-0 break-words text-xs text-stone-500">{reason}</p>
      {aftermarket ? <p className="mt-2 text-sm text-amber-200/90">{t('sell.aftermarket')}</p> : null}
    </section>
  )
}

function AssistantCard({
  line,
  question,
  answer,
  busy,
  hasKey,
  startCollapsed,
  onQuestion,
  onSend,
  onCheckPhoto,
  onPolish,
}: {
  line: string
  question: string
  answer: string
  busy: boolean
  hasKey: boolean
  startCollapsed?: boolean
  onQuestion: (v: string) => void
  onSend: () => void
  onCheckPhoto?: () => void
  onPolish?: () => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(!startCollapsed)

  useEffect(() => {
    setOpen(!startCollapsed)
  }, [startCollapsed])

  return (
    <section className="min-w-0 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left lg:hidden"
      >
        <span className="text-[11px] uppercase tracking-wider text-amber-200/80">{t('sell.assistToggle')}</span>
        <span className="text-stone-500">{open ? '−' : '+'}</span>
      </button>
      <p className="hidden text-[11px] uppercase tracking-wider text-amber-200/80 lg:block">{t('sell.assistTitle')}</p>
      <p className="mt-2 min-w-0 break-words text-sm text-stone-100">{line}</p>
      <div className={open ? 'block' : 'hidden lg:block'}>
        {answer ? <p className="mt-3 min-w-0 break-words text-sm text-stone-300">{answer}</p> : null}
        <div className="mt-3 flex min-w-0 flex-col gap-2">
          {onCheckPhoto ? (
            <GhostButton type="button" className="w-full" disabled={busy || !hasKey} onClick={onCheckPhoto}>
              {busy ? t('coach.working') : t('sell.assistCheck')}
            </GhostButton>
          ) : null}
          {onPolish ? (
            <GhostButton type="button" className="w-full" disabled={busy || !hasKey} onClick={onPolish}>
              {busy ? t('coach.working') : t('sell.polish')}
            </GhostButton>
          ) : null}
          <TextInput
            value={question}
            onChange={(e) => onQuestion(e.target.value)}
            placeholder={t('sell.assistPh')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSend()
              }
            }}
          />
          <GhostButton type="button" className="w-full" disabled={busy || !question.trim()} onClick={onSend}>
            {busy ? t('coach.working') : t('sell.assistSend')}
          </GhostButton>
        </div>
        {!hasKey ? (
          <p className="mt-2 text-xs text-stone-500">
            {t('sell.needKey')}{' '}
            <Link to="/instellingen" className="text-amber-400 underline-offset-2 hover:underline">
              {t('nav.backup')}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}

function PhotosPane({
  photos,
  viewSlot,
  viewSrc,
  viewUnlocked,
  pending,
  busy,
  filled,
  need,
  ready,
  nextId,
  onGo,
  onFile,
  onConfirm,
  onReject,
  onClear,
  onSkipDamage,
  onNextText,
}: {
  photos: PhotoMap
  viewSlot: ListingSlotId
  viewSrc?: string
  viewUnlocked: boolean
  pending: { slot: ListingSlotId; dataUrl: string } | null
  busy: boolean
  filled: number
  need: number
  ready: boolean
  nextId: ListingSlotId | null
  onGo: (id: ListingSlotId) => void
  onFile: (slot: ListingSlotId, file: File | undefined) => void
  onConfirm: () => void
  onReject: () => void
  onClear: () => void
  onSkipDamage: () => void
  onNextText: () => void
}) {
  const { t } = useI18n()
  const { n, of } = slotStepLabel(viewSlot)
  const current = nextId === viewSlot
  const optional = viewSlot === 'damage'

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-sm text-stone-300">{t('sell.progress', { filled, need })}</p>
      <GalleryStrip photos={photos} viewSlot={viewSlot} nextId={nextId} onGo={onGo} />

      <article
        className={`min-w-0 overflow-hidden rounded-2xl border bg-white/3 ${
          current ? 'border-amber-400/80 ring-2 ring-amber-500/40' : 'border-white/8'
        }`}
      >
        <div className="flex items-start justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-amber-500/80">
              {t('sell.step', { n, total: of })}
              {optional ? ` · ${t('sell.optional')}` : ''}
            </p>
            <h3 className="truncate text-base font-medium text-stone-50">{t(`sell.slot.${viewSlot}`)}</h3>
            <p className="mt-1 min-w-0 break-words text-sm text-stone-400">{t(`sell.how.${viewSlot}`)}</p>
          </div>
          {current ? (
            <span className="shrink-0 rounded-full bg-amber-500 px-2 py-1 text-[11px] font-semibold text-stone-950">
              {t('sell.now')}
            </span>
          ) : photos[viewSlot] ? (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200">
              {t('sell.done')}
            </span>
          ) : null}
        </div>

        <div className="relative mx-auto aspect-[3/4] w-full max-h-[min(70dvh,36rem)] bg-black/50">
          {viewSrc ? (
            <img src={viewSrc} alt="" className="size-full object-contain" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 px-4 py-6">
              <SlotExample slot={viewSlot} />
              <p className="text-center text-xs text-stone-500">{t('sell.exampleHint')}</p>
            </div>
          )}
          {pending ? (
            <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/90 to-transparent p-3">
              <p className="text-sm font-medium text-stone-100">{t('sell.confirmTitle')}</p>
              <div className="grid grid-cols-2 gap-2">
                <PrimaryButton type="button" className="w-full" onClick={onConfirm}>
                  {t('sell.confirmUse')}
                </PrimaryButton>
                <GhostButton type="button" className="w-full" onClick={onReject}>
                  {t('sell.confirmAgain')}
                </GhostButton>
              </div>
            </div>
          ) : null}
        </div>

        {!pending ? (
          <div className="hidden flex-col gap-2 p-3 lg:flex">
            <SlotFileButtons
              busy={busy}
              filled={Boolean(photos[viewSlot])}
              disabled={!viewUnlocked}
              primary
              onFile={(file) => void onFile(viewSlot, file)}
            />
            {photos[viewSlot] ? (
              <GhostButton type="button" className="w-full" onClick={onClear}>
                {t('sell.remove')}
              </GhostButton>
            ) : null}
          </div>
        ) : null}
      </article>

      {optional && ready ? (
        <GhostButton type="button" className="w-full" onClick={onSkipDamage}>
          {t('sell.skipDamage')}
        </GhostButton>
      ) : null}
      {ready ? (
        <PrimaryButton type="button" className="hidden w-full lg:inline-flex" onClick={onNextText}>
          {t('sell.nextToText')}
        </PrimaryButton>
      ) : null}
      <p className="text-xs text-stone-500">{t('sell.localHint')}</p>
    </div>
  )
}

function GalleryStrip({
  photos,
  viewSlot,
  nextId,
  onGo,
}: {
  photos: PhotoMap
  viewSlot: ListingSlotId
  nextId: ListingSlotId | null
  onGo: (id: ListingSlotId) => void
}) {
  const { t } = useI18n()
  return (
    <ol className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">
      {LISTING_SLOTS.map((slot) => {
        const { n } = slotStepLabel(slot.id)
        const src = photos[slot.id]
        const unlocked = slotUnlocked(slot.id, photos)
        const current = viewSlot === slot.id
        const next = nextId === slot.id
        return (
          <li key={slot.id} className="shrink-0">
            <button
              type="button"
              disabled={!unlocked}
              onClick={() => onGo(slot.id)}
              className={`relative flex min-h-11 min-w-11 overflow-hidden rounded-xl ${
                current
                  ? 'size-16 ring-2 ring-amber-400'
                  : unlocked
                    ? 'size-12 ring-1 ring-white/15'
                    : 'size-11 opacity-40 ring-1 ring-white/10'
              }`}
            >
              {src ? (
                <img src={src} alt="" className="size-full object-cover" />
              ) : (
                <span
                  className={`flex size-full items-center justify-center font-mono text-[11px] ${
                    next ? 'bg-amber-500 text-stone-950' : 'bg-white/5 text-stone-400'
                  }`}
                >
                  {n}
                </span>
              )}
              <span className="sr-only">{t(`sell.slot.${slot.id}`)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function PlacePane({
  listed,
  listings,
  title,
  body,
  linkDraft,
  checks,
  buyersOpen,
  copied,
  onList,
  onLink,
  onSaveLink,
  onCheck,
  onCopy,
  onWa,
  onBuyers,
  replies,
}: {
  listed: boolean
  listings: { id: string; platform: string; url: string; askingPrice: number; active: boolean }[]
  title: string
  body: string
  linkDraft: string
  checks: { title: boolean; body: boolean; order: boolean }
  buyersOpen: boolean
  copied: string | null
  onList: () => void
  onLink: (v: string) => void
  onSaveLink: () => void
  onCheck: (key: 'title' | 'body' | 'order') => void
  onCopy: (kind: string, text: string, extra?: () => void) => void
  onWa: (text: string) => void
  onBuyers: () => void
  replies: { id: string; q: string; text: string }[]
}) {
  const { t } = useI18n()
  return (
    <div className="min-w-0 space-y-4">
      <PrimaryButton type="button" className="w-full" onClick={onList}>
        {listed ? t('pdet.addList') : t('sell.listCta')}
      </PrimaryButton>

      <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4">
        <h3 className="text-sm font-medium text-stone-200">{t('sell.checkTitle')}</h3>
        <ol className="mt-3 space-y-3 text-sm text-stone-300">
          <li>
            <a
              href="https://www.marktplaats.nl/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-amber-400 underline-offset-2 hover:underline"
            >
              {t('sell.checkOpenMp')}
            </a>
          </li>
          <li className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className={checks.title ? 'text-emerald-300' : ''}>{t('sell.checkCopyTitle')}</span>
            <GhostButton
              type="button"
              className="w-full sm:w-auto"
              onClick={() => onCopy('title', title, () => onCheck('title'))}
            >
              {copied === 'title' ? t('common.copied') : t('common.copy')}
            </GhostButton>
          </li>
          <li className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className={checks.body ? 'text-emerald-300' : ''}>{t('sell.checkCopyBody')}</span>
            <GhostButton
              type="button"
              className="w-full sm:w-auto"
              onClick={() => onCopy('body', body, () => onCheck('body'))}
            >
              {copied === 'body' ? t('common.copied') : t('common.copy')}
            </GhostButton>
          </li>
          <li>
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                checked={checks.order}
                onChange={(e) => e.target.checked && onCheck('order')}
                className="mt-1 size-4 accent-amber-500"
              />
              <span>{t('sell.checkOrder')}</span>
            </label>
          </li>
        </ol>
        <p className="mt-3 text-xs text-stone-500">{t('sell.mpHint')}</p>
        {listed ? (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-stone-500">{t('sell.checkLink')}</p>
            <TextInput
              value={linkDraft}
              onChange={(e) => onLink(e.target.value)}
              placeholder={t('sell.checkLinkPh')}
            />
            <GhostButton type="button" className="w-full" onClick={onSaveLink}>
              {t('sell.checkSaveLink')}
            </GhostButton>
            {listings.filter((l) => l.active).map((l) => (
              <p key={l.id} className="truncate text-xs text-stone-500">
                {platformName(l.platform)}
                {l.url ? ` · ${l.url}` : ''}
              </p>
            ))}
          </div>
        ) : null}
        <GhostButton type="button" className="mt-3 w-full" onClick={() => onWa(`${title}\n\n${body}`)}>
          {t('sell.waListing')}
        </GhostButton>
      </section>

      {listed ? (
        <section className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4">
          <button
            type="button"
            onClick={onBuyers}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium text-stone-100"
          >
            {t('sell.buyersToggle')}
            <span className="text-stone-500">{buyersOpen ? '−' : '+'}</span>
          </button>
          {buyersOpen ? (
            <ul className="mt-3 grid min-w-0 grid-cols-1 gap-3">
              {replies.map((r) => (
                <li key={r.id} className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-medium text-stone-100">{r.q}</p>
                  <p className="mt-2 min-w-0 break-words text-sm text-stone-300">{r.text}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <GhostButton type="button" className="w-full" onClick={() => onCopy(r.id, r.text)}>
                      {copied === r.id ? t('common.copied') : t('common.copy')}
                    </GhostButton>
                    <GhostButton type="button" className="w-full" onClick={() => onWa(r.text)}>
                      {t('sell.wa')}
                    </GhostButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3">
            <MessagesTeaser side="verkopen" />
          </div>
        </section>
      ) : (
        <p className="text-sm text-stone-500">{t('sell.buyersLater')}</p>
      )}
    </div>
  )
}

function CopyBlock({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string
  text: string
  copied: boolean
  onCopy: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-stone-500">{label}</p>
        <GhostButton type="button" className="min-h-11 shrink-0 px-3" onClick={onCopy}>
          {copied ? t('common.copied') : t('common.copy')}
        </GhostButton>
      </div>
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-stone-200">
        {text}
      </pre>
    </div>
  )
}

function SlotFileButtons({
  busy,
  onFile,
  filled,
  primary,
  disabled,
}: {
  busy: boolean
  onFile: (file: File | undefined) => void
  filled?: boolean
  primary?: boolean
  disabled?: boolean
}) {
  const { t } = useI18n()
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const Btn = primary ? PrimaryButton : GhostButton
  const off = busy || disabled

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={off}
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={off}
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <Btn type="button" className="w-full" disabled={off} onClick={() => camRef.current?.click()}>
        {busy ? t('coach.working') : filled ? t('sell.replace') : t('sell.take')}
      </Btn>
      <GhostButton type="button" className="w-full" disabled={off} onClick={() => galRef.current?.click()}>
        {t('sell.pick')}
      </GhostButton>
    </div>
  )
}
