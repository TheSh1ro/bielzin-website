import { expect, test, type Page } from '@playwright/test'

async function enterGames(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar sem trilha' }).click()
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()
  await expect(page.getByRole('tab', { name: /Jogos/ })).toBeVisible()
}

async function expectIndicatorAligned(page: Page) {
  await expect
    .poll(() =>
      page.locator('.section-switcher').evaluate((switcher) => {
        const tab = switcher.querySelector('[aria-selected="true"]')!.getBoundingClientRect()
        const indicator = switcher
          .querySelector('.section-switcher-indicator')!
          .getBoundingClientRect()
        return Math.max(
          Math.abs(tab.left - indicator.left),
          Math.abs(tab.top - indicator.top),
          Math.abs(tab.width - indicator.width),
          Math.abs(tab.height - indicator.height),
        )
      }),
    )
    .toBeLessThan(2)
}

test('alinha o destaque com as duas abas no topo e no menu lateral', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterGames(page)
  const games = page.getByRole('tab', { name: /Jogos/ })
  const development = page.getByRole('tab', { name: /Desenvolvimento/ })

  await expect(page.getByRole('tab')).toHaveCount(2)
  await expectIndicatorAligned(page)
  await games.press('ArrowRight')
  await expect(development).toBeFocused()
  await expectIndicatorAligned(page)

  await page.evaluate(() => window.scrollTo(0, 600))
  await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
  await expectIndicatorAligned(page)
  await development.press('ArrowUp')
  await expect(games).toBeFocused()
  await expectIndicatorAligned(page)
})

test('abre o guia pelo banner e volta para Jogos preservando o histórico', async ({ page }) => {
  await enterGames(page)
  const shortcut = page.getByRole('link', { name: 'Guia de Riven' })
  await shortcut.click()
  await expect(page).toHaveURL(/\/riven$/)
  await expect(page.getByRole('heading', { name: 'Matchups da Riven Top', level: 1 })).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)

  await page.getByRole('button', { name: 'Habilidades', exact: true }).click()
  await expect(page).toHaveURL(/\/riven$/)
  await expect(page.getByRole('button', { name: 'Habilidades', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await expect(page.getByRole('region', { name: 'Habilidades da Riven' })).toBeFocused()
  await page.reload()
  await expect(page).toHaveURL(/\/riven$/)
  await expect(page.getByRole('navigation', { name: 'Guia da Riven' })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao perfil' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(shortcut).toBeFocused()

  await page.goForward()
  await expect(page.getByRole('region', { name: 'Habilidades da Riven' })).toBeVisible()
  await page.goBack()
  await expect(shortcut).toBeFocused()
})

test('esconde o header ao descer e revela ao subir', async ({ page }) => {
  await page.goto('/riven')
  const nav = page.getByRole('navigation', { name: 'Guia da Riven' })
  await expect(page.getByRole('heading', { name: 'Matchups da Riven Top', level: 1 })).toBeVisible()
  await page.locator('.riven-page').evaluate((element) => {
    element.scrollTop = 500
  })
  await expect(nav).toHaveClass(/is-hidden/)
  await page.locator('.riven-page').evaluate((element) => {
    element.scrollTop = 400
  })
  await expect(nav).not.toHaveClass(/is-hidden/)
  await page.locator('.riven-page').evaluate((element) => {
    element.scrollTop = 0
  })
  await expect(nav).not.toHaveClass(/is-hidden/)
})
