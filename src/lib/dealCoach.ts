import {
  IPHONES,
  SKIP_UNDER as SHEET_SKIP,
  buyForDefects,
  type DefectId,
  type IphoneMarkt,
  type MaxBuyCell,
} from '../data/marktwaarde'
import { jobIsClosed, jobMargin, jobPartsCost, phoneCost, phoneMargin } from './calc'
import type { Phone, Quote, RepairJob } from '../types'

/** Extra buffer on top of the cheat sheet — first-year flipper in NL. */
export const BEGINNER_EXTRA = 15

export const DEFECTS: DefectId[] = ['scherm', 'accu', 'laadpoort', 'camera', 'behuizing']

export const HARD_SKIPS = ['faceid', 'water', 'icloud', 'board'] as const
export type HardSkip = (typeof HARD_SKIPS)[number]

export type Difficulty = 'easy' | 'medium' | 'hard' | 'skip'

export type BuyVerdict = 'ok' | 'tight' | 'skip' | 'unknown'

export type BuyAdvice = {
  verdict: BuyVerdict
  difficulty: Difficulty
  /** Conservative max a beginner should pay. */
  max: number | null
  /** Cheat-sheet number (higher). */
  sheetMax: number | null
  /** Typical Marktplaats ask after a cheap fix (light housing). */
  askFast: number | null
  /** Clean private ask after fix. */
  askClean: number | null
  row: IphoneMarkt | null
  proish: boolean
  scenarioId: string | null
  reasonKeys: string[]
}

