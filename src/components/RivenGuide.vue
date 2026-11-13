<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { ArrowUpRight, ChevronDown, Clock3, Search, Sword, Swords } from 'lucide-vue-next'
import { profile } from '@/profile'
import { rivenLessons, rivenRuneGroups, rivenSkillOrder } from '@/data/riven'
import { recommendBuild } from '@/data/riven-builds'
import matchupData from '@/data/riven-matchups.json'
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

type Matchup = { early: boolean | null; late: boolean | null; tip: string }
const matchups: Partial<Record<string, Matchup>> = matchupData
const guideLinks = [
  { id: 'riven-matchups', name: 'Matchups', icon: Swords },
  { id: 'riven-habilidades', name: 'Habilidades', icon: Sword },
]

function jumpTo(id: string, updateUrl = true) {
  const section = document.getElementById(id)
  if (!section) return
  if (updateUrl) window.history.replaceState(window.history.state, '', '#' + id)
  section.focus({ preventScroll: true })
  section.scrollIntoView({ block: 'start', behavior: updateUrl ? 'smooth' : 'instant' })
}

onMounted(() => {
  const link = guideLinks.find(({ id }) => window.location.hash === '#' + id)
  if (link) jumpTo(link.id, false)
})

const goldFormat = new Intl.NumberFormat('pt-BR')
const greavesSynergies = [
  { id: 2517, summary: 'Vampirismo Universal que aumenta após participar de um abate.' },
  { id: 6333, summary: 'Adia parte do dano e limpa o restante ao participar de um abate.' },
  { id: 3156, summary: 'Resistência mágica e, ao ativar a passiva, escudo e vampirismo.' },
]

const topLaneOpponents = new Set([
  'Riven',
  'Volibear',
  'Malphite',
  'Jayce',
  'Cassiopeia',
  'Gangplank',
  'Garen',
  'Olaf',
  'Gnar',
  'Kennen',
  'Jax',
  'KSante',
  'Gragas',
  'Renekton',
  'Rumble',
  'Teemo',
  'Varus',
  'Pantheon',
  'Heimerdinger',
  'KogMaw',
  'Poppy',
  'Quinn',
  'Karma',
  'Camille',
  'Urgot',
  'Akali',
  'Chogath',
  'Zac',
  'Nasus',
  'Fiora',
  'Gwen',
  'Kled',
  'Zaahen',
  'Mordekaiser',
  'Warwick',
  'Shen',
  'Illaoi',
  'Yone',
  'Yorick',
  'Sett',
  'Irelia',
  'Aatrox',
  'Yasuo',
  'Darius',
  'Ambessa',
  'Trundle',
  'Tryndamere',
  'Singed',
  'Vladimir',
  'Rengar',
  'Ryze',
  'Maokai',
  'Qiyana',
  'DrMundo',
  'Sion',
  'Ornn',
  'Kayle',
  'TahmKench',
])

const featured = ['Renekton', 'Darius', 'Fiora', 'Jax', 'Aatrox', 'Garen', 'Camille', 'Poppy']

