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
import { ArrowUpRight, ChevronDown, Clock3, Search, Sword, Swords } from 'lucide-vue-next'
import { profile } from '@/profile'
import { rivenLessons, rivenSkillOrder } from '@/data/riven'
import { guideBuild, guideMatchup, guideVisible, guideItemization } from '@/lib/riven-guide'
import RivenItemization from './RivenItemization.vue'
import RivenBootsGuide from './RivenBootsGuide.vue'
import RivenRunePage from './RivenRunePage.vue'
import ChampionModel from './ChampionModel.vue'
const FeaturedRivenModel = defineAsyncComponent(() => import('./LocalChampionModel.vue'))
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

const activeSection = ref('riven-destaque')
const guideLinks = [
  { id: 'riven-destaque', name: 'Em destaque', icon: Sword },
  { id: 'riven-matchups', name: 'Matchups', icon: Swords },
  { id: 'riven-habilidades', name: 'Habilidades', icon: Sword },
]

function jumpTo(id: string) {
  const section = document.getElementById(id)
  if (!section) return
  activeSection.value = id
  section.focus({ preventScroll: true })
  section.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

onMounted(() => {
  if (window.location.hash.startsWith('#riven-')) {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    )
  }
})

const headerHidden = ref(false)
let scrollAnchor = 0
let navigationRoot: Element | null = null
function updateNavigation() {
  const nav = document.querySelector<HTMLElement>('.riven-nav')
  const top = Math.max(0, navigationRoot?.scrollTop ?? 0)
  const height = nav?.offsetHeight ?? 84
  if (top <= height) {
    headerHidden.value = false
    scrollAnchor = top
  } else if (Math.abs(top - scrollAnchor) >= 8) {
    headerHidden.value = top > scrollAnchor
    scrollAnchor = top
  }
  const edge = Math.max(height + 36, (navigationRoot?.clientHeight ?? 0) * 0.35)
  let current = guideLinks[0]!.id
  for (const link of guideLinks) {
    const section = document.getElementById(link.id)
    if (section && section.getBoundingClientRect().top <= edge) current = link.id
  }
  if (
    navigationRoot &&
    navigationRoot.scrollTop + navigationRoot.clientHeight >= navigationRoot.scrollHeight - 2
  ) {
    current = guideLinks[guideLinks.length - 1]!.id
  }
  activeSection.value = current
}
onMounted(() => {
  navigationRoot = document.querySelector('.riven-page')
  navigationRoot?.addEventListener('scroll', updateNavigation, { passive: true })
})
onUnmounted(() => navigationRoot?.removeEventListener('scroll', updateNavigation))

const goldFormat = new Intl.NumberFormat('pt-BR')
const greavesSynergies = [
  { id: 2517, summary: 'Dá CDR com base no AD extra e mais omnivamp após participar de um abate.' },
  { id: 6333, summary: 'Segura parte do burst. No abate, limpa o dano acumulado e recupera HP.' },
  { id: 3156, summary: 'Contra burst AP: escudo mágico e mais omnivamp quando a passiva ativa.' },
]

const featured = ['Renekton', 'Darius', 'Fiora', 'Jax', 'Aatrox', 'Garen', 'Camille', 'Poppy']

const lessonIndex = ref(0)
const skillRows = (['Q', 'W', 'E', 'R'] as const).map((key) => ({
  key,
  ...rivenLessons[spellKeys.indexOf(key)]!,
}))
const lesson = computed(() => rivenLessons[lessonIndex.value]!)
const lessonKey = computed(() => spellKeys[lessonIndex.value]!)
const videoBase = computed(
  () =>
    'https://lol.dyn.riotcdn.net/x/videos/champion-abilities/0092/ability_0092_' +
    lessonKey.value +
    '1',
)
const riven = shallowRef<Champion>()
const lessonSpell = computed(() => riven.value?.spells[lessonIndex.value - 1])
const lessonCooldown = computed(() =>
  lessonSpell.value ? cooldownText(lessonSpell.value.cooldown) : '',
)
function lessonEffect(slot: number) {
  const values = lessonSpell.value?.effect?.[slot]
  if (!values?.length || !values.every((value) => Number.isFinite(value) && value > 0)) {
    return ''
  }
  return [...new Set(values)].map((value) => goldFormat.format(value)).join(' / ')
}

