import {
  MARKTWAARDE_UPDATED,
  buyForDefects,
  type DefectId,
  type IphoneMarkt,
  type MaxBuyCell,
  type PartBand,
} from '../data/marktwaarde'
import { SHOPS, genFromModel, groupsFor } from '../data/leveranciers'
import type { EquipmentItem, Phone, StockPart } from '../types'
import {
  type BuyAdvice,
  type HardSkip,
  buyAdvice,
  compareOffer,
  parseListingText,
  suggestedLabor,
} from './dealCoach'

/** Shop snapshot for Jan — never include keys, IMEI, or customer data. */
export type JanShopInput = {
  city?: string
  companyName?: string
  phones?: Pick<Phone, 'brand' | 'model' | 'status' | 'purchasePrice' | 'demo'>[]
  stockParts?: Pick<StockPart, 'name' | 'qty' | 'cost' | 'status' | 'demo'>[]
  equipment?: Pick<EquipmentItem, 'name' | 'stockStatus' | 'demo'>[]
}

type ChatTurn = { role: 'user' | 'assistant'; content: string }

const DEFECT_NL: Record<DefectId, string> = {
  scherm: 'scherm',
  accu: 'accu',
  laadpoort: 'laadpoort',
  camera: 'camera',
  behuizing: 'behuizing',
}

const SKIP_NL: Record<HardSkip, string> = {
  faceid: 'Face ID / TrueDepth',
  water: 'waterschade',
  icloud: 'iCloud / Activation Lock',
  board: 'logic board',
}

const VERDICT_NL: Record<BuyAdvice['verdict'], string> = {
  ok: 'ok',
  tight: 'krap',
  skip: 'skip / niet kopen',
  unknown: 'onbekend',
}

export const JAN_BRIEFING_RULES = `Jij verzin GEEN inkoopprijs. Als de app een max heeft, is dat de waarheid. €200 voor iPhone 11 gebarsten scherm is FOUT als de app lager/skip zegt. Noem scherm-onderdeel + arbeid. Verwijs naar /marktwaarde en /leveranciers.
Dit is de Marktwaarde van DEZE app (geen gok). Gebruik deze cijfers. Voorspel geen prijsstijging of -daling "volgende week".`

function euroInt(n: number): string {
  return `€${Math.round(n)}`
}

function bandNl(min: number, max: number): string {
  return min === max ? euroInt(min) : `${euroInt(min)}–${euroInt(max)}`
}

function partNl(p: PartBand | null | undefined): string {
  if (!p) return 'n.v.t. in deze app'
  const text = bandNl(p.min, p.max)
  return p.note ? `${text} (${p.note})` : text
}

