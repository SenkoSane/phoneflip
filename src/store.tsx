import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { linesFromQuote, quoteTotal } from './lib/docs'
import { parseEuro } from './lib/format'
import { nextTicketNr, today, uid } from './lib/id'
import { deleteListingPhotos } from './lib/listingPhotos'
import type {
  AppData,
  EquipmentItem,
  EquipmentPurchase,
  EquipmentStockStatus,
  EquipmentWish,
  JobKind,
  JobStatus,
  LeftoverDest,
  Listing,
  Phone,
  PhoneStatus,
  Repair,
  RepairJob,
  StockPart,
  StockStatus,
  Quote,
  Receipt,
  DocLine,
  WorkshopProfile,
} from './types'
import { EMPTY_WORKSHOP } from './types'

const STORAGE_KEY = 'phoneflip.v1'
const TOMBSTONE_KEY = 'phoneflip.deletedIds'

const emptyData: AppData = {
  version: 1,
  phones: [],
  equipment: [],
  equipmentWishlist: [],
  repairJobs: [],
  stockParts: [],
  deletedIds: [],
  workshop: { ...EMPTY_WORKSHOP },
  quotes: [],
  receipts: [],
}

function asList<T>(value: unknown): T[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.filter((item) => item != null) as T[]
  if (typeof value === 'object') {
    return Object.values(value as Record<string, T>).filter((item) => item != null)
  }
  return []
}

function asEuro(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') return parseEuro(value)
  return 0
}

function normalizeRepairItem(raw: unknown): Repair | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Repair
  if (!r.id) return null
  return {
    ...r,
    name: typeof r.name === 'string' ? r.name : '',
    cost: asEuro(r.cost),
    supplier: typeof r.supplier === 'string' ? r.supplier : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
    leftoverDest: r.leftoverDest === 'stock' || r.leftoverDest === 'equipment' ? r.leftoverDest : undefined,
  }
}

function normalizeListingItem(raw: unknown): Listing | null {
  if (!raw || typeof raw !== 'object') return null
  const l = raw as Listing
  if (!l.id) return null
  return {
    ...l,
    askingPrice: asEuro(l.askingPrice),
    url: typeof l.url === 'string' ? l.url : '',
  }
}

function normalizePhone(raw: unknown): Phone | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Phone
  if (!p.id) return null
  return {
    ...p,
    customerName: typeof p.customerName === 'string' ? p.customerName : '',
    damage: typeof p.damage === 'string' ? p.damage : '',
    todo: typeof p.todo === 'string' ? p.todo : '',
    workDone: typeof p.workDone === 'string' ? p.workDone : '',
    purchasePrice: asEuro(p.purchasePrice),
    platformFee: asEuro(p.platformFee),
    shippingCost: asEuro(p.shippingCost),
    salePrice: p.salePrice == null ? null : asEuro(p.salePrice),
    repairs: asList(p.repairs).map(normalizeRepairItem).filter((r): r is Repair => r !== null),
    listings: asList(p.listings).map(normalizeListingItem).filter((l): l is Listing => l !== null),
    notes: typeof p.notes === 'string' ? p.notes : '',
  }
}

function normalizeJob(raw: unknown): RepairJob | null {
  if (!raw || typeof raw !== 'object') return null
  const j = raw as RepairJob
  if (!j.id) return null
  return {
    ...j,
    damage: typeof j.damage === 'string' ? j.damage : '',
    todo: typeof j.todo === 'string' ? j.todo : '',
    workDone: typeof j.workDone === 'string' ? j.workDone : '',
    laborCharge: asEuro(j.laborCharge),
    chargeParts: asEuro(j.chargeParts),
    parts: asList(j.parts).map(normalizeRepairItem).filter((r): r is Repair => r !== null),
    notes: typeof j.notes === 'string' ? j.notes : '',
  }
}

function uniqueIds(ids: unknown): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const walk = (value: unknown) => {
    if (value == null) return
    if (typeof value === 'string') {
      if (value && !seen.has(value)) {
        seen.add(value)
        out.push(value)
      }
      return
    }
    for (const item of asList<unknown>(value)) {
      if (item === value) return
      walk(item)
    }
  }
  walk(ids)
  return out
}

export function readPersistedTombstones(): string[] {
  try {
    return uniqueIds(JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '[]'))
  } catch {
    return []
  }
}

function persistTombstones(ids: string[]): string[] {
  const next = uniqueIds([...readPersistedTombstones(), ...ids])
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

function dropDeleted<T extends { id: string }>(items: T[], deleted: Set<string>): T[] {
  if (deleted.size === 0) return items
  return items.filter((item) => item?.id && !deleted.has(item.id))
}

function withTombstones(state: AppData, ids: string[]): string[] {
  return persistTombstones([...(state.deletedIds ?? []), ...ids])
}

function isTombstoned(state: AppData, id: string): boolean {
  if (!id) return false
  if ((state.deletedIds ?? []).includes(id)) return true
  return readPersistedTombstones().includes(id)
}

function goneIds<T extends { id: string }>(prev: T[] | undefined, next: T[] | undefined): string[] {
  const keep = new Set((next ?? []).map((item) => item.id))
  return (prev ?? []).map((item) => item.id).filter((id) => id && !keep.has(id))
}

function normalizeEquipment(raw: unknown): EquipmentItem | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as EquipmentItem
  if (!e.id) return null
  let purchases = asList<EquipmentPurchase>(e.purchases)
    .filter((p) => p && p.id)
    .map((p) => ({
      ...p,
      cost: asEuro(p.cost),
      date: typeof p.date === 'string' ? p.date : e.purchaseDate,
      qty: p.qty && p.qty > 0 ? p.qty : 1,
    }))
  if (purchases.length === 0 && asEuro(e.cost) !== 0) {
    purchases = [
      {
        id: `${e.id}-init`,
        cost: asEuro(e.cost),
        date: e.purchaseDate || today(),
        qty: 1,
        alreadyExpensed: e.alreadyExpensed,
      },
    ]
  }
  const cost = purchases.reduce((sum, p) => sum + asEuro(p.cost), 0)
  return {
    ...e,
    cost,
    purchaseDate: e.purchaseDate || purchases[0]?.date || today(),
    stockStatus: e.stockStatus === 'op' ? 'op' : 'op_voorraad',
    purchases,
  }
}

