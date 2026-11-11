import { defineConfig } from '@playwright/test'

const port = 38173
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: { baseURL, reducedMotion: 'reduce' },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
  },
})