const lessonStats = computed(() => {
  if (lessonKey.value === 'P') {
    // Data Dragon omits the passive ratio documented in patch 26.3.
    return [
      { label: 'Dano físico extra por carga', value: '30% a 45% do AD total (níveis 1 a 18)' },
    ]
  }
  const labels: Partial<Record<(typeof spellKeys)[number], string>> = {
    Q: 'Dano base por golpe',
    W: 'Dano base',
    E: 'Escudo base',
  }
  const label = labels[lessonKey.value]
  const base = lessonEffect(1)
  if (lessonKey.value === 'R') {
    const bonus = lessonEffect(3)
    const maximum = lessonEffect(2)
    // The patch 26.15 notes provide the R2 ratios missing from Data Dragon's tooltip.
    return [
      { label: 'R1 · AD extra', value: bonus && `+${bonus}% do AD extra` },
      { label: 'R2 · Dano físico mínimo', value: base && `${base} (+55% do AD extra)` },
      { label: 'R2 · Dano físico máximo', value: maximum && `${maximum} (+165% do AD extra)` },
    ].filter(({ value }) => value)
  }
  return label && base ? [{ label, value: base }] : []
})
const videoError = ref(false)

function selectLesson(index: number) {
  if (lessonIndex.value === index) return
  lessonIndex.value = index
  videoError.value = false
}

