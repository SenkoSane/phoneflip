import { localeFor, tr } from '../i18n'
import { PLATFORM_LABEL, type Platform } from '../types'

export function platformName(p: string | null | undefined): string {
  if (!p) return '—'
  if (p === 'overig') return tr('plat.overig')
  return PLATFORM_LABEL[p as Platform] ?? p
}

const euroFmt = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

export function euro(amount: number): string {
  return euroFmt.format(isEuroZero(amount) ? 0 : amount)
}

export function isEuroZero(amount: number): boolean {
  return !Number.isFinite(amount) || Math.abs(amount) < 0.005
}

/** Groen in / rood uit. Bij € 0,00 geen + of −. */
export function euroFlow(amount: number, direction: 'in' | 'uit'): string {
  if (isEuroZero(amount)) return euro(0)
  const formatted = euro(Math.abs(amount))
  return direction === 'in' ? `+ ${formatted}` : `− ${formatted}`
}

export function euroSigned(amount: number): string {
  if (isEuroZero(amount)) return euro(0)
  if (amount > 0) return euroFlow(amount, 'in')
  return euroFlow(amount, 'uit')
}

export function flowClass(direction: 'in' | 'uit', amount?: number): string {
  if (amount !== undefined && isEuroZero(amount)) return 'text-stone-500'
  return direction === 'in' ? 'text-emerald-400' : 'text-rose-400'
}

export function niceDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(localeFor(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function parseEuro(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, '').replace(/€/g, '')
  if (!cleaned || cleaned === '-' || cleaned === ',' || cleaned === '.') return 0
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized = cleaned
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma && lastComma >= 0) {
    normalized = cleaned.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(',', '.')
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

export function phoneTitle(brand: string, model: string): string {
  return [brand, model].filter(Boolean).join(' ') || tr('common.unknownDevice')
}

export function partLabel(name: string): string {
  const key = `part.${name}`
  const s = tr(key)
  return s === key ? name : s
}

export function condLabel(condition: string): string {
  if (!condition) return ''
  const key = `cond.${condition}`
  const s = tr(key)
  return s === key ? condition : s
}
