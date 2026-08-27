import { get, onValue, ref, set } from 'firebase/database'
import { tr } from '../i18n'
import type { AppData, Listing, Phone, Repair, RepairJob, WorkshopProfile } from '../types'
import { getSyncDatabase, isFirebaseConfigured } from './firebase'
import { normalize as normalizeAppData, readPersistedTombstones } from '../store'

export const SYNC_CODE_KEY = 'phoneflip.sync.code'
export const SYNC_SAVED_AT_KEY = 'phoneflip.sync.savedAt'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type CloudBlob = {
  savedAt: number
  data: AppData
}

export function makeSyncCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function normalizeSyncCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidSyncCode(code: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(code)
}

export function readStoredCode(): string | null {
  try {
    const code = localStorage.getItem(SYNC_CODE_KEY)
    return code && isValidSyncCode(code) ? code : null
  } catch {
    return null
  }
}

export function writeStoredCode(code: string | null) {
  try {
    if (code) localStorage.setItem(SYNC_CODE_KEY, code)
    else localStorage.removeItem(SYNC_CODE_KEY)
  } catch {
    /* ignore */
  }
}

export function readLocalSavedAt(): number {
  try {
    const n = Number(localStorage.getItem(SYNC_SAVED_AT_KEY) ?? '0')
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function writeLocalSavedAt(at: number) {
  try {
    localStorage.setItem(SYNC_SAVED_AT_KEY, String(at))
  } catch {
    /* ignore */
  }
}

function pathFor(code: string) {
  return `phoneflip/${code}`
}

export async function fetchCloud(code: string): Promise<CloudBlob | null> {
  const db = getSyncDatabase()
  if (!db) throw new Error(tr('sync.err.noFb'))
  const snap = await get(ref(db, pathFor(code)))
  if (!snap.exists()) return null
  const raw = snap.val() as Partial<CloudBlob> | null
  if (!raw || typeof raw.savedAt !== 'number' || !raw.data) return null
  const data = normalizeAppData(raw.data)
  return { savedAt: raw.savedAt, data }
}

export async function pushCloud(code: string, data: AppData, savedAt: number): Promise<void> {
  const db = getSyncDatabase()
  if (!db) throw new Error(tr('sync.err.noFb'))
  const blob: CloudBlob = sanitizeForFirebase({ savedAt, data: normalizeAppData(data) })
  await set(ref(db, pathFor(code)), blob)
  writeLocalSavedAt(savedAt)
}

export function subscribeCloud(
  code: string,
  onBlob: (blob: CloudBlob | null) => void,
  onError: (message: string) => void,
): () => void {
  const db = getSyncDatabase()
  if (!db) {
    onError(tr('sync.err.noFb'))
    return () => {}
  }
  const r = ref(db, pathFor(code))
  const unsub = onValue(
    r,
    (snap) => {
      if (!snap.exists()) {
        onBlob(null)
        return
      }
      const raw = snap.val() as Partial<CloudBlob> | null
      if (!raw || typeof raw.savedAt !== 'number' || !raw.data) {
        onBlob(null)
        return
      }
      onBlob({ savedAt: raw.savedAt, data: normalizeAppData(raw.data) })
    },
    (err) => onError(err.message || tr('sync.err.fail')),
  )
  return unsub
}

function isStoreEmpty(data: AppData): boolean {
  return (
    data.phones.length === 0 &&
    data.equipment.length === 0 &&
    data.equipmentWishlist.length === 0 &&
    data.repairJobs.length === 0 &&
    data.stockParts.length === 0 &&
    (data.quotes ?? []).length === 0 &&
    (data.receipts ?? []).length === 0
  )
}

export function localHasOwnData(data: AppData): boolean {
  return !isStoreEmpty(data)
}

function isDemoItem(item: { demo?: boolean }): boolean {
  return item.demo === true
}

export function isDemoOnly(data: AppData): boolean {
  const all = [
    ...data.phones,
    ...data.repairJobs,
    ...data.equipment,
    ...data.equipmentWishlist,
    ...data.stockParts,
    ...(data.quotes ?? []),
    ...(data.receipts ?? []),
  ]
  return all.length === 0 || all.every(isDemoItem)
}

export function hasUserData(data: AppData): boolean {
  return !isStoreEmpty(data) && !isDemoOnly(data)
}

function mergeNestedById<T extends { id: string }>(
  older: T[] | null | undefined,
  newer: T[] | null | undefined,
  deleted: Set<string>,
): T[] {
  const map = new Map<string, T>()
  for (const item of [...(older ?? []), ...(newer ?? [])]) {
    if (!item?.id || deleted.has(item.id)) continue
    const prev = map.get(item.id)
    map.set(item.id, prev ? { ...prev, ...item } : item)
  }
  return [...map.values()]
}

function pickNewer<T extends { updatedAt?: string; demo?: boolean }>(a: T, b: T): T {
  const ta = a.updatedAt ?? ''
  const tb = b.updatedAt ?? ''
  if (tb > ta) return b
  if (ta > tb) return a
  if (b.demo !== true && a.demo === true) return b
  return a
}

function mergePhone(a: Phone, b: Phone, deleted: Set<string>): Phone {
  const newer = pickNewer(a, b)
  const older = newer === a ? b : a
  return {
    ...newer,
    repairs: mergeNestedById<Repair>(older.repairs, newer.repairs, deleted),
    listings: mergeNestedById<Listing>(older.listings, newer.listings, deleted),
  }
}

function mergeJob(a: RepairJob, b: RepairJob, deleted: Set<string>): RepairJob {
  const newer = pickNewer(a, b)
  const older = newer === a ? b : a
  return {
    ...newer,
    parts: mergeNestedById<Repair>(older.parts, newer.parts, deleted),
  }
}

function mergeById<T extends { id: string; demo?: boolean; updatedAt?: string }>(
  a: T[] | null | undefined,
  b: T[] | null | undefined,
  deleted: Set<string>,
  mergeItem?: (prev: T, next: T) => T,
): T[] {
  const map = new Map<string, T>()
  for (const item of [...(a ?? []), ...(b ?? [])]) {
    if (!item?.id || deleted.has(item.id)) continue
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    map.set(item.id, mergeItem ? mergeItem(prev, item) : pickNewer(prev, item))
  }
  return [...map.values()]
}

export function nestedFingerprint(data: AppData): string {
  const parts: string[] = []
  for (const p of data.phones ?? []) {
    parts.push(`p:${p.id}`)
    for (const r of p.repairs ?? []) parts.push(`pr:${r.id}`)
    for (const l of p.listings ?? []) parts.push(`pl:${l.id}`)
  }
  for (const j of data.repairJobs ?? []) {
    parts.push(`j:${j.id}`)
    for (const r of j.parts ?? []) parts.push(`jp:${r.id}`)
  }
  for (const s of data.stockParts ?? []) parts.push(`s:${s.id}`)
  for (const e of data.equipment ?? []) parts.push(`e:${e.id}`)
  for (const w of data.equipmentWishlist ?? []) parts.push(`w:${w.id}`)
  for (const q of data.quotes ?? []) {
    parts.push(`q:${q.id}`)
    for (const l of q.lines ?? []) parts.push(`ql:${l.id}`)
  }
  for (const r of data.receipts ?? []) {
    parts.push(`rc:${r.id}`)
    for (const l of r.lines ?? []) parts.push(`rl:${l.id}`)
  }
  for (const id of data.deletedIds ?? []) parts.push(`d:${id}`)
  return parts.sort().join(',')
}

export function mergeAppData(local: AppData, remote: AppData): AppData {
  const deletedIds = [
    ...(local.deletedIds ?? []),
    ...(remote.deletedIds ?? []),
    ...readPersistedTombstones(),
  ]
  const deleted = new Set(deletedIds)
  return normalizeAppData({
    version: 1,
    phones: mergeById(local.phones ?? [], remote.phones ?? [], deleted, (a, b) =>
      mergePhone(a, b, deleted),
    ),
    repairJobs: mergeById(local.repairJobs ?? [], remote.repairJobs ?? [], deleted, (a, b) =>
      mergeJob(a, b, deleted),
    ),
    equipment: mergeById(local.equipment ?? [], remote.equipment ?? [], deleted),
    equipmentWishlist: mergeById(
      local.equipmentWishlist ?? [],
      remote.equipmentWishlist ?? [],
      deleted,
    ),
    stockParts: mergeById(local.stockParts ?? [], remote.stockParts ?? [], deleted),
    quotes: mergeById(local.quotes ?? [], remote.quotes ?? [], deleted),
    receipts: mergeById(local.receipts ?? [], remote.receipts ?? [], deleted),
    deletedIds,
    workshop: pickNewerWorkshop(local.workshop, remote.workshop),
  })
}

function pickNewerWorkshop(
  a?: WorkshopProfile | null,
  b?: WorkshopProfile | null,
): WorkshopProfile | undefined {
  const ta = a?.updatedAt ?? ''
  const tb = b?.updatedAt ?? ''
  let picked: WorkshopProfile | null | undefined
  if (tb > ta) picked = b ?? a
  else if (ta > tb) picked = a ?? b
  else {
    const filled = (w?: WorkshopProfile | null) =>
      Boolean(
        w &&
          (w.phone ||
            w.city ||
            w.address ||
            w.kvk ||
            w.iban ||
            w.email ||
            (w.companyName && w.companyName !== 'PhoneFlip' && w.companyName !== 'Phone Flipper')),
      )
    if (filled(a) && !filled(b)) picked = a
    else if (filled(b) && !filled(a)) picked = b
    else picked = a ?? b
  }
  if (!picked) return undefined
  if (picked.passwordHash) return picked
  const hash = a?.passwordHash || b?.passwordHash
  return hash ? { ...picked, passwordHash: hash } : picked
}

export function sanitizeForFirebase<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export { isFirebaseConfigured }
