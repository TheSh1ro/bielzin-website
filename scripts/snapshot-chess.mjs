import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const lichessUsers = ['Gabriel_TKChess', 'Italian_TKChess']
const chessComUsers = ['gabrieltkchess', 'gabriel_tkchess']

async function readJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'bielzin-website (https://github.com/TheSh1ro/bielzin-website)',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`${url} respondeu com HTTP ${response.status}`)
  return response.json()
}

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('A coleta recebeu um número inválido nas estatísticas de xadrez')
  }
  return value
}

const snapshot = { collectedAt: new Date().toISOString(), games: 0, wins: 0, playTime: 0 }

for (const user of lichessUsers) {
  const url = `https://lichess.org/api/user/${user}`
  const profile = await readJson(url)
  snapshot.games += count(profile.count.all)
  snapshot.wins += count(profile.count.win)
  snapshot.playTime += count(profile.playTime.total)
}

for (const chessComUser of chessComUsers) {
  const { archives } = await readJson(
    `https://api.chess.com/pub/player/${chessComUser}/games/archives?format=json`,
  )
  const seen = new Set()
  let dailyGames = 0
  let untimedGames = 0

  for (const archive of archives) {
    const { games } = await readJson(`${archive}?format=json`)
    for (const game of games) {
      const player = [game.white, game.black].find(
        ({ username }) => username.toLowerCase() === chessComUser,
      )
      if (!player || seen.has(game.url)) continue
      seen.add(game.url)
      snapshot.games++
      snapshot.wins += Number(player.result === 'win')

      if (game.time_class === 'daily') {
        dailyGames++
        continue
      }

      const date = game.pgn?.match(/^\[UTCDate "([\d.]+)"\]/m)?.[1]
      const time = game.pgn?.match(/^\[UTCTime "([\d:]+)"\]/m)?.[1]
      const duration = game.end_time - Date.parse(`${date?.replaceAll('.', '-')}T${time}Z`) / 1000
      if (Number.isFinite(duration) && duration >= 0) {
        snapshot.playTime += duration
      } else {
        untimedGames++
      }
    }
  }
  if (!seen.size) throw new Error(`Histórico de partidas vazio para ${chessComUser}`)
  console.log(
    `Chess.com (${chessComUser}): ${seen.size} partidas, ${dailyGames} diárias e ${untimedGames} ao vivo sem duração`,
  )
}

const filepath = fileURLToPath(new URL('../src/data/chess.json', import.meta.url))
const config = await resolveConfig(filepath)
await writeFile(filepath, await format(JSON.stringify(snapshot), { ...config, filepath }))
