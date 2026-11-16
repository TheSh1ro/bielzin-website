<script setup lang="ts">
import {
  defineAsyncComponent,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { ArrowUpRight, ChevronDown, Search, Swords } from 'lucide-vue-next'
import rivenPoster from '@/assets/riven-pacto-quebrado.webp'
import { profile } from '@/profile'
import {
  guideBuild,
  guideMatchup,
  guideVisible,
  guideItemization,
  guideState,
  refreshGuide,
} from '@/lib/riven-guide'
import RivenItemization from './RivenItemization.vue'
import RivenBootsGuide from './RivenBootsGuide.vue'
import RivenRunePage from './RivenRunePage.vue'
import ChampionModel from './ChampionModel.vue'
import {
  abilityText,
  cooldownText,
  riotData,
  riotImage,
  riotJson,
  spellKeys,
  type Champion,
  type ChampionSummary,
  type Item,
} from '@/lib/data-dragon'

const FeaturedRivenModel = defineAsyncComponent(() => import('./LocalChampionModel.vue'))
const featuredModelReady = ref(false)
const activeSection = ref('riven-destaque')
const steps = ref<HTMLElement>()
const guideLinks = [
  { id: 'riven-destaque', name: 'Em destaque' },
  { id: 'riven-matchups', name: 'Matchups' },
]

function jumpTo(id: string) {
  stopMarginScroll()
  const index = guideLinks.findIndex((link) => link.id === id)
  const root = steps.value
  const section = document.getElementById(id)
  if (index < 0 || !root || !section) return
  section.focus({ preventScroll: true })
  root.scrollTo({
    top: index * root.clientHeight,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}

function updateNavigation() {
  const root = steps.value
  if (!root?.clientHeight) return
  const index = Math.round(root.scrollTop / root.clientHeight)
  activeSection.value = guideLinks[Math.min(index, guideLinks.length - 1)]!.id
}

function onStepsWheel(event: WheelEvent) {
  stopMarginScroll()
  const root = steps.value
  if (!root || event.ctrlKey || event.deltaY <= 0 || root.scrollTop > 1) return
  const target = event.target
  if (target instanceof Element && target.closest('.riven-popover')) return
  const panel = root.firstElementChild
  const nextButton = panel?.lastElementChild
  if (!panel || !nextButton) return
  // Hand off as soon as the final content is visible, ignoring empty bottom padding.
  if (nextButton.getBoundingClientRect().bottom > panel.getBoundingClientRect().bottom + 1) return
  event.preventDefault()
  jumpTo('riven-matchups')
}

let marginFrame = 0
let marginPanel: HTMLElement | null = null
let marginTarget = 0

function stopMarginScroll() {
  cancelAnimationFrame(marginFrame)
  marginFrame = 0
  marginPanel = null
}

function scrollFromMargin(panel: HTMLElement, delta: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stopMarginScroll()
    panel.scrollBy({ top: delta, behavior: 'instant' })
    return
  }
  if (marginPanel !== panel) {
    stopMarginScroll()
    marginPanel = panel
    marginTarget = panel.scrollTop
  }
  marginTarget = Math.max(
    0,
    Math.min(panel.scrollHeight - panel.clientHeight, marginTarget + delta),
  )
  if (marginFrame) return
  let lastTime = performance.now()
  function advance(time: number) {
    const elapsed = Math.min(time - lastTime, 64)
    lastTime = time
    const distance = marginTarget - panel.scrollTop
    if (Math.abs(distance) <= 1) {
      panel.scrollTop = marginTarget
      stopMarginScroll()
      return
    }
    const movement = distance * (1 - Math.exp(-elapsed / 65))
    panel.scrollTop += Math.sign(distance) * Math.max(1, Math.abs(movement))
    marginFrame = requestAnimationFrame(advance)
  }
  marginFrame = requestAnimationFrame(advance)
}

function onPageWheel(event: WheelEvent) {
  const root = steps.value
  if (!root || event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY))
    return
  if (event.target instanceof Node && root.contains(event.target)) return
  event.preventDefault()
  const index = Math.round(root.scrollTop / root.clientHeight)
  // Let an ongoing section transition finish before accepting another margin gesture.
  if (Math.abs(root.scrollTop - index * root.clientHeight) > 1) return
  const panel = root.children[index] as HTMLElement | undefined
  if (!panel) return
  const delta =
    event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? panel.clientHeight : 1)
  const remaining = panel.scrollHeight - panel.clientHeight - panel.scrollTop
  const finalContent = panel.lastElementChild
  const atEnd =
    remaining <= 1 ||
    (index === 0 &&
      finalContent &&
      finalContent.getBoundingClientRect().bottom <= panel.getBoundingClientRect().bottom + 1)
  if (delta > 0 && atEnd && index < guideLinks.length - 1) {
    jumpTo(guideLinks[index + 1]!.id)
  } else if (delta < 0 && panel.scrollTop <= 1 && index > 0) {
    jumpTo(guideLinks[index - 1]!.id)
  } else {
    scrollFromMargin(panel, delta)
  }
}