export function normalize(parsed: Partial<AppData> | null | undefined): AppData {
  if (!parsed) return emptyData
  const deletedIds = uniqueIds([parsed.deletedIds, readPersistedTombstones()])
  persistTombstones(deletedIds)
  const deleted = new Set(deletedIds)
  return {
    version: 1,
    deletedIds,
    phones: dropDeleted(
      asList<Phone>(parsed.phones)
        .filter((p) => p && !p.demo)
        .map(normalizePhone)
        .filter((p): p is Phone => p !== null),
      deleted,
    ).map((p) => ({
      ...p,
      repairs: dropDeleted(p.repairs, deleted),
      listings: dropDeleted(p.listings, deleted),
    })),
    equipment: dropDeleted(
      asList<EquipmentItem>(parsed.equipment)
        .filter((e) => e && !e.demo)
        .map(normalizeEquipment)
        .filter((e): e is EquipmentItem => e !== null),
      deleted,
    ),
    equipmentWishlist: dropDeleted(
      asList<EquipmentWish>(parsed.equipmentWishlist)
        .filter((e) => e && !e.demo)
        .map((e) => ({ ...e, estimatedPrice: asEuro(e.estimatedPrice) })),
      deleted,
    ),
    repairJobs: dropDeleted(
      asList<RepairJob>(parsed.repairJobs)
        .filter((j) => j && !j.demo)
        .map(normalizeJob)
        .filter((j): j is RepairJob => j !== null),
      deleted,
    ).map((j) => ({ ...j, parts: dropDeleted(j.parts, deleted) })),
    stockParts: dropDeleted(
      asList<StockPart>(parsed.stockParts)
        .filter((s) => s && !s.demo)
        .map((s) => ({ ...s, cost: asEuro(s.cost), qty: Number(s.qty) || 1 })),
      deleted,
    ),
    workshop: normalizeWorkshop(parsed.workshop),
    quotes: assignDocNrs(
      dropDeleted(
        asList<Quote>(parsed.quotes)
          .filter((q) => q && q.id && !q.demo)
          .map(normalizeQuote)
          .filter((q): q is Quote => q !== null),
        deleted,
      ),
    ),
    receipts: assignDocNrs(
      dropDeleted(
        asList<Receipt>(parsed.receipts)
          .filter((r) => r && r.id && !r.demo)
          .map(normalizeReceipt)
          .filter((r): r is Receipt => r !== null),
        deleted,
      ),
    ),
  }
}

function normalizeDocLine(raw: unknown): DocLine | null {
  if (!raw || typeof raw !== 'object') return null
  const l = raw as DocLine
  if (!l.id) return null
  return {
    id: l.id,
    name: typeof l.name === 'string' ? l.name : '',
    amount: asEuro(l.amount),
  }
}

function assignDocNrs<T extends { nr: number }>(items: T[]): T[] {
  let max = items.reduce((n, item) => Math.max(n, Number(item.nr) || 0), 0)
  return items.map((item) => {
    if (Number(item.nr) > 0) return item
    max += 1
    return { ...item, nr: max }
  })
}

function normalizeQuote(raw: unknown): Quote | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as Quote
  if (!q.id) return null
  const status = q.status === 'geaccepteerd' || q.status === 'afgewezen' ? q.status : 'open'
  return {
    ...q,
    nr: Number(q.nr) || 0,
    jobId: q.jobId || null,
    acceptedJobId: q.acceptedJobId || null,
    status,
    customerName: typeof q.customerName === 'string' ? q.customerName : '',
    brand: typeof q.brand === 'string' ? q.brand : '',
    model: typeof q.model === 'string' ? q.model : '',
    damage: typeof q.damage === 'string' ? q.damage : '',
    todo: typeof q.todo === 'string' ? q.todo : '',
    notes: typeof q.notes === 'string' ? q.notes : '',
    lines: asList(q.lines).map(normalizeDocLine).filter((l): l is DocLine => l !== null),
    laborCharge: asEuro(q.laborCharge),
    date: typeof q.date === 'string' && q.date ? q.date : today(),
    createdAt: q.createdAt || new Date().toISOString(),
    updatedAt: q.updatedAt || q.createdAt || new Date().toISOString(),
  }
}

