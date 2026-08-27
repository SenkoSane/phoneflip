import { LineCapStyle, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { localeFor, tr } from '../i18n'
import { jobRevenue } from './calc'
import { dutchDocDate, jobTicketLabel, quoteLabel, receiptLabel, sanitizeFilePart } from './id'
import { EMPTY_WORKSHOP, type Quote, type Receipt, type RepairJob, type WorkshopProfile } from '../types'

const A4_W = 595.28
const A4_H = 841.89
const BON_W = 360
const BON_H = 740

const stone900 = rgb(0.11, 0.098, 0.09)
const stone800 = rgb(0.161, 0.145, 0.137)
const stone500 = rgb(0.471, 0.443, 0.42)
const stone200 = rgb(0.906, 0.89, 0.875)
const ink = rgb(0.165, 0.145, 0.125)
const amber = rgb(0.961, 0.62, 0.043)
const paper = rgb(1, 1, 1)

const moneyFmt = new Intl.NumberFormat('nl-NL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
function dateFmt() {
  return new Intl.DateTimeFormat(localeFor(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export type PdfKind = 'offerte' | 'bon'

export function workshopOrDefault(raw?: WorkshopProfile | null): WorkshopProfile {
  return {
    ...EMPTY_WORKSHOP,
    companyName: brandName(raw?.companyName),
    phone: raw?.phone?.trim() ?? '',
    city: raw?.city?.trim() ?? '',
    address: raw?.address?.trim() ?? '',
    kvk: raw?.kvk?.trim() ?? '',
    iban: raw?.iban?.trim() ?? '',
    email: raw?.email?.trim() ?? '',
    updatedAt: raw?.updatedAt ?? '',
  }
}

function brandName(raw?: string): string {
  const t = raw?.trim() ?? ''
  if (!t || t === 'PhoneFlip') return 'Phone Flipper'
  return t
}

function latin(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/€/g, 'EUR ')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '')
}

function money(n: number): string {
  return `EUR ${moneyFmt.format(Number.isFinite(n) ? n : 0)}`
}

function amountNl(n: number): string {
  return moneyFmt.format(Number.isFinite(n) ? n : 0)
}

function drawEuro(page: PDFPage, x: number, y: number, s: number, color: ReturnType<typeof rgb>, knock: ReturnType<typeof rgb>) {
  page.drawEllipse({
    x: x + s * 0.4,
    y: y + s * 0.38,
    xScale: s * 0.34,
    yScale: s * 0.36,
    borderWidth: Math.max(1.2, s * 0.1),
    borderColor: color,
  })
  page.drawRectangle({
    x: x + s * 0.48,
    y: y + s * 0.04,
    width: s * 0.36,
    height: s * 0.68,
    color: knock,
  })
  page.drawRectangle({ x: x + s * 0.06, y: y + s * 0.26, width: s * 0.52, height: s * 0.08, color })
  page.drawRectangle({ x: x + s * 0.06, y: y + s * 0.42, width: s * 0.52, height: s * 0.08, color })
}

/** Telefoon + steeksleutel in een amber badge. */
function drawBrandMark(page: PDFPage, x: number, y: number, s = 1) {
  page.drawCircle({ x: x + 13 * s, y: y + 13 * s, size: 15 * s, color: amber })
  page.drawRectangle({
    x: x + 6.5 * s,
    y: y + 4.5 * s,
    width: 10 * s,
    height: 17.5 * s,
    color: stone900,
  })
  page.drawRectangle({
    x: x + 8.2 * s,
    y: y + 8 * s,
    width: 6.6 * s,
    height: 10.5 * s,
    color: paper,
  })
  page.drawRectangle({
    x: x + 9.4 * s,
    y: y + 19.4 * s,
    width: 4.2 * s,
    height: 1.15 * s,
    color: amber,
  })
  page.drawLine({
    start: { x: x + 17.5 * s, y: y + 7.5 * s },
    end: { x: x + 24.5 * s, y: y + 16.5 * s },
    thickness: 2.15 * s,
    color: stone900,
    lineCap: LineCapStyle.Round,
  })
  page.drawCircle({
    x: x + 25.6 * s,
    y: y + 18 * s,
    size: 3.3 * s,
    borderColor: stone900,
    borderWidth: 1.7 * s,
    color: amber,
  })
}

function nice(iso: string): string {
  if (!iso) return dateFmt().format(new Date())
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? iso : dateFmt().format(d)
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso || new Date().toISOString().slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return dateFmt().format(d)
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const clean = latin(text).replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const words = clean.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) cur = test
    else {
      if (cur) lines.push(cur)
      cur = word
    }
  }
  if (cur) lines.push(cur)
  return lines
}

type Line = { label: string; amount: number | null }

function customerLines(job: RepairJob): { lines: Line[]; total: number } {
  const parts = job.parts ?? []
  const lines: Line[] = []
  const charge = job.chargeParts || 0
  if (parts.length === 0) {
    if (charge > 0) lines.push({ label: tr('pdf.parts'), amount: charge })
  } else if (charge > 0) {
    let left = Math.round(charge * 100)
    parts.forEach((part, i) => {
      const cents = i === parts.length - 1 ? left : Math.round((charge / parts.length) * 100)
      left -= cents
      lines.push({ label: part.name || tr('pdf.part'), amount: cents / 100 })
    })
  } else {
    for (const part of parts) {
      lines.push({ label: tr('pdf.partInc', { name: part.name || tr('pdf.part') }), amount: null })
    }
  }
  lines.push({ label: tr('pdf.labor'), amount: job.laborCharge || 0 })
  return { lines, total: jobRevenue(job) }
}

function drawDots(
  page: PDFPage,
  font: PDFFont,
  y: number,
  x: number,
  width: number,
  left: string,
  right: string,
  size: number,
) {
  const l = latin(left).slice(0, 42)
  const r = latin(right)
  page.drawText(l, { x, y, size, font, color: ink })
  page.drawText(r, {
    x: x + width - font.widthOfTextAtSize(r, size),
    y,
    size,
    font,
    color: ink,
  })
  const start = x + font.widthOfTextAtSize(l, size) + 5
  const end = x + width - font.widthOfTextAtSize(r, size) - 5
  let dx = start
  while (dx < end) {
    page.drawText('.', { x: dx, y, size: size - 1, font, color: stone500 })
    dx += 3.6
  }
}

type PdfSource = {
  customerName: string
  brand: string
  model: string
  date: string
  damage: string
  todo: string
  workDone: string
  lines: Line[]
  total: number
  docNr: string
  ticket: string
}

function jobToOfferteSource(job: RepairJob): PdfSource {
  const ticket = jobTicketLabel(job.ticketNr)
  const year = (job.dateIn || job.createdAt || '').slice(0, 4) || String(new Date().getFullYear())
  const { lines, total } = customerLines(job)
  return {
    customerName: job.customerName,
    brand: job.brand,
    model: job.model,
    date: job.dateIn || '',
    damage: job.damage ?? '',
    todo: job.todo ?? '',
    workDone: job.workDone ?? '',
    lines,
    total,
    docNr: `OF-${year}-${String(job.ticketNr).padStart(4, '0')}`,
    ticket,
  }
}

function jobToBonSource(job: RepairJob): PdfSource {
  const ticket = jobTicketLabel(job.ticketNr)
  const { lines, total } = customerLines(job)
  return {
    customerName: job.customerName,
    brand: job.brand,
    model: job.model,
    date: job.paidAt || job.dateDone || new Date().toISOString().slice(0, 10),
    damage: job.damage ?? '',
    todo: job.todo ?? '',
    workDone: job.workDone ?? '',
    lines,
    total,
    docNr: ticket,
    ticket,
  }
}

function isArbeidLabel(name: string): boolean {
  return /^(arbeid|labor)\b/i.test((name ?? '').trim())
}

function roundCents(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

function namedPartSum(rows: { name: string; amount: number }[] | null | undefined): number {
  return (rows ?? [])
    .filter((l) => l.name.trim() && !isArbeidLabel(l.name))
    .reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0)
}

function linePartSum(lines: Line[]): number {
  return lines
    .filter((l) => !isArbeidLabel(l.label))
    .reduce((s, l) => s + (typeof l.amount === 'number' ? l.amount : 0), 0)
}

/** Arbeid: explicit > 0, else linked job > 0, else paid − onderdelen. €0 still prints. */
function resolveLaborCharge(
  explicit: number | null | undefined,
  linked: number | null | undefined,
  partsSum: number,
  paidTotal?: number | null,
): number {
  const fromExplicit = roundCents(explicit ?? 0)
  if (fromExplicit > 0.005) return fromExplicit
  const fromLinked = roundCents(linked ?? 0)
  if (fromLinked > 0.005) return fromLinked
  if (paidTotal != null && Number.isFinite(paidTotal)) {
    const rest = roundCents(paidTotal - partsSum)
    if (rest > 0.005) return rest
  }
  return 0
}

function partDocLines(rows: { name: string; amount: number }[] | null | undefined): Line[] {
  return (rows ?? [])
    .filter((l) => l.name.trim() && !isArbeidLabel(l.name))
    .map((l) => ({ label: l.name.trim(), amount: l.amount }))
}

/** Last row is always Arbeid — never omitted, even at EUR 0,00. */
function withForcedArbeid(parts: Line[], laborAmt: number): Line[] {
  return [...parts.filter((l) => !isArbeidLabel(l.label)), { label: tr('pdf.labor'), amount: roundCents(laborAmt) }]
}

function quoteToSource(quote: Quote, linkedJob?: RepairJob | null): PdfSource {
  const parts = partDocLines(quote.lines)
  const laborAmt = resolveLaborCharge(quote.laborCharge, linkedJob?.laborCharge, namedPartSum(quote.lines))
  const lines = withForcedArbeid(parts, laborAmt)
  return {
    customerName: quote.customerName,
    brand: quote.brand,
    model: quote.model,
    date: quote.date || quote.createdAt,
    damage: quote.damage,
    todo: quote.todo,
    workDone: '',
    lines,
    total: roundCents(namedPartSum(quote.lines) + laborAmt),
    docNr: quoteLabel(quote.nr),
    ticket: linkedJob ? jobTicketLabel(linkedJob.ticketNr) : quoteLabel(quote.nr),
  }
}

function receiptToSource(receipt: Receipt, linkedJob?: RepairJob | null): PdfSource {
  const parts = partDocLines(receipt.lines)
  const laborAmt = resolveLaborCharge(
    receipt.laborCharge,
    linkedJob?.laborCharge,
    namedPartSum(receipt.lines),
    receipt.paidTotal,
  )
  return {
    customerName: receipt.customerName,
    brand: receipt.brand,
    model: receipt.model,
    date: receipt.paidAt || receipt.createdAt,
    damage: receipt.damage,
    todo: '',
    workDone: receipt.workDone,
    lines: withForcedArbeid(parts, laborAmt),
    total: roundCents(receipt.paidTotal),
    docNr: receiptLabel(receipt.nr),
    ticket: linkedJob ? jobTicketLabel(linkedJob.ticketNr) : receiptLabel(receipt.nr),
  }
}

function forcedArbeidFromSource(src: PdfSource): { parts: Line[]; laborAmt: number; rows: Line[] } {
  const parts = src.lines.filter((l) => !isArbeidLabel(l.label))
  const fromLine = src.lines.find((l) => isArbeidLabel(l.label))
  const laborAmt = resolveLaborCharge(fromLine?.amount, 0, linePartSum(src.lines), src.total)
  return { parts, laborAmt, rows: withForcedArbeid(parts, laborAmt) }
}

async function buildOfferte(src: PdfSource, workshop: WorkshopProfile): Promise<Uint8Array> {
  const margin = 48
  const headerH = 96
  const doc = await PDFDocument.create()
  const page = doc.addPage([A4_W, A4_H])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const profile = workshopOrDefault(workshop)
  const ticket = src.ticket
  const docNr = src.docNr
  const { rows: lines } = forcedArbeidFromSource(src)
  const total = src.total

  page.drawRectangle({ x: 0, y: A4_H - headerH, width: A4_W, height: headerH, color: stone900 })
  page.drawRectangle({ x: 0, y: A4_H - headerH - 5, width: A4_W, height: 5, color: amber })
  drawBrandMark(page, margin, A4_H - 62, 1.15)
  page.drawText(latin(profile.companyName), {
    x: margin + 40,
    y: A4_H - 42,
    size: 22,
    font: bold,
    color: paper,
  })
  page.drawText(latin(tr('pdf.quoteTag')), { x: margin + 40, y: A4_H - 62, size: 10, font, color: amber })

  const bits = [
    profile.address,
    [profile.city, profile.phone].filter(Boolean).join('  ·  '),
    profile.email,
    profile.kvk ? `KVK ${profile.kvk}` : '',
    profile.iban ? `IBAN ${profile.iban}` : '',
  ]
    .map((s) => latin(s))
    .filter(Boolean)
  let hy = A4_H - 34
  for (const line of bits.slice(0, 5)) {
    page.drawText(line, {
      x: A4_W - margin - font.widthOfTextAtSize(line, 8),
      y: hy,
      size: 8,
      font,
      color: stone200,
    })
    hy -= 11
  }

  let y = A4_H - headerH - 36
  page.drawText(tr('pdf.quote'), { x: margin, y, size: 20, font: bold, color: stone900 })
  y -= 16
  page.drawText(`${docNr}   ·   ${ticket}`, { x: margin, y, size: 10, font, color: stone500 })
  y -= 28

  const device = [src.brand, src.model].filter(Boolean).join(' ') || tr('pdf.device')
  const pairs: [string, string][] = [
    [tr('pdf.customer'), src.customerName || '—'],
    [tr('pdf.date'), nice(src.date || '')],
    [tr('pdf.device'), device],
    [tr('pdf.quoteNr'), docNr],
  ]
  const col = (A4_W - margin * 2) / 2
  pairs.forEach((pair, i) => {
    const x = i % 2 === 0 ? margin : margin + col
    const yy = y - Math.floor(i / 2) * 28
    page.drawText(latin(pair[0]).toUpperCase(), { x, y: yy, size: 7, font: bold, color: stone500 })
    page.drawText(latin(pair[1]), { x, y: yy - 12, size: 10, font, color: ink })
  })
  y -= 64

  const block = (title: string, body: string) => {
    const text = latin(body).trim()
    if (!text) return
    page.drawText(title.toUpperCase(), { x: margin, y, size: 7, font: bold, color: stone500 })
    y -= 14
    for (const line of wrap(font, text, 10, A4_W - margin * 2).slice(0, 8)) {
      page.drawText(line, { x: margin, y, size: 10, font, color: ink })
      y -= 13
    }
    y -= 8
  }
  block(tr('pdf.damage'), src.damage)
  block(tr('pdf.todo'), src.todo)

  const width = A4_W - margin * 2
  page.drawRectangle({ x: margin, y: y - 6, width, height: 22, color: stone800 })
  page.drawText(tr('pdf.desc'), { x: margin + 10, y, size: 7.5, font: bold, color: paper })
  page.drawText(tr('pdf.amount'), {
    x: margin + width - 10 - bold.widthOfTextAtSize(tr('pdf.amount'), 7.5),
    y,
    size: 7.5,
    font: bold,
    color: paper,
  })
  y -= 28
  lines.forEach((line, i) => {
    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - 6,
        width,
        height: 22,
        color: rgb(0.98, 0.97, 0.96),
      })
    }
    page.drawText(latin(line.label).slice(0, 70), { x: margin + 10, y, size: 10, font, color: ink })
    const amount = line.amount == null ? tr('pdf.pm') : money(line.amount)
    page.drawText(amount, {
      x: margin + width - 10 - font.widthOfTextAtSize(amount, 10),
      y,
      size: 10,
      font,
      color: ink,
    })
    y -= 22
  })
  y -= 6
  page.drawRectangle({ x: margin, y: y - 10, width, height: 32, color: stone900 })
  page.drawText(tr('pdf.total'), { x: margin + 10, y: y + 2, size: 11, font: bold, color: paper })
  const tot = money(total)
  page.drawText(tot, {
    x: margin + width - 10 - bold.widthOfTextAtSize(tot, 12),
    y: y + 2,
    size: 12,
    font: bold,
    color: amber,
  })
  y -= 36

  page.drawText(tr('pdf.valid', { date: addDays(src.date || new Date().toISOString().slice(0, 10), 14) }), {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: ink,
  })
  y -= 16
  const terms = [tr('pdf.term1'), tr('pdf.term2'), tr('pdf.term3')]
  for (const t of terms) {
    for (const line of wrap(font, t, 8, A4_W - margin * 2)) {
      page.drawText(line, { x: margin, y, size: 8, font, color: stone500 })
      y -= 11
    }
    y -= 4
  }

  page.drawRectangle({ x: margin, y: 36, width: 28, height: 3, color: amber })
  page.drawText(`${latin(profile.companyName)}  ·  ${docNr}  ·  ${tr('pdf.quoteWord')}`, {
    x: margin + 36,
    y: 34,
    size: 8,
    font,
    color: stone500,
  })

  return doc.save()
}

