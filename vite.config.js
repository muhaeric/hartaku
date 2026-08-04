import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Runs the files in `api/` during `npm run dev` with the same handler signature
 * Vercel uses in production, so there is no separate dev server to start.
 */
function devApiPlugin (env) {
  return {
    name: 'hartaku-dev-api',
    configureServer (server) {
      // The api/ handlers read secrets from process.env; in dev they come from .env
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()

        const [pathname, search = ''] = req.url.split('?')
        const file = path.join(process.cwd(), `${pathname.slice(1)}.js`)
        if (!fs.existsSync(file)) return next()

        try {
          const mod = await server.ssrLoadModule(file)
          await mod.default(await toVercelRequest(req, search), toVercelResponse(res))
        } catch (err) {
          server.config.logger.error(`[dev-api] ${pathname}: ${err.stack || err.message}`)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'dev_api_error', message: err.message }))
          }
        }
      })
    }
  }
}

async function toVercelRequest (req, search) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')

  req.query = Object.fromEntries(new URLSearchParams(search))
  req.cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf('=')
        return [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))]
      })
  )
  req.body = raw && req.headers['content-type']?.includes('application/json')
    ? JSON.parse(raw)
    : raw

  return req
}

function toVercelResponse (res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (body) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(body))
    return res
  }
  res.send = (body) => {
    res.end(body)
    return res
  }
  return res
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), devApiPlugin(env)],
    // Bound to IPv4 explicitly: Vite's default `localhost` resolves to ::1 first
    // on Windows, which leaves http://127.0.0.1:3000 refusing connections.
    // For testing on a real phone: `npm run dev -- --host`.
    server: { host: '127.0.0.1', port: 3000 },
    build: { sourcemap: false }
  }
})