function normalizeReceipt(raw: unknown): Receipt | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Receipt
  if (!r.id) return null
  return {
    ...r,
    nr: Number(r.nr) || 0,
    jobId: r.jobId || null,
    customerName: typeof r.customerName === 'string' ? r.customerName : '',
    brand: typeof r.brand === 'string' ? r.brand : '',
    model: typeof r.model === 'string' ? r.model : '',
    damage: typeof r.damage === 'string' ? r.damage : '',
    workDone: typeof r.workDone === 'string' ? r.workDone : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
    lines: asList(r.lines).map(normalizeDocLine).filter((l): l is DocLine => l !== null),
    laborCharge: asEuro(r.laborCharge),
    paidTotal: asEuro(r.paidTotal),
    paidAt: typeof r.paidAt === 'string' && r.paidAt ? r.paidAt : today(),
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
  }
}

function normalizeWorkshop(raw: unknown): WorkshopProfile {
  const w = raw && typeof raw === 'object' ? (raw as WorkshopProfile) : EMPTY_WORKSHOP
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    companyName: str(w.companyName).trim() === 'PhoneFlip' || !str(w.companyName).trim()
      ? EMPTY_WORKSHOP.companyName
      : str(w.companyName).trim(),
    phone: str(w.phone),
    city: str(w.city),
    address: str(w.address),
    kvk: str(w.kvk),
    iban: str(w.iban),
    email: str(w.email),
    locale: w.locale === 'en' || w.locale === 'nl' ? w.locale : undefined,
    passwordHash:
      typeof w.passwordHash === 'string' && /^[0-9a-f]{64}$/.test(w.passwordHash)
        ? w.passwordHash
        : undefined,
    updatedAt: str(w.updatedAt),
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData
    return normalize(JSON.parse(raw) as Partial<AppData>)
  } catch {
    return emptyData
  }
}

