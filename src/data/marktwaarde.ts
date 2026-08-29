/** Cheat sheet iPhone 11–17 per opslag. Schattingen 29 augustus 2026. Verkoop = Marktplaats NL; onderdelen = Fixje / Rounded. */

export const MARKTWAARDE_UPDATED = '2026-08-29'

/** Standaard buffer (14–17). 11/12 gebruiken 35, 13 gebruikt 30 — oudere flips hebben meer risico. */
export const INKOOP_BUFFER = 25
export const INKOOP_BUFFER_OUD = 35

/** Onder dit bedrag (na afronding-check op raw) tonen we skip i.p.v. een lullig getal. */
export const SKIP_UNDER = 40

export type EuroBand = {
  min: number
  max: number
}

export type PartBand = EuroBand & {
  note?: string
}

export type MaxBuyCell =
  | { kind: 'point'; value: number; note?: string }
  | { kind: 'band'; min: number; max: number; note?: string }
  | { kind: 'either'; a: number; b: number; note?: string }
  | { kind: 'skip'; label: string }
  | { kind: 'unknown' }

export type DefectId = 'scherm' | 'accu' | 'laadpoort' | 'camera' | 'behuizing'

export type BuyScenario = {
  id: string
  label: string
  defects: DefectId[]
  /** After-fix verkoop = lichte huisschade i.p.v. strakke privé-prijs. */
  huis: boolean
  buy: MaxBuyCell
}

export type BestBuy = {
  label: string
  cell: MaxBuyCell
  scenarioIds: string[]
}

export type MarktStorage = '64 GB' | '128 GB' | '256 GB' | '512 GB' | '1 TB'

export const STORAGE_GB: Record<MarktStorage, number> = {
  '64 GB': 64,
  '128 GB': 128,
  '256 GB': 256,
  '512 GB': 512,
  '1 TB': 1024,
}

/** 254 GB is a common typo for 256. 1 TB = 1024 GB. Accepts "64gb" without a space. */
export function parseStorage(raw: string | undefined | null): MarktStorage | null {
  if (!raw?.trim()) return null
  const t = raw.toLowerCase()
  if (/\b1\s*tb\b/.test(t) || /\b1024(\s*gb)?\b/.test(t)) return '1 TB'
  if (/\b512(\s*gb)?\b/.test(t)) return '512 GB'
  if (/\b(256|254)(\s*gb)?\b/.test(t)) return '256 GB'
  if (/\b128(\s*gb)?\b/.test(t)) return '128 GB'
  if (/\b64(\s*gb)?\b/.test(t)) return '64 GB'
  return null
}

export function defaultStorageFor(id: string): MarktStorage {
  return id === '17' ? '256 GB' : '128 GB'
}

export function pickStorageRow(rows: IphoneMarkt[], wanted: MarktStorage | null): IphoneMarkt {
  const fallback = rows.find((r) => r.storage === defaultStorageFor(rows[0]?.id ?? '')) ?? rows[0]!
  if (!wanted) return fallback
  const exact = rows.find((r) => r.storage === wanted)
  if (exact) return exact
  const target = STORAGE_GB[wanted]
  return rows.reduce((best, r) =>
    Math.abs(STORAGE_GB[r.storage] - target) < Math.abs(STORAGE_GB[best.storage] - target) ? r : best,
  )
}

export type IphoneMarkt = {
  id: string
  model: string
  storage: MarktStorage
  /** Werkende particuliere verkoop, strak / zo goed als nieuw. */
  prive: EuroBand & { rekenwaarde: number }
  /**
   * Lichte huisschade: deukjes/krassen behuizing, scherm ok.
   * ~10–20% onder strakke privé-prijs (hier ~15%, afgerond).
   * Rekenwaarde = midden van de band, voor inkoop mét behuizingsschade.
   */
  lichtHuis: EuroBand & { rekenwaarde: number }
  parts: {
    scherm: PartBand
    accu: PartBand
    laadpoort: PartBand | null
    camera: PartBand | null
  }
  scenarios: BuyScenario[]
  bestBuy: BestBuy
}

