import { useRef, useState } from 'react'
import { DeviceSync } from '../components/DeviceSync'
import { useI18n } from '../i18n'
import { readOpenAiKey, writeOpenAiKey } from '../lib/ai'
import { hashPassword, passwordMatches, writeCustomGateHash } from '../lib/gate'
import { useStore } from '../store'
import { EMPTY_WORKSHOP, type AppData, type WorkshopProfile } from '../types'
import { ConfirmDialog, Field, GhostButton, PrimaryButton, TextInput, onSubmit } from '../ui'

export function Settings() {
  const { t, lang, setLang } = useI18n()
  const { data, importData, setWorkshop } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const w = data.workshop ?? EMPTY_WORKSHOP
  const [companyName, setCompanyName] = useState(w.companyName)
  const [phone, setPhone] = useState(w.phone)
  const [city, setCity] = useState(w.city)
  const [address, setAddress] = useState(w.address)
  const [kvk, setKvk] = useState(w.kvk)
  const [iban, setIban] = useState(w.iban)
  const [email, setEmail] = useState(w.email)
  const [saved, setSaved] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [aiKey, setAiKey] = useState(() => readOpenAiKey())
  const [aiSaved, setAiSaved] = useState(false)

  function download() {
    const blob = new Blob(
      [JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `phoneflip-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function onFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!Array.isArray(parsed.phones)) throw new Error('ongeldig')
        setPendingBackup(parsed)
      } catch {
        alert(t('settings.badFile'))
      }
    }
    reader.readAsText(file)
  }

  function saveWorkshop() {
    const next: WorkshopProfile = {
      companyName: companyName.trim() || EMPTY_WORKSHOP.companyName,
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      kvk: kvk.trim(),
      iban: iban.trim(),
      email: email.trim(),
      locale: lang,
      passwordHash: w.passwordHash,
      updatedAt: new Date().toISOString(),
    }
    setWorkshop(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  function savePassword() {
    setPwError('')
    setPwSaved(false)
    if (!passwordMatches(currentPw)) {
      setPwError(t('settings.pwWrong'))
      return
    }
    if (newPw.trim().length < 4) {
      setPwError(t('settings.pwShort'))
      return
    }
    if (newPw !== confirmPw) {
      setPwError(t('settings.pwMismatch'))
      return
    }
    if (passwordMatches(newPw)) {
      setPwError(t('settings.pwSame'))
      return
    }
    const passwordHash = hashPassword(newPw)
    writeCustomGateHash(passwordHash)
    setWorkshop({
      ...(data.workshop ?? EMPTY_WORKSHOP),
      locale: lang,
      passwordHash,
    })
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setPwSaved(true)
    window.setTimeout(() => setPwSaved(false), 2500)
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/80">
          {t('settings.kicker')}
        </p>
        <h2 className="font-display mt-1 text-2xl text-stone-50 sm:text-3xl">{t('settings.title')}</h2>
        <p className="mt-2 text-sm text-stone-400">{t('settings.hint')}</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5">
        <div>
          <h3 className="text-sm font-medium text-stone-200">{t('lang.section')}</h3>
          <p className="mt-1 text-xs text-stone-500">{t('lang.hint')}</p>
          <p className="mt-2 text-sm text-stone-200">
            {t('lang.current', { name: lang === 'en' ? t('lang.en') : t('lang.nl') })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['nl', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium ${
                lang === code
                  ? 'bg-amber-500 text-stone-950'
                  : 'border border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
              }`}
              onClick={() => {
                setLang(code)
                setWorkshop({
                  ...(data.workshop ?? EMPTY_WORKSHOP),
                  locale: code,
                  passwordHash: w.passwordHash,
                })
              }}
            >
              {t(code === 'nl' ? 'lang.nl' : 'lang.en')}
            </button>
          ))}
        </div>
      </section>

      <form
        className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5"
        onSubmit={onSubmit(savePassword)}
      >
        <div>
          <h3 className="text-sm font-medium text-stone-200">{t('settings.pwTitle')}</h3>
          <p className="mt-1 text-xs text-stone-500">{t('settings.pwHint')}</p>
        </div>
        <Field label={t('settings.pwCurrent')}>
          <TextInput
            type="password"
            autoComplete="current-password"
            className="min-h-11"
            value={currentPw}
            onChange={(e) => {
              setCurrentPw(e.target.value)
              if (pwError) setPwError('')
            }}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('settings.pwNew')}>
            <TextInput
              type="password"
              autoComplete="new-password"
              className="min-h-11"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value)
                if (pwError) setPwError('')
              }}
            />
          </Field>
          <Field label={t('settings.pwConfirm')}>
            <TextInput
              type="password"
              autoComplete="new-password"
              className="min-h-11"
              value={confirmPw}
              onChange={(e) => {
                setConfirmPw(e.target.value)
                if (pwError) setPwError('')
              }}
            />
          </Field>
        </div>
        {pwError ? <p className="text-sm text-rose-400">{pwError}</p> : null}
        <PrimaryButton type="submit" className="w-full sm:w-auto">
          {pwSaved ? t('settings.pwSaved') : t('settings.pwSave')}
        </PrimaryButton>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5"
        onSubmit={onSubmit(() => {
          writeOpenAiKey(aiKey)
          setAiSaved(true)
          window.setTimeout(() => setAiSaved(false), 2000)
        })}
      >
        <div>
          <h3 className="text-sm font-medium text-stone-200">{t('settings.aiTitle')}</h3>
          <p className="mt-1 text-xs text-stone-500">{t('settings.aiHint')}</p>
        </div>
        <Field label={t('settings.aiKey')}>
          <TextInput
            type="password"
            autoComplete="off"
            className="min-h-11"
            value={aiKey}
            onChange={(e) => setAiKey(e.target.value)}
            placeholder="sk-…"
          />
        </Field>
        <PrimaryButton type="submit" className="w-full sm:w-auto">
          {aiSaved ? t('common.saved') : t('settings.aiSave')}
        </PrimaryButton>
        {readOpenAiKey() ? (
          <p className="text-xs text-stone-500">{t('settings.aiOnDevice')}</p>
        ) : null}
      </form>

      <DeviceSync />

      <form
        className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5"
        onSubmit={onSubmit(saveWorkshop)}
      >
        <div>
          <h3 className="text-sm font-medium text-stone-200">{t('settings.docs')}</h3>
          <p className="mt-1 text-xs text-stone-500">{t('settings.docsHint')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('settings.company')}>
            <TextInput
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Phone Flipper"
            />
          </Field>
          <Field label={t('settings.phone')}>
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 …"
            />
          </Field>
          <Field label={t('settings.city')}>
            <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('settings.cityPh')} />
          </Field>
          <Field label={t('settings.address')}>
            <TextInput
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('settings.addressPh')}
            />
          </Field>
          <Field label={t('settings.email')}>
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@…"
            />
          </Field>
          <Field label={t('settings.kvk')}>
            <TextInput value={kvk} onChange={(e) => setKvk(e.target.value)} />
          </Field>
        </div>
        <Field label={t('settings.iban')}>
          <TextInput value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00 BANK 0000 0000 00" />
        </Field>
        <PrimaryButton type="submit" className="w-full sm:w-auto">
          {saved ? t('common.saved') : t('settings.saveProfile')}
        </PrimaryButton>
      </form>

      <div className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="text-sm text-stone-300">
          {t('settings.counts', {
            phones: data.phones.length,
            jobs: data.repairJobs.length,
            quotes: (data.quotes ?? []).length,
            receipts: (data.receipts ?? []).length,
            eq: data.equipment.length,
            wish: data.equipmentWishlist.length,
            stock: data.stockParts.length,
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="button" className="w-full sm:w-auto" onClick={download}>
            {t('settings.download')}
          </PrimaryButton>
          <GhostButton type="button" className="w-full sm:w-auto" onClick={() => fileRef.current?.click()}>
            {t('settings.restore')}
          </GhostButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <p className="text-xs text-stone-500">
        {t('settings.warn')}
      </p>
      {pendingBackup && (
        <ConfirmDialog
          title={t('settings.restoreTitle')}
          body={t('settings.restoreBody')}
          confirmLabel={t('common.replace')}
          onClose={() => setPendingBackup(null)}
          onConfirm={() => {
            importData(pendingBackup)
            setPendingBackup(null)
          }}
        />
      )}
    </div>
  )
}

