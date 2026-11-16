import { test, expect } from '@playwright/test'
import snapshot from './fixtures/riven-guide.json' with { type: 'json' }

test('atualiza o guia ao voltar para a aba e preserva conteúdo se a API cair', async ({ page }) => {
  const data = structuredClone(snapshot)
  await page.route('**/rest/v1/rpc/get_riven_guide', (route) => route.fulfill({ json: data }))
  await page.route('**/realms/br.json', (route) => route.fulfill({ json: { v: '16.22.1' } }))
  await page.route('**/cdn/16.22.1/data/pt_BR/champion.json', (route) =>
    route.fulfill({
      json: {
        data: Object.fromEntries(
          ['Renekton', 'Darius', 'Aatrox'].map((id) => [
            id,
            {
              id,
              name: id,
              title: id,
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
    route.fulfill({ json: { data: {} } }),
  )
  await page.goto('/riven')
  await page.getByRole('button', { name: 'Matchups', exact: true }).click()
  await page.getByRole('button', { name: 'Oponente Renekton', exact: true }).click()
  const opponents = page.getByRole('list', { name: 'Campeões' }).getByRole('button')
  await expect(opponents).toHaveText(['Aatrox', 'Darius', 'Renekton'])
  const search = page.getByRole('searchbox', { name: 'Buscar campeão' })
  await search.fill('a')
  await expect(opponents).toHaveText(['Aatrox', 'Darius'])
  await search.press('Escape')
  await page.getByRole('tab', { name: 'Dicas', exact: true }).click()
  const tips = page.getByRole('list', { name: 'Dicas do matchup' })
  await expect(tips).toContainText(data.matchups.Renekton.tips[0]!)
  data.matchups.Renekton.tips = ['Dica salva com a página aberta.']
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(tips).toHaveText('Dica salva com a página aberta.')
  data.matchups.Renekton.visible = false
  data.matchups.Darius.visible = false
  data.matchups.Aatrox.tips = ['Outro campeão depois de ocultar o anterior.']
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('button', { name: 'Oponente Aatrox', exact: true })).toBeVisible()
  await expect(tips).toHaveText('Outro campeão depois de ocultar o anterior.')
  await page.route('**/rest/v1/rpc/get_riven_guide', (route) => route.fulfill({ status: 503 }))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(tips).toHaveText('Outro campeão depois de ocultar o anterior.')
})