/**
 * Max. inkoop = after-fix Marktplaats − som(Fixje/Rounded-onderdelen) − buffer.
 * After-fix = strakke MP-rekenwaarde, tenzij behuizing in de combo → lichte-huisschade.
 * Behuizing zelf heeft geen extra part (alleen lagere verkoop).
 * Onderdeelprijs: goedkoop-bruikbare Fixje-hq (niet Apple OEM), of (16/17) hq/A+ / AM-vs-pulled.
 * Afronding op €5. Raw < €40 → skip / te krap.
 */
function round5(n: number): number {
  return Math.round(n / 5) * 5
}

type FPart =
  | { k: 'n'; n: number; note?: string }
  | { k: 'band'; cheap: number; dear: number }
  | { k: 'either'; am: number; pulled: number }
  | { k: 'skip'; label: string }
  | { k: 'unknown' }
  | { k: 'zero' }

function mergeParts(a: FPart, b: FPart): FPart {
  if (a.k === 'unknown' || b.k === 'unknown') return { k: 'unknown' }
  if (a.k === 'skip') return a
  if (b.k === 'skip') return b
  if (a.k === 'zero') return b
  if (b.k === 'zero') return a
  if (a.k === 'n' && b.k === 'n') return { k: 'n', n: a.n + b.n, note: a.note ?? b.note }
  if (a.k === 'band' && b.k === 'n') {
    return { k: 'band', cheap: a.cheap + b.n, dear: a.dear + b.n }
  }
  if (b.k === 'band' && a.k === 'n') {
    return { k: 'band', cheap: b.cheap + a.n, dear: b.dear + a.n }
  }
  if (a.k === 'either' && b.k === 'n') {
    return { k: 'either', am: a.am + b.n, pulled: a.pulled + b.n }
  }
  if (b.k === 'either' && a.k === 'n') {
    return { k: 'either', am: b.am + a.n, pulled: b.pulled + a.n }
  }
  // 17: AM-scherm + goedkope accu — zelfde keuze als de bestaande scherm+accu-rekenwaarde.
  if (a.k === 'either' && b.k === 'band') {
    return { k: 'n', n: a.am + b.cheap, note: 'AM-scherm' }
  }
  if (b.k === 'either' && a.k === 'band') {
    return { k: 'n', n: b.am + a.cheap, note: 'AM-scherm' }
  }
  return { k: 'unknown' }
}

function toCell(sell: number, p: FPart, buffer: number, note?: string): MaxBuyCell {
  switch (p.k) {
    case 'unknown':
      return { kind: 'unknown' }
    case 'skip':
      return { kind: 'skip', label: p.label }
    case 'zero':
      return toCell(sell, { k: 'n', n: 0 }, buffer, note)
    case 'n': {
      const raw = sell - p.n - buffer
      if (raw < SKIP_UNDER) return { kind: 'skip', label: 'skip / te krap' }
      const value = round5(raw)
      const n = note ?? p.note
      return n ? { kind: 'point', value, note: n } : { kind: 'point', value }
    }
    case 'band': {
      const min = round5(sell - p.dear - buffer)
      const max = round5(sell - p.cheap - buffer)
      if (max < SKIP_UNDER) return { kind: 'skip', label: 'skip / te krap' }
      return note ? { kind: 'band', min, max, note } : { kind: 'band', min, max }
    }
    case 'either': {
      const a = round5(sell - p.am - buffer)
      const b = round5(sell - p.pulled - buffer)
      return note ? { kind: 'either', a, b, note } : { kind: 'either', a, b }
    }
  }
}