async function buildBon(src: PdfSource, workshop: WorkshopProfile): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([BON_W, BON_H])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const profile = workshopOrDefault(workshop)
  const ticket = src.ticket
  const { parts: partLines, laborAmt } = forcedArbeidFromSource(src)
  const total = src.total
  const mx = 28
  const inner = BON_W - mx * 2
  const brand = latin(profile.companyName)

  page.drawRectangle({ x: 0, y: BON_H - 108, width: BON_W, height: 108, color: stone900 })
  page.drawRectangle({ x: 0, y: BON_H - 112, width: BON_W, height: 4, color: amber })
  drawBrandMark(page, BON_W / 2 - 16, BON_H - 52, 1.05)
  const bw = bold.widthOfTextAtSize(brand, 16)
  page.drawText(brand, { x: (BON_W - bw) / 2, y: BON_H - 78, size: 16, font: bold, color: paper })
  const tag = tr('pdf.receipt')
  page.drawText(tag, {
    x: (BON_W - font.widthOfTextAtSize(tag, 9)) / 2,
    y: BON_H - 94,
    size: 9,
    font,
    color: amber,
  })

  let y = BON_H - 138
  const meta: [string, string][] = [
    [tr('pdf.customer'), src.customerName || '—'],
    [tr('pdf.date'), nice(src.date || '')],
    [tr('pdf.receiptNr'), src.docNr],
  ]
  if (ticket && ticket !== src.docNr) meta.push([tr('pdf.ticket'), ticket])
  meta.push([tr('pdf.device'), [src.brand, src.model].filter(Boolean).join(' ') || '—'])
  for (const [k, v] of meta) {
    drawDots(page, font, y, mx, inner, k, v, 9)
    y -= 16
  }

  const info = [src.workDone?.trim(), src.damage?.trim()].filter(Boolean).join(' — ')
  if (info) {
    y -= 8
    page.drawText(tr('pdf.repair'), { x: mx, y, size: 7, font: bold, color: stone500 })
    y -= 13
    for (const line of wrap(font, info, 9, inner).slice(0, 5)) {
      page.drawText(line, { x: mx, y, size: 9, font, color: ink })
      y -= 12
    }
  }

  y -= 8
  page.drawLine({
    start: { x: mx, y },
    end: { x: mx + inner, y },
    thickness: 0.6,
    color: stone200,
    dashArray: [2, 2],
  })
  y -= 18

  for (const line of partLines) {
    drawDots(
      page,
      font,
      y,
      mx,
      inner,
      line.label,
      line.amount == null ? tr('pdf.included') : money(line.amount),
      10,
    )
    y -= 18
  }

  // Always print Arbeid above the Betaald bar — never skip, never overlap.
  drawDots(page, bold, y, mx, inner, tr('pdf.labor'), money(laborAmt), 10)
  y -= 22

  y -= 16
  const barH = 52
  const barY = y - barH
  page.drawRectangle({ x: mx, y: barY, width: inner, height: barH, color: stone900 })
  page.drawRectangle({ x: mx, y: barY + barH - 3, width: inner, height: 3, color: amber })
  page.drawText(tr('pdf.paid'), { x: mx + 12, y: barY + 32, size: 9, font: bold, color: amber })
  const paidAmt = amountNl(total)
  const amtSize = 18
  const amtW = bold.widthOfTextAtSize(paidAmt, amtSize)
  const euroS = 16
  const groupW = euroS + 6 + amtW
  const gx = mx + inner - 12 - groupW
  drawEuro(page, gx, barY + 20, euroS, amber, stone900)
  page.drawText(paidAmt, {
    x: gx + euroS + 6,
    y: barY + 24,
    size: amtSize,
    font: bold,
    color: paper,
  })
  y = barY - 16

  const thanks = wrap(
    font,
    tr('pdf.thanks', { name: profile.companyName }),
    9,
    inner,
  )
  for (const line of thanks) {
    page.drawText(line, {
      x: (BON_W - font.widthOfTextAtSize(line, 9)) / 2,
      y,
      size: 9,
      font,
      color: stone500,
    })
    y -= 12
  }

  y -= 8
  const loc = [profile.city, profile.phone].filter(Boolean).join('  ·  ')
  if (loc) {
    page.drawText(latin(loc), {
      x: (BON_W - font.widthOfTextAtSize(latin(loc), 8)) / 2,
      y,
      size: 8,
      font,
      color: stone500,
    })
  }

  page.drawRectangle({ x: (BON_W - 36) / 2, y: 24, width: 36, height: 3, color: amber })

  return doc.save()
}

