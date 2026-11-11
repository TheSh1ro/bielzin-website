import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'

// Run locally. Never expose this key through VITE_* variables or browser code.
const key = process.env.RIOT_API_KEY
if (!key) throw new Error('Defina RIOT_API_KEY no ambiente antes de executar a coleta.')
const gameName = process.argv[2] || 'bielzin'
const tagLine = process.argv[3] || 'sh1ro'
const file = new URL('../src/data/lol-tracker.json', import.meta.url)
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function writeAtomically(destination, content) {
  const temporary = new URL(`${destination.href}.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, content)
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function dataDragon(path) {
  const response = await fetch(`https://ddragon.leagueoflegends.com/${path}`, {
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Data Dragon: HTTP ${response.status} em ${path}`)
  return response
}

async function riot(host, path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://${host}.api.riotgames.com${path}`, {
      headers: { 'X-Riot-Token': key },
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 && attempt < 2) {
      await pause(Math.min(Number(response.headers.get('Retry-After') || 5), 120) * 1000)
      continue
    }
    if (!response.ok)
      throw new Error(`Riot: HTTP ${response.status} em ${path.split('/').slice(0, 5).join('/')}`)
    return response.json()
  }
}

const identity = await riot(
  'americas',
  `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
)
console.log(`Coletando ${identity.gameName}#${identity.tagLine} (BR)…`)
const puuid = encodeURIComponent(identity.puuid)
const summoner = await riot('br1', `/lol/summoner/v4/summoners/by-puuid/${puuid}`)
const entries = await riot('br1', `/lol/league/v4/entries/by-puuid/${puuid}`)
const ids = await riot(
  'americas',
  `/lol/match/v5/matches/by-puuid/${puuid}/ids?type=ranked&count=40`,
)
const versions = await (await dataDragon('api/versions.json')).json()
const version = versions[0]
const championData = await (await dataDragon(`cdn/${version}/data/pt_BR/champion.json`)).json()
const champions = new Map(
  Object.values(championData.data).map((champion) => [Number(champion.key), champion]),
)
const matches = []
for (const id of ids) {
  const { info } = await riot('americas', `/lol/match/v5/matches/${encodeURIComponent(id)}`)
  const player = info.participants.find((participant) => participant.puuid === identity.puuid)
  if (player && [420, 440].includes(info.queueId)) {
    const champion = champions.get(player.championId)
    matches.push({
      id,
      queueId: info.queueId,
      startedAt: new Date(info.gameStartTimestamp).toISOString(),
      durationSeconds: info.gameDuration,
      championId: player.championId,
      championName: champion?.name || player.championName,
      championIcon: `${champion?.id || player.championName}.png`,
      win: player.win,
      remake: Boolean(player.gameEndedInEarlySurrender && info.gameDuration < 300),
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      cs: player.totalMinionsKilled + player.neutralMinionsKilled,
      visionScore: player.visionScore,
      role: player.teamPosition,
      damage: player.totalDamageDealtToChampions,
    })
  }
  await pause(100)
}
const ranks = entries
  .filter((entry) => ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'].includes(entry.queueType))
  .map(({ queueType, tier, rank, leaguePoints, wins, losses }) => ({
    queueType,
    tier,
    division: rank,
    leaguePoints,
    wins,
    losses,
  }))
const collectedAt = new Date().toISOString()

// Publish only after all referenced icons are available locally.
const media = new URL('../public/media/lol/', import.meta.url)
await mkdir(media, { recursive: true })
const images = new Map(
  matches.map((match) => [match.championIcon, `champion/${match.championIcon}`]),
)
images.set(`profile-${summoner.profileIconId}.png`, `profileicon/${summoner.profileIconId}.png`)
for (const [name, path] of images) {
  const response = await dataDragon(`cdn/${version}/img/${path}`)
  await writeAtomically(new URL(name, media), Buffer.from(await response.arrayBuffer()))
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
const lock = new URL(`${file.href}.lock`)
const publication = await open(lock, 'wx').catch((error) => {
  if (error.code !== 'EEXIST') throw error
  throw new Error('Outra coleta está publicando o snapshot. Tente novamente.', { cause: error })
})

try {
  let previous = { schemaVersion: 1, accounts: [] }
  try {
    previous = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const old = previous.accounts.find((account) => account.puuid === identity.puuid)
  const rankDay = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  })
  const records = [
    ...(old?.rankHistory || []),
    ...ranks.map((rank) => ({ recordedAt: collectedAt, ...rank })),
  ]
  records.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
  const dailyRanks = new Map()
  for (const point of records) {
    const day = rankDay.format(new Date(point.recordedAt))
    dailyRanks.set(`${point.queueType}:${day}`, point)
  }
  const rankHistory = [...dailyRanks.values()].sort(
    (a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt),
  )
  const account = {
    ...identity,
    platform: 'BR1',
    region: 'BR',
    collectedAt,
    dataDragonVersion: version,
    profileIconId: summoner.profileIconId,
    level: summoner.summonerLevel,
    matchSampleLimit: 40,
    ranks,
    rankHistory,
    matches,
  }
  previous.accounts = [
    ...previous.accounts.filter((entry) => entry.puuid !== identity.puuid),
    account,
  ]
  await writeAtomically(file, JSON.stringify(previous, null, 2) + '\n')
  console.log(
    `Snapshot salvo: ${matches.length} partidas, ${ranks.length} filas, ${rankHistory.length} registros de elo.`,
  )
} finally {
  await publication.close()
  await rm(lock)
}