const SCENARIO_DEFS: { id: string; label: string; defects: DefectId[] }[] = [
  { id: 'scherm', label: 'Alleen scherm', defects: ['scherm'] },
  { id: 'accu', label: 'Alleen accu', defects: ['accu'] },
  { id: 'laadpoort', label: 'Alleen laadpoort', defects: ['laadpoort'] },
  { id: 'camera', label: 'Alleen camera', defects: ['camera'] },
  { id: 'behuizing', label: 'Alleen behuizing', defects: ['behuizing'] },
  { id: 'scherm-accu', label: 'Scherm + accu', defects: ['scherm', 'accu'] },
  { id: 'scherm-huis', label: 'Scherm + behuizing', defects: ['scherm', 'behuizing'] },
  { id: 'accu-poort', label: 'Accu + laadpoort', defects: ['accu', 'laadpoort'] },
  { id: 'accu-huis', label: 'Accu + behuizing', defects: ['accu', 'behuizing'] },
  {
    id: 'scherm-accu-huis',
    label: 'Scherm + accu + behuizing',
    defects: ['scherm', 'accu', 'behuizing'],
  },
  { id: 'poort-huis', label: 'Laadpoort + behuizing', defects: ['laadpoort', 'behuizing'] },
  { id: 'scherm-poort', label: 'Scherm + laadpoort', defects: ['scherm', 'laadpoort'] },
]

const SIMPLE_BEST = new Set<string>(['accu', 'laadpoort', 'behuizing'])

function cellScore(cell: MaxBuyCell): number | null {
  switch (cell.kind) {
    case 'point':
      return cell.value
    case 'band':
      return cell.max
    case 'either':
      return Math.max(cell.a, cell.b)
    default:
      return null
  }
}

function joinNl(labels: string[]): string {
  const names = labels.map((s) => s.replace(/^Alleen /u, ''))
  if (names.length === 1) return `Alleen ${names[0].toLowerCase()}`
  const lower = names.map((n) => n.toLowerCase())
  const first = lower[0]!.charAt(0).toUpperCase() + lower[0]!.slice(1)
  if (lower.length === 2) return `${first} of ${lower[1]}`
  return `${first}, ${lower.slice(1, -1).join(', ')} of ${lower.at(-1)}`
}

function pickBest(scenarios: BuyScenario[]): BestBuy {
  const pool = scenarios.filter((s) => SIMPLE_BEST.has(s.id))
  let best = -Infinity
  const winners: BuyScenario[] = []
  for (const s of pool) {
    const score = cellScore(s.buy)
    if (score == null) continue
    if (score > best) {
      best = score
      winners.length = 0
      winners.push(s)
    } else if (score === best) {
      winners.push(s)
    }
  }
  const pick = winners[0]
  if (!pick) {
    return { label: '—', cell: { kind: 'unknown' }, scenarioIds: [] }
  }
  return {
    label: winners.length === 1 ? pick.label : joinNl(winners.map((w) => w.label)),
    cell: pick.buy,
    scenarioIds: winners.map((w) => w.id),
  }
}

type Formula = {
  scherm: FPart
  accu: FPart
  laadpoort: FPart
  camera: FPart
}

function buildScenarios(strak: number, huis: number, f: Formula, buffer: number): BuyScenario[] {
  const partOf = (d: DefectId): FPart => {
    if (d === 'behuizing') return { k: 'zero' }
    return f[d]
  }

  return SCENARIO_DEFS.map((def) => {
    const huisIn = def.defects.includes('behuizing')
    const sell = huisIn ? huis : strak
    const total = def.defects.map(partOf).reduce(mergeParts)
    const extraNote =
      def.id === 'behuizing'
        ? 'geen extra part'
        : def.id === 'camera' && f.camera.k === 'n'
          ? f.camera.note
          : def.id === 'scherm' && f.scherm.k === 'band'
            ? 'Fixje hq hoog; A+ laag'
            : def.id === 'scherm' && f.scherm.k === 'either'
              ? 'AM hoog; pulled orig. laag'
              : undefined
    return {
      id: def.id,
      label: def.label,
      defects: def.defects,
      huis: huisIn,
      buy: toCell(sell, total, buffer, extraNote),
    }
  })
}

