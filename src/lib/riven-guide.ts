import { computed, ref, shallowRef } from 'vue'
import { publicRpc } from './supabase'

export type GuideBuild = {
  start: number[]
  boots: number | null
  core: number[]
  situational: { item: number; condition: string }[]
  reason: string
}
export type GuideRunes = {
  primaryStyle: number
  primary: number[]
  secondaryStyle: number
  secondary: number[]
  shards: number[]
}
export type ItemChoice = { item: number; condition: string }
export type BuildRoute = {
  id: string
  title: string
  when: string
  reason: string
  items: number[]
  components: ItemChoice[]
  followup: string
}
export type Itemization = {
  intro: string
  defaultRoute: string
  routes: BuildRoute[]
  boots: ItemChoice[]
  bootsNote: string
}
export type LanePlan = {
  route: string | null
  reason: string
  components: ItemChoice[]
}
export type GuideMatchup = {
  visible: boolean
  early: 'favorable' | 'even' | 'unfavorable' | null
  late: 'favorable' | 'even' | 'unfavorable' | null
  tips: string[]
  build: GuideBuild | null
  runes: GuideRunes | null
  lanePlan?: LanePlan | null
}
type Rune = { id: number; name: string; icon: string }
type RuneStyle = Rune & { slots: Rune[][] }
type Guide = {
  defaults: { build: GuideBuild; runes: GuideRunes; itemization?: Itemization | null }
  matchups: Partial<Record<string, GuideMatchup>>
  catalog: { version: string; styles: RuneStyle[]; shards: Record<string, Rune> }
}

const guide = shallowRef<Guide>()
export const guideItemization = computed(() => guide.value?.defaults.itemization)
export const guideState = ref<'loading' | 'ready' | 'error'>('loading')
let pending = false

export async function refreshGuide() {
  if (pending || document.hidden) return
  if (!guide.value) guideState.value = 'loading'
  pending = true
  try {
    const data = await publicRpc<Guide | null>('get_riven_guide')
    if (!data?.defaults || !data.matchups || !data.catalog) throw new Error('Guia indisponível.')
    guide.value = data
    guideState.value = 'ready'
  } catch {
    if (!guide.value) guideState.value = 'error'
  } finally {
    pending = false
  }
}

export function guideMatchup(id: string) {
  return guide.value?.matchups[id]
}

export function guideVisible(id: string) {
  return guideMatchup(id)?.visible === true
}

export function guideRecommendedRoute(id: string) {
  const itemization = guideItemization.value
  if (!itemization) return
  const routeId = guideMatchup(id)?.lanePlan?.route ?? itemization.defaultRoute
  return itemization.routes.find(({ id }) => id === routeId) ?? itemization.routes[0]
}

export function guideOutlookLabel(outlook?: GuideMatchup['early'], id?: string) {
  switch (outlook) {
    case 'favorable':
      return 'Favorável'
    case 'unfavorable':
      return 'Desfavorável'
    case 'even':
      return id === 'Riven' ? 'Espelho' : 'Equilibrado'
    default:
      return 'A avaliar'
  }
}

export function filterChampionText(value: string) {
  return value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function guideBuild(id: string) {
  const override = guideMatchup(id)?.build
  const build = override ?? guide.value?.defaults.build
  return build && { ...build, isBase: !override }
}

export function guideRunePage(id: string) {
  if (!guide.value) return
  const { catalog, defaults } = guide.value
  const selection = guideMatchup(id)?.runes ?? defaults.runes
  return {
    selection,
    primary: catalog.styles.find((s) => s.id === selection.primaryStyle),
    secondary: catalog.styles.find((s) => s.id === selection.secondaryStyle),
    shards: [
      [5008, 5005, 5007],
      [5008, 5010, 5001],
      [5011, 5013, 5001],
    ].map((row) => row.flatMap((key) => catalog.shards[key] ?? [])),
  }
}
