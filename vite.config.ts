import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { adminLogin } from './api/admin-login'
import { recordVisit } from './api/visit'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    {
      name: 'local-site-api',
      configureServer(server) {
        const env = { ...loadEnv(mode, server.config.envDir, ''), ...process.env }
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== 'POST' || !req.headers.host) return next()
          const url = new URL(req.url ?? '/', 'http://' + req.headers.host)
          if (url.pathname !== '/api/visit' && url.pathname !== '/api/admin-login') return next()
          try {
            const chunks: Buffer[] = []
            let size = 0
            for await (const chunk of req) {
              size += chunk.length
              if (size > 16_384) {
                res.writeHead(413).end()
                return
              }
              chunks.push(chunk)
            }
            const request = new Request(url, {
              method: 'POST',
              headers: Object.entries(req.headers).map(([key, value]) => [key, String(value)]),
              body: Buffer.concat(chunks).toString('utf8'),
            })
            const response =
              url.pathname === '/api/visit'
                ? await recordVisit(request, env)
                : await adminLogin(request, env, true)
            res.writeHead(response.status, Object.fromEntries(response.headers))
            res.end(await response.text())
          } catch (error) {
            next(error)
          }
        })
      },
    },
  ],
  server: {
    host: '127.0.0.1',
  },
  build: {
    rollupOptions: {
      input: {
        profile: fileURLToPath(new URL('./index.html', import.meta.url)),
        riven: fileURLToPath(new URL('./riven.html', import.meta.url)),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
