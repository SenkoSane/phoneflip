import type { DefectId } from './marktwaarde'
import { matchIphone, parseListingText } from '../lib/dealCoach'

export const GENS = ['11', '12', '13', '14', '15', '16', '17'] as const
export type Gen = (typeof GENS)[number]

export type ExtLink = {
  href: string
  shop: string
  labelKey: string
  noteKey?: string
  pick?: boolean
  warn?: boolean
}

export type LinkGroup = {
  id: string
  titleKey: string
  hintKey?: string
  warnKey?: string
  links: ExtLink[]
}

export type ShopCard = {
  id: string
  name: string
  href: string
  where: string
  whenKey: string
  warnKey?: string
}

type Slugs = {
  screenCheap: string
  screenPlus: string
  battery: string
  batterySet: string
  dock: string
  camera: string
  frame: string
  battSticker: string
  speaker: string
  earpiece: string
  camGlass: string
  back?: string
}

function f(path: string): string {
  return `https://www.fixje.nl/${path.replace(/^\//, '')}`
}

function classic(n: string): Slugs {
  return {
    screenCheap: `iphone-${n}-scherm`,
    screenPlus: `iphone-${n}-scherm-a-kwaliteit`,
    battery: `iphone-${n}-batterij-a-kwaliteit`,
    batterySet: `iphone-${n}-batterij-set-a-kwaliteit`,
    dock: `iphone-${n}-dock-connector`,
    camera: `iphone-${n}-achter-camera`,
    frame: `iphone-${n}-frame-sticker`,
    battSticker: `iphone-${n}-batterij-sticker`,
    speaker: `iphone-${n}-luidspreker`,
    earpiece: `iphone-${n}-oorspeaker`,
    camGlass: `iphone-${n}-camera-glas`,
  }
}

const SLUGS: Record<Gen, Slugs | null> = {
  '11': classic('11'),
  '12': classic('12'),
  '13': classic('13'),
  '14': classic('14'),
  '15': classic('15'),
  '16': {
    screenCheap: 'iphone-16-scherm-premium',
    screenPlus: 'iphone-16-scherm-a-kwaliteit',
    battery: 'iphone-16-batterij',
    batterySet: 'iphone-16-batterijset',
    dock: 'iphone-16-dock-connector',
    camera: 'iphone-16-achtercamera',
    frame: 'iphone-16-framesticker',
    battSticker: 'iphone-16-batterijsticker',
    speaker: 'iphone-16-gaasjes',
    earpiece: 'iphone-16-sensorkabel',
    camGlass: 'iphone-16-cameraglas',
    back: 'iphone-16-achterkant-origineel',
  },
  '17': null,
}

export const SHOPS: ShopCard[] = [
  {
    id: 'fixje',
    name: 'Fixje',
    href: 'https://www.fixje.nl/iphone-onderdelen/',
    where: 'Vriezenveen',
    whenKey: 'sup.fixjeWhen',
  },
  {
    id: 'fixjescherm',
    name: 'FixjeScherm',
    href: 'https://fixjescherm.nl/',
    where: 'NL · KOR / btw-vrij',
    whenKey: 'sup.fjsWhen',
    warnKey: 'sup.fjsWarn',
  },
  {
    id: 'rounded',
    name: 'Rounded',
    href: 'https://rounded.com/?currency=EUR&sl=nl',
    where: 'Goes',
    whenKey: 'sup.roundedWhen',
    warnKey: 'sup.roundedWarn',
  },
  {
    id: 'gsm55',
    name: 'GSM55',
    href: 'https://www.gsm55.nl/',
    where: 'NL',
    whenKey: 'sup.gsm55When',
  },
  {
    id: 'phoneparts',
    name: 'PhoneParts',
    href: 'https://www.phoneparts.nl/',
    where: 'NL',
    whenKey: 'sup.phonepartsWhen',
  },
  {
    id: 'ifixit',
    name: 'iFixit',
    href: 'https://nl.ifixit.com/',
    where: 'Handleidingen',
    whenKey: 'sup.ifixitWhen',
  },
]

