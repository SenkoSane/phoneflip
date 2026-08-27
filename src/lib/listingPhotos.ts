import {
  LISTING_SLOTS,
  type ListingSlotId,
  type PhotoMap,
} from '../data/listingSlots'

const DB_NAME = 'phoneflip-listing'
const STORE = 'photos'
const FALLBACK = 'phoneflip.listingPhotos.'

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function readFallback(phoneId: string): PhotoMap {
  try {
    const raw = localStorage.getItem(FALLBACK + phoneId)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as PhotoMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeFallback(phoneId: string, photos: PhotoMap) {
  try {
    const slim: PhotoMap = {}
    for (const slot of LISTING_SLOTS) {
      const v = photos[slot.id]
      if (v) slim[slot.id] = v
    }
    localStorage.setItem(FALLBACK + phoneId, JSON.stringify(slim))
  } catch {
    /* quota */
  }
}

export async function loadListingPhotos(phoneId: string): Promise<PhotoMap> {
  const db = await openDb()
  if (!db) return readFallback(phoneId)
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(phoneId)
      req.onsuccess = () => {
        const v = req.result as PhotoMap | undefined
        resolve(v && typeof v === 'object' ? v : {})
      }
      req.onerror = () => resolve(readFallback(phoneId))
    } catch {
      resolve(readFallback(phoneId))
    }
  })
}

export async function saveListingPhotos(phoneId: string, photos: PhotoMap): Promise<void> {
  writeFallback(phoneId, photos)
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(photos, phoneId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export async function deleteListingPhotos(phoneId: string): Promise<void> {
  try {
    localStorage.removeItem(FALLBACK + phoneId)
  } catch {
    /* ignore */
  }
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(phoneId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export function emptyPhotoMap(): PhotoMap {
  return {}
}

export type { ListingSlotId, PhotoMap }
