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
  await expect(page.getByRole('link', { name: 'Ver perfil', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Flex/ }).click()
  await expect(page.getByRole('button', { name: /Flex/ })).toHaveAttribute('aria-pressed', 'true')

  const next = page.getByRole('button', { name: /Meus projetos/ })
  await next.focus()
  await next.press('Enter')
  await expect(page.getByRole('tab', { name: /Desenvolvimento/ })).toBeFocused()
})

test('exibe os mapas em destaque e permite explorar o ranking do osu!', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()

  const osu = page.getByRole('region', { name: 'osu!', exact: true })
  await expect(osu.getByRole('link', { name: 'Ver perfil no osu!' })).toHaveAttribute(
    'href',
    'https://osu.ppy.sh/users/19383022',
  )
  const maps = osu.getByRole('region', { name: 'Mapas que criei' })
  await expect(maps.getByRole('link')).toHaveCount(6)
  await expect(maps.getByRole('link', { name: /Plain Jane/ })).toHaveAttribute(
    'href',
    'https://osu.ppy.sh/beatmapsets/1325234#osu/2745187',
  )
  await expect(
    osu.getByRole('region', { name: 'Top plays' }).getByRole('link').first(),
  ).toHaveAttribute('href', /https:\/\/osu\.ppy\.sh\/scores\/\d+/)
  const medals = osu.getByRole('region', { name: 'Medalhas', exact: true })
  for (const category of ['Full combo', 'Pass']) {
    await expect(
      medals.getByRole('region', { name: category, exact: true }).getByRole('listitem'),
    ).toHaveCount(4)
  }

  const chart = osu.getByRole('slider', { name: 'Dia do histórico do ranking mundial' })
  const latest = await chart.getAttribute('aria-valuetext')
  expect(latest).toContain('posição #')
  await chart.press('Home')
  await expect(chart).not.toHaveAttribute('aria-valuetext', latest!)
})