export const TOOL_GROUPS: LinkGroup[] = [
  {
    id: 'kits',
    titleKey: 'sup.g.kits',
    hintKey: 'sup.g.kitsHint',
    links: [
      {
        href: f('beginners-reparatieset'),
        shop: 'Fixje',
        labelKey: 'sup.l.kitBegin',
        pick: true,
      },
      {
        href: f('iphone-reparatieset-15in1'),
        shop: 'Fixje',
        labelKey: 'sup.l.kit15',
      },
      {
        href: f('iphone-reparatieset-premium'),
        shop: 'Fixje',
        labelKey: 'sup.l.kitPremium',
      },
      {
        href: 'https://fixjescherm.nl/product/budget-reparatieset/',
        shop: 'FixjeScherm',
        labelKey: 'sup.l.kitBudget',
        noteKey: 'sup.n.cheap',
      },
      {
        href: 'https://fixjescherm.nl/product/luxe-reparatieset/',
        shop: 'FixjeScherm',
        labelKey: 'sup.l.kitLuxe',
      },
    ],
  },
  {
    id: 'hand',
    titleKey: 'sup.g.hand',
    hintKey: 'sup.g.handHint',
    links: [
      {
        href: f('2uul-schroevendraaier-pentalobe-p2'),
        shop: 'Fixje',
        labelKey: 'sup.l.pentalobe',
        pick: true,
      },
      {
        href: f('2uul-precisie-schermopener'),
        shop: 'Fixje',
        labelKey: 'sup.l.opener',
      },
      {
        href: f('heat-gun'),
        shop: 'Fixje',
        labelKey: 'sup.l.heat',
      },
      {
        href: f('reinigingsset-basic'),
        shop: 'Fixje',
        labelKey: 'sup.l.clean',
      },
      {
        href: f('gereedschap/'),
        shop: 'Fixje',
        labelKey: 'sup.l.allTools',
      },
    ],
  },
  {
    id: 'consumables',
    titleKey: 'sup.g.consume',
    hintKey: 'sup.g.consumeHint',
    links: [
      {
        href: 'https://www.bol.com/nl/nl/s/?searchtext=isopropanol+99',
        shop: 'Bol',
        labelKey: 'sup.l.ipa',
        pick: true,
      },
      {
        href: 'https://www.bol.com/nl/nl/s/?searchtext=T-7000+lijm',
        shop: 'Bol',
        labelKey: 'sup.l.t7000',
        pick: true,
      },
      {
        href: 'https://www.bol.com/nl/nl/s/?searchtext=B-7000+lijm',
        shop: 'Bol',
        labelKey: 'sup.l.b7000',
      },
    ],
  },
]

function rounded(n: Gen): string {
  return `https://rounded.com/iphone-${n}/?currency=EUR&sl=nl`
}

function fjsScreen(n: Gen): string {
  if (n === '11') return 'https://fixjescherm.nl/product/iphone-11-scherm/'
  return `https://fixjescherm.nl/product/iphone-${n}-scherm-oled/`
}

function fjsBatt(n: Gen): string {
  return `https://fixjescherm.nl/product/iphone-${n}-accu/`
}

function ifixit(n: Gen): string {
  return `https://nl.ifixit.com/Device/iPhone_${n}`
}

function ifixitEn(n: Gen): string {
  return `https://www.ifixit.com/Device/iPhone_${n}`
}

function cat(n: Gen): string {
  if (n === '17') return 'https://www.fixje.nl/iphone-onderdelen/'
  return `https://www.fixje.nl/iphone-onderdelen/iphone-${n}-onderdelen/`
}

function guide(n: Gen, kind: 'batterij' | 'scherm' | 'dock-connector'): string {
  return `https://www.fixje.nl/iphone-${n}-${kind}-vervangen/`
}

function repairHub(n: Gen): string {
  return `https://www.fixje.nl/iphone-reparatie/iphone-${n}-reparatie/`
}

export function genFromModel(model: string): Gen | null {
  const hit = matchIphone(model)
  if (!hit) return null
  return hit.row.id as Gen
}

export function defectsFromNotes(input: {
  todo?: string
  damage?: string
  parts?: { name: string }[]
}): DefectId[] {
  const blob = [input.todo, input.damage, ...(input.parts ?? []).map((p) => p.name)]
    .filter(Boolean)
    .join(' ')
  const fromText = blob ? parseListingText(blob).defects : []
  const extra: DefectId[] = []
  for (const p of input.parts ?? []) {
    const n = p.name.toLowerCase()
    if (n.includes('scherm')) extra.push('scherm')
    if (n.includes('batter') || n.includes('accu')) extra.push('accu')
    if (n.includes('oplaad') || n.includes('dock') || n.includes('laad')) extra.push('laadpoort')
    if (n.includes('camera')) extra.push('camera')
    if (n.includes('achterkant') || n.includes('frame') || n.includes('behuiz')) extra.push('behuizing')
  }
  return [...new Set([...fromText, ...extra])]
}