function phone(
  row: Omit<IphoneMarkt, 'scenarios' | 'bestBuy'> & { formula: Formula; buffer?: number },
): IphoneMarkt {
  const { formula, buffer = INKOOP_BUFFER, ...rest } = row
  const scenarios = buildScenarios(
    rest.prive.rekenwaarde,
    rest.lichtHuis.rekenwaarde,
    formula,
    buffer,
  )
  return { ...rest, scenarios, bestBuy: pickBest(scenarios) }
}

function shiftBand(
  b: EuroBand & { rekenwaarde: number },
  delta: number,
): EuroBand & { rekenwaarde: number } {
  return {
    min: round5(b.min + delta),
    max: round5(b.max + delta),
    rekenwaarde: round5(b.rekenwaarde + delta),
  }
}

type PhoneSeed = Omit<IphoneMarkt, 'scenarios' | 'bestBuy' | 'storage'> & {
  formula: Formula
  buffer?: number
}

/**
 * Euro-delta on sell bands vs the model's base SKU (128 GB; iPhone 17 = 256 GB).
 * Conservative used-NL / Marktplaats — not Apple retail. Parts stay the same,
 * so max buy follows rekenwaarde (higher GB → higher sell and higher max buy).
 * 64 (11–12 only): −€15
 * 256 vs 128: +€20 (11–14) / +€25 (15–16)
 * 512 vs 128: +€35 (12 Pro) / +€40 (13–14) / +€50 (15–16)
 * 1 TB vs 128 (13–16 Pro/Max): +€65
 * 17 (base 256): 512 +€40 · 1 TB +€75
 */
function variants(seed: PhoneSeed, deltas: [MarktStorage, number][]): IphoneMarkt[] {
  return deltas.map(([storage, delta]) =>
    phone({
      ...seed,
      storage,
      prive: shiftBand(seed.prive, delta),
      lichtHuis: shiftBand(seed.lichtHuis, delta),
    }),
  )
}

export function modelBuffer(id: string): number {
  if (id === '11' || id === '12') return INKOOP_BUFFER_OUD
  if (id === '13') return 30
  return INKOOP_BUFFER
}

function defectKey(defects: DefectId[]): string {
  return [...defects].sort().join('|')
}

/** Exact scenario, or working-phone max (strak − buffer, geen parts). Unknown combo → skip. */
export function buyForDefects(row: IphoneMarkt, defects: DefectId[]): MaxBuyCell {
  if (defects.length === 0) {
    return toCell(row.prive.rekenwaarde, { k: 'zero' }, modelBuffer(row.id))
  }
  const key = defectKey(defects)
  const found = row.scenarios.find((s) => defectKey(s.defects) === key)
  return found?.buy ?? { kind: 'skip', label: 'skip / te krap' }
}

