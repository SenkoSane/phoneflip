export const PHONE_STATUSES = [
  'kast',
  'bezig',
  'klaar',
  'te_koop',
  'verkocht',
] as const

export type PhoneStatus = (typeof PHONE_STATUSES)[number]

export const REPAIR_STATUSES = [
  'te_bestellen',
  'besteld',
  'binnen',
  'geinstalleerd',
] as const

export type RepairStatus = (typeof REPAIR_STATUSES)[number]

export const PLATFORMS = [
  'marktplaats',
  'vinted',
  'facebook',
  'whatsapp',
  'instagram',
  'overig',
] as const

export type Platform = (typeof PLATFORMS)[number]

export type LeftoverDest = 'stock' | 'equipment'

export type Repair = {
  id: string
  name: string
  cost: number
  date: string
  supplier: string
  status: RepairStatus
  notes: string
  fromStockId?: string
  fromEquipmentId?: string
  leftoverDest?: LeftoverDest
}

export type Listing = {
  id: string
  platform: Platform
  askingPrice: number
  url: string
  listedAt: string
  active: boolean
}

export type Phone = {
  id: string
  ticketNr: number
  createdAt: string
  updatedAt: string
  brand: string
  model: string
  storage: string
  color: string
  imei: string
  condition: string
  notes: string
  damage: string
  todo: string
  workDone: string
  purchasePrice: number
  purchaseDate: string
  purchaseSource: string
  customerName: string
  status: PhoneStatus
  repairs: Repair[]
  listings: Listing[]
  salePrice: number | null
  saleDate: string | null
  salePlatform: Platform | null
  platformFee: number
  shippingCost: number
  demo?: boolean
}

export const EQUIPMENT_STOCK_STATUSES = ['op_voorraad', 'op'] as const
export type EquipmentStockStatus = (typeof EQUIPMENT_STOCK_STATUSES)[number]

export type EquipmentPurchase = {
  id: string
  cost: number
  date: string
  qty?: number
  notes?: string
  alreadyExpensed?: boolean
}

export type EquipmentItem = {
  id: string
  name: string
  cost: number
  purchaseDate: string
  category: string
  notes: string
  demo?: boolean
  alreadyExpensed?: boolean
  stockStatus?: EquipmentStockStatus
  purchases?: EquipmentPurchase[]
  updatedAt?: string
}

export type EquipmentWish = {
  id: string
  name: string
  estimatedPrice: number
  category: string
  notes: string
  url: string
  status: 'te_kopen'
  createdAt: string
  demo?: boolean
}

export const JOB_STATUSES = ['nieuw', 'bezig', 'klaar', 'opgehaald'] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_KINDS = ['klant', 'vriend'] as const

export type JobKind = (typeof JOB_KINDS)[number]

export type RepairJob = {
  id: string
  ticketNr: number
  createdAt: string
  updatedAt: string
  customerName: string
  kind: JobKind
  brand: string
  model: string
  notes: string
  damage: string
  todo: string
  workDone: string
  status: JobStatus
  parts: Repair[]
  laborCharge: number
  chargeParts: number
  dateIn: string
  dateDone: string | null
  paidAt: string | null
  demo?: boolean
}