function L(
  href: string,
  shop: string,
  labelKey: string,
  extra?: Pick<ExtLink, 'noteKey' | 'pick' | 'warn'>,
): ExtLink {
  return { href, shop, labelKey, ...extra }
}

export function groupsFor(gen: Gen, defects?: DefectId[]): LinkGroup[] {
  const slugs = SLUGS[gen]
  const n = Number(gen)
  const want = defects && defects.length > 0 ? new Set(defects) : null
  const groups: LinkGroup[] = []

  const hubs: ExtLink[] = [
    L(cat(gen), 'Fixje', 'sup.l.cat', { pick: true }),
    L(rounded(gen), 'Rounded', 'sup.l.roundedModel', { noteKey: 'sup.n.compare' }),
    L(ifixit(gen), 'iFixit', 'sup.l.ifixitNl'),
    L(ifixitEn(gen), 'iFixit', 'sup.l.ifixitEn'),
    L(repairHub(gen), 'Fixje', 'sup.l.repairHub'),
  ]
  if (gen === '16') {
    hubs.push(L('https://www.fixje.nl/iphone-onderdelen/iphone-16e-onderdelen/', 'Fixje', 'sup.l.cat16e'))
  }
  if (gen === '17') {
    hubs.push(
      L('https://www.fixje.nl/?s=iphone+17', 'Fixje', 'sup.l.search17', { noteKey: 'sup.n.no17' }),
    )
  }
  groups.push({
    id: 'hubs',
    titleKey: 'sup.g.hubs',
    hintKey: 'sup.g.hubsHint',
    links: hubs,
  })

  const screenLinks: ExtLink[] = []
  if (slugs) {
    if (gen === '11') {
      screenLinks.push(
        L(fjsScreen(gen), 'FixjeScherm', 'sup.l.screenLcd', { pick: true, noteKey: 'sup.n.fjs11' }),
        L(f(slugs.screenCheap), 'Fixje', 'sup.l.screenHq'),
        L(f(slugs.screenPlus), 'Fixje', 'sup.l.screenA'),
      )
    } else {
      screenLinks.push(
        L(f(slugs.screenCheap), 'Fixje', 'sup.l.screenHq', { pick: n <= 15, warn: n >= 12 }),
        L(f(slugs.screenPlus), 'Fixje', 'sup.l.screenA', { warn: true }),
        L(fjsScreen(gen), 'FixjeScherm', 'sup.l.screenOled', { noteKey: 'sup.n.oledCheap', warn: true }),
      )
    }
    screenLinks.push(
      L(f(slugs.frame), 'Fixje', 'sup.l.frame', { pick: true }),
      L(guide(gen, 'scherm'), 'Fixje', 'sup.l.guideScreen'),
      L(rounded(gen), 'Rounded', 'sup.l.roundedScreen', { noteKey: 'sup.n.compare' }),
    )
  } else {
    screenLinks.push(
      L(cat(gen), 'Fixje', 'sup.l.cat', { warn: true }),
      L(fjsScreen(gen), 'FixjeScherm', 'sup.l.screenOled', { warn: true }),
      L(rounded(gen), 'Rounded', 'sup.l.roundedModel', { warn: true }),
    )
  }
  groups.push({
    id: 'scherm',
    titleKey: 'mw.scherm',
    hintKey: n === 11 ? 'sup.h.screen11' : n >= 16 ? 'sup.h.screenNew' : 'sup.h.screenOled',
    warnKey: n >= 16 ? 'coach.skipNewScreen' : n >= 12 ? 'coach.hardOled' : undefined,
    links: screenLinks,
  })

  const battLinks: ExtLink[] = []
  if (slugs) {
    battLinks.push(
      L(f(slugs.battery), 'Fixje', 'sup.l.battA', { pick: true }),
      L(f(slugs.batterySet), 'Fixje', 'sup.l.battSet', { noteKey: 'sup.n.set' }),
      L(fjsBatt(gen), 'FixjeScherm', 'sup.l.battCheap', { noteKey: 'sup.n.compare' }),
      L(f(slugs.battSticker), 'Fixje', 'sup.l.battSticker'),
      L(guide(gen, 'batterij'), 'Fixje', 'sup.l.guideBatt'),
      L(rounded(gen), 'Rounded', 'sup.l.roundedBatt', { noteKey: 'sup.n.compare' }),
    )
  } else {
    battLinks.push(
      L('https://www.fixje.nl/?s=iphone+17+batterij', 'Fixje', 'sup.l.search17'),
      L(fjsBatt(gen), 'FixjeScherm', 'sup.l.battCheap'),
      L(rounded(gen), 'Rounded', 'sup.l.roundedBatt'),
    )
  }
  groups.push({
    id: 'accu',
    titleKey: 'mw.accu',
    hintKey: 'sup.h.accu',
    links: battLinks,
  })

  const dockLinks: ExtLink[] = []
  if (slugs) {
    dockLinks.push(
      L(f(slugs.dock), 'Fixje', 'sup.l.dock', { pick: true }),
      L(guide(gen, 'dock-connector'), 'Fixje', 'sup.l.guideDock'),
      L(rounded(gen), 'Rounded', 'sup.l.roundedDock', { noteKey: 'sup.n.compare' }),
    )
  } else {
    dockLinks.push(
      L('https://www.fixje.nl/?s=iphone+17+dock', 'Fixje', 'sup.l.search17'),
      L(rounded(gen), 'Rounded', 'sup.l.roundedDock'),
    )
  }
  groups.push({
    id: 'laadpoort',
    titleKey: 'mw.laadpoort',
    hintKey: 'sup.h.dock',
    links: dockLinks,
  })

  const camLinks: ExtLink[] = []
  if (slugs) {
    camLinks.push(
      L(f(slugs.camera), 'Fixje', 'sup.l.camera', { pick: true }),
      L(f(slugs.camGlass), 'Fixje', 'sup.l.camGlass'),
      L(rounded(gen), 'Rounded', 'sup.l.roundedCam', { noteKey: 'sup.n.compare' }),
    )
  } else {
    camLinks.push(L(rounded(gen), 'Rounded', 'sup.l.roundedCam'))
  }
  groups.push({
    id: 'camera',
    titleKey: 'mw.camera',
    hintKey: 'sup.h.camera',
    links: camLinks,
  })

  groups.push({
    id: 'behuizing',
    titleKey: 'mw.behuizing',
    hintKey: 'sup.h.housing',
    links: slugs?.back
      ? [
          L(f(slugs.back), 'Fixje', 'sup.l.back', { noteKey: 'sup.n.housingSkip', warn: true }),
          L(f(slugs.frame), 'Fixje', 'sup.l.frame'),
        ]
      : slugs
        ? [L(f(slugs.frame), 'Fixje', 'sup.l.frame', { noteKey: 'sup.n.housingSkip' })]
        : [L(rounded(gen), 'Rounded', 'sup.l.roundedModel', { noteKey: 'sup.n.housingSkip' })],
  })

  if (slugs) {
    groups.push({
      id: 'extra',
      titleKey: 'sup.g.extra',
      hintKey: 'sup.g.extraHint',
      links: [
        L(f(slugs.speaker), 'Fixje', 'sup.l.speaker'),
        L(f(slugs.earpiece), 'Fixje', 'sup.l.earpiece'),
        L(cat(gen), 'Fixje', 'sup.l.catMore'),
      ],
    })
  }

  if (!want) return groups
  const keep = new Set<string>(['hubs'])
  for (const d of want) keep.add(d)
  if (want.has('scherm') || want.has('accu')) keep.add('extra')
  return groups.filter((g) => keep.has(g.id))
}

export function compactGroups(model: string, defects: DefectId[]): LinkGroup[] {
  const gen = genFromModel(model)
  if (!gen) {
    return [
      {
        id: 'hubs',
        titleKey: 'sup.g.hubs',
        links: SHOPS.slice(0, 4).map((s) => L(s.href, s.name, 'sup.l.shopHome')),
      },
      TOOL_GROUPS[0],
    ]
  }
  const focus = defects.length > 0 ? defects : (['accu', 'laadpoort'] as DefectId[])
  return [...groupsFor(gen, focus).filter((g) => g.id !== 'extra' && g.id !== 'behuizing'), TOOL_GROUPS[0]]
}
