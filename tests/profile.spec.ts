import { expect, test } from '@playwright/test'

test('ajusta o volume na entrada e controla a trilha pelo topo do perfil', async ({ page }) => {
  await page.goto('/')

  const sound = page.getByRole('group', { name: 'Trilha do perfil' })
  const volume = sound.getByRole('slider', { name: 'Volume da trilha' })
  const audio = page.locator('audio')
  await volume.press('ArrowRight')
  await expect(volume).toHaveAttribute('aria-valuetext', '4%')
  await sound.getByRole('button', { name: 'Entrar sem trilha' }).click()
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()

  await expect(sound.getByRole('button', { name: 'Reproduzir trilha' })).toBeVisible()
  await expect(audio).toHaveJSProperty('paused', true)
  await expect(audio).toHaveJSProperty('volume', 0.04)
  await expect(page.getByRole('region', { name: 'Trilha do perfil' })).toHaveCount(0)

  await sound.getByRole('button', { name: 'Reproduzir trilha' }).click()
  await expect(audio).toHaveJSProperty('paused', false)
  await sound.getByRole('button', { name: 'Pausar trilha' }).click()
  await expect(audio).toHaveJSProperty('paused', true)
})

test('troca a faixa em rotação no mesmo player e mantém o volume', async ({ page }) => {
  await page.goto('/')
  const volume = page.getByRole('slider', { name: 'Volume da trilha' })
  await volume.press('ArrowRight')
  await page.getByRole('button', { name: 'Entrar no perfil' }).click()

  const rotation = page.getByRole('region', { name: 'Playlist' })
  await expect(rotation.getByRole('listitem')).toHaveCount(3)
  const audio = page.locator('audio')
  for (const [title, src, spotifyUrl] of [
    ['Awakening', 'awakening.mp3', 'https://open.spotify.com/track/03JFWSxq5pj3z1kkp9cXOQ'],
    [
      'Flicker In The Fog',
      'flicker-in-the-fog.mp3',
      'https://open.spotify.com/track/12ZA5C3oLso9sO94pdEIuH',
    ],
  ]) {
    await expect(rotation.getByRole('link', { name: `Abrir ${title} no Spotify` })).toHaveAttribute(
      'href',
      spotifyUrl,
    )
    await rotation.getByRole('button', { name: `Tocar ${title}` }).click()
    await expect(audio).toHaveAttribute('src', `/media/${src}`)
    await expect(audio).toHaveJSProperty('paused', false)
    await expect
      .poll(() => audio.evaluate((player) => (player as HTMLAudioElement).currentTime))
      .toBeGreaterThan(0)
    await expect(audio).toHaveJSProperty('volume', 0.04)
    await expect(rotation.getByRole('button', { name: `Pausar ${title}` })).toHaveAttribute(
      'aria-current',
      'true',
    )
  }
})

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

  const games = page.getByRole('tabpanel', { name: /Jogos/ })
  const league = games.getByRole('region', { name: 'League of Legends', exact: true })
  await expect(league.getByRole('link', { name: 'Guia de Riven' })).toBeVisible()
  await expect(
    league.getByRole('region', { name: 'Meu perfil' }).getByRole('heading', {
      name: 'Meu perfil',
      exact: true,
      level: 4,
    }),
  ).toBeVisible()
  await expect(games.getByRole('region', { name: 'Xadrez', exact: true })).toBeVisible()
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
