import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

test('publica o snapshot somente depois de salvar os ícones', async (context) => {
  const temporaryRoot = await realpath(tmpdir())
  const directory = await mkdtemp(join(temporaryRoot, 'bielzin-snapshot-'))
  assert.equal(dirname(await realpath(directory)), temporaryRoot)
  context.after(() => rm(directory, { recursive: true, force: true }))
  const scripts = join(directory, 'scripts')
  const data = join(directory, 'src', 'data')
  await mkdir(scripts)
  await mkdir(data, { recursive: true })
  const collector = join(scripts, 'snapshot-lol.mjs')
  await copyFile(new URL('../scripts/snapshot-lol.mjs', import.meta.url), collector)
  const snapshot = join(data, 'lol-tracker.json')
  const original = JSON.stringify({ schemaVersion: 1, accounts: [{ puuid: 'existing' }] })
  await writeFile(snapshot, original)

  const mock = join(directory, 'mock.mjs')
  await writeFile(
    mock,
    `globalThis.fetch = async (href) => {
      const { pathname } = new URL(href)
      if (pathname.includes('/by-riot-id/'))
        return Response.json({ puuid: 'new', gameName: 'Conta', tagLine: 'BR' })
      if (pathname.includes('/summoners/'))
        return Response.json({ profileIconId: 99, summonerLevel: 42 })
      if (pathname.includes('/entries/') || pathname.endsWith('/ids')) return Response.json([])
      if (pathname.endsWith('/versions.json')) return Response.json(['1.0.0'])
      if (pathname.endsWith('/champion.json')) return Response.json({ data: {} })
      if (pathname.endsWith('/profileicon/99.png')) {
        return process.env.SNAPSHOT_TEST_IMAGE_ERROR
          ? new Response(null, { status: 503 })
          : new Response('mock icon')
      }
      throw new Error('Unexpected URL: ' + href)
    }`,
  )
  const collect = (failImage) =>
    run(process.execPath, ['--import', pathToFileURL(mock).href, collector], {
      env: {
        ...process.env,
        RIOT_API_KEY: 'test-key',
        SNAPSHOT_TEST_IMAGE_ERROR: failImage ? '1' : '',
      },
    })

  await assert.rejects(collect(true), /Data Dragon: HTTP 503/)
  assert.equal(await readFile(snapshot, 'utf8'), original)

  await collect(false)
  const updated = JSON.parse(await readFile(snapshot, 'utf8'))
  assert.deepEqual(
    updated.accounts.map(({ puuid }) => puuid),
    ['existing', 'new'],
  )
  const icon = join(directory, 'public', 'media', 'lol', 'profile-99.png')
  assert.equal(await readFile(icon, 'utf8'), 'mock icon')
})