function save(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

type Action =
  | { type: 'replace'; data: AppData }
  | { type: 'upsert_phone'; phone: Phone }
  | { type: 'delete_phone'; id: string }
  | { type: 'set_status'; id: string; status: PhoneStatus }
  | { type: 'set_repairs'; id: string; repairs: Repair[] }
  | { type: 'set_listings'; id: string; listings: Listing[] }
  | { type: 'list_phone'; id: string; listings: Listing[] }
  | { type: 'record_sale'; id: string; patch: Partial<Phone> }
  | { type: 'void_sale'; id: string }
  | { type: 'upsert_equipment'; item: EquipmentItem }
  | { type: 'set_equipment_stock'; id: string; stockStatus: EquipmentStockStatus }
  | { type: 'delete_equipment'; id: string }
  | { type: 'upsert_wish'; item: EquipmentWish }
  | { type: 'delete_wish'; id: string }
  | { type: 'buy_wish'; wishId: string; item: EquipmentItem }
  | { type: 'upsert_job'; job: RepairJob }
  | { type: 'delete_job'; id: string }
  | { type: 'set_job_status'; id: string; status: JobStatus }
  | { type: 'set_job_parts'; id: string; parts: Repair[] }
  | { type: 'upsert_stock'; item: StockPart }
  | { type: 'delete_stock'; id: string }
  | { type: 'assign_stock'; stockId: string; target: { kind: 'phone' | 'job'; id: string }; repair: Repair }
  | { type: 'assign_equipment'; target: { kind: 'phone' | 'job'; id: string }; repair: Repair }
  | {
      type: 'return_leftover'
      target: { kind: 'phone' | 'job'; id: string }
      repairId: string
      dest: 'stock' | 'equipment'
    }
  | { type: 'set_workshop'; workshop: WorkshopProfile }
  | { type: 'upsert_quote'; quote: Quote }
  | { type: 'delete_quote'; id: string }
  | { type: 'accept_quote'; id: string; acceptedJobId: string; job?: RepairJob }
  | { type: 'upsert_receipt'; receipt: Receipt }
  | { type: 'delete_receipt'; id: string }

function keepDemo<T extends { id: string; demo?: boolean }>(
  existing: T | undefined,
  next: T,
): T {
  return existing?.demo ? { ...next, demo: true } : next
}

function touch(phone: Phone): Phone {
  return {
    ...phone,
    updatedAt: new Date().toISOString(),
    repairs: asList(phone.repairs),
    listings: asList(phone.listings),
  }
}

function touchJob(job: RepairJob): RepairJob {
  return {
    ...job,
    updatedAt: new Date().toISOString(),
    parts: asList(job.parts),
  }
}

function mergeListings(existing: Listing[] | undefined, incoming: Listing[]): Listing[] {
  const next = [...asList<Listing>(existing)]
  for (const listing of incoming) {
    const i = next.findIndex((l) => l.active && l.platform === listing.platform)
    if (i >= 0) next[i] = { ...listing, id: next[i].id }
    else next.push(listing)
  }
  return next
}

function leftoverStock(repair: Repair): StockPart {
  return {
    id: uid(),
    name: repair.name,
    cost: repair.cost,
    supplier: repair.supplier,
    date: today(),
    notes: 'Overgebleven van een ticket',
    qty: 1,
    status: 'op_voorraad',
    assignedKind: null,
    assignedId: null,
    alreadyExpensed: true,
  }
}

function leftoverEquipment(repair: Repair): EquipmentItem {
  const purchase: EquipmentPurchase = {
    id: uid(),
    cost: repair.cost,
    date: today(),
    qty: 1,
    alreadyExpensed: true,
  }
  return {
    id: uid(),
    name: repair.name,
    cost: repair.cost,
    purchaseDate: today(),
    category: 'Overig',
    notes: 'Overgebleven van een ticket',
    alreadyExpensed: true,
    stockStatus: 'op_voorraad',
    purchases: [purchase],
    updatedAt: new Date().toISOString(),
  }
}

function sameItemName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function attachRepair(
  state: AppData,
  target: { kind: 'phone' | 'job'; id: string },
  repair: Repair,
  extra: Partial<AppData> = {},
): AppData {
  if (target.kind === 'phone') {
    return {
      ...state,
      ...extra,
      phones: state.phones.map((p) =>
        p.id === target.id
          ? touch({
              ...p,
              repairs: [...asList<Repair>(p.repairs), repair],
              status: p.status === 'kast' ? 'bezig' : p.status,
            })
          : p,
      ),
    }
  }
  return {
    ...state,
    ...extra,
    repairJobs: state.repairJobs.map((j) =>
      j.id === target.id
        ? touchJob({
            ...j,
            parts: [...asList<Repair>(j.parts), repair],
            status: j.status === 'nieuw' ? 'bezig' : j.status,
          })
        : j,
    ),
  }
}

function withJobDates(job: RepairJob, prev?: RepairJob): RepairJob {
  const next = { ...job }
  if (next.status === 'klaar') {
    next.dateDone = next.dateDone || today()
  }
  if (next.status === 'opgehaald') {
    next.dateDone = next.dateDone || today()
    const justPickedUp = prev?.status !== 'opgehaald'
    if (justPickedUp) {
      const chosen = next.paidAt && next.paidAt !== prev?.paidAt ? next.paidAt : today()
      next.paidAt = chosen
    } else {
      next.paidAt = next.paidAt || today()
    }
  }
  return next
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'replace':
      return normalize(action.data)
    case 'upsert_phone': {
      if (isTombstoned(state, action.phone.id)) return state
      const existing = state.phones.find((p) => p.id === action.phone.id)
      const phone = keepDemo(existing, action.phone)
      const phones = existing
        ? state.phones.map((p) => (p.id === phone.id ? touch(phone) : p))
        : [...state.phones, touch(phone)]
      return { ...state, phones }
    }
    case 'delete_phone': {
      const phone = state.phones.find((p) => p.id === action.id)
      const extra = phone
        ? [
            phone.id,
            ...asList<Repair>(phone.repairs).map((r) => r.id),
            ...asList<Listing>(phone.listings).map((l) => l.id),
          ]
        : [action.id]
      return {
        ...state,
        deletedIds: withTombstones(state, extra),
        phones: state.phones.filter((p) => p.id !== action.id),
      }
    }
    case 'set_status':
      return {
        ...state,
        phones: state.phones.map((p) => {
          if (p.id !== action.id) return p
          const next = touch({ ...p, status: action.status })
          if (action.status !== 'verkocht') {
            next.salePrice = null
            next.saleDate = null
            next.salePlatform = null
            next.platformFee = 0
            next.shippingCost = 0
          }
          if (
            p.status === 'te_koop' &&
            action.status !== 'te_koop' &&
            action.status !== 'verkocht'
          ) {
            next.listings = asList<Listing>(next.listings).map((l) => ({ ...l, active: false }))
          }
          return next
        }),
      }
    case 'set_repairs': {
      const phone = state.phones.find((p) => p.id === action.id)
      const deletedIds = withTombstones(state, goneIds(phone?.repairs, action.repairs))
      const repairs = dropDeleted(action.repairs, new Set(deletedIds))
      return {
        ...state,
        deletedIds,
        phones: state.phones.map((p) =>
          p.id === action.id ? touch({ ...p, repairs }) : p,
        ),
      }
    }
    case 'set_listings': {
      const phone = state.phones.find((p) => p.id === action.id)
      const deletedIds = withTombstones(state, goneIds(phone?.listings, action.listings))
      const listings = dropDeleted(action.listings, new Set(deletedIds))
      return {
        ...state,
        deletedIds,
        phones: state.phones.map((p) =>
          p.id === action.id ? touch({ ...p, listings }) : p,
        ),
      }
    }
    case 'list_phone':
      return {
        ...state,
        phones: state.phones.map((p) =>
          p.id === action.id
            ? touch({
                ...p,
                status: 'te_koop',
                listings: mergeListings(p.listings, action.listings),
              })
            : p,
        ),
      }
    case 'record_sale':
      return {
        ...state,
        phones: state.phones.map((p) =>
          p.id === action.id
            ? touch({
                ...p,
                ...action.patch,
                status: 'verkocht',
                listings: asList<Listing>(p.listings).map((l) => ({ ...l, active: false })),
              })
            : p,
        ),
      }
    case 'void_sale':
      return {
        ...state,
        phones: state.phones.map((p) =>
          p.id === action.id
            ? touch({
                ...p,
                status: 'te_koop',
                salePrice: null,
                saleDate: null,
                salePlatform: null,
                platformFee: 0,
                shippingCost: 0,
              })
            : p,
        ),
      }
    case 'upsert_equipment': {
      if (isTombstoned(state, action.item.id)) return state
      const existing = state.equipment.find((e) => e.id === action.item.id)
      const item = keepDemo(existing, {
        ...action.item,
        stockStatus: action.item.stockStatus ?? existing?.stockStatus ?? 'op_voorraad',
        updatedAt: new Date().toISOString(),
      })
      const equipment = existing
        ? state.equipment.map((e) => (e.id === item.id ? item : e))
        : [...state.equipment, item]
      return { ...state, equipment }
    }
    case 'set_equipment_stock':
      return {
        ...state,
        equipment: state.equipment.map((e) =>
          e.id === action.id
            ? {
                ...e,
                stockStatus: action.stockStatus,
                updatedAt: new Date().toISOString(),
              }
            : e,
        ),
      }
    case 'delete_equipment': {
      const strip = (repairs: Repair[]) =>
        repairs.map((r) =>
          r.fromEquipmentId === action.id ? { ...r, fromEquipmentId: undefined } : r,
        )
      return {
        ...state,
        deletedIds: withTombstones(state, [action.id]),
        equipment: state.equipment.filter((e) => e.id !== action.id),
        phones: state.phones.map((p) =>
          asList<Repair>(p.repairs).some((r) => r.fromEquipmentId === action.id)
            ? touch({ ...p, repairs: strip(asList<Repair>(p.repairs)) })
            : p,
        ),
        repairJobs: state.repairJobs.map((j) =>
          asList<Repair>(j.parts).some((r) => r.fromEquipmentId === action.id)
            ? touchJob({ ...j, parts: strip(asList<Repair>(j.parts)) })
            : j,
        ),
      }
    }
    case 'upsert_wish': {
      if (isTombstoned(state, action.item.id)) return state
      const existing = state.equipmentWishlist.find((w) => w.id === action.item.id)
      const item = keepDemo(existing, action.item)
      const equipmentWishlist = existing
        ? state.equipmentWishlist.map((w) => (w.id === item.id ? item : w))
        : [...state.equipmentWishlist, item]
      return { ...state, equipmentWishlist }
    }
    case 'delete_wish':
      return {
        ...state,
        deletedIds: withTombstones(state, [action.id]),
        equipmentWishlist: state.equipmentWishlist.filter((w) => w.id !== action.id),
      }
    case 'buy_wish':
      return {
        ...state,
        deletedIds: withTombstones(state, [action.wishId]),
        equipmentWishlist: state.equipmentWishlist.filter((w) => w.id !== action.wishId),
        equipment: [...state.equipment, action.item],
      }
    case 'upsert_job': {
      if (isTombstoned(state, action.job.id)) return state
      const existing = state.repairJobs.find((j) => j.id === action.job.id)
      const job = touchJob(withJobDates(keepDemo(existing, action.job), existing))
      const repairJobs = existing
        ? state.repairJobs.map((j) => (j.id === job.id ? job : j))
        : [...state.repairJobs, job]
      return { ...state, repairJobs }
    }
    case 'delete_job': {
      const job = state.repairJobs.find((j) => j.id === action.id)
      const extra = job
        ? [job.id, ...asList<Repair>(job.parts).map((r) => r.id)]
        : [action.id]
      return {
        ...state,
        deletedIds: withTombstones(state, extra),
        repairJobs: state.repairJobs.filter((j) => j.id !== action.id),
      }
    }
    case 'set_job_status':
      return {
        ...state,
        repairJobs: state.repairJobs.map((j) => {
          if (j.id !== action.id) return j
          return touchJob(withJobDates({ ...j, status: action.status }, j))
        }),
      }
    case 'set_job_parts': {
      const job = state.repairJobs.find((j) => j.id === action.id)
      const deletedIds = withTombstones(state, goneIds(job?.parts, action.parts))
      const parts = dropDeleted(action.parts, new Set(deletedIds))
      return {
        ...state,
        deletedIds,
        repairJobs: state.repairJobs.map((j) =>
          j.id === action.id ? touchJob({ ...j, parts }) : j,
        ),
      }
    }
    case 'upsert_stock': {
      if (isTombstoned(state, action.item.id)) return state
      const existing = state.stockParts.find((s) => s.id === action.item.id)
      const item = keepDemo(existing, action.item)
      const stockParts = existing
        ? state.stockParts.map((s) => (s.id === item.id ? item : s))
        : [...state.stockParts, item]
      return { ...state, stockParts }
    }
    case 'delete_stock': {
      const strip = (repairs: Repair[]) =>
        repairs.map((r) =>
          r.fromStockId === action.id ? { ...r, fromStockId: undefined } : r,
        )
      return {
        ...state,
        deletedIds: withTombstones(state, [action.id]),
        stockParts: state.stockParts.filter((s) => s.id !== action.id),
        phones: state.phones.map((p) =>
          asList<Repair>(p.repairs).some((r) => r.fromStockId === action.id)
            ? touch({ ...p, repairs: strip(asList<Repair>(p.repairs)) })
            : p,
        ),
        repairJobs: state.repairJobs.map((j) =>
          asList<Repair>(j.parts).some((r) => r.fromStockId === action.id)
            ? touchJob({ ...j, parts: strip(asList<Repair>(j.parts)) })
            : j,
        ),
      }
    }
    case 'assign_stock': {
      const stock = state.stockParts.find((s) => s.id === action.stockId)
      if (!stock || stock.status === 'gebruikt' || stock.qty < 1) return state
      const nextQty = stock.qty - 1
      const stockParts = state.stockParts.map((s) =>
        s.id !== action.stockId
          ? s
          : {
              ...s,
              qty: Math.max(0, nextQty),
              status: (nextQty <= 0 ? 'gebruikt' : s.status) as StockStatus,
              assignedKind: action.target.kind,
              assignedId: action.target.id,
            },
      )
      if (action.target.kind === 'phone') {
        return attachRepair(state, action.target, action.repair, { stockParts })
      }
      return attachRepair(state, action.target, action.repair, { stockParts })
    }
    case 'assign_equipment':
      return attachRepair(state, action.target, action.repair)
    case 'return_leftover': {
      const phone =
        action.target.kind === 'phone'
          ? state.phones.find((p) => p.id === action.target.id)
          : undefined
      const job =
        action.target.kind === 'job'
          ? state.repairJobs.find((j) => j.id === action.target.id)
          : undefined
      const repair = phone
        ? asList<Repair>(phone.repairs).find((r) => r.id === action.repairId)
        : job
          ? asList<Repair>(job.parts).find((r) => r.id === action.repairId)
          : undefined
      if (!repair || repair.leftoverDest) return state

      const dest: LeftoverDest = action.dest
      const mark = (r: Repair) => (r.id === repair.id ? { ...r, leftoverDest: dest } : r)
      const phones = phone
        ? state.phones.map((p) =>
            p.id === phone.id ? touch({ ...p, repairs: asList<Repair>(p.repairs).map(mark) }) : p,
          )
        : state.phones
      const repairJobs = job
        ? state.repairJobs.map((j) =>
            j.id === job.id ? touchJob({ ...j, parts: asList<Repair>(j.parts).map(mark) }) : j,
          )
        : state.repairJobs

      let stockParts = state.stockParts
      let equipment = state.equipment
      if (dest === 'stock') {
        const origin = repair.fromStockId
          ? stockParts.find((s) => s.id === repair.fromStockId)
          : undefined
        const match =
          origin ?? stockParts.find((s) => sameItemName(s.name, repair.name))
        if (match) {
          stockParts = stockParts.map((s) =>
            s.id === match.id
              ? {
                  ...s,
                  qty: s.qty + 1,
                  status: (s.status === 'gebruikt' ? 'op_voorraad' : s.status) as StockStatus,
                  assignedKind: null,
                  assignedId: null,
                }
              : s,
          )
        } else {
          stockParts = [...stockParts, leftoverStock(repair)]
        }
      } else {
        const origin = repair.fromEquipmentId
          ? equipment.find((e) => e.id === repair.fromEquipmentId)
          : undefined
        const match =
          origin ?? equipment.find((e) => sameItemName(e.name, repair.name))
        if (match) {
          equipment = equipment.map((e) =>
            e.id === match.id
              ? { ...e, stockStatus: 'op_voorraad' as const, updatedAt: new Date().toISOString() }
              : e,
          )
        } else {
          equipment = [...equipment, leftoverEquipment(repair)]
        }
      }

      return {
        ...state,
        phones,
        repairJobs,
        stockParts,
        equipment,
      }
    }
    case 'set_workshop':
      return {
        ...state,
        workshop: normalizeWorkshop({
          ...action.workshop,
          passwordHash: action.workshop.passwordHash ?? state.workshop?.passwordHash,
          updatedAt: new Date().toISOString(),
        }),
      }
    case 'upsert_quote': {
      if (isTombstoned(state, action.quote.id)) return state
      const list = state.quotes ?? []
      const existing = list.find((q) => q.id === action.quote.id)
      const quote = {
        ...action.quote,
        lines: asList<DocLine>(action.quote.lines),
        updatedAt: new Date().toISOString(),
      }
      const quotes = existing
        ? list.map((q) => (q.id === quote.id ? quote : q))
        : [...list, quote]
      return { ...state, quotes }
    }
    case 'delete_quote':
      return {
        ...state,
        deletedIds: withTombstones(state, [action.id]),
        quotes: (state.quotes ?? []).filter((q) => q.id !== action.id),
      }
    case 'accept_quote': {
      const list = state.quotes ?? []
      const quote = list.find((q) => q.id === action.id)
      if (!quote) return state
      const repairJobs = action.job
        ? [...state.repairJobs, action.job]
        : state.repairJobs
      return {
        ...state,
        repairJobs,
        quotes: list.map((q) =>
          q.id === quote.id
            ? {
                ...q,
                status: 'geaccepteerd' as const,
                acceptedJobId: action.acceptedJobId,
                updatedAt: new Date().toISOString(),
              }
            : q,
        ),
      }
    }
    case 'upsert_receipt': {
      if (isTombstoned(state, action.receipt.id)) return state
      const list = state.receipts ?? []
      const existing = list.find((r) => r.id === action.receipt.id)
      const receipt = {
        ...action.receipt,
        lines: asList<DocLine>(action.receipt.lines),
        updatedAt: new Date().toISOString(),
      }
      const receipts = existing
        ? list.map((r) => (r.id === receipt.id ? receipt : r))
        : [...list, receipt]
      return { ...state, receipts }
    }
    case 'delete_receipt':
      return {
        ...state,
        deletedIds: withTombstones(state, [action.id]),
        receipts: (state.receipts ?? []).filter((r) => r.id !== action.id),
      }
    default:
      return state
  }
}