let pageSurface: HTMLElement | null = null
onMounted(() => {
  pageSurface = steps.value?.closest<HTMLElement>('.riven-page') ?? null
  pageSurface?.addEventListener('wheel', onPageWheel, { passive: false })
})
onUnmounted(() => {
  pageSurface?.removeEventListener('wheel', onPageWheel)
  stopMarginScroll()
})

onMounted(() => {
  if (window.location.hash.startsWith('#riven-')) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  }
})

const goldFormat = new Intl.NumberFormat('pt-BR')
const greavesSynergies = [
  {
    id: 2517,
    summary: 'Dá CDR com base no AD extra e mais vampirismo após participar de um abate.',
  },
  { id: 6333, summary: 'Segura parte do burst. No abate, reseta o dano acumulado e recupera HP.' },
  { id: 3156, summary: 'Contra burst AP: escudo mágico e mais vampirismo quando a passiva ativa.' },
]

const version = ref('')
const allChampions = shallowRef<ChampionSummary[]>([])
const roster = computed(() => allChampions.value.filter(({ id }) => guideVisible(id)))
onMounted(() => {
  void refreshGuide()
  window.addEventListener('focus', refreshGuide)
  document.addEventListener('visibilitychange', refreshGuide)
})
onUnmounted(() => {
  window.removeEventListener('focus', refreshGuide)
  document.removeEventListener('visibilitychange', refreshGuide)
})
watch(roster, (champions) => {
  if (champions.length && !champions.some(({ id }) => id === selectedId.value))
    selectedId.value = champions[0]!.id
})
const items = shallowRef<Record<string, Item>>({})
const dataState = ref<'loading' | 'ready' | 'error'>('loading')
const itemsState = ref<'loading' | 'ready' | 'error'>('loading')

async function loadPatch() {
  dataState.value = 'loading'
  itemsState.value = 'loading'
  try {
    const { v } = await riotJson<{ v: string }>('/realms/br.json')
    if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error('Versão inválida')
    version.value = v
    void loadItems()
    const { data } = await riotData<ChampionSummary>(v, 'champion')
    allChampions.value = Object.values(data).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    dataState.value = 'ready'
  } catch {
    dataState.value = 'error'
    if (!version.value) itemsState.value = 'error'
  }
}

async function loadItems() {
  itemsState.value = 'loading'
  try {
    const { data } = await riotData<Item>(version.value, 'item')
    items.value = Object.fromEntries(
      Object.entries(data).filter(([, item]) => item.maps['11'] && item.inStore !== false),
    )
    itemsState.value = 'ready'
  } catch {
    itemsState.value = 'error'
  }
}

const contentCategories = [
  { id: 'abilities', name: 'Cooldowns' },
  { id: 'build', name: 'Itemização' },
  { id: 'tips', name: 'Dicas' },
  { id: 'runes', name: 'Runas' },
] as const
type ContentCategory = (typeof contentCategories)[number]['id']
const activeCategory = ref<ContentCategory>('abilities')

function chooseCategory(id: ContentCategory) {
  activeCategory.value = id
  const panel = steps.value?.children[1] as HTMLElement | undefined
  // Changing subjects always starts at the beginning of the new content.
  if (panel) panel.scrollTop = 0
}

function onCategoryKey(event: KeyboardEvent, index: number) {
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % contentCategories.length
  else if (event.key === 'ArrowLeft')
    next = (index + contentCategories.length - 1) % contentCategories.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = contentCategories.length - 1
  else return
  event.preventDefault()
  const category = contentCategories[next]!
  chooseCategory(category.id)
  document.getElementById(`matchup-tab-${category.id}`)?.focus({ preventScroll: true })
}