export const IPHONES: IphoneMarkt[] = [
  ...variants(
    {
      id: '11',
      model: 'iPhone 11',
      buffer: INKOOP_BUFFER_OUD,
      prive: { min: 120, max: 145, rekenwaarde: 135 },
      lichtHuis: { min: 100, max: 125, rekenwaarde: 115 },
      parts: {
        scherm: { min: 40, max: 70, note: 'Fixje LCD ~40 / A+ ~70' },
        accu: { min: 29, max: 29, note: 'Fixje A+' },
        laadpoort: { min: 21, max: 21, note: 'Fixje dock' },
        camera: { min: 30, max: 30, note: 'Fixje achtercamera' },
      },
      formula: {
        scherm: { k: 'n', n: 40 },
        accu: { k: 'n', n: 29 },
        laadpoort: { k: 'n', n: 21 },
        camera: { k: 'n', n: 30, note: 'Fixje ~30, oké' },
      },
    },
    [
      ['64 GB', -15],
      ['128 GB', 0],
      ['256 GB', 20],
    ],
  ),
  ...variants(
    {
      id: '12',
      model: 'iPhone 12',
      buffer: INKOOP_BUFFER_OUD,
      prive: { min: 140, max: 175, rekenwaarde: 160 },
      lichtHuis: { min: 120, max: 150, rekenwaarde: 135 },
      parts: {
        scherm: { min: 63, max: 100, note: 'Fixje OLED hq ~63 / A+ ~100' },
        accu: { min: 29, max: 29, note: 'Fixje A+' },
        laadpoort: { min: 28, max: 28, note: 'Fixje dock' },
        camera: { min: 45, max: 45, note: 'Fixje achtercamera' },
      },
      formula: {
        scherm: { k: 'n', n: 63 },
        accu: { k: 'n', n: 29 },
        laadpoort: { k: 'n', n: 28 },
        camera: { k: 'n', n: 45, note: 'Fixje ~45, oké' },
      },
    },
    [
      ['64 GB', -15],
      ['128 GB', 0],
      ['256 GB', 20],
      ['512 GB', 35],
    ],
  ),
  ...variants(
    {
      id: '13',
      model: 'iPhone 13',
      buffer: 30,
      prive: { min: 175, max: 225, rekenwaarde: 200 },
      lichtHuis: { min: 150, max: 190, rekenwaarde: 170 },
      parts: {
        scherm: { min: 75, max: 120, note: 'Fixje hq ~75 / A+ ~120' },
        accu: { min: 30, max: 30, note: 'Fixje A+' },
        laadpoort: { min: 28, max: 28, note: 'Fixje dock' },
        camera: { min: 45, max: 45, note: 'Fixje achtercamera' },
      },
      formula: {
        scherm: { k: 'n', n: 75 },
        accu: { k: 'n', n: 30 },
        laadpoort: { k: 'n', n: 28 },
        camera: { k: 'n', n: 45, note: 'Fixje ~45, oké' },
      },
    },
    [
      ['128 GB', 0],
      ['256 GB', 20],
      ['512 GB', 40],
      ['1 TB', 65],
    ],
  ),
  ...variants(
    {
      id: '14',
      model: 'iPhone 14',
      prive: { min: 190, max: 245, rekenwaarde: 220 },
      lichtHuis: { min: 160, max: 210, rekenwaarde: 185 },
      parts: {
        scherm: { min: 85, max: 100, note: 'Fixje hq ~85 / A+ ~100' },
        accu: { min: 29, max: 29, note: 'Fixje A+' },
        laadpoort: { min: 40, max: 40, note: 'Fixje dock' },
        camera: { min: 55, max: 55, note: 'Fixje achtercamera' },
      },
      formula: {
        scherm: { k: 'n', n: 85 },
        accu: { k: 'n', n: 29 },
        laadpoort: { k: 'n', n: 40 },
        camera: { k: 'n', n: 55, note: 'Fixje ~55, krap' },
      },
    },
    [
      ['128 GB', 0],
      ['256 GB', 20],
      ['512 GB', 40],
      ['1 TB', 65],
    ],
  ),
  ...variants(
    {
      id: '15',
      model: 'iPhone 15',
      prive: { min: 270, max: 335, rekenwaarde: 300 },
      lichtHuis: { min: 230, max: 285, rekenwaarde: 255 },
      parts: {
        scherm: { min: 110, max: 150, note: 'Fixje hq ~110 / A+ ~150' },
        accu: { min: 23, max: 23, note: 'Fixje A+' },
        laadpoort: { min: 21, max: 21, note: 'Fixje dock' },
        camera: { min: 50, max: 50, note: 'Fixje achtercamera' },
      },
      formula: {
        scherm: { k: 'n', n: 110 },
        accu: { k: 'n', n: 23 },
        laadpoort: { k: 'n', n: 21 },
        camera: { k: 'n', n: 50, note: 'Fixje ~50, oké' },
      },
    },
    [
      ['128 GB', 0],
      ['256 GB', 25],
      ['512 GB', 50],
      ['1 TB', 65],
    ],
  ),
  ...variants(
    {
      id: '16',
      model: 'iPhone 16',
      prive: { min: 360, max: 450, rekenwaarde: 405 },
      lichtHuis: { min: 305, max: 385, rekenwaarde: 345 },
      parts: {
        scherm: { min: 125, max: 210, note: 'Fixje set hq ~125 / A+ ~210' },
        accu: { min: 25, max: 90, note: 'Fixje A+ ~25; orig. ~90' },
        laadpoort: { min: 29, max: 29, note: 'Fixje dock' },
        camera: { min: 75, max: 75, note: 'Fixje achtercamera' },
      },
      formula: {
        scherm: { k: 'band', cheap: 125, dear: 210 },
        accu: { k: 'n', n: 25 },
        laadpoort: { k: 'n', n: 29 },
        camera: { k: 'n', n: 75, note: 'Fixje ~75, oké' },
      },
    },
    [
      ['128 GB', 0],
      ['256 GB', 25],
      ['512 GB', 50],
      ['1 TB', 65],
    ],
  ),
  ...variants(
    {
      id: '17',
      model: 'iPhone 17',
      prive: { min: 550, max: 700, rekenwaarde: 620 },
      lichtHuis: { min: 470, max: 600, rekenwaarde: 530 },
      parts: {
        scherm: { min: 70, max: 300, note: 'AM soft OLED ~70 (schatting); pulled orig. ~300' },
        accu: { min: 25, max: 80, note: 'A+ schatting ~25 (vgl. 16); orig. ~80' },
        laadpoort: { min: 29, max: 29, note: 'Fixje 17 n.v.t.; vgl. 16 ~29' },
        camera: null,
      },
      formula: {
        scherm: { k: 'either', am: 70, pulled: 300 },
        accu: { k: 'band', cheap: 25, dear: 80 },
        laadpoort: { k: 'n', n: 29 },
        camera: { k: 'unknown' },
      },
    },
    [
      ['256 GB', 0],
      ['512 GB', 40],
      ['1 TB', 75],
    ],
  ),
]

