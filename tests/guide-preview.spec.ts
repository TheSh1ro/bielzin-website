import { test, expect } from '@playwright/test'
import snapshot from '../src/data/riven-guide.json' with { type: 'json' }

test('atualiza a prévia local sem recarregar e preserva conteúdo se a API cair', async ({
  page,
}) => {
  const data = structuredClone(snapshot)
  await page.route('**/api/guide', (route) => route.fulfill({ json: data }))
  await page.route('**/realms/br.json', (route) => route.fulfill({ json: { v: '16.22.1' } }))
  await page.route('**/cdn/16.22.1/data/pt_BR/champion.json', (route) =>
    route.fulfill({
      json: {
        data: Object.fromEntries(
          ['Renekton', 'Aatrox'].map((id) => [
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
  const tips = page.getByRole('list', { name: 'Dicas do matchup' })
  await expect(tips).toContainText(data.matchups.Renekton.tips[0]!)
  data.matchups.Renekton.tips = ['Dica salva com a página aberta.']
  await expect(tips).toHaveText('Dica salva com a página aberta.')
  data.matchups.Renekton.visible = false
  data.matchups.Aatrox.tips = ['Outro campeão depois de ocultar o anterior.']
  await expect(page.getByRole('button', { name: 'Oponente Aatrox', exact: true })).toBeVisible()
  await expect(tips).toHaveText('Outro campeão depois de ocultar o anterior.')
  await page.route('**/api/guide', (route) => route.fulfill({ status: 503 }))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(tips).toHaveText('Outro campeão depois de ocultar o anterior.')
})
