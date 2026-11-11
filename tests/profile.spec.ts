import { expect, test } from '@playwright/test'

test('abre o perfil mesmo quando o tracker não tem contas', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))
  await page.route(/\/src\/data\/lol-tracker\.json(?:\?|$)/, async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'export default { schemaVersion: 1, accounts: [] }',
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()

  await expect(page.getByRole('heading', { name: 'bielzin', exact: true })).toBeVisible()
  await expect(page.getByText('Nenhuma conta no tracker.')).toBeVisible()
  await page.getByRole('tab', { name: /Desenvolvimento/ }).click()
  await expect(page.getByRole('heading', { name: 'Mais projetos' })).toBeVisible()
  expect(errors).toEqual([])
})

test('mostra o snapshot atual e devolve o foco ao trocar de seção', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()

  await expect(
    page.getByRole('region', { name: 'Meu perfil' }).getByRole('heading', {
      name: 'Meu perfil',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver perfil' })).toBeVisible()
  await page.getByRole('button', { name: /Flex/ }).click()
  await expect(page.getByRole('button', { name: /Flex/ })).toHaveAttribute('aria-pressed', 'true')

  const next = page.getByRole('button', { name: /Meus projetos/ })
  await next.focus()
  await next.press('Enter')
  await expect(page.getByRole('tab', { name: /Desenvolvimento/ })).toBeFocused()
})
