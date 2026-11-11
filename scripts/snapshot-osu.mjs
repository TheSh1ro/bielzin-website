import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const base = 'https://osu.ppy.sh'
const userId = 19383022
const profileUrl = `${base}/users/${userId}`
const featuredMaps = [
  [1325234, 2745187],
  [1684512, 3441852],
  [1648128, 3376487],
  [1679668, 3431470],
  [1586095, 3239623],
  [1581458, 3229254],
]

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`osu! respondeu ${response.status} em ${url}`)
  return response
}

function parseEmbeddedJson(html, pattern, label) {
  const match = html.match(pattern)
  if (!match) throw new Error(`Dados de ${label} ausentes na página pública do osu!`)
  return JSON.parse(match[1])
}

const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }
function decodeHtml(html) {
  return html.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, code) => {
    if (code.startsWith('#x')) return String.fromCodePoint(parseInt(code.slice(2), 16))
    if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)))
    return entities[code]
  })
}

const [profilePage, scores, maps] = await Promise.all([
  request(`${profileUrl}/osu`).then((response) => response.text()),
  request(`${profileUrl}/scores/best?mode=osu&limit=6&offset=0`).then((response) =>
    response.json(),
  ),
  Promise.all(
    featuredMaps.map(async ([setId, mapId]) => {
      const html = await (await request(`${base}/beatmapsets/${setId}`)).text()
      const set = parseEmbeddedJson(
        html,
        /<script id="json-beatmapset"[^>]*>\s*([\s\S]*?)\s*<\/script>/,
        setId,
      )
      const map = set.beatmaps.find((map) => map.id === mapId)
      if (!map || set.user_id !== userId) throw new Error(`Mapa em destaque inválido: ${mapId}`)
      return {
        coverUrl: set.covers.cover,
        details: {
          setId,
          mapId,
          title: set.title,
          artist: set.artist,
          version: map.version,
          stars: map.difficulty_rating,
          plays: set.play_count,
          favorites: set.favourite_count,
        },
      }
    }),
  ),
])

const profileJson = profilePage.match(/data-initial-data="([^"]+)"/)?.[1]
if (!profileJson) throw new Error('Dados do perfil ausentes na página pública do osu!')
const { user, achievements } = JSON.parse(decodeHtml(profileJson))
if (user.id !== userId || user.rank_history.mode !== 'osu' || !Array.isArray(scores)) {
  throw new Error('A resposta do osu! não corresponde ao perfil solicitado.')
}

const stats = user.statistics
const earnedMedals = new Map(
  user.user_achievements.map(({ achievement_id, achieved_at }) => [achievement_id, achieved_at]),
)
const medals = [
  { key: 'fc', label: 'Full combo' },
  { key: 'pass', label: 'Pass' },
].map(({ key, label }) => {
  const iconPattern = new RegExp(`/osu-skill-${key}-(\\d+)\\.png$`)
  const highlights = achievements
    .flatMap(({ id, name, icon_url }) => {
      const earnedAt = earnedMedals.get(id)
      const tier = icon_url?.match(iconPattern)?.[1]
      return earnedAt && tier ? [{ id, name, icon: icon_url, earnedAt, tier: Number(tier) }] : []
    })
    .sort((a, b) => b.tier - a.tier)
    .slice(0, 4)
  return { key, label, highlights }
})

const assets = new URL('../public/media/osu/', import.meta.url)
const images = await Promise.all(
  [
    ['avatar.jpg', user.avatar_url],
    ...maps.map(({ details, coverUrl }) => [`map-${details.setId}.jpg`, coverUrl]),
  ].map(async ([name, url]) => [name, Buffer.from(await (await request(url)).arrayBuffer())]),
)
await mkdir(assets, { recursive: true })
await Promise.all(images.map(([name, image]) => writeFile(new URL(name, assets), image)))

const snapshot = {
  collectedAt: new Date().toISOString(),
  profileUrl,
  username: user.username,
  country: user.country_code,
  stats: {
    globalRank: stats.global_rank,
    countryRank: stats.country_rank,
    peakRank: user.rank_highest?.rank ?? null,
    pp: stats.pp,
    accuracy: stats.hit_accuracy,
    playTime: stats.play_time,
    plays: stats.play_count,
    maxCombo: stats.maximum_combo,
    level: stats.level.current,
  },
  rankHistory: user.rank_history.data,
  maps: maps.map(({ details }) => details),
  medals,
  best: scores.map((score) => ({
    id: score.id,
    title: score.beatmapset.title,
    artist: score.beatmapset.artist,
    version: score.beatmap.version,
    cover: score.beatmapset.covers.list,
    pp: score.pp,
    grade: score.rank,
    accuracy: score.accuracy * 100,
    maxCombo: score.max_combo,
    mods: score.mods.map(({ acronym }) => acronym).filter((mod) => mod !== 'CL'),
  })),
}
const snapshotPath = fileURLToPath(new URL('../src/data/osu.json', import.meta.url))
const formatting = await resolveConfig(snapshotPath)
await writeFile(
  snapshotPath,
  await format(JSON.stringify(snapshot), { ...formatting, filepath: snapshotPath }),
)
console.log(`Perfil de ${user.username} atualizado em ${snapshot.collectedAt}.`)
