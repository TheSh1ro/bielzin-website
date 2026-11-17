import { test, expect } from '@playwright/test'
// Fixture independente das configurações editoriais salvas pelo usuário.
const build = {
  start: [1055],
  boots: 3158,
  core: [2517, 6610, 6333],
  situational: [],
  reason: 'Build de teste',
}
const runes = {
  primaryStyle: 8000,
  primary: [8010, 9111, 9105, 8299],
  secondaryStyle: 8300,
  secondary: [8321, 8316],
  shards: [5007, 5008, 5001],
}
const matchup = { visible: false, early: null, late: null, tips: [''], build: null, runes: null }
const seed = {
  defaults: { build, runes },
  matchups: { Renekton: { ...matchup, visible: true, build }, Ahri: { ...matchup } },
}
const image = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>'
const rune = (id, name) => ({ id, name, icon: image })
const gameCatalog = {
  version: 'test',
  champions: [
    { id: 'Renekton', name: 'Renekton', icon: image },
    { id: 'Ahri', name: 'Ahri', icon: image },
    { id: 'NewChampion', name: 'Novo campeão', icon: image },
  ],
  items: Object.fromEntries(
    [
      [1055, 'Lâmina de Doran'],
      [2003, 'Poção de Vida'],
      [3158, 'Botas Ionianas'],
      [3047, 'Botas de Aço'],
      [3111, 'Passos de Mercúrio'],
      [3173, 'Esmagadores Acorrentados'],
      [2517, 'Fome Eterna'],
      [6610, 'Céu Dividido'],
      [6333, 'Dança da Morte'],
      [3123, 'Chamado do Carrasco'],
    ].map(([id, name]) => [
      id,
      {
        name,
        icon: image,
        ...([3158, 3047, 3111, 3173].includes(id)
          ? { tags: ['Boots'], bootTier: id === 3173 ? 'upgraded' : 'standard' }
          : { tags: [] }),
      },
    ]),
  ),
  styles: [
    {
      id: 8000,
      name: 'Precisão',
      icon: image,
      slots: [
        [
          rune(8005, 'Pressione o Ataque'),
          rune(8008, 'Ritmo Fatal'),
          rune(8021, 'Agilidade nos Pés'),
          rune(8010, 'Conquistador'),
        ],
        [rune(9111, 'Triunfo')],
        [rune(9105, 'Aceleração')],
        [rune(8299, 'Até a Morte')],
      ],
    },
    {
      id: 8300,
      name: 'Inspiração',
      icon: image,
      slots: [
        [rune(8351, 'Aprimoramento')],
        [rune(8321, 'Reembolso')],
        [rune(8345, 'Biscoitos')],
        [rune(8316, 'Quebra-galho')],
      ],
    },
  ],
  shardSlots: [
    [5008, 5005, 5007],
    [5008, 5010, 5001],
    [5011, 5013, 5001],
  ],
  shards: Object.fromEntries(
    [5008, 5005, 5007, 5010, 5001, 5011, 5013].map((id) => [id, rune(id, 'Fragmento ' + id)]),
  ),
}

async function setup(page, configure, role = 'admin') {
  const state = {
    guide: structuredClone(seed),
    revisions: {},
    fail: false,
    conflict: false,
    saves: [],
  }
  configure?.(state.guide)
  const user = { id: 'test-editor', aud: 'authenticated', email: 'editor@exemplo.test' }
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url'),
    'test-signature',
  ].join('.')
  await page.route('**/auth/v1/user', (route) => route.fulfill({ json: user }))
  await page.route('**/api/admin-login', (route) =>
    route.fulfill({
      json: {
        access_token: token,
        refresh_token: 'test-refresh-token',
      },
    }),
  )
  await page.route('**/functions/v1/guide-admin**', async (route) => {
    const pathname = new URL(route.request().url()).pathname.replace(
      '/functions/v1/guide-admin',
      '/guide',
    )
    if (pathname === '/guide/catalog') return route.fulfill({ json: gameCatalog })
    if (pathname === '/guide' && route.request().method() === 'GET')
      return route.fulfill({
        json: {
          ...state.guide,
          role: role === 'legacy' ? undefined : role,
          catalog: gameCatalog,
          revisions: state.revisions,
        },
      })
    if (route.request().method() === 'PUT') {
      const { data, revision } = route.request().postDataJSON()
      state.saves.push({ pathname, data })
      if (state.hold) await state.hold
      if (state.fail)
        return route.fulfill({
          status: 422,
          json: { message: 'Falha de validação' },
        })
      const entry = pathname.split('/').pop()
      if (state.conflict || revision !== (state.revisions[entry] ?? null))
        return route.fulfill({ status: 409, json: { message: 'O guia mudou em outra aba.' } })
      if (entry === 'defaults') state.guide.defaults = data
      else state.guide.matchups[entry] = data
      state.revisions[entry] = String(state.saves.length)
      return route.fulfill({ json: { data, revision: state.revisions[entry] } })
    }
    return route.fulfill({ status: 404 })
  })
  await page.goto('/admin')
  await page.getByLabel('E-mail').fill('editor@exemplo.test')
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const heading = role === 'editor' ? 'Matchups' : 'Padrões do guia'
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  if (role !== 'editor')
    await expect(page.getByRole('tablist', { name: 'Conteúdo para editar' })).toBeVisible()
  return state
}

