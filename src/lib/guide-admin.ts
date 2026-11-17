import { adminRequest } from './admin-api'
import type { GuideBuild, GuideMatchup, GuideRunes, Itemization } from './riven-guide'

export { adminClient, AdminRequestError as GuideRequestError } from './admin-api'

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

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
export const normalized = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export function guideRequest<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  return adminRequest('/guide-admin' + path, method, payload)
}
