import { createClient } from '@supabase/supabase-js'
import type { GuideBuild, GuideMatchup, GuideRunes, Itemization } from './riven-guide'
import { apiHeaders, backendUrl, publishableKey } from './supabase'

export const adminClient =
  backendUrl && publishableKey ? createClient(backendUrl, publishableKey) : null

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
  defaults: { build: GuideBuild; runes: GuideRunes; itemization?: Itemization | null }
  matchups: Partial<Record<string, GuideMatchup>>
}
export type AdminGuide = GuideContent & {
  catalog: GuideCatalog
  revisions: Partial<Record<string, string>>
}
export type VisitDetails = {
  id: string
  visitedAt: string
  city: string | null
  region: string | null
  userAgent: string | null
}
export type VisitPage = {
  items: VisitDetails[]
  next: { before: string; id: string } | null
}
export type SavedEntry<T> = { data: T; revision: string }

export class GuideRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
export const normalized = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export async function guideRequest<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  const session = (await adminClient?.auth.getSession())?.data.session
  if (!session) throw new GuideRequestError(401, 'Sua sessão expirou. Entre novamente.')
  const headers = apiHeaders()
  headers.set('Authorization', 'Bearer ' + session.access_token)
  if (payload !== undefined) headers.set('Content-Type', 'application/json')
  const response = await fetch(backendUrl + '/functions/v1/guide-admin' + path, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  }).catch(() => {
    throw new GuideRequestError(503, 'Não foi possível acessar o painel. Tente novamente.')
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new GuideRequestError(
      response.status,
      typeof data.message === 'string'
        ? data.message
        : 'Não foi possível concluir. Tente novamente.',
    )
  }
  return data as T
}
