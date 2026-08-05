import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { LANDING } from './src/lib/landing.js'

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Renders the landing copy into #root as plain HTML.
 *
 * React clears the container on mount, so this is only ever seen by something
 * that does not run JavaScript - which is exactly what Google's OAuth branding
 * review used to fetch and find empty. Generating it from the same object the
 * React landing page reads means the two can no longer disagree.
 */
function renderLandingHtml () {
  const features = LANDING.features
    .map(
      (feature) => `
            <li class="flex items-start gap-2.5">
              <span aria-hidden="true" class="text-[17px] leading-6">${escapeHtml(feature.icon)}</span>
              <span class="min-w-0">
                <span class="block text-body font-medium">${escapeHtml(feature.title)}</span>
                <span class="block text-caption text-subtitle dark:text-subtitle-dark">${escapeHtml(feature.body)}</span>
              </span>
            </li>`
    )
    .join('')

  const steps = LANDING.steps
    .map(
      (step, index) => `
            <li class="flex items-start gap-2.5">
              <span aria-hidden="true" class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">${index + 1}</span>
              <span class="text-caption text-subtitle dark:text-subtitle-dark">${escapeHtml(step)}</span>
            </li>`
    )
    .join('')

  const access = LANDING.access
    .map(
      (item) => `
            <div>
              <dt class="text-body font-medium">${escapeHtml(item.what)}</dt>
              <dd class="text-caption text-subtitle dark:text-subtitle-dark">${escapeHtml(item.why)}</dd>
            </div>`
    )
    .join('')

  const links = LANDING.links
    .map(
      (link) =>
        `<a class="font-medium text-brand-500" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`
    )
    .join('\n        ')

  return `
      <main class="mx-auto w-full max-w-lg px-page py-8">
        <header class="text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-brand-500 text-[26px]">💸</div>
          <h1 class="text-page-title font-bold tracking-tight">${escapeHtml(LANDING.name)}</h1>
          <p class="mx-auto mt-2 max-w-sm text-body text-subtitle dark:text-subtitle-dark">${escapeHtml(LANDING.tagline)}</p>
        </header>

        <section class="mt-6">
          <h2 class="text-section-title font-semibold">Apa itu ${escapeHtml(LANDING.name)}</h2>
          <p class="mt-1.5 text-body text-subtitle dark:text-subtitle-dark">${escapeHtml(LANDING.intro)}</p>
        </section>

        <section class="mt-8">
          <h2 class="text-section-title font-semibold">Yang bisa dilakukan</h2>
          <ul class="mt-2 space-y-3">${features}
          </ul>
        </section>

        <section class="mt-8">
          <h2 class="text-section-title font-semibold">Cara kerjanya</h2>
          <ol class="mt-2 space-y-2">${steps}
          </ol>
        </section>

        <section class="mt-8">
          <h2 class="text-section-title font-semibold">Data yang diakses dan alasannya</h2>
          <dl class="mt-2 space-y-3">${access}
          </dl>
          <p class="mt-3 rounded-card border border-hairline bg-surface p-3.5 text-caption text-subtitle dark:border-hairline-dark dark:bg-surface-dark dark:text-subtitle-dark">${escapeHtml(LANDING.privacyNote)}</p>
        </section>

        <footer class="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-hairline pt-4 text-caption dark:border-hairline-dark">
        ${links}
        </footer>
      </main>`
}

function landingHtmlPlugin () {
  return {
    name: 'hartaku-landing-html',
    transformIndexHtml (html) {
      return html.replace('<!--landing-->', renderLandingHtml())
    }
  }
}

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

      // Mirrors the vercel.json rewrites so the legal pages have the same URLs
      // in development as in production.
      server.middlewares.use((req, res, next) => {
        const [pathname] = req.url.split('?')
        if (pathname === '/privacy' || pathname === '/terms') {
          req.url = `${pathname}.html`
        }
        next()
      })

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
    plugins: [react(), landingHtmlPlugin(), devApiPlugin(env)],
    // Bound to IPv4 explicitly: Vite's default `localhost` resolves to ::1 first
    // on Windows, which leaves http://127.0.0.1:3000 refusing connections.
    // For testing on a real phone: `npm run dev -- --host`.
    server: { host: '127.0.0.1', port: 3000 },
    build: { sourcemap: false }
  }
})
