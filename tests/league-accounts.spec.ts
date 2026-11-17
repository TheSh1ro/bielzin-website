import { expect, test, type Page } from '@playwright/test'

const id = 'dce62113-4b62-439e-8e87-bd84b98c41f0'
const account = {
  id,
  riotId: 'Conta Demo#BR1',
  ownership: 'owner',
  lastError: null,
  profile: {
    gameName: 'Conta Demo',
    tagLine: 'BR1',
    region: 'BR',
    level: 120,
    collectedAt: '2026-11-16T21:00:00Z',
    profileIconId: 1,
    dataDragonVersion: '16.22.1',
    ranks: [
      {
        queueType: 'RANKED_SOLO_5x5',
        tier: 'GOLD',
        division: 'III',
        leaguePoints: 22,
        wins: 30,
        losses: 20,
      },
    ],
  },
}

async function openProfile(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar sem trilha' }).click()
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()
}

async function seedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      `sb-${location.hostname.split('.')[0]}-auth-token`,
      JSON.stringify({
        access_token: 'mock-authenticated-session',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'mock-user' },
      }),
    )
  })
}

test('Contas fica invisível para visitantes e usuários sem autorização', async ({ page }) => {
  let requests = 0
  await page.route('**/functions/v1/lol-vault/access', (route) => {
    requests++
    return route.fulfill({ status: 403, json: { message: 'Acesso restrito.' } })
  })
  await openProfile(page)
  await expect(page.getByRole('tab')).toHaveCount(2)
  expect(requests).toBe(0)

  await seedSession(page)
  await Promise.all([page.waitForResponse('**/functions/v1/lol-vault/access'), openProfile(page)])
  await expect(page.getByRole('tab')).toHaveCount(2)
  expect(requests).toBe(1)
})

test('abre detalhes, busca credenciais sob demanda e remove o conteúdo ao sair', async ({
  page,
}) => {
  await seedSession(page)
  let ownership = 'owner'
  let credentialReads = 0
  await page.route('**/functions/v1/lol-vault**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/access')) return route.fulfill({ json: { allowed: true } })
    if (path.endsWith('/credentials')) {
      credentialReads++
      return route.fulfill({ json: { login: 'login-demo', password: 'senha-demo' } })
    }
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON()
      expect(payload).toEqual({ riotId: account.riotId, ownership: 'others' })
      ownership = payload.ownership
      return route.fulfill({ json: { id } })
    }
    return route.fulfill({ json: { items: [{ ...account, ownership }] } })
  })

  await openProfile(page)
  await page.getByRole('tab', { name: /^Contas/ }).click()
  const summary = page.getByRole('button', { name: /Conta Demo/ })
  await expect(summary).toHaveAttribute('aria-expanded', 'false')
  await expect(summary).toContainText('Dono')
  await summary.click()
  await expect(page.getByText('30V / 20D')).toBeVisible()
  await expect(page.getByText('Sem ranking')).toBeVisible()
  expect(credentialReads).toBe(0)

  await page.getByRole('button', { name: 'Revelar login e senha' }).click()
  await expect(page.getByText('senha-demo')).toBeVisible()
  await summary.click()
  await expect(page.getByText('senha-demo')).toHaveCount(0)

  await summary.click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByLabel('Nova senha')).toHaveValue('')
  await page.getByLabel('Vínculo').selectOption({ label: 'Outros' })
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(summary).toContainText('Outros')
  await page.getByRole('button', { name: 'Revelar login e senha' }).click()
  await expect(page.getByText('senha-demo')).toBeVisible()

  await page.evaluate(() => {
    const key = `sb-${location.hostname.split('.')[0]}-auth-token`
    localStorage.removeItem(key)
    const channel = new BroadcastChannel(key)
    channel.postMessage({ event: 'SIGNED_OUT', session: null })
    channel.close()
  })
  await expect(page.getByRole('tab', { name: /^Contas/ })).toHaveCount(0)
  await expect(page.getByText('senha-demo')).toHaveCount(0)
})
