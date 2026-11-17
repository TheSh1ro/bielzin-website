export type Rank = {
  queueType: string
  tier: string
  division: string
  leaguePoints: number
  wins: number
  losses: number
}

export const tierNames: Record<string, string> = {
  IRON: 'Ferro',
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Mestre',
  GRANDMASTER: 'Grão-Mestre',
  CHALLENGER: 'Desafiante',
}

export function rankLabel(rank: Pick<Rank, 'tier' | 'division'>) {
  return `${tierNames[rank.tier] || rank.tier}${['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier) ? '' : ` ${rank.division}`}`
}

export function leagueProfileUrl(gameName: string, tagLine: string) {
  return `https://www.leagueofgraphs.com/pt/summoner/br/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`
}