async function openHiddenMatchup(page, name) {
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await page.getByRole('button', { name, exact: true }).click()
}

test('mostra os atalhos de administração com a resposta antiga do guia', async ({ page }) => {
  await setup(page, undefined, 'legacy')
  const matchups = page.getByRole('navigation', { name: 'Matchups', exact: true })
  const defaults = page.getByRole('button', { name: 'Padrões do guia' })
  const search = page.getByRole('searchbox', { name: 'Buscar campeão' })
  await expect(defaults).toBeVisible()
  await expect(search).toBeVisible()
  expect((await defaults.boundingBox()).y).toBeLessThan((await search.boundingBox()).y)
  const nav = page.getByRole('navigation', { name: 'Seções do painel' })
  const trigger = nav.getByRole('button', { name: /Trocar seção.*Matchups/ })
  const visits = nav.getByRole('link', { name: 'Visitas' })
  const listBefore = await matchups.boundingBox()
  await expect(visits).toBeHidden()
  await trigger.click()
  await expect(visits).toBeVisible()
  expect(await matchups.boundingBox()).toEqual(listBefore)
  await visits.focus()
  await page.keyboard.press('Escape')
  await expect(visits).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.getByRole('heading', { name: 'Padrões do guia', exact: true }).click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Atualizar dados do jogo' }).click()
  await expect(page.getByText('Dados do jogo atualizados.', { exact: true })).toBeVisible()
})

test('sincroniza padrões e matchups com a URL e o histórico', async ({ page }) => {
  await setup(page)
  await expect(page).toHaveURL(/\/admin\?aba=matchups&matchup=Default$/)

  await page.goto('/admin?aba=matchups')
  await expect(page).toHaveURL(/\/admin\?aba=matchups$/)
  await expect(page.getByRole('heading', { name: 'Matchups', exact: true })).toBeVisible()

  await openHiddenMatchup(page, 'Ahri')
  await expect(page).toHaveURL(/\/admin\?aba=matchups&matchup=Ahri$/)
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\?aba=matchups&matchup=Renekton$/)

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Ahri', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Renekton', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Renekton', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Padrões do guia' }).click()
  await expect(page).toHaveURL(/\/admin\?aba=matchups&matchup=Default$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Padrões do guia', exact: true })).toBeVisible()
})

