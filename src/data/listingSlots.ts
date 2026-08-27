export const LISTING_SLOTS = [
  { id: 'frontOn', required: true },
  { id: 'back', required: true },
  { id: 'left', required: true },
  { id: 'right', required: true },
  { id: 'bottom', required: true },
  { id: 'battery', required: true },
  { id: 'damage', required: false },
] as const

export type ListingSlotId = (typeof LISTING_SLOTS)[number]['id']

export type PhotoMap = Partial<Record<ListingSlotId, string>>

export function slotIndex(id: ListingSlotId): number {
  return LISTING_SLOTS.findIndex((s) => s.id === id)
}

export function requiredSlots() {
  return LISTING_SLOTS.filter((s) => s.required)
}

export function filledRequiredCount(photos: PhotoMap): number {
  return requiredSlots().filter((s) => Boolean(photos[s.id])).length
}

/** First required slot without a photo. */
export function nextSlotId(photos: PhotoMap): ListingSlotId | null {
  const next = requiredSlots().find((s) => !photos[s.id])
  if (next) return next.id
  if (!photos.damage) return 'damage'
  return null
}

/** First earlier required slot that still has no photo. */
export function blockingSlot(id: ListingSlotId, photos: PhotoMap): ListingSlotId | null {
  const i = slotIndex(id)
  for (let n = 0; n < i; n += 1) {
    const prev = LISTING_SLOTS[n]
    if (prev.required && !photos[prev.id]) return prev.id
  }
  return null
}

/** Later slots stay locked until every earlier required slot is filled. */
export function slotUnlocked(id: ListingSlotId, photos: PhotoMap): boolean {
  return blockingSlot(id, photos) == null
}

export function slotStepLabel(id: ListingSlotId): { n: number; of: number } {
  const i = slotIndex(id)
  return { n: i + 1, of: LISTING_SLOTS.length }
}
