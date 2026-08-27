import { appleModelHint } from '../data/appleTacs'

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Luhn-controlegijfer voor de 14-cijferige IMEI-stam (TAC + serienummer). */
export function luhnCheckDigit(body14: string): number {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let d = body14.charCodeAt(13 - i) - 48
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return (10 - (sum % 10)) % 10
}

export type ImeiCheck =
  | { kind: 'empty' }
  | { kind: 'bad_length'; digits: string; length: number }
  | {
      kind: 'result'
      digits: string
      imei: string
      tac: string
      serial: string
      checkDigit: number
      checksumOk: boolean
      from14: boolean
      imeisv: boolean
      modelHint: string | null
    }

export function checkImei(raw: string): ImeiCheck {
  const digits = digitsOnly(raw)
  if (!digits) return { kind: 'empty' }
  if (digits.length < 14 || digits.length > 16) {
    return { kind: 'bad_length', digits, length: digits.length }
  }

  const imeisv = digits.length === 16
  const from14 = digits.length === 14 || imeisv
  const body = digits.slice(0, 14)
  const checkDigit = luhnCheckDigit(body)
  const imei = `${body}${checkDigit}`
  const provided = digits.length === 15 ? digits.charCodeAt(14) - 48 : checkDigit
  const checksumOk = from14 || provided === checkDigit

  return {
    kind: 'result',
    digits,
    imei,
    tac: body.slice(0, 8),
    serial: body.slice(8, 14),
    checkDigit,
    checksumOk,
    from14,
    imeisv,
    modelHint: appleModelHint(body.slice(0, 8)),
  }
}
