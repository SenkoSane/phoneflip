import type { DocLine, Quote, Receipt, RepairJob } from '../types'
import { uid } from './id'

export function docLinesTotal(lines: DocLine[] | null | undefined): number {
  return (lines ?? []).reduce((sum, line) => sum + (Number.isFinite(line.amount) ? line.amount : 0), 0)
}

export function quoteTotal(quote: Quote): number {
  return docLinesTotal(quote.lines) + (quote.laborCharge || 0)
}

export function receiptTableTotal(receipt: Receipt): number {
  return docLinesTotal(receipt.lines) + (receipt.laborCharge || 0)
}

export function linesFromQuote(quote: Quote): DocLine[] {
  return (quote.lines ?? [])
    .filter((l) => l.name.trim())
    .map((l) => ({
      id: uid(),
      name: l.name.trim(),
      amount: Number.isFinite(l.amount) ? l.amount : 0,
    }))
}

export function linesFromJobParts(job: RepairJob): DocLine[] {
  const named = (job.parts ?? []).filter((p) => p.name.trim())
  if (named.length === 0) {
    if (job.chargeParts) return [{ id: uid(), name: 'Onderdelen', amount: job.chargeParts }]
    return []
  }
  const share = named.length ? job.chargeParts / named.length : 0
  return named.map((p) => ({
    id: uid(),
    name: p.name.trim(),
    amount: share,
  }))
}
