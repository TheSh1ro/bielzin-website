import { adminRequest } from './admin-api'
import type { Rank } from './league'

export type VaultAccount = {
  id: string
  riotId: string
  ownership: 'owner' | 'others'
  lastError: number | null
  profile: {
    gameName: string
    tagLine: string
    region: string
    level: number
    profileIconId: number
    dataDragonVersion: string
    collectedAt: string
    ranks: Rank[]
  } | null
}

export type Credentials = { login: string; password: string }

export function vaultRequest<T>(path = '', method = 'GET', payload?: unknown): Promise<T> {
  return adminRequest('/lol-vault' + path, method, payload)
}
