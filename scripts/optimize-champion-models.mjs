import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { NodeIO } from '@gltf-transform/core'
import { mkdir, copyFile, stat, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const backup = process.argv[2]
if (!backup) throw new Error('Informe uma pasta externa para preservar os originais.')
await mkdir(backup, { recursive: true })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const catalog = JSON.parse(await readFile('public/models/catalog.json', 'utf8'))
const manifest = JSON.parse(await readFile('src/data/champion-models.json', 'utf8'))
const report = []
for (const entry of catalog) {
  const file = path.join('public', manifest[entry.champion])
  const original = path.join(backup, path.basename(file))
  await copyFile(file, original, 1).catch((error) => {
    if (error.code !== 'EEXIST') throw error
  })
  const document = await io.read(original)
  const root = document.getRoot()
  const animations = root.listAnimations()
  const names = animations.map((clip) => ({
    clip,
    name: clip
      .getName()
      .replace(/\.anm$/i, '')
      .toLowerCase(),
  }))
  const idle = (
    names.find(({ name }) => /(^|_)idle_?0?1(?:_base|_raw)?$/.test(name)) ??
    names.find(({ name }) => /(^|_)idle(?:_base)?$/.test(name) || name === 'idlebase') ??
    names.find(({ name }) => name === 'idle0')
  )?.clip
  if (!idle) throw new Error('Idle ausente: ' + entry.champion)
  for (const animation of animations) {
    if (animation === idle) continue
    animation.listChannels().forEach((channel) => channel.dispose())
    animation.listSamplers().forEach((sampler) => sampler.dispose())
    animation.dispose()
  }
  for (const accessor of root.listAccessors()) {
    if (accessor.listParents().every((parent) => parent === root)) accessor.dispose()
  }
  await io.write(file, document)
  const verified = await io.read(file)
  const kept = verified.getRoot().listAnimations()
  if (kept.length !== 1 || kept[0].getName() !== idle.getName())
    throw new Error('Falha na validação')
  const samplers = kept[0].listSamplers()
  for (const [index, sampler] of idle.listSamplers().entries()) {
    for (const getter of ['getInput', 'getOutput']) {
      const before = sampler[getter]().getArray()
      const after = samplers[index][getter]().getArray()
      if (
        !Buffer.from(before.buffer, before.byteOffset, before.byteLength).equals(
          Buffer.from(after.buffer, after.byteOffset, after.byteLength),
        )
      )
        throw new Error('Idle alterado')
    }
  }
  const before = (await stat(original)).size
  const after = (await stat(file)).size
  report.push({ champion: entry.champion, before, after, idle: idle.getName() })
  entry.bytes = after
  entry.animations = 1
}
await writeFile('public/models/catalog.json', JSON.stringify(catalog, null, 2) + '\n')
await writeFile(path.join(backup, 'optimization-report.json'), JSON.stringify(report, null, 2))
const before = report.reduce((sum, r) => sum + r.before, 0)
const after = report.reduce((sum, r) => sum + r.after, 0)
console.log(
  JSON.stringify(
    {
      count: report.length,
      before,
      after,
      saved: before - after,
      percent: (1 - after / before) * 100,
      largest: report.sort((a, b) => b.after - a.after).slice(0, 3),
    },
    null,
    2,
  ),
)