type Store = {
  data: AppData
  addPhone: (input: Omit<Phone, 'id' | 'ticketNr' | 'createdAt' | 'updatedAt' | 'repairs' | 'listings'>) => Phone
  updatePhone: (phone: Phone) => void
  deletePhone: (id: string) => void
  setStatus: (id: string, status: PhoneStatus) => void
  setRepairs: (id: string, repairs: Repair[]) => void
  setListings: (id: string, listings: Listing[]) => void
  listPhone: (id: string, listings: Listing[]) => void
  recordSale: (id: string, patch: Partial<Phone>) => void
  voidSale: (id: string) => void
  upsertEquipment: (item: EquipmentItem) => void
  setEquipmentStock: (id: string, stockStatus: EquipmentStockStatus) => void
  deleteEquipment: (id: string) => void
  upsertWish: (item: EquipmentWish) => void
  deleteWish: (id: string) => void
  buyWish: (wishId: string, purchase: { cost: number; purchaseDate: string }) => void
  addJob: (
    input: Omit<RepairJob, 'id' | 'ticketNr' | 'createdAt' | 'updatedAt' | 'parts'>,
  ) => RepairJob
  updateJob: (job: RepairJob) => void
  deleteJob: (id: string) => void
  setJobStatus: (id: string, status: JobStatus) => void
  setJobParts: (id: string, parts: Repair[]) => void
  upsertStock: (item: StockPart) => void
  deleteStock: (id: string) => void
  assignStock: (stockId: string, target: { kind: 'phone' | 'job'; id: string }) => void
  assignEquipment: (equipmentId: string, target: { kind: 'phone' | 'job'; id: string }) => void
  returnLeftover: (
    target: { kind: 'phone' | 'job'; id: string },
    repairId: string,
    dest: 'stock' | 'equipment',
  ) => void
  setWorkshop: (workshop: WorkshopProfile) => void
  upsertQuote: (quote: Quote) => Quote
  deleteQuote: (id: string) => void
  acceptQuote: (id: string, live?: Quote) => string | null
  receiptFromQuote: (id: string, live?: Quote) => string | null
  upsertReceipt: (receipt: Receipt) => Receipt
  deleteReceipt: (id: string) => void
  importData: (data: AppData) => void
  applyRemote: (data: AppData) => void
  exportData: () => AppData
}

