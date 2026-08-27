import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

function openaiProxy(envKey: string): Plugin {
  function mount(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    if (req.method !== 'POST') {
      next()
      return
    }
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => {
      void (async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
            key?: string
            payload?: unknown
          }
          const key = String(body.key || envKey || '').trim()
          if (!key.startsWith('sk-')) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'no key' }))
            return
          }
          const r = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body.payload ?? {}),
          })
          const text = await r.text()
          const status = r.ok ? 200 : r.status === 401 || r.status === 403 ? r.status : 502
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(
            r.ok
              ? JSON.stringify({ result: JSON.parse(text) })
              : JSON.stringify({ error: text.slice(0, 300) }),
          )
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'fail' }))
        }
      })()
    })
  }
  return {
    name: 'openai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/openai', mount)
      server.middlewares.use('/.netlify/functions/openai', mount)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), openaiProxy(env.OPENAI_API_KEY ?? '')],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
  }
})