function cellNl(cell: MaxBuyCell): string {
  switch (cell.kind) {
    case 'point':
      return euroInt(cell.value)
    case 'band':
      return bandNl(cell.min, cell.max)
    case 'either':
      return `${euroInt(cell.a)} of ${euroInt(cell.b)}`
    case 'skip':
      return cell.label
    case 'unknown':
      return 'onbekend'
  }
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

export function janShopFromData(data: {
  workshop?: { city?: string; companyName?: string } | null
  phones?: Phone[]
  stockParts?: StockPart[]
  equipment?: EquipmentItem[]
}): JanShopInput {
  return {
    city: data.workshop?.city?.trim() || '',
    companyName: data.workshop?.companyName?.trim() || '',
    phones: (data.phones ?? []).map((p) => ({
      brand: p.brand,
      model: p.model,
      status: p.status,
      purchasePrice: p.purchasePrice,
      demo: p.demo,
    })),
    stockParts: (data.stockParts ?? []).map((p) => ({
      name: p.name,
      qty: p.qty,
      cost: p.cost,
      status: p.status,
      demo: p.demo,
    })),
    equipment: (data.equipment ?? []).map((e) => ({
      name: e.name,
      stockStatus: e.stockStatus,
      demo: e.demo,
    })),
  }
}

function parseFromHistory(history: ChatTurn[]) {
  const users = history.filter((m) => m.role === 'user').map((m) => m.content)
  const latest = users.at(-1) ?? ''
  const blob = users.slice(-6).join('\n')
  const fromLatest = parseListingText(latest)
  const fromAll = parseListingText(blob)
  const model = fromLatest.model || fromAll.model
  const defects = unique([...fromLatest.defects, ...fromAll.defects])
  const skips = unique([...fromLatest.skips, ...fromAll.skips])
  const price = fromLatest.price ?? fromAll.price
  const storage = fromLatest.storage || fromAll.storage
  return { model, defects, skips, price, storage, brand: fromLatest.brand || fromAll.brand }
}

function alwaysParts(row: IphoneMarkt): string[] {
  return [
    `scherm-onderdeel: ${partNl(row.parts.scherm)}`,
    `accu-onderdeel: ${partNl(row.parts.accu)}`,
  ]
}

function extraPartLines(row: IphoneMarkt, defects: DefectId[]): string[] {
  const extra: string[] = []
  for (const d of defects) {
    if (d === 'scherm' || d === 'accu') continue
    if (d === 'behuizing') {
      extra.push('behuizing: geen extra part; verkoop als lichte huisschade')
      continue
    }
    extra.push(`${DEFECT_NL[d]}-onderdeel: ${partNl(row.parts[d])}`)
  }
  return extra
}

function supplierLines(model: string, defects: DefectId[]): string[] {
  const gen = genFromModel(model)
  const shops = SHOPS.slice(0, 3)
    .map((s) => `${s.name} (${s.where})`)
    .join(', ')
  if (!gen) {
    return [`Shops: ${shops}. Pagina /leveranciers.`]
  }
  const focus = unique<DefectId>([...defects, 'scherm', 'accu'])
  const groups = groupsFor(gen, focus)
  const lines = [`Shops: ${shops}. Pagina /leveranciers?m=${gen}`]
  for (const g of groups) {
    if (g.id === 'hubs' || g.id === 'extra' || g.id === 'behuizing') continue
    const picks = g.links.filter((l) => l.pick)
    const use = (picks.length ? picks : g.links).slice(0, 1)
    for (const l of use) {
      lines.push(`${g.id}: ${l.shop} ${l.href}`)
    }
  }
  return lines.slice(0, 7)
}

function stockLines(shop: JanShopInput | null | undefined, model: string, defects: DefectId[]): string[] {
  if (!shop) return ['Werkplaats: geen snapshot.']
  const lines: string[] = []
  const who = [shop.companyName, shop.city].filter(Boolean).join(', ')
  lines.push(who ? `Werkplaats: ${who}` : 'Werkplaats: stad niet ingevuld')

  const open = (shop.phones ?? []).filter((p) => p.status !== 'verkocht' && !p.demo)
  const gen = genFromModel(model)
  const matched = gen
    ? open.filter((p) => genFromModel(`${p.brand} ${p.model}`) === gen)
    : []
  const show = (matched.length ? matched : open).slice(0, 6)
  if (open.length === 0) {
    lines.push('Voorraad toestellen: leeg (niet-verkocht, geen demo).')
  } else {
    lines.push(`Voorraad toestellen: ${open.length} niet-verkocht.`)
    for (const p of show) {
      const title = [p.brand, p.model].filter(Boolean).join(' ') || '?'
      lines.push(`- ${title} inkoop ${euroInt(p.purchasePrice)} (${p.status})`)
    }
  }

  const onHand = (shop.stockParts ?? []).filter(
    (p) => !p.demo && p.status === 'op_voorraad' && (p.qty ?? 0) > 0,
  )
  const needle = [
    gen ?? '',
    ...defects.map((d) => DEFECT_NL[d]),
    'scherm',
    'accu',
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase())
  const ranked = onHand
    .map((p) => {
      const n = p.name.toLowerCase()
      const score = needle.reduce((s, tok) => s + (tok && n.includes(tok) ? 1 : 0), 0)
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
  const parts = (ranked.some((r) => r.score > 0) ? ranked.filter((r) => r.score > 0) : ranked)
    .slice(0, 6)
    .map((r) => r.p)
  if (onHand.length === 0) {
    lines.push('Losse onderdelen op voorraad: geen.')
  } else {
    lines.push(`Losse onderdelen op voorraad: ${onHand.length}.`)
    for (const p of parts) {
      lines.push(`- ${p.qty}× ${p.name} (${euroInt(p.cost)})`)
    }
  }

  const eq = (shop.equipment ?? []).filter((e) => !e.demo).slice(0, 6)
  if (eq.length === 0) {
    lines.push('Apparatuur: geen (of alleen demo).')
  } else {
    lines.push(`Apparatuur: ${eq.map((e) => e.name).join(', ')}`)
  }
  return lines
}

function offerLine(price: number | null, advice: BuyAdvice): string | null {
  if (price == null || !(price > 0)) return null
  const cmp = compareOffer(price, advice)
  if (cmp === 'over') {
    const cap = advice.max != null ? `beginner-max ${euroInt(advice.max)}` : 'skip'
    return `Advertentieprijs ${euroInt(price)}: FOUT / veel te duur (${cap}).`
  }
  if (cmp === 'skip') return `Advertentieprijs ${euroInt(price)}: skip — niet kopen volgens de app.`
  if (cmp === 'under' && advice.max != null) {
    return `Advertentieprijs ${euroInt(price)}: onder beginner-max ${euroInt(advice.max)}.`
  }
  if (advice.sheetMax != null) {
    return `Advertentieprijs ${euroInt(price)}: tot cheat-sheet ${euroInt(advice.sheetMax)} — krap.`
  }
  return `Advertentieprijs ${euroInt(price)}.`
}

function modelBlock(parsed: ReturnType<typeof parseFromHistory>): string[] {
  const advice = buyAdvice({
    brand: parsed.brand,
    model: parsed.model,
    defects: parsed.defects,
    skips: parsed.skips,
  })
  const labor = suggestedLabor({
    model: parsed.model,
    defects: parsed.defects,
    skips: parsed.skips,
  })
  const row = advice.row
  const defectTxt =
    parsed.defects.length > 0 ? parsed.defects.map((d) => DEFECT_NL[d]).join(', ') : 'geen (werkt / niet genoemd)'
  const skipTxt =
    parsed.skips.length > 0 ? parsed.skips.map((s) => SKIP_NL[s]).join(', ') : 'geen'

  const lines = [
    `Model: ${parsed.model}${parsed.storage ? ` · ${parsed.storage}` : ''}${advice.proish ? ' (Pro/Max: zelfde generatie-sheet, vaak krapper)' : ''}`,
    `Cheat-sheet rij: ${row ? `${row.model} ${row.storage}` : 'niet in iPhone 11–17'}`,
    `Defecten: ${defectTxt}`,
    `Harde skips in bericht: ${skipTxt}`,
  ]

  if (!row) {
    lines.push(
      'Geen Marktwaarde-rij. Verzin GEEN hoge inkoop. Verwijs naar /marktwaarde (iPhone 11–17).',
    )
    return lines
  }

  const maxTxt = advice.max != null ? euroInt(advice.max) : 'skip / geen max'
  const sheetTxt = advice.sheetMax != null ? euroInt(advice.sheetMax) : 'skip / onbekend'
  lines.push(
    `Dit is de Marktwaarde van DEZE app (geen gok). Max inkoop ${maxTxt}, vraagprijs-band ${bandNl(row.prive.min, row.prive.max)}, scherm-defect betekent scherm-onderdeel ${partNl(row.parts.scherm)} + arbeid ${euroInt(labor.labor || 0)} (als scherm aangevinkt; anders arbeid volgens defect). Gebruik deze cijfers. Verzin geen €200 als de app lager zegt.`,
    `Typische verkoop strak: ${bandNl(row.prive.min, row.prive.max)} (reken ${euroInt(row.prive.rekenwaarde)})`,
    `Typische verkoop lichte huisschade: ${bandNl(row.lichtHuis.min, row.lichtHuis.max)} (reken ${euroInt(row.lichtHuis.rekenwaarde)})`,
    `Max inkoop beginner: ${maxTxt}`,
    `Cheat sheet (ervaren / pagina Marktwaarde): ${sheetTxt} · cel ${cellNl(buyForDefects(row, parsed.defects))}`,
    `Oordeel: ${VERDICT_NL[advice.verdict]} · moeilijkheid ${advice.difficulty}`,
  )
  if (advice.askFast != null) {
    lines.push(
      `Na fix vragen: ${euroInt(advice.askFast)} (snel) tot ${euroInt(advice.askClean ?? advice.askFast)} (strak)`,
    )
  }
  lines.push(...alwaysParts(row))
  lines.push(...extraPartLines(row, parsed.defects))
  if (advice.verdict === 'skip' || labor.difficulty === 'skip') {
    lines.push('Arbeid: n.v.t. (skip)')
  } else {
    const screenLabor = Number(row.id) <= 11 ? 50 : 70
    lines.push(`Arbeid (app, gekozen defecten): ${euroInt(labor.labor)}`)
    if (parsed.defects.includes('scherm')) {
      lines.push(`Arbeid scherm in die som: ${euroInt(screenLabor)}`)
    }
  }
  const offer = offerLine(parsed.price, advice)
  if (offer) lines.push(offer)
  return unique(lines.filter(Boolean))
}

const HARD_SKIP_STANDING =
  'Harde skips (altijd laten liggen): iCloud/Activation Lock, waterschade, Face ID/TrueDepth, logic board.'

export function buildJanBriefing(history: ChatTurn[], shop?: JanShopInput | null): string {
  const parsed = parseFromHistory(history)
  const chunks: string[] = [
    'JAN-APPBRIEFING (bindend, live kennis van DEZE app — geen gok, geen YouTube-prijs).',
    JAN_BRIEFING_RULES,
    `Marktwaarde-sheet bijgewerkt: ${MARKTWAARDE_UPDATED}. Pagina’s: /marktwaarde en /leveranciers.`,
    HARD_SKIP_STANDING,
  ]

  if (!parsed.model) {
    chunks.push(
      'Geen iPhone-model herkend in het gesprek.',
      'Stel 1–3 korte vragen: welk model (11–17), wat kapot (scherm/accu/behuizing), iCloud / Face ID / water?',
      'Daarna nóg geen hoge inkoop verzinnen. Wijs naar /marktwaarde. Geen €200 “omdat het een iPhone is”.',
    )
  } else {
    chunks.push('=== DEZE CASE (zelfde cijfers als Marktwaarde / BuyCoach) ===')
    chunks.push(...modelBlock(parsed))
    chunks.push('=== LEVERANCIERS ===')
    chunks.push(...supplierLines(parsed.model, parsed.defects))
  }

  chunks.push('=== WERKPLAATS / VOORRAAD ===')
  chunks.push(...stockLines(shop, parsed.model, parsed.defects))

  const text = chunks.join('\n')
  if (text.length <= 3800) return text
  return `${text.slice(0, 3700)}\n[briefing ingekort]`
}
