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

  await page.getByRole('button', { name: 'Matchups', exact: true }).click()
  await expect(page).toHaveURL(/\/riven$/)
  await expect(page.getByRole('button', { name: 'Matchups', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await expect(page.getByRole('region', { name: 'Matchups da Riven Top' })).toBeFocused()
  await page.reload()
  await expect(page).toHaveURL(/\/riven$/)
  await expect(page.getByRole('navigation', { name: 'Guia da Riven' })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao perfil' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(shortcut).toBeFocused()

  await page.goForward()
  await expect(page.getByRole('region', { name: 'Matchups da Riven Top' })).toBeVisible()
  await page.goBack()
  await expect(shortcut).toBeFocused()
})

for (const width of [1280, 390]) {
  test(`navega por degraus e preserva a leitura do matchup em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/riven')
    const nav = page.getByRole('navigation', { name: 'Guia da Riven' })
    const matchupButton = nav.getByRole('button', { name: 'Matchups', exact: true })
    const featuredButton = nav.getByRole('button', { name: 'Em destaque', exact: true })
    const panels = page.locator('.riven-step')
    const root = page.locator('.riven-steps')
    await expect(page.getByRole('button', { name: 'Oponente Renekton' })).toBeVisible({
      timeout: 20000,
    })

    await matchupButton.click()
    await expect(matchupButton).toHaveAttribute('aria-current', 'location')
    await expect(page.getByRole('region', { name: 'Matchups da Riven Top' })).toBeFocused()
    await expect
      .poll(() => root.evaluate((element) => Math.abs(element.scrollTop - element.clientHeight)))
      .toBeLessThan(2)

    await panels.nth(1).evaluate((element) => {
      element.scrollTop = 350
    })
    await expect(nav).toBeInViewport()
    await expect(matchupButton).toHaveAttribute('aria-current', 'location')
    await featuredButton.click()
    await expect(featuredButton).toHaveAttribute('aria-current', 'location')
    await expect.poll(() => root.evaluate((element) => element.scrollTop)).toBe(0)
    await matchupButton.click()
    await expect.poll(() => panels.nth(1).evaluate((element) => element.scrollTop)).toBe(350)
    await expect(matchupButton).toHaveAttribute('aria-current', 'location')
    expect(
      await page
        .locator('.riven-page')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
  })

  test(`o scroll troca de degrau apenas no limite do conteúdo em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/riven')
    const panels = page.locator('.riven-step')
    const nav = page.getByRole('navigation', { name: 'Guia da Riven' })
    const featuredButton = nav.getByRole('button', { name: 'Em destaque', exact: true })
    const matchupButton = nav.getByRole('button', { name: 'Matchups', exact: true })
    await expect(page.getByText('Fome Eterna', { exact: true }).first()).toBeVisible()
    await panels.first().evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await page.mouse.move(width / 2, 450)
    await page.mouse.wheel(0, 700)
    await expect(matchupButton).toHaveAttribute('aria-current', 'location')
    await expect
      .poll(() =>
        page
          .locator('.riven-steps')
          .evaluate((element) => Math.abs(element.scrollTop - element.clientHeight)),
      )
      .toBeLessThan(2)
    await panels.nth(1).evaluate((element) => {
      element.scrollTop = 0
    })
    await page.mouse.wheel(0, -700)
    await expect(featuredButton).toHaveAttribute('aria-current', 'location')
  })
}

test('mantém o canvas no enquadramento e os controles fora da leitura de Quad HD a mobile', async ({
  page,
}) => {
  await page.goto('/riven')
  const art = page.locator('.riven-feature-art')
  await expect(art.locator('.local-model')).toHaveAttribute('aria-busy', 'false')

  for (const [width, height] of [
    [2560, 1440],
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [1024, 1366],
    [901, 900],
    [900, 900],
    [768, 1024],
    [430, 932],
    [390, 844],
    [360, 800],
    [320, 568],
    [844, 390],
  ] as const) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(() =>
        art.evaluate((element) => {
          const stage = element.getBoundingClientRect()
          const canvas = element.querySelector('canvas')!.getBoundingClientRect()
          return Math.max(
            Math.abs(stage.height - canvas.height),
            Math.abs(stage.width - canvas.width),
          )
        }),
      )
      .toBeLessThan(1)

    const layout = await page.locator('.riven').evaluate((element) => {
      const reading = element.querySelector('.riven-steps')!.getBoundingClientRect()
      const nav = element.querySelector('.riven-step-nav')!.getBoundingClientRect()
      const back = element.querySelector('.riven-return')!.getBoundingClientRect()
      return {
        clearance: Math.min(nav.top, back.top) - reading.bottom,
        controlsOverlap: back.right > nav.left,
      }
    })
    expect(
      layout.clearance,
      `${width}×${height}: controles sobre a leitura`,
    ).toBeGreaterThanOrEqual(8)
    expect(layout.controlsOverlap, `${width}×${height}: controles sobrepostos`).toBe(false)
    await expect
      .poll(
        () =>
          page
            .locator('.riven-feature, .riven-step, .riven-enemy-panel, .primary-tree')
            .evaluateAll((elements) =>
              elements
                .filter((el) => el.scrollWidth > el.clientWidth + 2)
                .map((el) => ({
                  class: el.className,
                  width: el.clientWidth,
                  content: el.scrollWidth,
                })),
            ),
        { message: `${width}×${height}: conteúdo excede a largura` },
      )
      .toEqual([])
  }
})
