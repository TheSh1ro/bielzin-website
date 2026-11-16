import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const snapshot = JSON.parse(
  readFileSync(new URL('./fixtures/riven-guide.json', import.meta.url), 'utf8'),
)

for (const width of [1280, 390]) {
  test(`rotas, compras da lane e botas em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const data = structuredClone(snapshot)
    const defaultTitle = 'Axioma: pressão cedo e primeiro item barato'
    const route = (id: string, title: string, items: number[]) => ({
      id,
      title,
      items,
      when: `Quando usar ${title}`,
      reason: `Motivo de ${title}`,
      components: [],
      followup: `Continuação de ${title}`,
    })
    data.defaults.itemization = {
      intro: 'Primeiro a lane, depois o jogo.',
      defaultRoute: 'axioma',
      routes: [
        route('axioma', defaultTitle, [6696, 6333, 2517]),
        route('cutelo', 'Cutelo', [3071, 2517, 6333]),
        route('fome', 'Fome', [2517, 6333, 3156]),
        route('eclipse', 'Eclipse', [6692, 3071, 6333, 3156, 3026]),
      ],
      boots: [
        { item: 3158, condition: 'Aceleração com vantagem.' },
        { item: 3047, condition: 'Defesa contra ataques básicos.' },
        { item: 3111, condition: 'Contra controle.' },
      ],
      bootsNote: 'Reavalie os dragões.',
    }
    data.matchups.Renekton.lanePlan = null
    data.matchups.Jax = {
      ...data.matchups.Renekton,
      visible: true,
      lanePlan: { route: 'eclipse', reason: 'Trocas curtas contra Jax.', components: [] },
    }
    data.matchups.Teemo = {
      ...data.matchups.Renekton,
      visible: true,
      lanePlan: {
        route: null,
        reason: 'Componente sem fechar Malmortius.',
        components: [{ item: 3155, condition: 'Compre antes do primeiro item.' }],
      },
    }
    await page.route('**/realms/br.json', (route) => route.fulfill({ json: { v: '16.22.1' } }))
    await page.route('**/cdn/16.22.1/data/pt_BR/champion.json', (route) =>
      route.fulfill({
        json: {
          data: Object.fromEntries(
            ['Renekton', 'Jax', 'Teemo'].map((id) => [
              id,
              {
                id,
                key: ({ Renekton: '58', Jax: '24', Teemo: '17' } as Record<string, string>)[id],
                name: id,
                image: { full: id + '.png' },
              },
            ]),
          ),
        },
      }),
    )
    await page.route('**/cdn/16.22.1/data/pt_BR/champion/*.json', (route) =>
      route.fulfill({ json: { data: {} } }),
    )
    await page.route('**/cdn/16.22.1/data/pt_BR/item.json', (route) =>
      route.fulfill({
        json: {
          data: Object.fromEntries(
            [
              [6696, 'Axioma'],
              [3071, 'Cutelo'],
              [2517, 'Fome'],
              [6692, 'Eclipse'],
              [6333, 'Dança'],
              [3156, 'Malmortius'],
              [3026, 'Anjo'],
              [3155, 'Hexdrinker'],
              [3158, 'Ionianas'],
              [3047, 'Aço'],
              [3111, 'Mercúrio'],
            ].map(([id, name]) => [
              id,
              { name, image: { full: id + '.png' }, maps: { 11: true }, gold: { total: 3000 } },
            ]),
          ),
        },
      }),
    )
    await page.route('https://modelviewer.lol/embed?**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html><body>3D fixture</body></html>' }),
    )
    await page.route('**/rest/v1/rpc/get_riven_guide', (route) => route.fulfill({ json: data }))
    await page.goto('/riven')
    await page.getByRole('button', { name: 'Matchups', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Modelo 3D animado de Renekton' })).toBeVisible()
    await expect(page.locator('.champion-stage .local-model')).toHaveAttribute(
      'aria-busy',
      'false',
      {
        timeout: 20000,
      },
    )
    await expect(page.locator('.champion-stage select, .champion-stage button')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Runas', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Árvore primária', exact: true })).toBeVisible()
    await expect(page.locator('.rune-tree').first().locator('.rune-row')).toHaveCount(4)
    await expect(page.locator('.rune-tree').nth(1).locator('.rune-row')).toHaveCount(3)
    await page.getByRole('tab', { name: 'Itemização', exact: true }).click()
    const itemization = page.getByRole('tabpanel', { name: 'Itemização' })
    const routeHeading = itemization.getByRole('heading', { level: 2 })
    await expect(routeHeading).toHaveText([defaultTitle])
    await expect(itemization.getByText('Build recomendada', { exact: true })).toHaveCount(0)
    await expect(itemization.getByRole('list', { name: 'Início', exact: true })).toBeVisible()
    const cutelo = page
      .locator('.alternative-build')
      .filter({ has: page.locator('.alternative-title > span').filter({ hasText: /^Cutelo$/ }) })
    await cutelo.locator('summary').first().click()
    await expect(
      cutelo.getByRole('list', { name: 'Sequência da rota' }).getByRole('listitem'),
    ).toHaveText(['1Cutelo', '2Fome', '3Dança'])
    await expect(page.getByText('Motivo de Cutelo', { exact: true })).toBeHidden()
    await cutelo.getByText('Explicação da build', { exact: true }).click()
    await expect(page.getByText('Motivo de Cutelo', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Oponente Renekton' }).click()
    await page.evaluate(() => {
      const stage = document.querySelector('.champion-stage')!
      const heights: number[] = []
      const observer = new ResizeObserver(() => heights.push(stage.getBoundingClientRect().height))
      observer.observe(stage)
      Object.assign(window, { modelSwitch: { heights, observer } })
    })
    await page.getByRole('button', { name: 'Jax', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Modelo 3D animado de Jax' })).toBeVisible()
    await expect(page.locator('.champion-stage .local-model')).toHaveAttribute(
      'aria-busy',
      'false',
      {
        timeout: 20000,
      },
    )
    const heights = await page.evaluate(() => {
      const state = (
        window as unknown as { modelSwitch: { heights: number[]; observer: ResizeObserver } }
      ).modelSwitch
      state.observer.disconnect()
      return state.heights
    })
    expect(heights.length).toBeGreaterThan(0)
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1)
    await expect(page.locator('.champion-stage iframe')).toHaveCount(0)
    await expect(page.locator('.champion-stage canvas')).toHaveCount(1)
    await expect(routeHeading).toHaveText(['Eclipse'])
    await expect(itemization.getByText('Quando usar Eclipse', { exact: true })).toBeVisible()
    const fome = page
      .locator('.alternative-build')
      .filter({ has: page.locator('.alternative-title > span').filter({ hasText: /^Fome$/ }) })
    await fome.locator('summary').first().click()
    await expect(fome.getByRole('list', { name: 'Sequência da rota' })).toContainText('Malmortius')
    await page.getByRole('button', { name: 'Oponente Jax' }).click()
    await page.getByRole('button', { name: 'Teemo', exact: true }).click()
    await expect(routeHeading).toHaveText([defaultTitle])
    await expect(page.getByRole('region', { name: 'Compras antecipadas' })).toContainText(
      'Hexdrinker',
    )
    await expect(page.getByText('Defesa contra ataques básicos.', { exact: true })).toBeVisible()
    const overviewTrigger = page.getByRole('button', { name: 'Ver todas as matchups' })
    await overviewTrigger.click()
    const overview = page.getByRole('dialog', { name: 'Todas as matchups' })
    const matchups = overview.getByRole('list', { name: 'Matchups', exact: true })
    await expect(matchups.getByRole('button')).toHaveText(['Jax', 'Renekton', 'Teemo'])
    await expect(overview.locator('canvas, iframe')).toHaveCount(0)
    const jax = matchups
      .locator(':scope > li')
      .filter({ has: page.getByRole('button', { name: 'Jax', exact: true }) })
    await expect(
      jax.getByRole('list', { name: 'Itens da build' }).getByRole('img').first(),
    ).toHaveAccessibleName('Eclipse')
    await expect(jax.getByRole('list', { name: 'Primárias' }).getByRole('img')).toHaveCount(4)
    await expect(jax.getByRole('list', { name: 'Secundárias' }).getByRole('img')).toHaveCount(2)
    await expect(jax.getByRole('list', { name: 'Fragmentos' }).getByRole('img')).toHaveCount(3)
    await expect(overview.getByRole('img', { name: /Ionianas|Hexdrinker/ })).toHaveCount(0)
    const search = overview.getByRole('searchbox')
    await search.fill('sem resultado')
    await expect(overview.getByRole('status')).toHaveText('Nenhum campeão encontrado.')
    await search.press('Escape')
    await expect(overview).toBeHidden()
    await expect(overviewTrigger).toBeFocused()
    await overviewTrigger.click()
    await search.fill('jax')
    await expect(matchups.getByRole('button')).toHaveText(['Jax'])
    await overview.getByRole('button', { name: 'Jax' }).click()
    await expect(overview).toBeHidden()
    await expect(page.getByRole('button', { name: 'Oponente Jax' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}
