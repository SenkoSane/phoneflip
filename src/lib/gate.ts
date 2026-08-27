import { sha256Hex } from './sha256'

const UNLOCK_KEY = 'phoneflip.gate.v1'
export const GATE_HASH_KEY = 'phoneflip.gate.hash'
const EXPECTED =
  '46f0aa69acc05b034a425d3cf8a94190a9b246519d29a10f623754b30636c582'
const KEY_CODES = [77, 118, 122, 55, 120, 83, 64, 87]
const HASH_RE = /^[0-9a-f]{64}$/

export function isSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function lockSession() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}

function unlockSession() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1')
  } catch {
    /* ignore */
  }
}

function normalizePassword(value: string): string {
  return value.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '')
}

function matchesKey(password: string): boolean {
  const chars = [...password]
  if (chars.length !== KEY_CODES.length) return false
  return chars.every((ch, i) => ch.charCodeAt(0) === KEY_CODES[i])
}

export function isGateHash(value: unknown): value is string {
  return typeof value === 'string' && HASH_RE.test(value)
}

export function readCustomGateHash(): string | null {
  try {
    const raw = localStorage.getItem(GATE_HASH_KEY)
    return isGateHash(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeCustomGateHash(hash: string) {
  if (!isGateHash(hash)) return
  try {
    localStorage.setItem(GATE_HASH_KEY, hash)
  } catch {
    /* ignore */
  }
}

export function syncCustomGateHash(hash?: string | null) {
  if (isGateHash(hash)) writeCustomGateHash(hash)
}

export function hashPassword(password: string): string {
  return sha256Hex(normalizePassword(password))
}

export function passwordMatches(password: string): boolean {
  const pw = normalizePassword(password)
  if (!pw) return false
  const hex = sha256Hex(pw)
  const custom = readCustomGateHash()
  if (custom) return hex === custom
  return hex === EXPECTED || matchesKey(pw)
}

export function tryUnlock(password: string): boolean {
  if (!passwordMatches(password)) return false
  unlockSession()
  return true
}
