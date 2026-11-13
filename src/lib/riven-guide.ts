import snapshot from '@/data/riven-guide.json'

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

const guide: Guide = snapshot as Guide
export const guideItemization = guide.defaults.itemization

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
