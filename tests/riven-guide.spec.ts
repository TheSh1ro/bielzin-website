import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const snapshot = JSON.parse(
  readFileSync(new URL('./fixtures/riven-guide.json', import.meta.url), 'utf8'),
)

test('lê builds e avaliações do backend, distingue pendências e mostra situacionais indisponíveis', async ({
  page,
}) => {
  const data = structuredClone(snapshot)
  delete data.defaults.itemization
  data.defaults.build.start = [1055, 2003]
  data.defaults.build.situational = [
    { item: 3123, condition: 'Quando precisar reduzir cura.' },
    { item: 999999, condition: 'Revisar no próximo patch.' },
  ]
  Object.assign(data.matchups.Renekton, {
    build: null,
    early: null,
    late: 'even',
    tips: ['Texto vindo do banco.\nSegunda linha.', 'Outra dica independente.', '  '],
  })
  await page.route('**/rest/v1/rpc/get_riven_guide', (route) => route.fulfill({ json: data }))
  await page.route('**/realms/br.json', (route) => route.fulfill({ json: { v: '16.22.1' } }))
  const champion = {
    id: 'Renekton',
    name: 'Renekton',
    title: 'o Carniceiro',
    image: { full: 'Renekton.png' },
  }
  await page.route('**/cdn/16.22.1/data/pt_BR/champion.json', (route) =>
    route.fulfill({ json: { data: { Renekton: champion } } }),
  )
  await page.route('**/cdn/16.22.1/data/pt_BR/champion/*.json', (route) =>
    route.fulfill({ json: { data: {} } }),
  )
  await page.route('**/cdn/16.22.1/data/pt_BR/item.json', (route) =>
    route.fulfill({
      json: {
        data: Object.fromEntries(
          [
            [1055, 'Lâmina de Doran'],
            [2003, 'Poção de Vida'],
            [3123, 'Chamado do Carrasco'],
          ].map(([id, name]) => [
            id,
            { name, image: { full: id + '.png' }, maps: { 11: true }, gold: { total: 100 } },
          ]),
        ),
      },
    }),
  )
  await page.goto('/riven')
  await page.getByRole('button', { name: 'Matchups', exact: true }).click()
  await expect(page.getByLabel('Como é a matchup para a Riven')).toContainText('A avaliar')
  await expect(page.getByLabel('Como é a matchup para a Riven')).toContainText('Equilibrado')
  await page.getByRole('tab', { name: 'Dicas', exact: true }).click()
  await expect(
    page.getByRole('list', { name: 'Dicas do matchup' }).getByRole('listitem'),
  ).toHaveText(['Texto vindo do banco.\nSegunda linha.', 'Outra dica independente.'])
  await page.getByRole('tab', { name: 'Itemização', exact: true }).click()
  await expect(page.locator('.riven-item-groups')).toContainText('Poção de Vida')
  await expect(page.locator('.riven-item-groups')).toContainText('Quando precisar reduzir cura.')
  await expect(page.locator('.riven-item-groups')).toContainText(
    'Item 999999 indisponível neste patch',
  )
  await expect(page.locator('.riven-item-groups')).toContainText('Revisar no próximo patch.')
  await page.getByRole('tab', { name: 'Runas', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Conquistador', exact: true })).toBeVisible()
})