export const QUOTE_STATUSES = ['open', 'geaccepteerd', 'afgewezen'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export type DocLine = {
  id: string
  name: string
  amount: number
}

export type Quote = {
  id: string
  nr: number
  createdAt: string
  updatedAt: string
  jobId: string | null
  acceptedJobId: string | null
  status: QuoteStatus
  customerName: string
  brand: string
  model: string
  damage: string
  todo: string
  notes: string
  lines: DocLine[]
  laborCharge: number
  date: string
  demo?: boolean
}

export type Receipt = {
  id: string
  nr: number
  createdAt: string
  updatedAt: string
  jobId: string | null
  customerName: string
  brand: string
  model: string
  damage: string
  workDone: string
  notes: string
  lines: DocLine[]
  laborCharge: number
  paidTotal: number
  paidAt: string
  demo?: boolean
}

export const STOCK_STATUSES = ['op_voorraad', 'gereserveerd', 'gebruikt'] as const

export type StockStatus = (typeof STOCK_STATUSES)[number]

export type StockPart = {
  id: string
  name: string
  cost: number
  supplier: string
  date: string
  notes: string
  qty: number
  status: StockStatus
  assignedKind: 'phone' | 'job' | null
  assignedId: string | null
  alreadyExpensed?: boolean
  demo?: boolean
}

export type AppData = {
  version: 1
  phones: Phone[]
  equipment: EquipmentItem[]
  equipmentWishlist: EquipmentWish[]
  repairJobs: RepairJob[]
  stockParts: StockPart[]
  deletedIds: string[]
  workshop: WorkshopProfile
  quotes: Quote[]
  receipts: Receipt[]
}

export type WorkshopProfile = {
  companyName: string
  phone: string
  city: string
  address: string
  kvk: string
  iban: string
  email: string
  locale?: 'nl' | 'en'
  passwordHash?: string
  updatedAt: string
}

export const EMPTY_WORKSHOP: WorkshopProfile = {
  companyName: 'Phone Flipper',
  phone: '',
  city: '',
  address: '',
  kvk: '',
  iban: '',
  email: '',
  updatedAt: '',
}

export const STATUS_LABEL: Record<PhoneStatus, string> = {
  kast: 'In de kast',
  bezig: 'Bezig',
  klaar: 'Klaar',
  te_koop: 'Te koop',
  verkocht: 'Verkocht',
}

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  te_bestellen: 'Te bestellen',
  besteld: 'Besteld',
  binnen: 'Binnen',
  geinstalleerd: 'Geïnstalleerd',
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  nieuw: 'Nieuw',
  bezig: 'Bezig',
  klaar: 'Klaar',
  opgehaald: 'Opgehaald',
}

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  klant: 'Klant',
  vriend: 'Vriend',
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  open: 'Open',
  geaccepteerd: 'Geaccepteerd',
  afgewezen: 'Afgewezen',
}

export const EQUIPMENT_STOCK_LABEL: Record<EquipmentStockStatus, string> = {
  op_voorraad: 'Op voorraad',
  op: 'Op',
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  op_voorraad: 'Op voorraad',
  gereserveerd: 'Gereserveerd',
  gebruikt: 'Gebruikt',
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  marktplaats: 'Marktplaats',
  vinted: 'Vinted',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  overig: 'Overig',
}

export const BRANDS = [
  'Apple',
  'Samsung',
  'Google',
  'OnePlus',
  'Xiaomi',
  'Motorola',
  'Sony',
  'Overig',
]

export const STORAGE_OPTIONS = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']

export const CONDITIONS = [
  'Nieuw',
  'Zo goed als nieuw',
  'Goed',
  'Redelijk',
  'Beschadigd',
  'Voor onderdelen',
]

export const PART_OTHER = 'Overig'

export const PART_SUGGESTIONS = [
  'Scherm',
  'Batterij',
  'Achterkant',
  'Camera',
  'Oplaadpoort',
  'Speaker',
  'Microfoon',
  'Face ID / flexkabel',
  'Frame',
  'Knoppen',
  'Sim-lade',
]

const EQUIPMENT_LEFTOVER_KEYS = [
  'elastiek',
  'ipa',
  'isoprop',
  'alcohol',
  'lijm',
  't-7000',
  't7000',
  'b-7000',
  'b7000',
  'tape',
  'kapton',
  'plectrum',
]

export function guessLeftoverDest(name: string): LeftoverDest | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  if (EQUIPMENT_LEFTOVER_KEYS.some((k) => n.includes(k))) return 'equipment'
  if (PART_SUGGESTIONS.some((p) => p.toLowerCase() === n)) return 'stock'
  return null
}

export function resolveLeftoverDest(repair: Repair): LeftoverDest | null {
  if (repair.fromStockId) return 'stock'
  if (repair.fromEquipmentId) return 'equipment'
  return guessLeftoverDest(repair.name)
}

export const EQUIPMENT_CATEGORIES = [
  'Gereedschap',
  'Testers',
  'Werkplek',
  'Software',
  'Overig',
]
