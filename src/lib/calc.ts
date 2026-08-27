import {
  PLATFORM_LABEL,
  type EquipmentItem,
  type Phone,
  type Repair,
  type RepairJob,
  type StockPart,
} from '../types'
import { phoneTitle } from './format'
import { jobTicketLabel, ticketLabel } from './id'

function money(n: unknown): number {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

export function isPartSpent(repair: Repair): boolean {
  return repair.status !== 'te_bestellen'
}

export function isCashPartPurchase(repair: Repair): boolean {
  return !repair.fromStockId && !repair.fromEquipmentId && isPartSpent(repair)
}

export function spentPartsTotal(repairs: Repair[] | null | undefined): number {
  return (repairs ?? []).filter(isPartSpent).reduce((sum, r) => sum + money(r.cost), 0)
}

export function cashPartsTotal(repairs: Repair[] | null | undefined): number {
  return (repairs ?? []).filter(isCashPartPurchase).reduce((sum, r) => sum + money(r.cost), 0)
}

export function plannedPartsTotal(repairs: Repair[] | null | undefined): number {
  return (repairs ?? [])
    .filter((r) => r.status === 'te_bestellen' && !r.fromStockId)
    .reduce((sum, r) => sum + money(r.cost), 0)
}

export function repairTotal(phone: Phone): number {
  return spentPartsTotal(phone.repairs)
}

export function phoneCost(phone: Phone): number {
  return money(phone.purchasePrice) + repairTotal(phone)
}

export function saleNet(phone: Phone): number {
  if (phone.salePrice === null) return 0
  return phone.salePrice - phone.platformFee - phone.shippingCost
}

export function phoneMargin(phone: Phone): number | null {
  if (phone.salePrice === null) return null
  return saleNet(phone) - phoneCost(phone)
}

export type PhoneDeal = {
  inkoop: number
  onderdelen: number
  platform: number
  verzending: number
  kosten: number
  omzet: number
  winst: number
}

export function phoneDeal(
  phone: Phone,
  draft?: { salePrice: number; platformFee: number; shippingCost: number },
): PhoneDeal {
  const inkoop = phone.purchasePrice
  const onderdelen = repairTotal(phone)
  const platform = draft?.platformFee ?? phone.platformFee
  const verzending = draft?.shippingCost ?? phone.shippingCost
  const omzet = draft?.salePrice ?? phone.salePrice ?? 0
  const kosten = inkoop + onderdelen + platform + verzending
  return {
    inkoop,
    onderdelen,
    platform,
    verzending,
    kosten,
    omzet,
    winst: omzet - kosten,
  }
}

export function leftoverStockValue(stockParts: StockPart[]): number {
  return stockParts
    .filter((s) => s.alreadyExpensed && s.status !== 'gebruikt' && s.qty > 0)
    .reduce((sum, s) => sum + money(s.cost), 0)
}

export function inventoryValue(phones: Phone[], stockParts: StockPart[] = []): number {
  const phonesVal = phones
    .filter((p) => p.status !== 'verkocht')
    .reduce((sum, p) => sum + phoneCost(p), 0)
  return phonesVal + leftoverStockValue(stockParts)
}

export function jobPartsCost(job: RepairJob): number {
  return spentPartsTotal(job.parts)
}

export function jobRevenue(job: RepairJob): number {
  return job.chargeParts + job.laborCharge
}

export function jobMargin(job: RepairJob): number {
  return jobRevenue(job) - jobPartsCost(job)
}

export function jobIsClosed(job: RepairJob): boolean {
  return job.status === 'klaar' || job.status === 'opgehaald'
}

export function jobIsPickedUp(job: RepairJob): boolean {
  return job.status === 'opgehaald'
}

function jobPnlDate(job: RepairJob): string {
  return job.paidAt || job.dateDone || job.dateIn
}

export type Period = 'all' | 'month' | 'year'

function inPeriod(isoDate: string, period: Period, now = new Date()): boolean {
  if (period === 'all' || !isoDate) return true
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return false
  if (period === 'year') return d.getFullYear() === now.getFullYear()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export type Totals = {
  omzet: number
  inkoop: number
  onderdelen: number
  apparatuur: number
  platform: number
  verzending: number
  kosten: number
  resultaat: number
  voorraad: number
  gerealiseerdeMarge: number
  openTickets: number
  verkocht: number
  reparatieOmzet: number
  reparatieOnderdelen: number
  reparatieWinst: number
  openJobs: number
  afgerondeJobs: number
  gepland: number
}

export function totals(
  phones: Phone[],
  equipment: EquipmentItem[],
  period: Period = 'all',
  jobs: RepairJob[] = [],
  stockParts: StockPart[] = [],
): Totals {
  const sold = phones.filter((p) => p.status === 'verkocht' && inPeriod(p.saleDate ?? '', period))
  const bought = phones.filter((p) => inPeriod(p.purchaseDate, period))
  const gear = equipment.filter((e) => inPeriod(e.purchaseDate, period))
  const closedJobs = jobs.filter((j) => jobIsPickedUp(j) && inPeriod(jobPnlDate(j), period))

  const phoneOmzet = sold.reduce((s, p) => s + (p.salePrice ?? 0), 0)
  const reparatieOmzet = closedJobs.reduce((s, j) => s + jobRevenue(j), 0)
  const omzet = phoneOmzet + reparatieOmzet
  const inkoop = bought.reduce((s, p) => s + p.purchasePrice, 0)
  const phoneParts = phones.reduce(
    (s, p) =>
      s +
      (p.repairs ?? [])
        .filter((r) => isCashPartPurchase(r) && inPeriod(r.date, period))
        .reduce((rs, r) => rs + money(r.cost), 0),
    0,
  )
  const reparatieOnderdelen = jobs.reduce(
    (s, j) =>
      s +
      (j.parts ?? [])
        .filter((r) => isCashPartPurchase(r) && inPeriod(r.date, period))
        .reduce((rs, r) => rs + money(r.cost), 0),
    0,
  )
  const losseOnderdelen = stockParts
    .filter((p) => !p.alreadyExpensed && inPeriod(p.date, period))
    .reduce((s, p) => s + money(p.cost), 0)
  const onderdelen = phoneParts + reparatieOnderdelen + losseOnderdelen
  const apparatuur = gear
    .filter((e) => !e.alreadyExpensed)
    .reduce((s, e) => s + money(e.cost), 0)
  const platform = sold.reduce((s, p) => s + money(p.platformFee), 0)
  const verzending = sold.reduce((s, p) => s + money(p.shippingCost), 0)
  const kosten = inkoop + onderdelen + apparatuur + platform + verzending
  const resultaat = omzet - kosten
  const voorraad = inventoryValue(phones, stockParts)
  const gerealiseerdeMarge = sold.reduce((s, p) => s + (phoneMargin(p) ?? 0), 0)
  const reparatieWinst = closedJobs.reduce((s, j) => s + jobMargin(j), 0)
  const gepland =
    phones.reduce((s, p) => s + plannedPartsTotal(p.repairs), 0) +
    jobs.reduce((s, j) => s + plannedPartsTotal(j.parts), 0)

  return {
    omzet,
    inkoop,
    onderdelen,
    apparatuur,
    platform,
    verzending,
    kosten,
    resultaat,
    voorraad,
    gerealiseerdeMarge,
    openTickets: phones.filter((p) => p.status !== 'verkocht').length,
    verkocht: sold.length,
    reparatieOmzet,
    reparatieOnderdelen,
    reparatieWinst,
    openJobs: jobs.filter((j) => !jobIsClosed(j)).length,
    afgerondeJobs: closedJobs.length,
    gepland,
  }
}

export const LEDGER_CATEGORIES = [
  'verkoop_telefoon',
  'klantreparatie',
  'inkoop_telefoon',
  'onderdelen',
  'apparatuur',
  'platform',
  'verzending',
] as const

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number]

export type LedgerDirection = 'in' | 'uit'

export type LedgerEntry = {
  id: string
  date: string
  at?: string
  direction: LedgerDirection
  category: LedgerCategory
  description: string
  amount: number
  href?: string
  phoneId?: string
  jobId?: string
}

export const LEDGER_CATEGORY_LABEL: Record<LedgerCategory, string> = {
  verkoop_telefoon: 'Verkoop telefoons',
  klantreparatie: 'Klantreparaties',
  inkoop_telefoon: 'Inkoop telefoons',
  onderdelen: 'Onderdelen',
  apparatuur: 'Apparatuur',
  platform: 'Platformkosten',
  verzending: 'Verzending',
}

export const LEDGER_TYPE_LABEL: Record<LedgerCategory, string> = {
  verkoop_telefoon: 'Verkoop',
  klantreparatie: 'Reparatie',
  inkoop_telefoon: 'Inkoop',
  onderdelen: 'Onderdeel',
  apparatuur: 'Apparatuur',
  platform: 'Platform',
  verzending: 'Verzending',
}

function addEntry(
  rows: LedgerEntry[],
  period: Period,
  entry: LedgerEntry,
) {
  if (entry.amount <= 0) return
  if (!inPeriod(entry.date, period)) return
  rows.push(entry)
}

export function ledger(
  phones: Phone[],
  equipment: EquipmentItem[],
  jobs: RepairJob[] = [],
  stockParts: StockPart[] = [],
  period: Period = 'all',
): LedgerEntry[] {
  const rows: LedgerEntry[] = []

  for (const p of phones) {
    const title = `${ticketLabel(p.ticketNr)} ${phoneTitle(p.brand, p.model)}`
    addEntry(rows, period, {
      id: `inkoop-${p.id}`,
      date: p.purchaseDate,
      direction: 'uit',
      category: 'inkoop_telefoon',
      description: `Inkoop ${title}`,
      amount: p.purchasePrice,
      href: `/toestel/${p.id}`,
      phoneId: p.id,
    })
    for (const r of p.repairs ?? []) {
      if (!isCashPartPurchase(r)) continue
      addEntry(rows, period, {
        id: `phone-part-${r.id}`,
        date: r.date,
        direction: 'uit',
        category: 'onderdelen',
        description: `${r.name} · ${title}`,
        amount: r.cost,
        href: `/toestel/${p.id}`,
        phoneId: p.id,
      })
    }
    if (p.status === 'verkocht') {
      const via = p.salePlatform ? ` via ${PLATFORM_LABEL[p.salePlatform]}` : ''
      addEntry(rows, period, {
        id: `sale-${p.id}`,
        date: p.saleDate ?? '',
        at: p.updatedAt,
        direction: 'in',
        category: 'verkoop_telefoon',
        description: `Verkoop ${title}${via}`,
        amount: p.salePrice ?? 0,
        href: `/toestel/${p.id}`,
        phoneId: p.id,
      })
      addEntry(rows, period, {
        id: `fee-${p.id}`,
        date: p.saleDate ?? '',
        direction: 'uit',
        category: 'platform',
        description: `Platformkosten ${title}${via}`,
        amount: p.platformFee,
        href: `/toestel/${p.id}`,
        phoneId: p.id,
      })
      addEntry(rows, period, {
        id: `ship-${p.id}`,
        date: p.saleDate ?? '',
        direction: 'uit',
        category: 'verzending',
        description: `Verzending ${title}${via}`,
        amount: p.shippingCost,
        href: `/toestel/${p.id}`,
        phoneId: p.id,
      })
    }
  }

  for (const j of jobs) {
    const title = `${jobTicketLabel(j.ticketNr)} ${j.customerName}`
    for (const r of j.parts ?? []) {
      if (!isCashPartPurchase(r)) continue
      addEntry(rows, period, {
        id: `job-part-${r.id}`,
        date: r.date,
        direction: 'uit',
        category: 'onderdelen',
        description: `${r.name} · ${title}`,
        amount: r.cost,
        href: `/reparatie/${j.id}`,
        jobId: j.id,
      })
    }
    if (jobIsPickedUp(j)) {
      addEntry(rows, period, {
        id: `job-${j.id}`,
        date: jobPnlDate(j),
        at: j.updatedAt,
        direction: 'in',
        category: 'klantreparatie',
        description: `Reparatie ${title}`,
        amount: jobRevenue(j),
        href: `/reparatie/${j.id}`,
        jobId: j.id,
      })
    }
  }

  for (const s of stockParts) {
    if (s.alreadyExpensed) continue
    addEntry(rows, period, {
      id: `stock-${s.id}`,
      date: s.date,
      direction: 'uit',
      category: 'onderdelen',
      description: `Voorraad ${s.name}${s.qty > 1 ? ` (${s.qty}×)` : ''}`,
      amount: s.cost,
      href: '/onderdelen',
    })
  }

  for (const e of equipment) {
    if (e.alreadyExpensed) continue
    addEntry(rows, period, {
      id: `equip-${e.id}`,
      date: e.purchaseDate,
      direction: 'uit',
      category: 'apparatuur',
      description: `Apparatuur ${e.name}`,
      amount: e.cost,
      href: '/apparatuur',
    })
  }

  return rows.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    const byAt = (a.at ?? '').localeCompare(b.at ?? '')
    if (byAt !== 0) return byAt
    return a.id.localeCompare(b.id)
  })
}

export function withRunningSaldo(entries: LedgerEntry[]): (LedgerEntry & { saldo: number })[] {
  let saldo = 0
  return entries.map((e) => {
    saldo += e.direction === 'in' ? e.amount : -e.amount
    return { ...e, saldo }
  })
}
