export default async function handler(event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'POST only' }) }
  }
  try {
    const body = JSON.parse(event.body || '{}')
    const key = String(body.key || process.env.OPENAI_API_KEY || '').trim()
    if (!key.startsWith('sk-')) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'no key' }) }
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
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: text.slice(0, 300) }) }
    }
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ result: JSON.parse(text) }) }
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'fail' }),
    }
  }
}