const lessonIndex = ref(0)
const skillProgression = rivenSkillOrder.map((key) => ({
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
      { label: 'Dano físico extra por carga', value: '30% a 45% do DdA total (níveis 1 a 18)' },
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
      { label: 'R1 · DdA concedido', value: bonus && `+${bonus}% do DdA adicional` },
      { label: 'R2 · Dano físico mínimo', value: base && `${base} (+55% do DdA adicional)` },
      { label: 'R2 · Dano físico máximo', value: maximum && `${maximum} (+165% do DdA adicional)` },
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
      .filter(({ id }) => topLaneOpponents.has(id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
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

const build = computed(() => recommendBuild(selectedId.value))
const itemGroups = computed(() => [
  { name: 'Início e botas', ids: [build.value.start, build.value.boots] },
  { name: 'Ordem de compra', ids: build.value.core },
])
const selected = computed(() => roster.value.find(({ id }) => id === selectedId.value))
const matchup = computed(() => matchups[selectedId.value])
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
    <nav class="riven-nav" aria-label="Guia da Riven">
      <slot name="back" />
      <div class="riven-nav-sections">
        <a
          v-for="link in guideLinks"
          :key="link.id"
          :href="'#' + link.id"
          @click.left.exact.prevent="jumpTo(link.id)"
        >
          <component :is="link.icon" :size="16" aria-hidden="true" />
          {{ link.name }}
        </a>
      </div>
    </nav>

    <section class="riven-section riven-hot-tip riven-glass" aria-labelledby="riven-greaves-title">
      <div class="riven-hot-tip-copy">
        <h2 id="riven-greaves-title" class="riven-hot-tip-heading">DESTAQUE: RIVEN MID</h2>
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
            <span v-if="items[3168]" class="riven-item-price">
              {{ goldFormat.format(items[3168].gold.total) }} ouro
            </span>
          </div>
        </div>
        <p>
          <strong>Caminho Imortal é o que faz essa build de Riven Mid ser tão forte</strong>,
          aumentando o dano acima de meia vida e amplificando a cura e o escudo do E abaixo desse
          limiar.
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
          A bota chega a 10% de Vampirismo Universal, fazendo ataques e habilidades recuperarem
          vida. Com Fome Eterna, Dança da Morte e Malmortius, esses status tornam a Riven
          praticamente imortal em lutas prolongadas.
        </p>
      </div>
      <div class="riven-hot-tip-build">
        <h3>Itens que fortalecem a build</h3>
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
        <h1 id="riven-matchups-title">Matchups da Riven</h1>
        <span class="riven-patch"
          >Top<span v-if="version"> · Patch BR · {{ version }}</span></span
        >
      </div>
      <p v-if="dataState === 'loading'" class="riven-feedback" role="status">
        Carregando campeões…
      </p>
      <div v-else-if="dataState === 'error'" class="riven-feedback" role="status">
        <p>O catálogo de campeões está indisponível.</p>
        <button type="button" @click="loadPatch">Tentar novamente</button>
      </div>
      <div v-else-if="selected" class="riven-matchup riven-glass">
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

          <dl class="riven-assessment" aria-label="Avaliação do duelo para a Riven">
            <div v-for="stage in assessment" :key="stage.label">
              <dt>{{ stage.label }}</dt>
              <dd :class="{ favorable: stage.value === true, unfavorable: stage.value === false }">
                {{
                  stage.value === true
                    ? 'Favorável'
                    : stage.value === false
                      ? 'Desfavorável'
                      : matchup
                        ? selectedId === 'Riven'
                          ? 'Espelho'
                          : 'Equilibrado'
                        : 'A avaliar'
                }}
              </dd>
            </div>
          </dl>
        </div>

        <p class="riven-matchup-tip" aria-live="polite">
          {{ matchup?.tip ?? 'Dica de matchup em preparação.' }}
        </p>

        <div class="riven-matchup-grid">
          <section class="riven-matchup-column" aria-labelledby="riven-enemy-title">
            <div class="riven-title-line">
              <h2 id="riven-enemy-title">Habilidades de {{ selected.name }}</h2>
              <span class="riven-meta">Recarga base por nível</span>
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

          <section class="riven-matchup-column" aria-labelledby="riven-build-title">
            <div class="riven-title-line">
              <h2 id="riven-build-title">Build recomendada</h2>
              <span v-if="build.isBase" class="riven-meta">Base de Top</span>
            </div>
            <p class="riven-build-reason" aria-live="polite">{{ build.reason }}</p>
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
                    <span v-else>Item indisponível neste patch</span>
                  </li>
                </ul>
              </div>
              <p
                v-if="build.situational && items[build.situational.item]"
                class="riven-meta riven-situational"
              >
                <strong>{{ items[build.situational.item]?.name }}</strong>
                {{ build.situational.condition }}
              </p>
            </div>
            <div class="riven-runes">
              <h3>Runas</h3>
              <div class="riven-rune-groups">
                <ul v-for="group in rivenRuneGroups" :key="group.name" :aria-label="group.name">
                  <li v-for="[name, icon] in group.runes" :key="name" :title="name">
                    <img :src="icon" :alt="name" width="30" height="30" loading="lazy" />
                  </li>
                </ul>
              </div>
            </div>
          </section>
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
      <section class="riven-skill-order riven-glass" aria-labelledby="riven-skill-order-title">
        <div class="riven-title-line">
          <h3 id="riven-skill-order-title">Ordem de habilidades</h3>
          <span class="riven-skill-priority">Q → E → W</span>
        </div>
        <ol>
          <li
            v-for="(skill, index) in skillProgression"
            :key="index"
            :class="{ 'riven-ultimate-level': skill.key === 'R' }"
            :title="skill.name"
          >
            <span class="riven-skill-level">{{ index + 1 }}</span>
            <img :src="'/media/riven/' + skill.image" alt="" width="24" height="24" />
            <span>{{ skill.key }}</span>
          </li>
        </ol>
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
