const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function handle(method, rawBody) {
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (method !== 'POST') {
    return json(405, { error: 'POST only' })
  }
  try {
    const body = JSON.parse(rawBody || '{}')
    const key = String(body.key || process.env.OPENAI_API_KEY || '').trim()
    if (!key.startsWith('sk-')) {
      return json(400, { error: 'no key' })
    }
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    if (!res.ok) {
      const status = res.status === 401 || res.status === 403 ? res.status : 502
      return json(status, { error: text.slice(0, 300) })
    }
    return json(200, { result: JSON.parse(text) })
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : 'fail' })
  }
}

/** Netlify Functions v2 — must return a Web Response, not a Lambda { statusCode, body }. */
export default async (request) => {
  const raw = request.method === 'POST' || request.method === 'PUT' ? await request.text() : ''
  return handle(request.method, raw)
}

export const config = {
  path: ['/api/openai', '/.netlify/functions/openai'],
}
