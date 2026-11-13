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
export type GuideMatchup = {
  visible: boolean
  early: 'favorable' | 'even' | 'unfavorable' | null
  late: 'favorable' | 'even' | 'unfavorable' | null
  tips: string[]
  build: GuideBuild | null
  runes: GuideRunes | null
}
type Rune = { id: number; name: string; icon: string }
type RuneStyle = Rune & { slots: Rune[][] }
type Guide = {
  version: number
  defaults: { build: GuideBuild; runes: GuideRunes }
  matchups: Partial<Record<string, GuideMatchup>>
  catalog: { version: string; styles: RuneStyle[]; shards: Record<string, Rune> }
}

const guide: Guide = snapshot as Guide

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
