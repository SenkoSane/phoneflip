import { JAN_SYSTEM_PROMPT } from './janPrompt'

const KEY = 'phoneflip.openai.sk'

export function readOpenAiKey(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function writeOpenAiKey(value: string) {
  try {
    const v = value.trim()
    if (v) localStorage.setItem(KEY, v)
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export type AiParse = {
  brand?: string
  model?: string
  storage?: string
  damage?: string
  todo?: string
  defects?: string[]
  skips?: string[]
  listing?: string
}

async function postAi(payload: unknown): Promise<unknown> {
  const key = readOpenAiKey()
  const urls = ['/api/openai', '/.netlify/functions/openai']
  let lastErr = 'offline'
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, payload }),
      })
      if (!res.ok) {
        lastErr = `http ${res.status}`
        continue
      }
      const json = (await res.json()) as { error?: string; result?: unknown }
      if (json.error) {
        lastErr = json.error
        continue
      }
      return json.result
    } catch {
      lastErr = 'network'
    }
  }
  throw new Error(lastErr)
}

function extractJson(text: string): AiParse {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return {}
  try {
    return JSON.parse(text.slice(start, end + 1)) as AiParse
  } catch {
    return {}
  }
}

export async function aiParseListing(text: string): Promise<AiParse> {
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'Je helpt een beginner in Nederland met telefoon-flips. Antwoord ALLEEN JSON: {brand, model, storage, damage, todo, defects, skips}. defects is subset van scherm,accu,laadpoort,camera,behuizing. skips subset van faceid,water,icloud,board. Geen prijzen verzinnen.',
      },
      { role: 'user', content: text.slice(0, 4000) },
    ],
  })
  const choice = (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
    ?.content
  return extractJson(choice ?? '')
}

export async function aiParsePhoto(dataUrl: string): Promise<AiParse> {
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content:
          'Je kijkt naar een kapotte telefoon. Antwoord ALLEEN JSON: {damage, todo, defects, skips}. defects: scherm,accu,laadpoort,camera,behuizing. skips: faceid,water,icloud,board. Beginner in NL: Face ID, water, board = skip. Geen eurobedragen.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Wat is kapot? Kort Nederlands.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  })
  const choice = (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
    ?.content
  return extractJson(choice ?? '')
}

export async function aiPolishAd(draft: string): Promise<string> {
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          'Herschrijf als korte Marktplaats-advertentie (NL), max 120 woorden, geen emoji-spam, geen valse garantie. Behoud feiten. Alleen de tekst, geen JSON.',
      },
      { role: 'user', content: draft.slice(0, 2000) },
    ],
  })
  const choice = (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
    ?.content
  return (choice ?? '').trim() || draft
}

export async function aiPolishChat(draft: string): Promise<string> {
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'Herschrijf als kort WhatsApp-bericht (NL) van een beginner naar een Marktplaats-verkoper. Behoud checks: accu, behuizing, IMEI, serienummer, Zoek mijn, Face ID, waterschade. Geen emoji. Verzin geen prijzen of markttrends. Alleen de tekst.',
      },
      { role: 'user', content: draft.slice(0, 2000) },
    ],
  })
  const choice = (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
    ?.content
  return (choice ?? '').trim() || draft
}

export type PhotoTip = { slot: string; tip: string }

export async function aiReviewListingPhotos(input: {
  model: string
  photos: { id: string; n: number; title: string; dataUrl: string }[]
}): Promise<{ tips: PhotoTip[]; note: string }> {
  if (input.photos.length === 0) return { tips: [], note: '' }
  const content: unknown[] = [
    {
      type: 'text',
      text: `iPhone-listing foto’s in vaste volgorde. Model: ${input.model}. Per foto: nummer + wat het móet zijn. JSON only: {"tips":[{"slot":"frontOn","tip":"..."}],"note":"kort"}. slot = id. Tip alleen als de foto fout is (donker, scherm uit, vinger, wazig, verkeerde kant). Geen prijzen.`,
    },
  ]
  for (const p of input.photos.slice(0, 6)) {
    content.push({
      type: 'text',
      text: `Foto ${p.n}: id=${p.id} — ${p.title}`,
    })
    content.push({
      type: 'image_url',
      image_url: { url: p.dataUrl },
    })
  }
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content:
          'Je helpt een NL-beginner met Marktplaats-foto’s. Antwoord ALLEEN JSON: {tips:[{slot,tip}], note}. Geen eurobedragen.',
      },
      { role: 'user', content },
    ],
  })
  const choice = (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
    ?.content
  const json = extractJson(choice ?? '') as { tips?: PhotoTip[]; note?: string }
  const tips = Array.isArray(json.tips)
    ? json.tips.filter((t) => t && typeof t.slot === 'string' && typeof t.tip === 'string')
    : []
  return { tips, note: typeof json.note === 'string' ? json.note : '' }
}

export async function aiListingAssist(input: {
  question: string
  model: string
  facts: string
  photo?: { title: string; dataUrl: string }
}): Promise<string> {
  const q = input.question.trim().slice(0, 400)
  if (!q) return ''
  const content: unknown[] = [
    {
      type: 'text',
      text: `Toestel: ${input.model}\nFeiten:\n${input.facts.slice(0, 1200)}\n\nVraag: ${q}`,
    },
  ]
  if (input.photo?.dataUrl) {
    content.push({ type: 'text', text: `Huidige foto: ${input.photo.title}` })
    content.push({ type: 'image_url', image_url: { url: input.photo.dataUrl } })
  }
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 280,
    messages: [
      {
        role: 'system',
        content:
          'Je bent een korte NL-assistent voor een beginner die een iPhone op Marktplaats zet. Max 80 woorden. Geen emoji. Geen IMEI. Verzin geen prijzen of markttrends. Als de foto fout is (scherm uit, vinger, wazig, verkeerde kant), zeg wat er anders moet. Verwijs naar de vraagprijs die al in de app staat.',
      },
      { role: 'user', content },
    ],
  })
  const choice = (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
    ?.content
  return (choice ?? '').trim()
}

export type JanTurn = { role: 'user' | 'assistant'; content: string }

function choiceText(result: unknown): string {
  return (
    (result as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message
      ?.content ?? ''
  ).trim()
}

export async function aiJanChat(history: JanTurn[]): Promise<string> {
  const result = await postAi({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      { role: 'system', content: JAN_SYSTEM_PROMPT },
      ...history.slice(-24).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      })),
    ],
  })
  return choiceText(result)
}

export function fileToJpegDataUrl(file: File, max = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image'))
    }
    img.src = url
  })
}
