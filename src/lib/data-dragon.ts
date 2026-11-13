export const riotCdn = 'https://ddragon.leagueoflegends.com'
export const spellKeys = ['P', 'Q', 'W', 'E', 'R'] as const

type GameImage = { full: string }
type Ability = { name: string; description: string; image: GameImage }
export type Spell = Ability & { cooldown: number[]; effect?: (number[] | null)[] }

export type ChampionSummary = {
  key?: string
  id: string
  name: string
  title: string
  image: GameImage
}

export type Champion = ChampionSummary & { passive: Ability; spells: Spell[] }
export type Item = {
  name: string
  gold: { total: number }
  image: GameImage
  maps: Record<string, boolean>
  inStore?: boolean
}

const requests = new Map<string, Promise<unknown>>()

export function riotJson<T>(path: string): Promise<T> {
  const cached = requests.get(path)
  if (cached) return cached as Promise<T>

  const request = fetch(riotCdn + path, {
    signal: AbortSignal.timeout(12000),
    cache: path === '/realms/br.json' ? 'no-cache' : 'default',
  })
    .then((response) => {
      if (!response.ok) throw new Error('Data Dragon: ' + response.status)
      return response.json()
    })
    .catch((error) => {
      requests.delete(path)
      throw error
    })

  requests.set(path, request)
  return request
}

export function riotData<T>(version: string, file: string) {
  return riotJson<{ data: Record<string, T> }>('/cdn/' + version + '/data/pt_BR/' + file + '.json')
}

export function riotImage(version: string, folder: string, file: string) {
  return riotCdn + '/cdn/' + version + '/img/' + folder + '/' + file
}

export function abilityText(html: string) {
  const markup = html.replace(/<br\s*\/?>/gi, '\n')
  return new DOMParser().parseFromString(markup, 'text/html').body.textContent?.trim() ?? ''
}

const seconds = new Intl.NumberFormat('pt-BR')

export function cooldownText(values: number[]) {
  if (!values?.length || values.some((value) => !Number.isFinite(value) || value < 0)) return ''
  if (values.every((value) => value === 0)) return ''
  const ranks = new Set(values).size === 1 ? values.slice(0, 1) : values
  return ranks.map((rank) => seconds.format(rank)).join(' / ') + ' s'
}