export function daysSince(iso: string, now = new Date()): number {
  const raw = (iso || '').slice(0, 10)
  if (!raw) return 0
  const d = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return 0
  const ms = now.getTime() - d.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export function phoneAgeDays(phone: Phone, now = new Date()): number {
  return daysSince(phone.purchaseDate || phone.createdAt, now)
}

export function jobAgeDays(job: RepairJob, now = new Date()): number {
  return daysSince(job.dateIn || job.createdAt, now)
}

export function quoteAgeDays(quote: Quote, now = new Date()): number {
  return daysSince(quote.date || quote.createdAt, now)
}

export function stalePhoneDays(status: Phone['status']): number {
  if (status === 'klaar') return 3
  if (status === 'te_koop') return 10
  if (status === 'bezig') return 10
  return 7
}

export function isStalePhone(phone: Phone, now = new Date()): boolean {
  if (phone.status === 'verkocht') return false
  return phoneAgeDays(phone, now) >= stalePhoneDays(phone.status)
}

export function isStaleJob(job: RepairJob, now = new Date()): boolean {
  if (job.status === 'opgehaald') return false
  if (job.status === 'klaar') return jobAgeDays(job, now) >= 5
  return jobAgeDays(job, now) >= 10
}

export function isStaleQuote(quote: Quote, now = new Date()): boolean {
  return quote.status === 'open' && quoteAgeDays(quote, now) >= 2
}

function round5(n: number): number {
  return Math.round(n / 5) * 5
}

function cellLow(cell: MaxBuyCell): number | null {
  switch (cell.kind) {
    case 'point':
      return cell.value
    case 'band':
      return Math.min(cell.min, cell.max)
    case 'either':
      return Math.min(cell.a, cell.b)
    default:
      return null
  }
}

export function matchIphone(model: string): { row: IphoneMarkt; proish: boolean } | null {
  const s = model.toLowerCase().replace(/iphone/g, ' ').replace(/\s+/g, ' ')
  const proish = /\b(pro|max|plus|mini)\b/.test(s)
  const ids = ['17', '16', '15', '14', '13', '12', '11'] as const
  for (const id of ids) {
    if (new RegExp(`(^|\\D)${id}(\\D|$)`).test(s)) {
      const row = IPHONES.find((p) => p.id === id)
      if (row) return { row, proish }
    }
  }
  return null
}

function difficultyFor(
  row: IphoneMarkt | null,
  defects: DefectId[],
  skips: HardSkip[],
): Difficulty {
  if (skips.length > 0) return 'skip'
  if (!row) return defects.includes('scherm') ? 'hard' : 'medium'
  const gen = Number(row.id)
  if (defects.includes('scherm') && gen >= 16) return 'skip'
  if (defects.includes('scherm') && gen >= 12) return 'hard'
  if (defects.includes('scherm') && defects.length > 1) return 'hard'
  if (defects.includes('scherm') || defects.includes('camera')) return 'medium'
  if (gen >= 16) return 'medium'
  return 'easy'
}

function reasonKeysFor(input: {
  verdict: BuyVerdict
  difficulty: Difficulty
  skips: HardSkip[]
  defects: DefectId[]
  row: IphoneMarkt | null
  proish: boolean
}): string[] {
  const keys: string[] = []
  if (input.skips.includes('icloud')) keys.push('coach.skipIcloud')
  if (input.skips.includes('water')) keys.push('coach.skipWater')
  if (input.skips.includes('faceid')) keys.push('coach.skipFaceid')
  if (input.skips.includes('board')) keys.push('coach.skipBoard')
  if (input.proish) keys.push('coach.proish')
  if (!input.row) keys.push('coach.noSheet')
  if (input.difficulty === 'hard') keys.push('coach.hardOled')
  if (input.difficulty === 'skip' && input.defects.includes('scherm') && Number(input.row?.id) >= 16) {
    keys.push('coach.skipNewScreen')
  }
  if (input.difficulty === 'easy') keys.push('coach.easyHint')
  if (input.verdict === 'tight') keys.push('coach.tightHint')
  if (input.verdict === 'ok' && input.difficulty === 'easy') keys.push('coach.okHint')
  return [...new Set(keys)]
}

export function buyAdvice(input: {
  brand?: string
  model: string
  defects: DefectId[]
  skips?: HardSkip[]
}): BuyAdvice {
  const skips = input.skips ?? []
  const hit = matchIphone(input.model)
  const row = hit?.row ?? null
  const proish = hit?.proish ?? false
  const difficulty = difficultyFor(row, input.defects, skips)

  if (difficulty === 'skip' || skips.length > 0) {
    return {
      verdict: 'skip',
      difficulty: 'skip',
      max: null,
      sheetMax: row ? cellLow(buyForDefects(row, input.defects)) : null,
      askFast: row?.lichtHuis.rekenwaarde ?? null,
      askClean: row?.prive.rekenwaarde ?? null,
      row,
      proish,
      scenarioId: null,
      reasonKeys: reasonKeysFor({
        verdict: 'skip',
        difficulty: 'skip',
        skips,
        defects: input.defects,
        row,
        proish,
      }),
    }
  }

  if (!row) {
    return {
      verdict: 'unknown',
      difficulty,
      max: null,
      sheetMax: null,
      askFast: null,
      askClean: null,
      row: null,
      proish,
      scenarioId: null,
      reasonKeys: reasonKeysFor({
        verdict: 'unknown',
        difficulty,
        skips,
        defects: input.defects,
        row: null,
        proish,
      }),
    }
  }

  const cell = buyForDefects(row, input.defects)
  const sheet = cellLow(cell)
  const scenario = row.scenarios.find(
    (s) => [...s.defects].sort().join('|') === [...input.defects].sort().join('|'),
  )
  if (sheet == null || cell.kind === 'skip' || cell.kind === 'unknown') {
    return {
      verdict: 'skip',
      difficulty: difficulty === 'easy' ? 'hard' : difficulty,
      max: null,
      sheetMax: null,
      askFast: row.lichtHuis.rekenwaarde,
      askClean: row.prive.rekenwaarde,
      row,
      proish,
      scenarioId: scenario?.id ?? null,
      reasonKeys: ['coach.skipTight', ...reasonKeysFor({
        verdict: 'skip',
        difficulty: 'hard',
        skips,
        defects: input.defects,
        row,
        proish,
      })],
    }
  }

  const beginner = round5(sheet - BEGINNER_EXTRA)
  const max = beginner < SHEET_SKIP ? null : beginner
  const verdict: BuyVerdict = max == null ? 'skip' : beginner < sheet - 5 && beginner <= 70 ? 'tight' : 'ok'
  const finalVerdict: BuyVerdict = max == null ? 'skip' : difficulty === 'hard' ? 'tight' : verdict

  return {
    verdict: finalVerdict,
    difficulty,
    max,
    sheetMax: sheet,
    askFast: row.lichtHuis.rekenwaarde,
    askClean: row.prive.rekenwaarde,
    row,
    proish,
    scenarioId: scenario?.id ?? (input.defects.length === 0 ? 'werkt' : null),
    reasonKeys: reasonKeysFor({
      verdict: finalVerdict,
      difficulty,
      skips,
      defects: input.defects,
      row,
      proish,
    }),
  }
}

export function compareOffer(offer: number, advice: BuyAdvice): 'under' | 'ok' | 'over' | 'skip' {
  if (advice.verdict === 'skip' || advice.max == null) return 'skip'
  if (!(offer > 0)) return 'ok'
  if (offer <= advice.max) return 'under'
  if (advice.sheetMax != null && offer <= advice.sheetMax) return 'ok'
  return 'over'
}

export function suggestedAskForPhone(phone: Phone): {
  ask: number
  floor: number
  fromMarket: boolean
} {
  const kosten = phoneCost(phone)
  const floor = round5(kosten + BEGINNER_EXTRA)
  const hit = matchIphone(`${phone.brand} ${phone.model}`)
  const housingLeft = /huis|deuk|dent|behuiz|kras/i.test(`${phone.damage} ${phone.todo}`)
  if (hit) {
    const ask = housingLeft ? hit.row.lichtHuis.rekenwaarde : hit.row.prive.rekenwaarde
    const fast = hit.row.lichtHuis.rekenwaarde
    const beginnerAsk = housingLeft ? fast : round5((fast + ask) / 2)
    return { ask: Math.max(beginnerAsk, floor), floor, fromMarket: true }
  }
  return { ask: Math.max(round5(kosten * 1.15), floor), floor, fromMarket: false }
}

export function suggestedLabor(input: {
  model: string
  defects: DefectId[]
  skips?: HardSkip[]
  kind?: 'klant' | 'vriend'
}): { labor: number; difficulty: Difficulty; reasonKeys: string[] } {
  const advice = buyAdvice(input)
  if (input.kind === 'vriend') {
    return { labor: 0, difficulty: advice.difficulty, reasonKeys: ['coach.friendLabor', ...advice.reasonKeys] }
  }
  if (advice.difficulty === 'skip') {
    return { labor: 0, difficulty: 'skip', reasonKeys: advice.reasonKeys }
  }
  let labor = 0
  const d = new Set(input.defects)
  if (d.has('accu')) labor += 40
  if (d.has('laadpoort')) labor += 45
  if (d.has('camera')) labor += 40
  if (d.has('behuizing') && !d.has('scherm')) labor += 0
  if (d.has('scherm')) {
    const gen = Number(advice.row?.id ?? 0)
    labor += gen <= 11 ? 50 : 70
  }
  if (labor === 0 && input.defects.length === 0) labor = 35
  return { labor, difficulty: advice.difficulty, reasonKeys: advice.reasonKeys }
}

export function listingText(phone: Phone, city: string, lang: 'nl' | 'en'): string {
  const title = [phone.brand, phone.model, phone.storage, phone.color].filter(Boolean).join(' ')
  const listed = (phone.listings ?? []).find((l) => l.active)
  const price = listed?.askingPrice
  const work = (phone.workDone || phone.todo || '').trim()
  const dmg = (phone.damage || '').trim()
  if (lang === 'en') {
    return [
      title || 'iPhone',
      work ? `Work done: ${work}` : '',
      dmg ? `Notes: ${dmg}` : '',
      phone.imei ? `IMEI: ${phone.imei}` : '',
      price ? `Asking ${price} euro` : '',
      city ? `Pickup ${city} / shipping possible.` : 'Pickup or shipping.',
      'Tested. No iCloud lock.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    title || 'iPhone',
    work ? `Gedaan: ${work}` : '',
    dmg ? `Let op: ${dmg}` : '',
    phone.imei ? `IMEI: ${phone.imei}` : '',
    price ? `Vraagprijs €${price}` : '',
    city ? `Ophalen in ${city} of verzenden.` : 'Ophalen of verzenden.',
    'Getest. Geen iCloud-slot.',
  ]
    .filter(Boolean)
    .join('\n')
}

const STORAGE_RE = /\b(64|128|256|512)\s*(gb)?\b/i

export type ParsedListing = {
  brand: string
  model: string
  storage: string
  defects: DefectId[]
  skips: HardSkip[]
  price: number | null
  notes: string
}

export function parseListingText(raw: string): ParsedListing {
  const text = raw.replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  const hit = matchIphone(text)
  const storageMatch = text.match(STORAGE_RE)
  const storage = storageMatch ? `${storageMatch[1]} GB` : ''

  const defects: DefectId[] = []
  if (/scherm|barst|cracked|glass|lcd|oled|schermpje/.test(lower)) defects.push('scherm')
  if (/\baccu\b|batterij|battery|gezondheid|bh%|accu%/.test(lower) || /\b(7\d|8\d)\s*%/.test(lower)) {
    defects.push('accu')
  }
  if (/laadpoort|laadt niet|dock|charge port|oplaad/.test(lower)) defects.push('laadpoort')
  if (/\bcamera\b|lens/.test(lower)) defects.push('camera')
  if (/deuk|deukje|kras|behuiz|housing|dent|hoek/.test(lower)) defects.push('behuizing')

  const skips: HardSkip[] = []
  if (/face\s*id|truedepth|true depth/.test(lower)) skips.push('faceid')
  if (/water|waterschade|\bnat\b|vocht|corrosi/.test(lower)) skips.push('water')
  if (/icloud|zoek mijn|activation lock|\bfmi\b|find my/.test(lower)) skips.push('icloud')
  if (/logic board|moederbord|\bboard\b/.test(lower)) skips.push('board')

  const priceMatch = text.match(/€\s*(\d{2,4})/) || text.match(/(\d{2,4})\s*(euro|eur)\b/i)
  const price = priceMatch ? Number(priceMatch[1]) : null

  let model = hit ? hit.row.model : ''
  if (hit?.proish) {
    const extra = /\bmax\b/i.test(text) ? ' Pro Max' : /\bplus\b/i.test(text) ? ' Plus' : /\bmini\b/i.test(text) ? ' mini' : ' Pro'
    model = `${hit.row.model}${extra}`
  }

  return {
    brand: hit || /samsung|galaxy/.test(lower) ? (hit ? 'Apple' : 'Samsung') : /apple|iphone/.test(lower) ? 'Apple' : 'Apple',
    model,
    storage: storage === '64 GB' ? '64 GB' : storage,
    defects: [...new Set(defects)],
    skips: [...new Set(skips)],
    price: Number.isFinite(price) ? price : null,
    notes: text.slice(0, 400),
  }
}

export type CoachAlert = {
  id: string
  href: string
  title: string
  metaKey: string
  metaVars?: Record<string, string | number>
  amount: number
  tone: 'warn' | 'info'
}

export function dashboardAlerts(
  phones: Phone[],
  jobs: RepairJob[],
  quotes: Quote[],
  now = new Date(),
): CoachAlert[] {
  const out: CoachAlert[] = []
  for (const p of phones) {
    if (!isStalePhone(p, now)) continue
    const days = phoneAgeDays(p, now)
    out.push({
      id: `phone-${p.id}`,
      href: `/toestel/${p.id}`,
      title: [p.brand, p.model].filter(Boolean).join(' ') || p.id,
      metaKey: p.status === 'te_koop' ? 'coach.alertListed' : 'coach.alertStuck',
      metaVars: { n: days },
      amount: phoneCost(p),
      tone: 'warn',
    })
  }
  for (const j of jobs) {
    if (!isStaleJob(j, now)) continue
    out.push({
      id: `job-${j.id}`,
      href: `/reparatie/${j.id}`,
      title: j.customerName || j.model,
      metaKey: j.status === 'klaar' ? 'coach.alertPickup' : 'coach.alertJob',
      metaVars: { n: jobAgeDays(j, now) },
      amount: j.laborCharge + j.chargeParts,
      tone: 'warn',
    })
  }
  for (const q of quotes ?? []) {
    if (!isStaleQuote(q, now)) continue
    out.push({
      id: `quote-${q.id}`,
      href: `/offertes/${q.id}`,
      title: q.customerName || q.model,
      metaKey: 'coach.alertQuote',
      metaVars: { n: quoteAgeDays(q, now) },
      amount: (q.lines ?? []).reduce((s, l) => s + (l.amount || 0), 0) + (q.laborCharge || 0),
      tone: 'info',
    })
  }
  for (const j of jobs) {
    if (jobIsClosed(j)) continue
    if (j.kind === 'vriend' && jobPartsCost(j) > 0 && j.laborCharge <= 0) {
      out.push({
        id: `friend-${j.id}`,
        href: `/reparatie/${j.id}`,
        title: j.customerName || j.model,
        metaKey: 'coach.alertFriend',
        amount: jobPartsCost(j),
        tone: 'info',
      })
    }
  }
  return out.sort((a, b) => b.amount - a.amount).slice(0, 8)
}

export function soldSnit(phones: Phone[]): { n: number; avg: number } | null {
  const sold = phones.filter((p) => p.status === 'verkocht' && phoneMargin(p) != null)
  if (sold.length < 3) return null
  const avg = sold.reduce((s, p) => s + (phoneMargin(p) ?? 0), 0) / sold.length
  return { n: sold.length, avg }
}

export function jobSnit(jobs: RepairJob[]): { n: number; avg: number } | null {
  const closed = jobs.filter((j) => j.status === 'opgehaald')
  if (closed.length < 3) return null
  const avg = closed.reduce((s, j) => s + jobMargin(j), 0) / closed.length
  return { n: closed.length, avg }
}
