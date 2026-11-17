import { expect, test } from '@playwright/test'

test('conta acessos diretos e deduplica entre páginas, abas e recargas no dia de Brasília', async ({
  browser,
  context,
  page,
}) => {
  const counted = new Set<string>()
  const ids: string[] = []
  let day = 11
  await context.route('**/rest/v1/rpc/get_visit_count', (route) =>
    route.fulfill({ json: counted.size }),
  )
  await context.route('**/api/visit', (route) => {
    const id = route.request().postDataJSON().id as string
    ids.push(id)
    counted.add(day + '/' + id)
    return route.fulfill({ json: counted.size })
  })
  const nextTab = await context.newPage()
  await Promise.all([page.goto('/'), nextTab.goto('/')])
  await expect.poll(() => ids.length).toBe(2)
  await Promise.all([
    page.getByRole('button', { name: 'Entrar no perfil' }).press('Enter'),
    nextTab.getByRole('button', { name: 'Entrar no perfil' }).click(),
  ])
  await expect(page.locator('.connections + .profile-visits')).toHaveText('1 visita')
  await expect(nextTab.locator('.profile-visits')).toHaveText('1 visita')
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(1)

  await page.reload()
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()
  await expect(page.locator('.profile-visits')).toHaveText('1 visita')
  await page.goto('/riven')
  await expect(page.getByRole('main', { name: 'Guia da Riven' })).toBeVisible()
  await expect.poll(() => ids.length).toBe(4)
  expect(counted.size).toBe(1)

  day = 12
  await page.reload()
  await expect.poll(() => counted.size).toBe(2)
  await page.getByRole('link', { name: 'Voltar ao perfil' }).click()
  await expect(page.locator('.profile-visits')).toHaveText('2 visitas')
  expect(ids).toHaveLength(5)
  expect(new Set(ids).size).toBe(1)

  const independent = await browser.newContext({ baseURL: new URL(nextTab.url()).origin })
  await independent.route('**/api/visit', (route) => {
    counted.add(day + '/' + (route.request().postDataJSON().id as string))
    return route.fulfill({ json: counted.size })
  })
  const newVisitor = await independent.newPage()
  await newVisitor.goto('/riven')
  await newVisitor.getByRole('link', { name: 'Voltar ao perfil' }).click()
  await expect(newVisitor.locator('.profile-visits')).toHaveText('3 visitas')
  await independent.close()
})

test('o perfil abre com o contador indisponível', async ({ page }) => {
  await page.route('**/api/visit', (route) => route.fulfill({ status: 503 }))
  await page.route('**/rest/v1/rpc/*visit*', (route) => route.fulfill({ status: 503 }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()
  await expect(page.getByRole('heading', { name: 'bielzin', exact: true })).toBeVisible()
  await expect(page.locator('.profile-visits')).toHaveCount(0)
})

test('envia os detalhes para um navegador que já foi contado pelo modelo anterior', async ({
  page,
}) => {
  const legacyId = 'fe4cac07-2de7-4147-b3c2-4de575e93e79'
  let submittedId
  await page.route('**/api/visit', (route) => {
    submittedId = route.request().postDataJSON().id
    return route.fulfill({ json: 1 })
  })
  await page.route('**/preparar-visitante', (route) =>
    route.fulfill({ contentType: 'text/html', body: '' }),
  )
  await page.goto('/preparar-visitante')
  await page.evaluate(
    (id) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('bielzin', 1)
        request.onupgradeneeded = () => request.result.createObjectStore('profile')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('profile', 'readwrite')
          tx.objectStore('profile').put({ id, counted: true, detailsRecorded: true }, 'visitor')
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    legacyId,
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()
  await expect(page.locator('.profile-visits')).toHaveText('1 visita')
  expect(submittedId).toBe(legacyId)
})