test('editor salva um matchup e cadastra uma conta privada pelo menu do painel', async ({
  page,
}) => {
  const id = '329ff7f8-2dbd-41db-9025-567499e51acf'
  const account = { id, riotId: 'Teste#BR1', ownership: 'owner', profile: null, lastError: null }
  let items = []
  await page.route('**/functions/v1/lol-vault', (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({
        riotId: account.riotId,
        ownership: 'owner',
        login: 'login-demo',
        password: 'senha-demo',
      })
      items = [account]
      return route.fulfill({ status: 201, json: { id } })
    }
    return route.fulfill({ json: { items } })
  })
  const state = await setup(page, undefined, 'editor')
  const nav = page.getByRole('navigation', { name: 'Seções do painel' })
  await nav.getByRole('button', { name: /Trocar seção/ }).click()
  await expect(nav.getByRole('link', { name: 'Visitas' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Auditoria' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Padrões do guia' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: /Minhas contas/ })).toBeVisible()
  await openHiddenMatchup(page, 'Ahri')
  await expect(page.getByRole('button', { name: 'Atualizar dados do jogo' })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Mostrar este campeão na lista pública' }).click()
  await expect
    .poll(() => state.saves.map((entry) => entry.pathname))
    .toEqual(['/guide/matchups/Ahri'])

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Menu do painel' }).click()
  await nav.getByRole('button', { name: /Trocar seção/ }).click()
  await nav.getByRole('link', { name: 'Minhas contas' }).click()
  await expect(page).toHaveURL(/\/admin\?aba=contas$/)
  await expect(page.getByRole('heading', { name: 'Minhas contas' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar conta' }).click()
  await page.getByLabel('Riot ID').fill(account.riotId)
  await page.getByLabel('Login', { exact: true }).fill('login-demo')
  await page.getByLabel('Senha', { exact: true }).fill('senha-demo')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByRole('button', { name: /Teste#BR1/ })).toBeVisible()
  await expect(page.getByText('senha-demo')).toHaveCount(0)

  await page.goto('/admin?aba=visitas')
  await expect(page.getByRole('alert')).toHaveText('Visitas são restritas à administração.')
  await page.goto('/admin?aba=matchups&matchup=Default')
  await expect(page).toHaveURL(/\/admin\?aba=matchups$/)
  await expect(page.getByRole('heading', { name: 'Matchups', exact: true })).toBeVisible()
})

test('preserva o rascunho quando outra sessão salva o mesmo matchup', async ({ page }) => {
  const state = await setup(page)
  await openHiddenMatchup(page, 'Ahri')
  state.conflict = true
  await page.getByLabel('Dica 1', { exact: true }).fill('Meu rascunho')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText(
    'O guia mudou em outra aba.',
  )
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Meu rascunho')
  expect(state.guide.matchups.Ahri.tips).toEqual([''])

  const dialog = page.waitForEvent('dialog').then((prompt) => prompt.dismiss())
  await Promise.all([dialog, page.goBack()])
  await expect(page).toHaveURL(/\/admin\?aba=matchups&matchup=Ahri$/)
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Meu rascunho')

  state.conflict = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Alterações salvas')
  await page.goBack()
  await expect(page).toHaveURL(/\/admin\?aba=matchups&matchup=Default$/)
})

test('edita, salva, recarrega e restaura herança independente', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Confronto' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    page.getByRole('region', { name: 'Dificuldade da matchup', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Mostrar este campeão na lista pública')).toBeChecked()
  await page.getByLabel('Mostrar este campeão na lista pública').uncheck()
  await page.getByLabel('Early game', { exact: true }).selectOption('even')
  await page.getByLabel('Dica 1', { exact: true }).fill('Dica atualizada')
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await page.getByRole('button', { name: 'Adicionar itens iniciais', exact: true }).click()
  await page.getByLabel('Buscar item').fill('Poção')
  await page.getByRole('button', { name: 'Poção de Vida', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar situacional', exact: true }).click()
  await page.getByLabel('Buscar item').fill('Carrasco')
  await page.getByRole('button', { name: 'Chamado do Carrasco', exact: true }).click()
  await page.getByLabel('Quando usar').fill('Contra cura')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.saves.at(-1).data.build.start).toEqual([1055, 2003])
  expect(state.saves.at(-1).data.visible).toBe(false)
  expect(state.saves.at(-1).data.runes).toBeNull()
  await page.reload()
  await expect(page.getByLabel('Mostrar este campeão na lista pública')).not.toBeChecked()
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Dica atualizada')
  await expect(page.getByLabel('Early game', { exact: true })).toHaveValue('even')
  await page.getByRole('tab', { name: /^Runas/ }).click()
  await page
    .getByRole('region', { name: 'Runas', exact: true })
    .getByRole('button', { name: 'Personalizar runas', exact: true })
    .click()
  const runes = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Runas', exact: true }) })
  await runes.getByRole('button', { name: 'Restaurar runas padrão', exact: true }).click()
  await page.getByRole('button', { name: 'Restaurar padrão', exact: true }).click()
  await page.getByRole('tab', { name: /^Itens/ }).click()
  const items = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Itens', exact: true }) })
  await items.getByRole('button', { name: 'Restaurar itens padrão', exact: true }).click()
  await page.getByRole('button', { name: 'Restaurar padrão', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.saves.at(-1).data.build).toBeNull()
  expect(state.saves.at(-1).data.runes).toBeNull()
})

test('preserva formulário em erro e avisa ao sair com alterações', async ({ page }) => {
  const state = await setup(page)
  await openHiddenMatchup(page, 'Ahri')
  state.fail = true
  await page.getByLabel('Dica 1', { exact: true }).fill('Não perder este texto')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Falha de validação')
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Não perder este texto')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ahri', exact: true })).toBeVisible()
  state.fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  await openHiddenMatchup(page, 'Novo campeão')
  await expect(page.getByLabel('Early game', { exact: true }).locator('option:checked')).toHaveText(
    'A avaliar',
  )
  await expect(page.getByLabel('Late game', { exact: true }).locator('option:checked')).toHaveText(
    'A avaliar',
  )
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await expect(page.getByRole('button', { name: 'Personalizar itens', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: /^Runas/ }).click()
  await expect(page.getByRole('button', { name: 'Personalizar runas', exact: true })).toBeVisible()
})

test('seleciona runas por ícone, mantém combinações válidas e cabe no celular', async ({
  page,
}) => {
  const state = await setup(page)
  await page.getByRole('tab', { name: 'Runas', exact: true }).click()
  await page
    .getByRole('group', { name: 'Árvore primária', exact: true })
    .getByRole('button', { name: 'Inspiração', exact: true })
    .click()
  await expect(
    page
      .getByRole('group', { name: 'Árvore secundária', exact: true })
      .getByRole('button', { name: 'Precisão', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page
      .getByRole('group', { name: 'Árvore secundária', exact: true })
      .getByRole('button', { name: 'Inspiração', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Até a Morte', exact: true }).click()
  await page
    .getByRole('group', { name: 'Fragmento 1', exact: true })
    .getByRole('button', { name: 'Fragmento 5005', exact: true })
    .click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.saves.at(-1).data.runes.secondary).toEqual([9105, 8299])
  expect(state.saves.at(-1).data.runes.shards[0]).toBe(5005)
  await page.setViewportSize({ width: 1500, height: 900 })
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Runas', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await page.getByRole('button', { name: 'Adicionar itens iniciais', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByLabel('Buscar item').fill('não existe')
  await expect(page.getByText('Nenhum item encontrado. Tente outro nome.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('filtra visibilidade, reordena itens e fecha o seletor sem alterar a build', async ({
  page,
}) => {
  const state = await setup(page)
  await expect(page.getByRole('button', { name: 'Incluídos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Novo campeão', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Novo campeão', exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Mover para baixo: Ordem de compra 1', exact: true })
    .click()
  await page.getByRole('button', { name: 'Trocar: Lâmina de Doran', exact: true }).click()
  await page.getByRole('button', { name: 'Fechar seleção de item', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.saves.at(-1).data.build.core).toEqual([6610, 2517, 6333])
  expect(state.saves.at(-1).data.build.start).toEqual([1055])
})

test('seletor de botas inclui convencionais sem botas no nome e separa aprimoradas', async ({
  page,
}) => {
  const state = await setup(page)
  await page.getByRole('button', { name: 'Trocar: Botas Ionianas', exact: true }).click()
  const shop = page.getByRole('dialog', { name: 'Selecionar botas' })
  await expect(shop.getByRole('heading', { name: 'Convencionais', exact: true })).toBeVisible()
  await expect(shop.getByRole('heading', { name: 'Aprimoradas', exact: true })).toBeVisible()
  await expect(shop.getByRole('button', { name: 'Lâmina de Doran', exact: true })).toHaveCount(0)
  await page.getByLabel('Buscar item').fill('botas')
  await expect(shop.getByRole('button', { name: 'Passos de Mercúrio', exact: true })).toBeVisible()
  await shop.getByRole('button', { name: 'Passos de Mercúrio', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.saves.at(-1).data.build.boots).toBe(3111)
})

test('salva ao trocar de campeão sem descartar a edição pendente', async ({ page }) => {
  const state = await setup(page)
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0)
  await openHiddenMatchup(page, 'Ahri')
  await page.getByLabel('Dica 1', { exact: true }).fill('Salva ao navegar')
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Renekton', exact: true })).toBeVisible()
  expect(state.guide.matchups.Ahri.tips[0]).toBe('Salva ao navegar')
})
test('serializa edições durante uma gravação e persiste o texto mais recente', async ({ page }) => {
  const state = await setup(page)
  let release
  state.hold = new Promise((resolve) => {
    release = resolve
  })
  await openHiddenMatchup(page, 'Ahri')
  await page.getByLabel('Dica 1', { exact: true }).fill('Primeira edição')
  await expect.poll(() => state.saves.length).toBe(1)
  await page.getByLabel('Dica 1', { exact: true }).fill('Edição mais recente')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Salvando')
  state.hold = undefined
  release()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.saves).toHaveLength(2)
  expect(state.guide.matchups.Ahri.tips[0]).toBe('Edição mais recente')
  await page.reload()
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Edição mais recente')
})

test('adiciona, reordena e remove dicas com salvamento automático', async ({ page }) => {
  const state = await setup(page)
  await openHiddenMatchup(page, 'Ahri')
  await page.getByLabel('Dica 1', { exact: true }).fill('Primeira dica')
  await page.getByRole('button', { name: 'Adicionar dica', exact: true }).click()
  await page.getByLabel('Dica 2', { exact: true }).fill('Segunda dica')
  await page.getByRole('button', { name: 'Mover dica 2 para cima', exact: true }).click()
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Segunda dica')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.guide.matchups.Ahri.tips).toEqual(['Segunda dica', 'Primeira dica'])
  await page.reload()
  await expect(page.getByLabel('Dica 2', { exact: true })).toHaveValue('Primeira dica')
  await page.getByRole('button', { name: 'Remover dica 1', exact: true }).click()
  await page.getByRole('button', { name: 'Remover dica 1', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.guide.matchups.Ahri.tips).toEqual([])
  await expect(page.getByText('Nenhuma dica adicionada.')).toBeVisible()
})

test('edita builds compartilhadas e compras antecipadas com persistência', async ({ page }) => {
  const state = await setup(page, (guide) => {
    guide.defaults.itemization = {
      intro: 'Introdução',
      defaultRoute: 'base',
      boots: [{ item: 3158, condition: 'Com vantagem' }],
      bootsNote: 'Critérios',
      routes: [
        {
          id: 'base',
          title: 'Rota base',
          when: 'Lane estável',
          reason: 'Motivo',
          items: [2517, 6333],
          components: [],
          followup: 'Continue pelo jogo',
        },
      ],
    }
  })
  await page.locator('summary').filter({ hasText: 'Rota base' }).click()
  await page.getByLabel('Explicação da build', { exact: true }).fill('Sinergia editada')
  await page.getByRole('tab', { name: 'Botas', exact: true }).click()
  await page.getByLabel('Quando fazer cada bota').fill('Critério atualizado de botas')
  await page.getByRole('tab', { name: 'Builds', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar item da rota 1', exact: true }).click()
  await page.getByLabel('Buscar item').fill('Céu')
  await page.getByRole('button', { name: 'Céu Dividido', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.guide.defaults.itemization.routes[0].items).toEqual([2517, 6333, 6610])
  await page.reload()
  await page.locator('summary').filter({ hasText: 'Rota base' }).click()
  await expect(page.getByLabel('Explicação da build', { exact: true })).toHaveValue(
    'Sinergia editada',
  )
  await openHiddenMatchup(page, 'Ahri')
  await page.getByRole('tab', { name: /^Itens/ }).click()
  const routePicker = page.getByRole('group', { name: 'Rota indicada para a lane' })
  const routeOption = routePicker.getByRole('radio', { name: 'Rota base' })
  await expect(routePicker.getByRole('radio', { name: 'Usar padrão do guia' })).toBeChecked()
  await expect(routeOption.locator('..').locator('img')).toHaveAttribute('src', image)
  await routePicker.getByText('Rota base', { exact: true }).click()
  await expect(routeOption).toBeChecked()
  await expect(page.getByLabel('Explicação para esta lane')).toHaveCount(0)
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click()
  await page.getByLabel('Buscar item').fill('Carrasco')
  await page.getByRole('button', { name: 'Chamado do Carrasco', exact: true }).click()
  await page.getByLabel('item 1 · Quando e por quê').fill('Antes do núcleo')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.guide.matchups.Ahri.build).toBeNull()
  expect(state.guide.matchups.Ahri.lanePlan.route).toBe('base')
  expect(state.guide.matchups.Ahri.lanePlan.components[0]).toEqual({
    item: 3123,
    condition: 'Antes do núcleo',
  })
  await page.reload()
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await expect(routeOption).toBeChecked()
  await expect(page.getByLabel('item 1 · Quando e por quê')).toHaveValue('Antes do núcleo')
  await page.getByRole('button', { name: 'Remover item 1', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Alterações salvas')
  expect(state.guide.matchups.Ahri.lanePlan.components).toEqual([])
  expect(state.guide.defaults.itemization.routes[0].reason).toBe('Sinergia editada')
})

test('confirma resets por grupo, permite cancelar e desfazer sem perder o confronto', async ({
  page,
}) => {
  const state = await setup(page, (guide) => {
    guide.matchups.Renekton = {
      ...guide.matchups.Renekton,
      early: 'unfavorable',
      tips: ['Guarde o E'],
      runes: structuredClone(runes),
      lanePlan: { route: null, reason: 'Plano preservado', components: [] },
    }
  })
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await page.getByRole('button', { name: 'Restaurar itens padrão' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText(
    'Compras antecipadas, runas, dicas, dificuldade e visibilidade são mantidos.',
  )
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(state.saves).toHaveLength(0)
  await expect(page.getByRole('button', { name: 'Restaurar itens padrão' })).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar itens padrão' }).click()
  await page.getByRole('button', { name: 'Restaurar padrão', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Alterações salvas')
  expect(state.guide.matchups.Renekton).toMatchObject({
    build: null,
    runes,
    visible: true,
    early: 'unfavorable',
    tips: ['Guarde o E'],
    lanePlan: { reason: 'Plano preservado' },
  })
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Alterações salvas')
  expect(state.guide.matchups.Renekton.build).toEqual(build)
  await page.getByRole('tab', { name: /^Runas/ }).click()
  await page.getByRole('button', { name: 'Restaurar runas padrão' }).click()
  await page.getByRole('button', { name: 'Restaurar padrão', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Alterações salvas')
  expect(state.guide.matchups.Renekton.build).toEqual(build)
  expect(state.guide.matchups.Renekton.runes).toBeNull()
  await page.reload()
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await page.getByRole('tab', { name: /^Runas/ }).click()
  await expect(page.getByRole('button', { name: 'Personalizar runas' })).toBeVisible()
})

test('separa padrões por assunto, navega com teclado e protege builds em uso', async ({ page }) => {
  const state = await setup(page, (guide) => {
    guide.defaults.itemization = {
      intro: 'Texto antigo preservado nos dados',
      defaultRoute: 'base',
      boots: [],
      bootsNote: 'Botas',
      routes: ['base', 'alternativa'].map((id) => ({
        id,
        title: id,
        when: '',
        reason: '',
        items: [2517],
        components: [],
        followup: '',
      })),
    }
    guide.matchups.Renekton.lanePlan = { route: 'alternativa', reason: 'Usada', components: [] }
  })
  await expect(page.getByLabel('Introdução da itemização')).toHaveCount(0)
  await page.locator('summary').filter({ hasText: 'alternativa' }).click()
  await expect(page.getByRole('button', { name: 'Remover rota', exact: true })).toBeDisabled()
  await expect(
    page.getByText('Compartilhada com todos os matchups. Indicada contra Renekton.'),
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Builds', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Botas', exact: true })).toBeFocused()
  await expect(page.getByLabel('Quando fazer cada bota')).toBeVisible()
  await page.getByLabel('Quando fazer cada bota').fill('Botas atualizadas')
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  expect(state.guide.defaults.itemization.intro).toBe('Texto antigo preservado nos dados')
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await page.getByRole('button', { name: 'Padrões do guia', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Padrões do guia', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Builds', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('button', { name: 'Ocultos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Renekton', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ahri', exact: true })).toBeVisible()
})

test('abre visitas no painel, mantém o editor e permite repetir a paginação', async ({ page }) => {
  const state = await setup(page)
  const visit = {
    id: 'c19273ec-aba8-4c8e-bb62-80b071e724ff',
    visitedAt: '2026-11-15T19:00:00Z',
    city: 'São Paulo',
    region: 'SP',
    userAgent: 'Mozilla/5.0 (teste)',
    activity: [
      { id: '1', at: '2026-11-15T19:00:00Z', kind: 'admin_login' },
      { id: '2', at: '2026-11-15T19:00:10Z', kind: 'admin_login_failed' },
      { id: '3', at: '2026-11-15T19:00:30Z', kind: 'admin_panel' },
    ],
  }
  let failedOnce = false
  await page.route('**/functions/v1/guide-admin/visits*', (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('before')
    if (cursor && !failedOnce) {
      failedOnce = true
      return route.fulfill({ status: 503, json: { message: 'Visitas indisponíveis no momento.' } })
    }
    return route.fulfill({
      json: cursor
        ? { items: [{ ...visit, id: 'older', city: null, region: null }], next: null }
        : { items: [visit], next: { before: visit.visitedAt, id: visit.id } },
    })
  })
  await openHiddenMatchup(page, 'Ahri')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toBeEmpty()
  await page.getByLabel('Dica 1', { exact: true }).fill('Edição antes de abrir visitas')
  const nav = page.getByRole('navigation', { name: 'Seções do painel' })
  const sectionTrigger = nav.getByRole('button', { name: /Trocar seção/ })
  await sectionTrigger.click()
  await nav.getByRole('link', { name: 'Visitas', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\?aba=visitas$/)
  await expect(sectionTrigger).toHaveAccessibleName(/Visitas/)
  await expect(sectionTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('heading', { name: 'Visitas', exact: true })).toBeVisible()
  await expect(page.getByText('São Paulo, SP', { exact: true })).toBeVisible()
  await expect(page.locator('time').first()).toContainText('16:00')
  await page.locator('summary').filter({ hasText: 'Credenciais recusadas' }).click()
  await expect(page.getByText('16:00:10', { exact: true })).toBeVisible()
  await expect(page.getByText('Mozilla/5.0 (teste)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Carregar mais' }).click()
  await expect(page.getByRole('alert')).toHaveText('Visitas indisponíveis no momento.')
  await expect(page.getByText('São Paulo, SP', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('Localização indisponível', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Ahri', exact: true })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Alterações salvas')
  expect(state.guide.matchups.Ahri.tips).toEqual(['Edição antes de abrir visitas'])
  await page.goForward()
  await expect(sectionTrigger).toHaveAccessibleName(/Visitas/)
  await page.reload()
  await expect(page.getByText('São Paulo, SP', { exact: true })).toBeVisible()
})

test('gera e copia o link, reenvia por e-mail e revoga cargos pelo painel', async ({ page }) => {
  await setup(page)
  const user = {
    id: 'new-user',
    email: 'colaborador@exemplo.test',
    role: 'editor',
    confirmed: false,
    invited: true,
    self: false,
  }
  const invitations = []
  const inviteUrl = 'https://bielzin.xyz/admin/convite#signup_token=convite-de-teste'
  const changes = []
  await page.route('**/functions/v1/guide-admin/users**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/invite') || path.endsWith('/signup-link')) {
      invitations.push(route.request().postDataJSON())
      return route.fulfill({ json: { id: user.id, inviteUrl } })
    }
    if (path.endsWith('/role')) {
      changes.push(route.request().postDataJSON())
      user.role = changes.at(-1).role
      return route.fulfill({ json: {} })
    }
    return route.fulfill({ json: { items: [user], next: null } })
  })
  let filter
  await page.route('**/functions/v1/guide-admin/audit?*', (route) => {
    filter = new URL(route.request().url()).searchParams.get('actor')
    return route.fulfill({
      json: {
        next: null,
        items: [
          {
            id: '1',
            at: '2026-11-17T18:00:00Z',
            actorEmail: user.email,
            action: 'matchup_saved',
            target: 'Ahri',
            changes: { tips: { before: ['Dica antiga'], after: ['Dica nova'] } },
          },
        ],
      },
    })
  })

  const sectionTrigger = page.getByRole('button', { name: /Trocar seção/ })
  await sectionTrigger.click()
  await page.getByRole('link', { name: 'Usuários' }).click()
  await page.getByRole('button', { name: 'Convidar usuário' }).click()
  await expect(page.getByLabel('E-mail do convite')).toBeHidden()
  await page.getByRole('button', { name: 'Gerar link' }).click()
  await expect(page.getByLabel('Link de cadastro')).toHaveValue(inviteUrl)
  expect(invitations[0]).toEqual({ role: 'editor' })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copiar link' }).click()
  await expect(page.getByText('Link copiado.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(inviteUrl)
  await page.getByRole('button', { name: 'Fechar convite' }).click()
  await page.getByRole('button', { name: 'Renovar convite' }).click()
  await page.getByRole('button', { name: 'Enviar por e-mail' }).click()
  await expect(page.getByText('Convite reenviado.')).toBeVisible()
  expect(invitations[1]).toMatchObject({ resend: true, delivery: 'email' })

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByLabel('Cargo de ' + user.email).selectOption('')
  await expect(page.getByText('Cargo atualizado.')).toBeVisible()
  expect(changes).toEqual([{ role: null }])
  await expect(page.getByRole('button', { name: 'Renovar convite' })).toHaveCount(0)

  await sectionTrigger.click()
  await page.getByRole('link', { name: 'Auditoria' }).click()
  await page.getByText('Autor e período', { exact: true }).click()
  await page.getByLabel('E-mail ou UUID').fill(user.email)
  await page.getByRole('button', { name: 'Filtrar' }).click()
  await expect(
    page.getByRole('list', { name: 'Eventos de auditoria' }).getByText('Editou matchup'),
  ).toBeVisible()
  await page.getByText('Ver alterações').click()
  await expect(page.getByText('Dica antiga')).toBeVisible()
  await expect(page.getByText('Dica nova')).toBeVisible()
  expect(filter).toBe(user.email)

  await page.setViewportSize({ width: 360, height: 800 })
  const start = await page.getByLabel('De', { exact: true }).boundingBox()
  const end = await page.getByLabel('Até', { exact: true }).boundingBox()
  expect(start?.y).toBe(end?.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test('solicita e-mail e senha no link de cadastro', async ({ page }) => {
  await page.route('**/functions/v1/panel-signup', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      token: 'cadastro-fixture',
      email: 'convidado@exemplo.test',
      password: 'senha-ficticia-segura',
    })
    return route.fulfill({ status: 201, json: {} })
  })
  await page.goto('/admin/convite#signup_token=cadastro-fixture')
  await expect(page).toHaveURL(/\/admin\/convite$/)
  await page.getByLabel('E-mail', { exact: true }).fill('convidado@exemplo.test')
  await page.getByLabel('Nova senha').fill('senha-ficticia-segura')
  await page.getByLabel('Confirmar senha').fill('senha-ficticia-segura')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Conta criada' })).toBeVisible()
})

test('solicita e salva a senha em um convite', async ({ page }) => {
  const user = { id: 'invite-user', aud: 'authenticated', email: 'colaborador@exemplo.test' }
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url'),
    'test-signature',
  ].join('.')
  await page.route('**/auth/v1/verify', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      token_hash: 'invite-fixture',
      type: 'invite',
    })
    return route.fulfill({
      json: { access_token: token, refresh_token: 'refresh', expires_in: 3600, user },
    })
  })
  await page.route('**/auth/v1/user', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ password: 'senha-ficticia-segura' })
    return route.fulfill({ json: user })
  })
  await page.route('**/auth/v1/logout?*', (route) => route.fulfill({ status: 204 }))
  await page.goto('/admin/convite#token_hash=invite-fixture')
  await expect(page).toHaveURL(/\/admin\/convite$/)
  await page.getByLabel('Nova senha').fill('senha-ficticia-segura')
  await page.getByLabel('Confirmar senha').fill('senha-ficticia-segura')
  await page.getByRole('button', { name: 'Salvar senha' }).click()
  await expect(page.getByRole('heading', { name: 'Senha definida' })).toBeVisible()
})
