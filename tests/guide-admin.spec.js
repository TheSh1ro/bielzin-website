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

async function setup(page, configure) {
  const state = { guide: structuredClone(seed), fail: false, saves: [] }
  configure?.(state.guide)
  await page.route('**/api/guide**', async (route) => {
    const pathname = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    if (pathname === '/guide/catalog') return route.fulfill({ json: gameCatalog })
    if (pathname === '/guide' && route.request().method() === 'GET')
      return route.fulfill({ json: state.guide })
    if (route.request().method() === 'PUT') {
      const data = route.request().postDataJSON()
      state.saves.push({ pathname, data })
      if (state.hold) await state.hold
      if (state.fail)
        return route.fulfill({
          status: 422,
          json: { detail: 'Falha de validação' },
        })
      if (pathname.endsWith('/defaults')) state.guide.defaults = data
      else state.guide.matchups[pathname.split('/').pop()] = data
      return route.fulfill({ json: data })
    }
    return route.fulfill({ status: 404 })
  })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Padrões do guia', exact: true })).toBeVisible()
  return state
}

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
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.saves.at(-1).data.build.start).toEqual([1055, 2003])
  expect(state.saves.at(-1).data.visible).toBe(false)
  expect(state.saves.at(-1).data.runes).toBeNull()
  await page.reload()
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
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
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.saves.at(-1).data.build).toBeNull()
  expect(state.saves.at(-1).data.runes).toBeNull()
})

test('preserva formulário em erro e avisa ao sair com alterações', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  state.fail = true
  await page.getByLabel('Dica 1', { exact: true }).fill('Não perder este texto')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Falha de validação')
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Não perder este texto')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Renekton', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ahri', exact: true })).toBeVisible()
  state.fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  await page.getByRole('button', { name: 'Novo campeão', exact: true }).click()
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
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
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
  await page.getByRole('button', { name: 'Incluídos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Novo campeão', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Novo campeão', exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Mover para baixo: Ordem de compra 1', exact: true })
    .click()
  await page.getByRole('button', { name: 'Trocar: Lâmina de Doran', exact: true }).click()
  await page.getByRole('button', { name: 'Fechar seleção de item', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
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
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.saves.at(-1).data.build.boots).toBe(3111)
})

test('salva ao trocar de campeão sem descartar a edição pendente', async ({ page }) => {
  const state = await setup(page)
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
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
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  await page.getByLabel('Dica 1', { exact: true }).fill('Primeira edição')
  await expect.poll(() => state.saves.length).toBe(1)
  await page.getByLabel('Dica 1', { exact: true }).fill('Edição mais recente')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText('Salvando')
  state.hold = undefined
  release()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.saves).toHaveLength(2)
  expect(state.guide.matchups.Ahri.tips[0]).toBe('Edição mais recente')
  await page.reload()
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Edição mais recente')
})

test('adiciona, reordena e remove dicas com salvamento automático', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  await page.getByLabel('Dica 1', { exact: true }).fill('Primeira dica')
  await page.getByRole('button', { name: 'Adicionar dica', exact: true }).click()
  await page.getByLabel('Dica 2', { exact: true }).fill('Segunda dica')
  await page.getByRole('button', { name: 'Mover dica 2 para cima', exact: true }).click()
  await expect(page.getByLabel('Dica 1', { exact: true })).toHaveValue('Segunda dica')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.guide.matchups.Ahri.tips).toEqual(['Segunda dica', 'Primeira dica'])
  await page.reload()
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  await expect(page.getByLabel('Dica 2', { exact: true })).toHaveValue('Primeira dica')
  await page.getByRole('button', { name: 'Remover dica 1', exact: true }).click()
  await page.getByRole('button', { name: 'Remover dica 1', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
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
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.guide.defaults.itemization.routes[0].items).toEqual([2517, 6333, 6610])
  await page.reload()
  await page.locator('summary').filter({ hasText: 'Rota base' }).click()
  await expect(page.getByLabel('Explicação da build', { exact: true })).toHaveValue(
    'Sinergia editada',
  )
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await page.getByLabel('Rota indicada para a lane').selectOption('base')
  await expect(page.getByLabel('Explicação para esta lane')).toHaveCount(0)
  await page.getByRole('button', { name: 'Adicionar componente da lane', exact: true }).click()
  await page.getByLabel('Buscar item').fill('Carrasco')
  await page.getByRole('button', { name: 'Chamado do Carrasco', exact: true }).click()
  await page.getByLabel('componente da lane 1 · Quando e por quê').fill('Antes do núcleo')
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
  expect(state.guide.matchups.Ahri.build).toBeNull()
  expect(state.guide.matchups.Ahri.lanePlan.components[0]).toEqual({
    item: 3123,
    condition: 'Antes do núcleo',
  })
  await page.reload()
  await page.getByRole('button', { name: 'Ahri', exact: true }).click()
  await page.getByRole('tab', { name: /^Itens/ }).click()
  await expect(page.getByLabel('componente da lane 1 · Quando e por quê')).toHaveValue(
    'Antes do núcleo',
  )
  await page.getByRole('button', { name: 'Remover componente da lane 1', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toContainText(
    'Salvo automaticamente',
  )
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
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Salvo automaticamente')
  expect(state.guide.matchups.Renekton).toMatchObject({
    build: null,
    runes,
    visible: true,
    early: 'unfavorable',
    tips: ['Guarde o E'],
    lanePlan: { reason: 'Plano preservado' },
  })
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Salvo automaticamente')
  expect(state.guide.matchups.Renekton.build).toEqual(build)
  await page.getByRole('tab', { name: /^Runas/ }).click()
  await page.getByRole('button', { name: 'Restaurar runas padrão' }).click()
  await page.getByRole('button', { name: 'Restaurar padrão', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Salvamento' })).toHaveText('Salvo automaticamente')
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
  await page.getByRole('button', { name: 'Editar builds compartilhadas' }).click()
  await expect(page.getByRole('heading', { name: 'Padrões do guia', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Builds', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('button', { name: 'Ocultos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Renekton', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ahri', exact: true })).toBeVisible()
})
