import { BEGINNER_EXTRA, matchIphone } from './dealCoach'
import { phoneCost } from './calc'
import type { Phone } from '../types'
import { filledRequiredCount, requiredSlots, type PhotoMap } from '../data/listingSlots'

export type SellGrade = 'A' | 'B' | 'C' | 'skip'

function round5(n: number): number {
  return Math.round(n / 5) * 5
}

function blobOf(phone: Phone): string {
  return `${phone.damage} ${phone.todo} ${phone.workDone} ${phone.notes} ${phone.condition}`.toLowerCase()
}

export function sellGradeFor(phone: Phone): { grade: SellGrade; reasonKeys: string[] } {
  const blob = blobOf(phone)
  if (/icloud|zoek mijn|activation lock|\bfmi\b/.test(blob)) {
    return { grade: 'skip', reasonKeys: ['sell.skipIcloud'] }
  }
  if (/waterschade|\bwater\b|vochtschade|corrosi/.test(blob)) {
    return { grade: 'skip', reasonKeys: ['sell.skipWater'] }
  }
  if (/face\s*id/.test(blob) && /stuk|kapot|niet|defect|broken/.test(blob)) {
    return { grade: 'skip', reasonKeys: ['sell.skipFaceid'] }
  }
  if (phone.condition === 'Voor onderdelen') {
    return { grade: 'skip', reasonKeys: ['sell.skipParts'] }
  }

  const todo = (phone.todo ?? '').toLowerCase()
  const done = (phone.workDone ?? '').toLowerCase()
  const screenOpen = /scherm|barst|oled|lcd/.test(todo) && !/scherm/.test(done)
  if (screenOpen) {
    return { grade: 'C', reasonKeys: ['sell.gradeScreenOpen'] }
  }
  if (phone.condition === 'Beschadigd') {
    return { grade: 'C', reasonKeys: ['sell.gradeDamaged'] }
  }

  const housing = /deuk|deukje|kras|behuiz|huis|dent|hoek/.test(blob)
  if (housing || phone.condition === 'Redelijk') {
    return { grade: 'B', reasonKeys: housing ? ['sell.gradeHousing'] : ['sell.gradeFair'] }
  }
  if (phone.condition === 'Nieuw' || phone.condition === 'Zo goed als nieuw') {
    return { grade: 'A', reasonKeys: ['sell.gradeClean'] }
  }
  return { grade: 'A', reasonKeys: ['sell.gradeGood'] }
}

export function askForGrade(phone: Phone, grade: SellGrade): { ask: number; floor: number } {
  const kosten = phoneCost(phone)
  const floor = round5(kosten + BEGINNER_EXTRA)
  const hit = matchIphone(`${phone.brand} ${phone.model}`, phone.storage)
  if (grade === 'skip') {
    return { ask: floor, floor }
  }
  if (!hit) {
    return { ask: Math.max(round5(kosten * 1.15), floor), floor }
  }
  const clean = hit.row.prive.rekenwaarde
  const huis = hit.row.lichtHuis.rekenwaarde
  const raw = grade === 'A' ? clean : grade === 'B' ? huis : round5(huis - 20)
  return { ask: Math.max(raw, floor), floor }
}

export function aftermarketScreen(phone: Phone): boolean {
  return (phone.repairs ?? []).some((r) => /scherm/i.test(r.name))
}

export function listingTitle(phone: Phone, grade: SellGrade, gradeWord: string): string {
  const bits = [phone.brand, phone.model, phone.storage, phone.color].filter(Boolean)
  const name = bits.join(' ') || 'iPhone'
  if (grade === 'skip') return name
  return `${name} · ${gradeWord}`
}

export function listingBody(input: {
  phone: Phone
  city: string
  grade: SellGrade
  ask: number
  title: string
  aftermarket: boolean
  lang: 'nl' | 'en'
}): string {
  const { phone, city, grade, ask, title, aftermarket, lang } = input
  const work = (phone.workDone || '').trim()
  const dmg = (phone.damage || '').trim()
  if (lang === 'en') {
    const lines = [
      title,
      '',
      work ? `Work done: ${work}` : 'Tested and ready.',
      aftermarket ? 'Screen was replaced with a quality aftermarket part (not Apple original).' : '',
      grade === 'A' ? 'Clean device, light use.' : '',
      grade === 'B' || grade === 'C' ? (dmg ? `Please note: ${dmg}` : 'Light cosmetic wear on the housing.') : '',
      city ? `Pickup in ${city}, shipping possible (buyer pays postage).` : 'Pickup or shipping.',
      `Asking €${ask}.`,
      'No iCloud lock. IMEI shown at pickup.',
    ]
    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n').trim()
  }
  const lines = [
    title,
    '',
    work ? `Gedaan: ${work}` : 'Getest en klaar voor gebruik.',
    aftermarket ? 'Scherm is vervangen (kwaliteitsonderdeel, geen Apple-origineel).' : '',
    grade === 'A' ? 'Nette staat, lichte gebruikssporen.' : '',
    grade === 'B' || grade === 'C' ? (dmg ? `Let op: ${dmg}` : 'Lichte gebruikssporen op de behuizing.') : '',
    city ? `Ophalen in ${city}, verzenden kan (koper betaalt verzending).` : 'Ophalen of verzenden.',
    `Vraagprijs €${ask}.`,
    'Geen iCloud-slot. IMEI bij ophalen.',
  ]
  return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n').trim()
}

export const BUYER_REPLY_IDS = [
  'still',
  'price',
  'pickup',
  'battery',
  'faceid',
  'screen',
] as const

export type BuyerReplyId = (typeof BUYER_REPLY_IDS)[number]

export function photoSetReady(photos: PhotoMap): boolean {
  return filledRequiredCount(photos) === requiredSlots().length
}

export type SellStep = 'photos' | 'text' | 'place'

export function sellCheerKey(filledRequired: number): string | null {
  if (filledRequired < 1 || filledRequired > 6) return null
  return `sell.cheer.${filledRequired}`
}