const StoreContext = createContext<Store | null>(null)

let skipCloudPush = false

export function consumeSkipCloudPush(): boolean {
  if (!skipCloudPush) return false
  skipCloudPush = false
  return true
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    save(data)
  }, [data])

  const api = useMemo<Store>(() => {
    return {
      data,
      addPhone(input) {
        const phone: Phone = {
          ...input,
          id: uid(),
          ticketNr: nextTicketNr(data.phones.map((p) => p.ticketNr)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          repairs: [],
          listings: [],
        }
        dispatch({ type: 'upsert_phone', phone })
        return phone
      },
      updatePhone(phone) {
        dispatch({ type: 'upsert_phone', phone })
      },
      deletePhone(id) {
        void deleteListingPhotos(id)
        dispatch({ type: 'delete_phone', id })
      },
      setStatus(id, status) {
        dispatch({ type: 'set_status', id, status })
      },
      setRepairs(id, repairs) {
        dispatch({ type: 'set_repairs', id, repairs })
      },
      setListings(id, listings) {
        dispatch({ type: 'set_listings', id, listings })
      },
      listPhone(id, listings) {
        dispatch({ type: 'list_phone', id, listings })
      },
      recordSale(id, patch) {
        dispatch({ type: 'record_sale', id, patch })
      },
      voidSale(id) {
        dispatch({ type: 'void_sale', id })
      },
      upsertEquipment(item) {
        dispatch({ type: 'upsert_equipment', item })
      },
      setEquipmentStock(id, stockStatus) {
        dispatch({ type: 'set_equipment_stock', id, stockStatus })
      },
      deleteEquipment(id) {
        dispatch({ type: 'delete_equipment', id })
      },
      upsertWish(item) {
        dispatch({ type: 'upsert_wish', item })
      },
      deleteWish(id) {
        dispatch({ type: 'delete_wish', id })
      },
      buyWish(wishId, purchase) {
        const wish = data.equipmentWishlist.find((w) => w.id === wishId)
        if (!wish) return
        dispatch({
          type: 'buy_wish',
          wishId,
          item: {
            id: uid(),
            name: wish.name,
            cost: purchase.cost,
            purchaseDate: purchase.purchaseDate,
            category: wish.category,
            notes: wish.notes,
            demo: wish.demo,
          },
        })
      },
      addJob(input) {
        const job: RepairJob = {
          ...input,
          id: uid(),
          ticketNr: nextTicketNr(data.repairJobs.map((j) => j.ticketNr)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parts: [],
        }
        dispatch({ type: 'upsert_job', job })
        return job
      },
      updateJob(job) {
        dispatch({ type: 'upsert_job', job })
      },
      deleteJob(id) {
        dispatch({ type: 'delete_job', id })
      },
      setJobStatus(id, status) {
        dispatch({ type: 'set_job_status', id, status })
      },
      setJobParts(id, parts) {
        dispatch({ type: 'set_job_parts', id, parts })
      },
      upsertStock(item) {
        dispatch({ type: 'upsert_stock', item })
      },
      deleteStock(id) {
        dispatch({ type: 'delete_stock', id })
      },
      assignStock(stockId, target) {
        const stock = data.stockParts.find((s) => s.id === stockId)
        if (!stock || stock.qty < 1) return
        const unitCost =
          stock.qty > 1 ? Math.round((stock.cost / stock.qty) * 100) / 100 : stock.cost
        const repair: Repair = {
          id: uid(),
          name: stock.name,
          cost: unitCost,
          date: stock.date,
          supplier: stock.supplier,
          status: 'geinstalleerd',
          notes: stock.notes,
          fromStockId: stock.id,
        }
        dispatch({ type: 'assign_stock', stockId, target, repair })
      },
      assignEquipment(equipmentId, target) {
        const item = data.equipment.find((e) => e.id === equipmentId)
        if (!item) return
        const repair: Repair = {
          id: uid(),
          name: item.name,
          cost: 0,
          date: today(),
          supplier: '',
          status: 'geinstalleerd',
          notes: 'Uit apparatuur',
          fromEquipmentId: item.id,
        }
        dispatch({ type: 'assign_equipment', target, repair })
      },
      returnLeftover(target, repairId, dest) {
        dispatch({ type: 'return_leftover', target, repairId, dest })
      },
      setWorkshop(workshop) {
        dispatch({ type: 'set_workshop', workshop })
      },
      upsertQuote(quote) {
        const nr = quote.nr || nextTicketNr(data.quotes.map((q) => q.nr))
        const next = {
          ...quote,
          nr,
          createdAt: quote.createdAt || new Date().toISOString(),
        }
        dispatch({ type: 'upsert_quote', quote: next })
        return next
      },
      deleteQuote(id) {
        dispatch({ type: 'delete_quote', id })
      },
      acceptQuote(id, live) {
        let quote = live ?? data.quotes.find((q) => q.id === id)
        if (!quote) return null
        if (live) {
          quote = {
            ...live,
            nr: live.nr || nextTicketNr(data.quotes.map((q) => q.nr)),
            createdAt: live.createdAt || new Date().toISOString(),
          }
          dispatch({ type: 'upsert_quote', quote })
        }
        const linked =
          (quote.jobId && data.repairJobs.find((j) => j.id === quote.jobId)) ||
          (quote.acceptedJobId && data.repairJobs.find((j) => j.id === quote.acceptedJobId))
        if (linked) {
          dispatch({ type: 'accept_quote', id, acceptedJobId: linked.id })
          return linked.id
        }
        const chargeParts = quote.lines.reduce((s, l) => s + l.amount, 0)
        const job: RepairJob = {
          id: uid(),
          ticketNr: nextTicketNr(data.repairJobs.map((j) => j.ticketNr)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customerName: quote.customerName,
          kind: 'klant',
          brand: quote.brand,
          model: quote.model,
          notes: quote.notes,
          damage: quote.damage,
          todo: quote.todo,
          workDone: '',
          status: 'nieuw',
          parts: quote.lines
            .filter((l) => l.name.trim())
            .map((l) => ({
              id: uid(),
              name: l.name.trim(),
              cost: 0,
              date: today(),
              supplier: '',
              status: 'te_bestellen' as const,
              notes: '',
            })),
          laborCharge: quote.laborCharge,
          chargeParts,
          dateIn: today(),
          dateDone: null,
          paidAt: null,
        }
        dispatch({ type: 'accept_quote', id, acceptedJobId: job.id, job })
        return job.id
      },
      receiptFromQuote(id, live) {
        let quote = live ?? data.quotes.find((q) => q.id === id)
        if (!quote) return null
        if (live) {
          quote = {
            ...live,
            nr: live.nr || nextTicketNr(data.quotes.map((q) => q.nr)),
            createdAt: live.createdAt || new Date().toISOString(),
          }
          dispatch({ type: 'upsert_quote', quote })
        }
        const lines = linesFromQuote(quote)
        const receipt: Receipt = {
          id: uid(),
          nr: nextTicketNr(data.receipts.map((r) => r.nr)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          jobId: quote.jobId || quote.acceptedJobId || null,
          customerName: quote.customerName,
          brand: quote.brand,
          model: quote.model,
          damage: quote.damage,
          workDone: quote.todo || '',
          notes: quote.notes,
          lines,
          laborCharge: quote.laborCharge || 0,
          paidTotal: quoteTotal(quote),
          paidAt: today(),
        }
        dispatch({ type: 'upsert_receipt', receipt })
        return receipt.id
      },
      upsertReceipt(receipt) {
        const nr = receipt.nr || nextTicketNr(data.receipts.map((r) => r.nr))
        const next = {
          ...receipt,
          nr,
          createdAt: receipt.createdAt || new Date().toISOString(),
        }
        dispatch({ type: 'upsert_receipt', receipt: next })
        return next
      },
      deleteReceipt(id) {
        dispatch({ type: 'delete_receipt', id })
      },
      importData(next) {
        dispatch({ type: 'replace', data: normalize(next) })
      },
      applyRemote(next) {
        skipCloudPush = true
        dispatch({ type: 'replace', data: normalize(next) })
      },
      exportData() {
        return data
      },
    }
  }, [data])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore moet binnen StoreProvider')
  return ctx
}

export function blankPhoneFields() {
  return {
    brand: 'Apple',
    model: '',
    storage: '128 GB',
    color: '',
    imei: '',
    condition: 'Goed',
    notes: '',
    damage: '',
    todo: '',
    workDone: '',
    purchasePrice: 0,
    purchaseDate: today(),
    purchaseSource: '',
    customerName: '',
    status: 'kast' as PhoneStatus,
    salePrice: null,
    saleDate: null,
    salePlatform: null,
    platformFee: 0,
    shippingCost: 0,
  }
}

export function blankJobFields() {
  return {
    customerName: '',
    kind: 'klant' as JobKind,
    brand: 'Apple',
    model: '',
    notes: '',
    damage: '',
    todo: '',
    workDone: '',
    status: 'nieuw' as JobStatus,
    laborCharge: 0,
    chargeParts: 0,
    dateIn: today(),
    dateDone: null as string | null,
    paidAt: null as string | null,
  }
}