export function iphoneGroups(): { id: string; model: string; variants: IphoneMarkt[] }[] {
  const ids: string[] = []
  for (const row of IPHONES) {
    if (!ids.includes(row.id)) ids.push(row.id)
  }
  return ids.map((id) => {
    const list = IPHONES.filter((p) => p.id === id)
    return { id, model: list[0]!.model, variants: list }
  })
}

export function marktFor(id: string, storage?: string | null): IphoneMarkt | undefined {
  const rows = IPHONES.filter((p) => p.id === id)
  if (!rows.length) return undefined
  return pickStorageRow(rows, parseStorage(storage ?? '') ?? null)
}

export const WEL_DOEN = [
  'Accu en laadpoort op 11–15: vaak de ruimste marge (Fixje-onderdeel goedkoop). Dat is meestal de beste inkoop.',
  'Alleen behuizing (werkt, deukjes): max. inkoop = huis-rekenwaarde − buffer, geen extra part. Vaak een simpele Marktplaats-flip.',
  'iPhone 11 128 GB scherm kapot: meestal max €60. 64 GB lager; scherm + slechte accu is skip of te krap.',
  'Scherm alleen als de inkoop écht laag is — OLED vanaf 12 eet sneller de winst. Combinatie scherm + huis op 11/12 is vaak te krap.',
  'Camera achterkant op 11–15 kan, als het Fixje-onderdeel rond de €30–55 blijft.',
  'iPhone 16: Fixje hoge-kwaliteit/set (~€125) kan; A+ (~€210) eet de marge.',
]

export const NIET_DOEN = [
  'Face ID / TrueDepth: gekoppelde module, vaak geen Face ID na wissel — laat liggen.',
  'Waterschade: onvoorspelbaar, geen garantie, skip.',
  'iCloud-slot / Activation Lock: skip, altijd.',
  'Logic board / water + board: niet doen.',
  'iPhone 16/17 met duur A+/origineel scherm: te krap tenzij je het toestel bijna cadeau krijgt.',
  'iPhone 17: geen 128 GB, Marktplaats-prijs nog hoog, Fixje heeft nog geen 17-parts — lastige flip.',
]