const selectedId = ref('Renekton')
const query = ref('')
const pickerOpen = ref(false)
const opponentPicker = ref<HTMLElement>()
const opponentTrigger = ref<HTMLButtonElement>()
const searchInput = ref<HTMLInputElement>()

async function togglePicker() {
  if (pickerOpen.value) {
    closePicker()
    return
  }
  query.value = ''
  pickerOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closePicker(restoreFocus = false) {
  if (!pickerOpen.value) return
  pickerOpen.value = false
  if (restoreFocus) opponentTrigger.value?.focus()
}

function onPickerFocusOut(event: FocusEvent) {
  if (event.relatedTarget && !opponentPicker.value?.contains(event.relatedTarget as Node))
    closePicker()
}

function onOutsidePointerDown(event: PointerEvent) {
  if (pickerOpen.value && !opponentPicker.value?.contains(event.target as Node)) closePicker()
}

onMounted(() => document.addEventListener('pointerdown', onOutsidePointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onOutsidePointerDown))

function selectOpponent(id: string) {
  selectedId.value = id
  closePicker(true)
}

const build = computed(() => guideBuild(selectedId.value))
const selected = computed(() => roster.value.find(({ id }) => id === selectedId.value))
const matchup = computed(() => guideMatchup(selectedId.value))
const recommendedRoute = computed(() => {
  const itemization = guideItemization.value
  if (!itemization) return
  const routeId = matchup.value?.lanePlan?.route ?? itemization.defaultRoute
  return itemization.routes.find(({ id }) => id === routeId) ?? itemization.routes[0]
})
const alternativeRoutes = computed(
  () => guideItemization.value?.routes.filter(({ id }) => id !== recommendedRoute.value?.id) ?? [],
)

const itemGroups = computed(() => [
  {
    name: recommendedRoute.value ? 'Início' : 'Início e botas',
    ids: [
      ...(build.value?.start ?? []),
      ...(!recommendedRoute.value && build.value?.boots ? [build.value.boots] : []),
    ],
  },
  ...(!recommendedRoute.value && build.value
    ? [{ name: 'Ordem de compra', ids: build.value.core }]
    : []),
])
const assessment = computed(() => [
  { label: 'Early game', value: matchup.value?.early },
  { label: 'Late game', value: matchup.value?.late },
])
const filterText = (value: string) =>
  value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
const opponentList = computed(() => {
  const term = filterText(query.value)
  return roster.value.filter(
    ({ name, id }) => filterText(name).includes(term) || filterText(id).includes(term),
  )
})

const enemy = shallowRef<Champion>()
const enemyState = ref<'loading' | 'ready' | 'error'>('loading')
const enemyRetry = ref(0)

watch([version, selectedId, enemyRetry], async ([patch, id], _old, onCleanup) => {
  if (!patch) return
  let stale = false
  onCleanup(() => {
    stale = true
  })
  enemy.value = undefined
  enemyState.value = 'loading'
  try {
    const { data } = await riotData<Champion>(patch, 'champion/' + id)
    if (stale) return
    const champion = data[id]
    if (!champion?.passive || !champion.spells) throw new Error('Campeão indisponível')
    enemy.value = champion
    enemyState.value = 'ready'
  } catch {
    if (!stale) enemyState.value = 'error'
  }
})

const enemyAbilities = computed(() => {
  if (!enemy.value) return []
  return [enemy.value.passive, ...enemy.value.spells].map((ability, index) => ({
    ...ability,
    key: spellKeys[index] ?? '',
    description: abilityText(ability.description),
    icon: riotImage(version.value, index === 0 ? 'passive' : 'spell', ability.image.full),
    cooldown: 'cooldown' in ability ? cooldownText(ability.cooldown as number[]) : '',
  }))
})

void loadPatch()
</script>

<template>
  <div class="riven" :data-section="activeSection">
    <div class="riven-toolbar">
      <div class="riven-return"><slot name="back" /></div>
      <nav class="riven-step-nav" aria-label="Guia da Riven">
        <button
          v-for="(link, index) in guideLinks"
          type="button"
          :key="link.id"
          :aria-label="link.name"
          :title="link.name"
          :aria-current="activeSection === link.id ? 'location' : undefined"
          @click="jumpTo(link.id)"
        >
          <span aria-hidden="true">{{ index === 0 ? 'Destaque' : 'Matchups' }}</span>
        </button>
      </nav>
    </div>

    <nav
      class="riven-progress"
      :class="{ 'is-matchups': activeSection === 'riven-matchups' }"
      aria-label="Etapas do guia"
    >
      <button
        v-for="(link, index) in guideLinks"
        :key="link.id"
        type="button"
        :aria-label="index === 0 ? 'Ir para destaque' : 'Ir para matchups'"
        :title="link.name"
        :aria-current="activeSection === link.id ? 'step' : undefined"
        @click="jumpTo(link.id)"
      ></button>
    </nav>

    <div ref="steps" class="riven-steps" @scroll.passive="updateNavigation" @wheel="onStepsWheel">
      <div class="riven-step">
        <section
          id="riven-destaque"
          tabindex="-1"
          class="riven-section riven-hot-tip riven-feature"
          aria-labelledby="riven-greaves-title"
        >
          <header class="riven-feature-heading">
            <h2 id="riven-greaves-title" class="riven-mid-title">RIVEN <span>MID</span></h2>
            <div class="riven-hot-tip-title">
              <img
                v-if="version"
                :src="riotImage(version, 'item', '3168.png')"
                alt=""
                width="40"
                height="40"
                loading="lazy"
              />
              <div class="riven-synergy-name">
                <h3>Caminho Imortal</h3>
              </div>
            </div>
          </header>
          <div class="riven-hot-tip-copy">
            <p class="riven-feature-lead">
              <strong>A bota vermelha está completamente broken na Riven</strong>
              A combinação de Caminho Imortal, Fome Eterna, Dança da Morte e Malmortius é muito
              forte, tornando a Riven praticamente imortal.
            </p>
            <dl class="riven-greaves-effects" aria-label="Efeitos do Caminho Imortal por vida">
              <div>
                <dt>Acima de 50% de vida</dt>
                <dd><strong>+4%</strong> de dano causado</dd>
              </div>
              <div>
                <dt>Abaixo de 50% de vida</dt>
                <dd><strong>+12%</strong> de cura e escudo</dd>
              </div>
            </dl>
            <h3 class="riven-feature-followup">Se posicione em busca do primeiro abate</h3>
            <p>
              Participar de um abate ativa o vampirismo da Fome Eterna e as curas da Dança da Morte
              e do Triunfo. Abaixo de 50% de vida, Malmortius concede vampirismo extra e escudo
              mágico. A bota evoluída amplifica todos esses efeitos.
            </p>
          </div>
          <div class="riven-feature-art" aria-hidden="true">
            <img
              v-show="!featuredModelReady"
              class="riven-feature-poster"
              :src="rivenPoster"
              alt=""
              fetchpriority="high"
            />
            <FeaturedRivenModel
              source="/models/riven-pacto-quebrado.glb"
              champion="Riven Pacto Quebrado"
              @ready="featuredModelReady = true"
            />
          </div>
          <div class="riven-hot-tip-build">
            <h3>Como os itens se completam</h3>
            <p v-if="itemsState === 'loading'" class="riven-feedback" role="status">
              Carregando itens…
            </p>
            <div v-else-if="itemsState === 'error'" class="riven-feedback" role="status">
              <p>As descrições dos itens estão indisponíveis.</p>
              <button type="button" @click="version ? loadItems() : loadPatch()">
                Tentar novamente
              </button>
            </div>
            <ul v-else>
              <li v-for="{ id, summary } in greavesSynergies" :key="id">
                <div v-if="items[id]" class="riven-synergy-item">
                  <img
                    :src="riotImage(version, 'item', items[id].image.full)"
                    alt=""
                    width="36"
                    height="36"
                    loading="lazy"
                  />
                  <span>
                    <span class="riven-synergy-name">
                      <strong>{{ items[id].name }}</strong>
                      <span class="riven-item-price"
                        >{{ goldFormat.format(items[id].gold.total) }} ouro</span
                      >
                    </span>
                    <span class="riven-item-preview">{{ summary }}</span>
                  </span>
                </div>
                <p v-else>Item indisponível neste patch.</p>
              </li>
            </ul>
          </div>
        </section>
        <button class="riven-next-step" type="button" @click="jumpTo('riven-matchups')">
          <span class="riven-explore-label"
            ><span>Explorar</span><strong>Matchups do top</strong></span
          >
        </button>
      </div>
      <div class="riven-step">
        <section
          id="riven-matchups"
          class="riven-section"
          tabindex="-1"
          aria-labelledby="riven-matchups-title"
        >
          <div class="riven-title-line riven-section-heading">
            <h1 id="riven-matchups-title">
              Matchups da Riven <span class="riven-lane-label">Top</span>
            </h1>
            <span v-if="version" class="riven-patch">Patch BR · {{ version }}</span>
          </div>
          <p
            v-if="dataState === 'loading' || guideState === 'loading'"
            class="riven-feedback"
            role="status"
          >
            Carregando matchups…
          </p>
          <div v-else-if="dataState === 'error'" class="riven-feedback" role="status">
            <p>O catálogo de campeões está indisponível.</p>
            <button type="button" @click="loadPatch">Tentar novamente</button>
          </div>
          <div v-else-if="guideState === 'error'" class="riven-feedback" role="status">
            <p>Os matchups estão indisponíveis.</p>
            <button type="button" @click="refreshGuide">Tentar novamente</button>
          </div>
          <p v-else-if="!roster.length" class="riven-feedback" role="status">
            Nenhum matchup disponível no momento.
          </p>
          <div v-else-if="selected && build" class="riven-matchup">
            <aside class="riven-matchup-identity" aria-label="Oponente e avaliação">
              <div class="riven-controls">
                <div
                  ref="opponentPicker"
                  class="riven-field riven-picker"
                  @focusout="onPickerFocusOut"
                  @keydown.esc="closePicker(true)"
                >
                  <span id="riven-opponent-label">Oponente</span>
                  <button
                    id="riven-opponent-trigger"
                    ref="opponentTrigger"
                    class="riven-opponent-trigger"
                    type="button"
                    aria-labelledby="riven-opponent-label riven-opponent-name"
                    :aria-expanded="pickerOpen"
                    :aria-controls="pickerOpen ? 'riven-opponent-options' : undefined"
                    @click="togglePicker"
                  >
                    <img
                      :src="riotImage(version, 'champion', selected.image.full)"
                      alt=""
                      width="28"
                      height="28"
                    />
                    <span id="riven-opponent-name">{{ selected.name }}</span>
                    <ChevronDown :size="16" aria-hidden="true" />
                  </button>
                  <div v-if="pickerOpen" id="riven-opponent-options" class="riven-popover">
                    <label class="riven-search">
                      <Search :size="16" aria-hidden="true" />
                      <span class="sr-only">Buscar campeão</span>
                      <input
                        ref="searchInput"
                        v-model="query"
                        type="search"
                        placeholder="Buscar campeão"
                        autocomplete="off"
                        @keydown.enter.prevent="
                          opponentList[0] && selectOpponent(opponentList[0].id)
                        "
                      />
                    </label>
                    <p v-if="!opponentList.length" class="riven-meta" role="status">
                      Nenhum campeão encontrado.
                    </p>
                    <ul v-else class="riven-roster-list" aria-label="Campeões">
                      <li v-for="champion in opponentList" :key="champion.id">
                        <button
                          type="button"
                          :aria-pressed="champion.id === selectedId"
                          @click="selectOpponent(champion.id)"
                        >
                          <img
                            :src="riotImage(version, 'champion', champion.image.full)"
                            alt=""
                            width="28"
                            height="28"
                            loading="lazy"
                          />
                          {{ champion.name }}
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                <dl class="riven-assessment" aria-label="Como é a matchup para a Riven">
                  <div v-for="stage in assessment" :key="stage.label" :data-outlook="stage.value">
                    <dt>{{ stage.label }}</dt>
                    <dd
                      :class="{
                        favorable: stage.value === 'favorable',
                        unfavorable: stage.value === 'unfavorable',
                      }"
                    >
                      {{
                        stage.value === 'favorable'
                          ? 'Favorável'
                          : stage.value === 'unfavorable'
                            ? 'Desfavorável'
                            : stage.value === 'even'
                              ? selectedId === 'Riven'
                                ? 'Espelho'
                                : 'Equilibrado'
                              : 'A avaliar'
                      }}
                    </dd>
                  </div>
                </dl>
              </div>
              <ChampionModel :champion="selected" />
            </aside>
            <div class="riven-matchup-content">
              <div class="riven-content-tabs" role="tablist" aria-label="Conteúdo do matchup">
                <button
                  v-for="(category, index) in contentCategories"
                  :id="`matchup-tab-${category.id}`"
                  :key="category.id"
                  type="button"
                  role="tab"
                  :aria-selected="activeCategory === category.id"
                  :aria-controls="`matchup-panel-${category.id}`"
                  :tabindex="activeCategory === category.id ? 0 : -1"
                  @click="chooseCategory(category.id)"
                  @keydown="onCategoryKey($event, index)"
                >
                  <span
                    class="riven-category-icon"
                    :class="`category-icon-${category.id}`"
                    aria-hidden="true"
                  >
                    <img
                      v-if="category.id === 'abilities'"
                      src="https://ddragon.leagueoflegends.com/cdn/img/perk-images/StatMods/StatModsCDRScalingIcon.png"
                      alt=""
                      width="40"
                      height="40"
                    />
                    <img
                      v-else-if="category.id === 'build' && version"
                      :src="riotImage(version, 'item', '3071.png')"
                      alt=""
                      width="40"
                      height="40"
                    />
                    <Swords v-else-if="category.id === 'tips'" :size="40" :stroke-width="1.5" />
                    <img
                      v-else-if="category.id === 'runes'"
                      src="https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Conqueror/Conqueror.png"
                      alt=""
                      width="40"
                      height="40"
                    />
                  </span>
                  <span class="riven-category-copy">
                    <span class="riven-category-number" aria-hidden="true">0{{ index + 1 }}</span>
                    <span>{{ category.name }}</span>
                  </span>
                </button>
              </div>
              <div
                v-for="category in contentCategories"
                v-show="activeCategory === category.id"
                :id="`matchup-panel-${category.id}`"
                :key="category.id"
                class="riven-content-panel"
                role="tabpanel"
                :aria-labelledby="`matchup-tab-${category.id}`"
                tabindex="0"
              >
                <template v-if="category.id === 'abilities'">
                  <section class="riven-enemy-panel" aria-labelledby="riven-enemy-title">
                    <div class="riven-title-line">
                      <h2 id="riven-enemy-title">Habilidades de {{ selected.name }}</h2>
                      <span class="riven-meta">Cooldown por level</span>
                    </div>
                    <p v-if="enemyState === 'loading'" class="riven-feedback" role="status">
                      Carregando habilidades…
                    </p>
                    <div v-else-if="enemyState === 'error'" class="riven-feedback" role="status">
                      <p>As habilidades estão indisponíveis.</p>
                      <button type="button" @click="enemyRetry++">Tentar novamente</button>
                    </div>
                    <ul v-else :key="selectedId" class="riven-enemy-spells">
                      <li v-for="ability in enemyAbilities" :key="ability.key">
                        <details>
                          <summary>
                            <img :src="ability.icon" alt="" width="32" height="32" loading="lazy" />
                            <span class="riven-spell-name">
                              <span class="riven-spell-key">{{
                                ability.key === 'P' ? 'Passiva' : ability.key
                              }}</span>
                              {{ ability.name }}
                            </span>
                            <span v-if="ability.key !== 'P'" class="riven-cooldown">
                              {{ ability.cooldown || 'Variável' }}
                            </span>
                            <ChevronDown :size="15" aria-hidden="true" />
                          </summary>
                          <p>{{ ability.description }}</p>
                        </details>
                      </li>
                    </ul>
                  </section>
                </template>
                <template v-else-if="category.id === 'build'">
                  <section
                    class="riven-matchup-column build-panel"
                    aria-labelledby="riven-build-title"
                  >
                    <header class="riven-build-intro">
                      <div class="riven-title-line">
                        <h2 id="riven-build-title">
                          {{ recommendedRoute?.title ?? 'Build recomendada' }}
                        </h2>
                        <span v-if="build.isBase && !recommendedRoute" class="riven-meta"
                          >Padrão</span
                        >
                      </div>
                      <p v-if="recommendedRoute?.when ?? build.reason" class="riven-build-reason">
                        {{ recommendedRoute?.when ?? build.reason }}
                      </p>
                    </header>
                    <p v-if="itemsState === 'loading'" class="riven-feedback" role="status">
                      Carregando itens…
                    </p>
                    <div v-else-if="itemsState === 'error'" class="riven-feedback" role="status">
                      <p>O catálogo de itens está indisponível.</p>
                      <button type="button" @click="loadItems">Tentar novamente</button>
                    </div>
                    <div v-else class="riven-item-groups">
                      <div
                        v-for="(group, index) in itemGroups"
                        :key="group.name"
                        class="riven-item-group"
                        :class="{ 'riven-opening-group': index === 0 }"
                      >
                        <span v-if="index === 0" class="riven-opening-label">{{ group.name }}</span>
                        <h3 v-else>{{ group.name }}</h3>
                        <ul :aria-label="group.name">
                          <li v-for="id in group.ids" :key="id" class="riven-item">
                            <template v-if="items[id]">
                              <img
                                :src="riotImage(version, 'item', items[id].image.full)"
                                alt=""
                                width="28"
                                height="28"
                                loading="lazy"
                              />
                              {{ items[id].name }}
                            </template>
                            <span v-else>Item {{ id }} indisponível neste patch</span>
                          </li>
                        </ul>
                      </div>
                      <RivenItemization
                        v-if="recommendedRoute"
                        :routes="[recommendedRoute]"
                        :plan="matchup?.lanePlan"
                        :opponent="selected?.name ?? selectedId"
                        :items="items"
                        :version="version"
                      />
                      <div
                        v-if="build.situational.length"
                        class="riven-item-group riven-situational-group"
                      >
                        <h3>Situacionais</h3>
                        <ul>
                          <li
                            v-for="(choice, index) in build.situational"
                            :key="index"
                            class="riven-item"
                          >
                            <template v-if="items[choice.item]">
                              <img
                                :src="riotImage(version, 'item', items[choice.item]!.image.full)"
                                alt=""
                                width="28"
                                height="28"
                                loading="lazy"
                              />
                              <span
                                ><strong>{{ items[choice.item]?.name }}</strong
                                ><span v-if="choice.condition" class="riven-meta riven-situational">
                                  {{ choice.condition }}</span
                                ></span
                              >
                            </template>
                            <span v-else
                              >Item {{ choice.item }} indisponível neste patch<span
                                v-if="choice.condition"
                              >
                                — {{ choice.condition }}</span
                              ></span
                            >
                          </li>
                        </ul>
                      </div>
                    </div>
                    <RivenBootsGuide
                      v-if="recommendedRoute && guideItemization && itemsState === 'ready'"
                      :content="guideItemization"
                      :items="items"
                      :version="version"
                    />
                    <RivenItemization
                      v-if="alternativeRoutes.length && itemsState === 'ready'"
                      alternatives
                      :routes="alternativeRoutes"
                      :opponent="selected?.name ?? selectedId"
                      :items="items"
                      :version="version"
                    />
                  </section>
                </template>
                <section
                  v-else-if="category.id === 'tips'"
                  class="riven-tips-panel"
                  aria-labelledby="riven-tips-title"
                >
                  <h2 id="riven-tips-title">Como jogar contra {{ selected.name }}</h2>
                  <div class="riven-matchup-tips" aria-live="polite">
                    <ul
                      v-if="matchup?.tips.some((tip) => tip.trim())"
                      aria-label="Dicas do matchup"
                    >
                      <li
                        v-for="(tip, index) in matchup.tips.filter((tip) => tip.trim())"
                        :key="index"
                      >
                        {{ tip }}
                      </li>
                    </ul>
                    <p v-else>Dicas de matchup em preparação.</p>
                  </div>
                </section>
                <template v-else>
                  <section class="riven-matchup-column" aria-labelledby="riven-runes-title">
                    <h2 id="riven-runes-title">Runas</h2>
                    <RivenRunePage :champion="selectedId" />
                  </section>
                </template>
              </div>
            </div>
          </div>
        </section>

        <footer class="riven-footer">
          <a
            href="https://developer.riotgames.com/docs/lol#data-dragon"
            target="_blank"
            rel="noopener noreferrer"
            >Data Dragon <ArrowUpRight :size="14"
          /></a>
          <a
            href="https://www.leagueoflegends.com/pt-br/champions/riven/"
            target="_blank"
            rel="noopener noreferrer"
            >Riven na Riot <ArrowUpRight :size="14"
          /></a>
          <a :href="profile.favoriteGame.guide" target="_blank" rel="noopener noreferrer"
            >Guia anterior <ArrowUpRight :size="14"
          /></a>
        </footer>
      </div>
    </div>
  </div>
</template>

<style src="@/assets/riven.css" scoped></style>
