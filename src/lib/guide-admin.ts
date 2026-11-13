import type { GuideBuild, GuideMatchup, GuideRunes } from './riven-guide'

export type RuneChoice = { id: number; name: string; icon: string }
export type GuideCatalog = {
  version: string
  warning?: string
  champions: { id: string; name: string; icon: string }[]
  items: Record<
    string,
    { name: string; icon: string; tags?: string[]; bootTier?: 'standard' | 'upgraded' }
  >
  styles: (RuneChoice & { slots: RuneChoice[][] })[]
  shards: Record<string, RuneChoice>
  shardSlots: number[][]
}
export type GuideContent = {
  defaults: { build: GuideBuild; runes: GuideRunes }
  matchups: Partial<Record<string, GuideMatchup>>
}
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
export const normalized = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export async function guideRequest<T>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(
    '/api/guide' + path,
    payload === undefined
      ? {}
      : {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
  ).catch(() => {
    throw new Error('Não foi possível acessar o tracker local. Verifique se ele está rodando.')
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const field = data.detail?.[0]?.loc?.slice(1).join('.')
    const fields: Record<string, string> = {
      'build.start': 'Selecione pelo menos um item inicial.',
      'build.core': 'Selecione pelo menos um item na ordem de compra.',
    }
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : (fields[field] ?? 'Não foi possível concluir. Verifique os campos e tente novamente.'),
    )
  }
  return data as T
}