function downloadDocLabel(kind: PdfKind, docNr: string): string {
  const word = kind === 'offerte' ? tr('pdf.fileQuote') : tr('pdf.fileReceipt')
  const nr = docNr.replace(/^(OF|OFF|B|BON|Q|QUOTE|R|RECEIPT)-/i, '').trim()
  return `${word}-${nr || docNr}`
}

function pdfDownloadName(src: PdfSource, kind: PdfKind): string {
  return `${sanitizeFilePart(src.customerName)} - ${dutchDocDate(src.date)} - ${sanitizeFilePart(downloadDocLabel(kind, src.docNr))}.pdf`
}

export async function downloadJobPdf(
  job: RepairJob,
  workshop: WorkshopProfile | undefined,
  kind: PdfKind,
): Promise<void> {
  const profile = workshopOrDefault(workshop)
  const src = kind === 'offerte' ? jobToOfferteSource(job) : jobToBonSource(job)
  const bytes = kind === 'offerte' ? await buildOfferte(src, profile) : await buildBon(src, profile)
  await savePdfBytes(pdfDownloadName(src, kind), bytes)
}

export async function downloadQuotePdf(
  quote: Quote,
  workshop: WorkshopProfile | undefined,
  linkedJob?: RepairJob | null,
): Promise<void> {
  const profile = workshopOrDefault(workshop)
  const src = quoteToSource(quote, linkedJob)
  const bytes = await buildOfferte(src, profile)
  await savePdfBytes(pdfDownloadName(src, 'offerte'), bytes)
}

export async function downloadReceiptPdf(
  receipt: Receipt,
  workshop: WorkshopProfile | undefined,
  linkedJob?: RepairJob | null,
): Promise<void> {
  const profile = workshopOrDefault(workshop)
  const src = receiptToSource(receipt, linkedJob)
  const bytes = await buildBon(src, profile)
  await savePdfBytes(pdfDownloadName(src, 'bon'), bytes)
}

async function savePdfBytes(name: string, bytes: Uint8Array): Promise<void> {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
