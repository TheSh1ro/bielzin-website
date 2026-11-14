import snapshot from '@/data/riven-guide.json'
import { computed, shallowReactive } from 'vue'

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
  version: number
  defaults: { build: GuideBuild; runes: GuideRunes; itemization?: Itemization | null }
  matchups: Partial<Record<string, GuideMatchup>>
  catalog: { version: string; styles: RuneStyle[]; shards: Record<string, Rune> }
}

const guide = shallowReactive<Guide>(snapshot as Guide)
export const guideItemization = computed(() => guide.defaults.itemization)

// Production keeps the exported snapshot; local previews follow the admin database.
export function watchLocalGuide() {
  if (!import.meta.env.DEV) return () => {}
  let stopped = false
  let pending = false
  async function refresh() {
    if (pending || document.hidden) return
    pending = true
    try {
      const response = await fetch('/api/guide', {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      })
      if (!response.ok) return
      const data = (await response.json()) as Pick<Guide, 'defaults' | 'matchups'>
      if (!stopped && data.defaults?.build && data.defaults?.runes && data.matchups) {
        if (JSON.stringify(data.defaults) !== JSON.stringify(guide.defaults))
          guide.defaults = data.defaults
        if (JSON.stringify(data.matchups) !== JSON.stringify(guide.matchups))
          guide.matchups = data.matchups
      }
    } catch {
      // Keep the last readable version when the local tracker is unavailable.
    } finally {
      pending = false
    }
  }
  void refresh()
  const interval = window.setInterval(() => void refresh(), 2000)
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', refresh)
  return () => {
    stopped = true
    window.clearInterval(interval)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', refresh)
  }
}

export function guideMatchup(id: string) {
  return guide.matchups[id]
}

export function guideVisible(id: string) {
  return guideMatchup(id)?.visible === true
}

export function guideBuild(id: string) {
  const override = guideMatchup(id)?.build
  return { ...(override ?? guide.defaults.build), isBase: !override }
}

export function guideRuneGroups(id: string) {
  const selection = guideMatchup(id)?.runes ?? guide.defaults.runes
  const resolve = (styleId: number, ids: number[]) => {
    const style = guide.catalog.styles.find((value) => value.id === styleId)
    return {
      name: style?.name ?? 'Runas indisponíveis',
      runes: ids.map(
        (key) =>
          style?.slots.flat().find((rune) => rune.id === key) ?? {
            id: key,
            name: 'Runa indisponível',
            icon: '',
          },
      ),
    }
  }
  return [
    resolve(selection.primaryStyle, selection.primary),
    resolve(selection.secondaryStyle, selection.secondary),
    {
      name: 'Fragmentos',
      runes: selection.shards.map(
        (key) =>
          guide.catalog.shards[key] ?? {
            id: key,
            name: 'Fragmento indisponível',
            icon: '',
          },
      ),
    },
  ]
}

export function guideRunePage(id: string) {
  const selection = guideMatchup(id)?.runes ?? guide.defaults.runes
  return {
    selection,
    styles: guide.catalog.styles,
    primary: guide.catalog.styles.find((s) => s.id === selection.primaryStyle),
    secondary: guide.catalog.styles.find((s) => s.id === selection.secondaryStyle),
    shards: [
      [5008, 5005, 5007],
      [5008, 5010, 5001],
      [5011, 5013, 5001],
    ].map((row) => row.flatMap((key) => guide.catalog.shards[key] ?? [])),
  }
}