const version = ref('')
const roster = shallowRef<ChampionSummary[]>([])
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
    void riotData<Champion>(v, 'champion/Riven')
      .then(({ data }) => {
        riven.value = data.Riven
      })
      .catch(() => {})
    const { data } = await riotData<ChampionSummary>(v, 'champion')
    roster.value = Object.values(data)
      .filter(({ id }) => guideVisible(id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    if (!roster.value.some(({ id }) => id === selectedId.value)) {
      selectedId.value = roster.value[0]?.id ?? ''
    }
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

const itemGroups = computed(() => [
  {
    name: guideItemization ? 'Início' : 'Início e botas',
    ids: [
      ...build.value.start,
      ...(!guideItemization && build.value.boots ? [build.value.boots] : []),
    ],
  },
  ...(!guideItemization ? [{ name: 'Ordem de compra', ids: build.value.core }] : []),
])
const selected = computed(() => roster.value.find(({ id }) => id === selectedId.value))
const matchup = computed(() => guideMatchup(selectedId.value))
const assessment = computed(() => [
  { label: 'Early game', value: matchup.value?.early },
  { label: 'Late game', value: matchup.value?.late },
])
const filterText = (value: string) =>
  value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
const results = computed(() => {
  const term = filterText(query.value)
  return roster.value.filter(
    ({ name, id }) => filterText(name).includes(term) || filterText(id).includes(term),
  )
})
const opponentList = computed(() => {
  if (query.value.trim()) return results.value
  const suggestions = featured.flatMap(
    (id) => roster.value.find((champion) => champion.id === id) ?? [],
  )
  return [...suggestions, ...roster.value.filter(({ id }) => !featured.includes(id))]
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
  <div class="riven">
    <nav
      class="riven-nav"
      :class="{ 'is-hidden': headerHidden }"
      aria-label="Guia da Riven"
      @focusin="headerHidden = false"
    >
      <div class="riven-nav-identity" aria-label="Riven">
        <span class="riven-nav-sigil" aria-hidden="true"
          ><Sword :size="20" :stroke-width="1.25"
        /></span>
        <strong>RIVEN</strong>
      </div>
      <div class="riven-nav-sections">
        <button
          v-for="link in guideLinks"
          type="button"
          :key="link.id"
          :aria-current="activeSection === link.id ? 'location' : undefined"
          @click="jumpTo(link.id)"
        >
          {{ link.name }}
        </button>
      </div>
      <div class="riven-nav-return"><slot name="back" /></div>
    </nav>

    <section
      id="riven-destaque"
      tabindex="-1"
      class="riven-section riven-hot-tip riven-feature"
      aria-labelledby="riven-greaves-title"
    >
      <div class="riven-hot-tip-copy">
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
        <p>
          <strong>O upgrade da missão do mid faz a diferença nas fights longas.</strong>
          Com HP alto, Caminho Imortal dá mais dano. Abaixo de 50%, aumenta a cura e o shield do E.
          Com Fome Eterna e Dança da Morte, você tem sustain para continuar fightando e recuperar
          muito HP enquanto bate.
        </p>
        <dl class="riven-greaves-effects">
          <div>
            <dt>Acima de 50% de vida</dt>
            <dd>+4% de dano causado</dd>
          </div>
          <div>
            <dt>Abaixo de 50% de vida</dt>
            <dd>+12% de cura e escudo</dd>
          </div>
        </dl>
        <p>
          <strong>O primeiro abate é o que vira a fight.</strong> Participar de um abate ativa o
          omnivamp extra da Fome Eterna e faz a Dança da Morte limpar o dano acumulado e curar.
          Contra burst AP, Malmortius ajuda a sobreviver com o escudo mágico e mais omnivamp. É essa
          combinação que permite continuar batendo mesmo com pouco HP.
        </p>
      </div>
      <div class="riven-feature-art" aria-hidden="true">
        <FeaturedRivenModel
          source="/models/riven-pacto-quebrado.glb"
          champion="Riven Pacto Quebrado"
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
      <p v-if="dataState === 'loading'" class="riven-feedback" role="status">
        Carregando campeões…
      </p>
      <div v-else-if="dataState === 'error'" class="riven-feedback" role="status">
        <p>O catálogo de campeões está indisponível.</p>
        <button type="button" @click="loadPatch">Tentar novamente</button>
      </div>
      <p v-else-if="!roster.length" class="riven-feedback" role="status">
        Nenhum matchup disponível no momento.
      </p>
      <div v-else-if="selected" class="riven-matchup">
        <div class="riven-matchup-overview">
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
                    @keydown.enter.prevent="opponentList[0] && selectOpponent(opponentList[0].id)"
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
              <div v-for="stage in assessment" :key="stage.label">
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

          <div class="riven-duel-stage">
            <ChampionModel :champion="selected" />
            <div class="riven-duel-copy">
              <div class="riven-duel-heading">
                <span>Riven × {{ selected.name }}</span>
                <p>{{ selected.title }}</p>
              </div>
              <div class="riven-matchup-tips" aria-live="polite">
                <ul v-if="matchup?.tips.some((tip) => tip.trim())" aria-label="Dicas do matchup">
                  <li v-for="(tip, index) in matchup.tips.filter((tip) => tip.trim())" :key="index">
                    {{ tip }}
                  </li>
                </ul>
                <p v-else>Dicas de matchup em preparação.</p>
              </div>
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
            </div>
          </div>
        </div>
        <div class="riven-matchup-grid">
          <section class="riven-matchup-column build-panel" aria-labelledby="riven-build-title">
            <div class="riven-title-line">
              <h2 id="riven-build-title">
                {{ guideItemization ? 'Itemização' : 'Build recomendada' }}
              </h2>
              <span v-if="build.isBase && !guideItemization" class="riven-meta">Padrão</span>
            </div>
            <p v-if="!guideItemization" class="riven-build-reason" aria-live="polite">
              {{ build.reason }}
            </p>
            <p v-if="itemsState === 'loading'" class="riven-feedback" role="status">
              Carregando itens…
            </p>
            <div v-else-if="itemsState === 'error'" class="riven-feedback" role="status">
              <p>O catálogo de itens está indisponível.</p>
              <button type="button" @click="loadItems">Tentar novamente</button>
            </div>
            <div v-else class="riven-item-groups">
              <div v-for="group in itemGroups" :key="group.name" class="riven-item-group">
                <h3>{{ group.name }}</h3>
                <ul>
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
                v-if="guideItemization"
                :content="guideItemization"
                :plan="matchup?.lanePlan"
                :opponent="selected?.name ?? selectedId"
                :items="items"
                :version="version"
              />
              <div v-if="build.situational.length" class="riven-item-group">
                <h3>Situacionais</h3>
                <ul>
                  <li v-for="(choice, index) in build.situational" :key="index" class="riven-item">
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
                      >Item {{ choice.item }} indisponível neste patch<span v-if="choice.condition">
                        — {{ choice.condition }}</span
                      ></span
                    >
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <aside class="riven-matchup-aside" aria-label="Runas e botas">
            <section class="riven-matchup-column" aria-labelledby="riven-runes-title">
              <h2 id="riven-runes-title">Runas</h2>
              <RivenRunePage :champion="selectedId" />
            </section>
            <RivenBootsGuide
              v-if="guideItemization && itemsState === 'ready'"
              :content="guideItemization"
              :items="items"
              :version="version"
            />
          </aside>
        </div>
      </div>
    </section>

    <section
      id="riven-habilidades"
      class="riven-section"
      tabindex="-1"
      aria-labelledby="riven-habilidades-title"
    >
      <h2 id="riven-habilidades-title">Habilidades da Riven</h2>
      <section class="riven-skill-order" aria-labelledby="riven-skill-order-title">
        <h3 id="riven-skill-order-title">Ordem de up das skills</h3>
        <div class="riven-skill-openings">
          <p class="riven-skill-order-intro">
            Comece de <strong>Q → E → W</strong>. No level 2, o E serve para segurar o dano e sair
            da troca. Maximize <strong>Q → E → W</strong> e upe
            <strong>R nos levels 6, 11 e 16</strong>.
          </p>
          <p class="riven-skill-order-intro">
            Pegou <strong>level 2 antes do inimigo</strong> e dá para ir pra cima? Upe
            <strong>W no 2 para buscar o all-in</strong> enquanto ele ainda está level 1. Nesse
            caso, upe <strong>E no level 3</strong>.
          </p>
        </div>
        <p class="riven-skill-order-caption">
          Up por level · padrão com E no 2; para o all-in, W no 2 e E no 3
        </p>
        <div
          class="riven-skill-grid-scroll"
          tabindex="0"
          role="region"
          aria-label="Up das skills por level"
        >
          <table class="riven-skill-grid">
            <caption class="sr-only">
              Ordem padrão para upar as skills da Riven
            </caption>
            <tbody>
              <tr v-for="skill in skillRows" :key="skill.key">
                <th scope="row">
                  <span>{{ skill.key }}</span>
                  <img
                    :src="'/media/riven/' + skill.image"
                    :alt="skill.name"
                    width="24"
                    height="24"
                  />
                </th>
                <td
                  v-for="(key, index) in rivenSkillOrder"
                  :key="index"
                  :class="{ 'is-learned': key === skill.key }"
                  :title="
                    'Level ' + (index + 1) + (key === skill.key ? ' · Upar ' + skill.key : '')
                  "
                >
                  <span v-if="key === skill.key">{{ index + 1 }}</span>
                  <span class="sr-only">{{
                    key === skill.key
                      ? ' · Upar ' + skill.key + ' no level ' + (index + 1)
                      : 'Level ' + (index + 1) + ': sem ponto'
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <div class="riven-lesson riven-glass">
        <div class="riven-film">
          <video
            v-if="!videoError"
            :key="videoBase"
            :src="videoBase + '.webm'"
            :poster="videoBase + '.jpg'"
            preload="none"
            controls
            muted
            loop
            playsinline
            :aria-label="'Demonstração de ' + lesson.name"
            @error="videoError = true"
          ></video>
          <a
            v-else
            href="https://www.leagueoflegends.com/pt-br/champions/riven/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver demonstração na Riot <ArrowUpRight :size="16" />
          </a>
        </div>
        <div class="riven-skill-list" role="group" aria-label="Habilidade da Riven">
          <button
            v-for="(skill, index) in rivenLessons"
            :key="skill.name"
            type="button"
            :aria-pressed="index === lessonIndex"
            @click="selectLesson(index)"
          >
            <img :src="'/media/riven/' + skill.image" alt="" width="44" height="44" />
            <span>{{ index === 0 ? 'Passiva' : spellKeys[index] }}</span>
            <span class="sr-only">{{ skill.name }}</span>
          </button>
        </div>
        <div class="riven-lesson-copy" aria-live="polite">
          <div class="riven-title-line">
            <h3>{{ lesson.name }}</h3>
            <span v-if="lessonCooldown" class="riven-cooldown">
              <Clock3 :size="14" aria-hidden="true" /> {{ lessonCooldown }}
            </span>
          </div>
          <p>{{ lesson.description }}</p>
          <p v-for="stat in lessonStats" :key="stat.label" class="riven-lesson-stat">
            {{ stat.label }} <strong>{{ stat.value }}</strong>
          </p>
          <p class="riven-tip">{{ lesson.tip }}</p>
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
      <p>Projeto de fãs independente. League of Legends, imagens e dados pertencem à Riot Games.</p>
    </footer>
  </div>
</template>

<style src="@/assets/riven.css" scoped></style>
