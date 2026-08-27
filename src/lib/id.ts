export function uid(): string {
  return crypto.randomUUID()
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ticketLabel(nr: number): string {
  return `T-${String(nr).padStart(4, '0')}`
}

export function jobTicketLabel(nr: number): string {
  return `K-${String(nr).padStart(4, '0')}`
}

export function quoteLabel(nr: number): string {
  return `OF-${String(nr).padStart(4, '0')}`
}

export function receiptLabel(nr: number): string {
  return `B-${String(nr).padStart(4, '0')}`
}

export function nextTicketNr(existing: number[]): number {
  return existing.reduce((max, n) => Math.max(max, n), 0) + 1
}

export function dutchDocDate(iso?: string | null): string {
  const raw = (iso || '').slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${now.getFullYear()}`
}

export function sanitizeFilePart(raw: string): string {
  const t = (raw || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t || 'Onbekend'
}
