<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import GuideBuildEditor from '@/components/GuideBuildEditor.vue'
import GuideRuneEditor from '@/components/GuideRuneEditor.vue'
import GuideItemizationEditor from '@/components/GuideItemizationEditor.vue'
import GuideChoicesEditor from '@/components/GuideChoicesEditor.vue'
import type { GuideBuild, GuideMatchup, GuideRunes, Itemization } from '@/lib/riven-guide'
import {
  clone,
  normalized,
  guideRequest,
  type GuideContent,
  type GuideCatalog,
} from '@/lib/guide-admin'
import '@/assets/admin.css'
import {
  ArrowLeft,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Check,
  X,
  Eye,
  EyeOff,
  Plus,
  ChevronUp,
  ChevronDown,
  Menu,
  RotateCcw,
  ArrowUpRight,
} from 'lucide-vue-next'

const guide = ref<GuideContent>()
const catalog = ref<GuideCatalog>()
const selected = ref('defaults')
const empty = (): GuideMatchup => ({
  visible: false,
  early: null,
  late: null,
  tips: [],
  build: null,
  runes: null,
})
const draft = ref<GuideMatchup & { itemization?: Itemization | null }>(empty())
const baseline = ref('')
const saving = ref(false)
const refreshing = ref(false)
const message = ref('Carregando configurações…')
const failed = ref(false)
const search = ref('')
const rosterFilter = ref('all')
const mobileNavigation = ref(false)
const activeSection = ref('routes')
const sections = computed(() =>
  isDefault.value
    ? [
        ...(guide.value?.defaults.itemization
          ? [
              { id: 'routes', label: 'Builds' },
              { id: 'boots', label: 'Botas' },
            ]
          : []),
        { id: 'build', label: 'Itens' },
        { id: 'runes', label: 'Runas' },
      ]
    : [
        { id: 'duel', label: 'Confronto' },
        { id: 'build', label: 'Itens da lane' },
        { id: 'runes', label: 'Runas' },
      ],
)
const routeUsage = computed(() => {
  const usage: Record<string, string[]> = {}
  for (const [id, matchup] of Object.entries(guide.value?.matchups ?? {})) {
    const route = matchup?.lanePlan?.route
    if (route)
      (usage[route] ??= []).push(catalog.value?.champions.find((c) => c.id === id)?.name ?? id)
  }
  return usage
})
const defaultRouteTitle = computed(
  () =>
    guide.value?.defaults.itemization?.routes.find(
      (route) => route.id === guide.value?.defaults.itemization?.defaultRoute,
    )?.title ?? 'Rota inicial',
)
type ResetGroup = 'build' | 'runes' | 'lanePlan'
const resetDialog = ref<HTMLDialogElement>()
const resetGroup = ref<ResetGroup>('build')
const resetLabel = computed(
  () => ({ build: 'itens', runes: 'runas', lanePlan: 'plano da lane' })[resetGroup.value],
)
const resetUndo = ref<{ group: ResetGroup; previous: GuideMatchup[ResetGroup]; expected: string }>()
const selectedChampion = computed(() =>
  catalog.value?.champions.find((c) => c.id === selected.value),
)
const visibleCount = computed(
  () => Object.values(guide.value?.matchups ?? {}).filter((c) => c?.visible).length,
)
const itemSearch = ref('')
const itemCategory = ref<'boots' | undefined>()
const dialog = ref<HTMLDialogElement>()
const itemSearchField = ref<HTMLInputElement>()
let pickAction: ((id: number) => void) | undefined
let disposed = false
let hydrating = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
let saveTask: Promise<void> | undefined
const isDefault = computed(() => selected.value === 'defaults')
const payload = computed(() =>
  isDefault.value
    ? {
        build: draft.value.build,
        runes: draft.value.runes,
        ...(draft.value.itemization !== undefined ? { itemization: draft.value.itemization } : {}),
      }
    : draft.value,
)
const dirty = computed(
  () => baseline.value !== '' && !!guide.value && JSON.stringify(payload.value) !== baseline.value,
)
const title = computed(() =>
  isDefault.value
    ? 'Padrões do guia'
    : catalog.value?.champions.find((c) => c.id === selected.value)?.name,
)
const champions = computed(
  () =>
    catalog.value?.champions
      .filter((c) => normalized(c.name + ' ' + c.id).includes(normalized(search.value)))
      .filter(
        (c) =>
          rosterFilter.value === 'all' ||
          (rosterFilter.value === 'visible') === !!guide.value?.matchups[c.id]?.visible,
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) ?? [],
)
const matchingItems = computed(() =>
  Object.entries(catalog.value?.items ?? {})
    .filter(([, item]) => itemCategory.value !== 'boots' || item.tags?.includes('Boots'))
    .filter(([id, item]) =>
      normalized(item.name + ' ' + id + (item.tags?.includes('Boots') ? ' botas' : '')).includes(
        normalized(itemSearch.value),
      ),
    )
    .sort(
      (a, b) =>
        Number(a[1].bootTier === 'upgraded') - Number(b[1].bootTier === 'upgraded') ||
        a[1].name.localeCompare(b[1].name, 'pt-BR'),
    ),
)
const build = computed<GuideBuild>({
  get: () => draft.value.build ?? guide.value!.defaults.build,
  set: (value) => {
    draft.value.build = value
  },
})
const runes = computed<GuideRunes>({
  get: () => draft.value.runes ?? guide.value!.defaults.runes,
  set: (value) => {
    draft.value.runes = value
  },
})
const itemization = computed<Itemization>({
  get: () => draft.value.itemization!,
  set: (value) => {
    draft.value.itemization = value
  },
})
const stages = [
  { key: 'early', label: 'Early game' },
  { key: 'late', label: 'Late game' },
] as const

function status(text: string, error = false) {
  message.value = text
  failed.value = error
}
function cancelScheduledSave() {
  clearTimeout(saveTimer)
  saveTimer = undefined
}
watch(
  () => JSON.stringify(payload.value),
  () => {
    if (hydrating) return
    if (resetUndo.value && JSON.stringify(payload.value) !== resetUndo.value.expected)
      resetUndo.value = undefined
    cancelScheduledSave()
    if (dirty.value) {
      if (!saving.value) status('')
      saveTimer = setTimeout(() => void save(), 500)
    }
  },
  { flush: 'sync' },
)
async function navigate(id: string) {
  if (id === selected.value && baseline.value) {
    mobileNavigation.value = false
    return
  }
  if (dirty.value || saving.value) await save()
  if (disposed || (dirty.value && !confirm('Não foi possível salvar. Descartar as alterações?')))
    return
  cancelScheduledSave()
  hydrating = true
  const wasDefault = isDefault.value
  selected.value = id
  resetUndo.value = undefined
  mobileNavigation.value = false
  if (
    wasDefault !== isDefault.value ||
    !sections.value.some((section) => section.id === activeSection.value)
  )
    activeSection.value = sections.value[0]!.id
  draft.value = isDefault.value
    ? { ...empty(), ...clone(guide.value!.defaults) }
    : clone(guide.value!.matchups[id] ?? empty())
  baseline.value = JSON.stringify(payload.value)
  hydrating = false
  status('')
  window.scrollTo({ top: 0, behavior: 'instant' })
}
function moveTip(index: number, offset: number) {
  const tips = draft.value.tips
  ;[tips[index], tips[index + offset]] = [tips[index + offset]!, tips[index]!]
}
function personalize(group: 'build' | 'runes') {
  if (group === 'build') draft.value.build = clone(guide.value!.defaults.build)
  else draft.value.runes = clone(guide.value!.defaults.runes)
}
function requestReset(group: ResetGroup) {
  resetGroup.value = group
  resetDialog.value!.showModal()
}
function applyReset() {
  const group = resetGroup.value
  const previous = clone(draft.value[group])
  draft.value[group] = null
  resetUndo.value = { group, previous, expected: JSON.stringify(payload.value) }
  resetDialog.value!.close()
}
function undoReset() {
  const undo = resetUndo.value
  if (!undo) return
  // Each reset restores only its own group, leaving the rest of the matchup intact.
  Object.assign(draft.value, { [undo.group]: clone(undo.previous) })
  resetUndo.value = undefined
}
async function selectSection(id: string, focus = false) {
  activeSection.value = id
  if (focus) {
    await nextTick()
    document.getElementById('tab-' + id)?.focus()
  }
}
async function openDefaults(section: string) {
  await navigate('defaults')
  if (isDefault.value) await selectSection(section)
}
function onTabKey(event: KeyboardEvent) {
  const ids = sections.value.map((section) => section.id)
  const index = ids.indexOf(activeSection.value)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? ids.length - 1
        : event.key === 'ArrowRight'
          ? (index + 1) % ids.length
          : event.key === 'ArrowLeft'
            ? (index - 1 + ids.length) % ids.length
            : -1
  if (next < 0) return
  event.preventDefault()
  void selectSection(ids[next]!, true)
}
async function load() {
  status('Carregando configurações…')
  try {
    const [content, game] = await Promise.all([
      guideRequest<GuideContent>(''),
      guideRequest<GuideCatalog>('/catalog'),
    ])
    if (disposed) return
    guide.value = content
    catalog.value = game
    await navigate('defaults')
    if (game.warning) status(game.warning, true)
  } catch (error) {
    if (!disposed) status((error as Error).message, true)
  }
}
function save(): Promise<void> {
  cancelScheduledSave()
  if (saveTask) return saveTask
  if (!dirty.value || disposed) return Promise.resolve()
  saving.value = true
  status('Salvando…')
  saveTask = (async () => {
    try {
      // Serializa gravações e inclui edições feitas enquanto a requisição estava em andamento.
      while (dirty.value && !disposed) {
        const submitted = clone(payload.value)
        if (isDefault.value)
          guide.value!.defaults = await guideRequest<GuideContent['defaults']>(
            '/defaults',
            submitted,
          )
        else
          guide.value!.matchups[selected.value] = await guideRequest<GuideMatchup>(
            '/matchups/' + selected.value,
            submitted,
          )
        baseline.value = JSON.stringify(submitted)
      }
      status('Salvo automaticamente')
    } catch (error) {
      status((error as Error).message, true)
    } finally {
      saving.value = false
      saveTask = undefined
      cancelScheduledSave()
    }
  })()
  return saveTask
}
async function refresh() {
  if (!catalog.value) return load()
  refreshing.value = true
  try {
    catalog.value = await guideRequest<GuideCatalog>('/catalog?refresh=true')
    status(catalog.value.warning ?? 'Catálogo atualizado.', !!catalog.value.warning)
  } catch (error) {
    status((error as Error).message, true)
  } finally {
    refreshing.value = false
  }
}
function pick(action: (id: number) => void, category?: 'boots') {
  itemCategory.value = category
  pickAction = action
  itemSearch.value = ''
  dialog.value!.showModal()
  itemSearchField.value!.focus()
}
function chooseItem(id: number) {
  dialog.value!.close()
  pickAction?.(id)
}
function warnOnExit(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => {
  document.title = 'Painel · bielzin'
  window.addEventListener('beforeunload', warnOnExit)
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  cancelScheduledSave()
  window.removeEventListener('beforeunload', warnOnExit)
})
</script>

<template>
  <div class="admin-page">
    <aside id="admin-navigation" class="admin-sidebar" :class="{ 'mobile-open': mobileNavigation }">
      <a class="admin-brand" href="/"
        ><span class="brand-mark">bz.</span
        ><span>Guia de Riven<small>Editor de conteúdo</small></span></a
      >
      <button
        type="button"
        class="default-nav"
        :disabled="!guide || saving"
        :aria-current="isDefault ? 'page' : undefined"
        @click="navigate('defaults')"
      >
        <SlidersHorizontal :size="18" /><span
          >Padrões do guia<small>Builds, botas, itens e runas</small></span
        >
      </button>
      <div class="roster-heading">
        <span>Matchups</span><span>{{ visibleCount }} incluídos</span>
      </div>
      <label class="search-field" for="champion-search"
        ><Search :size="16" /><input
          id="champion-search"
          v-model="search"
          type="search"
          placeholder="Buscar campeão"
          aria-label="Buscar campeão"
          autocomplete="off"
      /></label>
      <div class="roster-filters" aria-label="Filtrar campeões">
        <button type="button" :aria-pressed="rosterFilter === 'all'" @click="rosterFilter = 'all'">
          Todos
        </button>
        <button
          type="button"
          :aria-pressed="rosterFilter === 'visible'"
          @click="rosterFilter = 'visible'"
        >
          Incluídos
        </button>
        <button
          type="button"
          :aria-pressed="rosterFilter === 'hidden'"
          @click="rosterFilter = 'hidden'"
        >
          Ocultos
        </button>
      </div>
      <nav class="champion-list" aria-label="Matchups">
        <button
          v-for="champion in champions"
          :key="champion.id"
          type="button"
          :disabled="saving"
          :aria-current="selected === champion.id ? 'page' : undefined"
          @click="navigate(champion.id)"
        >
          <img :src="champion.icon" alt="" loading="lazy" /><span>{{ champion.name }}</span
          ><EyeOff
            v-if="!guide?.matchups[champion.id]?.visible"
            :size="13"
            class="roster-hidden"
            aria-hidden="true"
          /><span
            v-if="guide?.matchups[champion.id]?.visible"
            class="visibility-dot"
            aria-hidden="true"
            title="Incluído no guia"
          />
        </button>
        <p v-if="catalog && !champions.length" class="empty-state">Nenhum campeão encontrado.</p>
      </nav>
      <a class="back-link" href="/riven"><ArrowLeft :size="16" /> Abrir guia</a>
    </aside>
    <main class="admin-main">
      <header class="admin-toolbar">
        <button
          type="button"
          class="icon-button mobile-menu"
          :aria-expanded="mobileNavigation"
          aria-controls="admin-navigation"
          aria-label="Escolher conteúdo"
          @click="mobileNavigation = !mobileNavigation"
        >
          <Menu :size="20" />
        </button>
        <span class="editor-breadcrumb"
          >Guia de Riven <span>/</span> {{ isDefault ? 'Padrões' : title }}</span
        >
        <div class="autosave-state" :class="{ error: failed }">
          <p role="status" aria-label="Salvamento" aria-live="polite">
            <RefreshCw v-if="saving" :size="14" class="spinning" /><Check
              v-else-if="guide && !dirty && !failed"
              :size="14"
            /><span>{{
              message || (dirty ? 'Aguardando para salvar…' : 'Salvo automaticamente')
            }}</span>
          </p>
          <button
            v-if="failed && dirty && !saving"
            type="button"
            class="secondary-button"
            @click="save"
          >
            Tentar novamente
          </button>
        </div>
      </header>
      <div class="admin-content">
        <div class="editor-heading">
          <div class="editor-identity">
            <img
              v-if="selectedChampion"
              class="champion-portrait"
              :src="selectedChampion.icon"
              alt=""
            />
            <div v-else class="default-portrait"><SlidersHorizontal :size="28" /></div>
            <div>
              <p class="eyebrow">
                {{ isDefault ? 'BASE DO GUIA' : 'RIVEN × ' + title?.toUpperCase() }}
              </p>
              <h1>{{ title || 'Carregando…' }}</h1>
              <p class="muted">
                {{
                  isDefault
                    ? 'A base compartilhada pelos matchups.'
                    : 'Dificuldade, dicas e ajustes só para este confronto.'
                }}
              </p>
            </div>
          </div>
          <label v-if="guide && !isDefault" class="visibility-toggle" for="visible"
            ><input
              id="visible"
              v-model="draft.visible"
              type="checkbox"
              aria-label="Mostrar este campeão na lista pública" /><span
              class="switch-track" /><span>{{
              draft.visible ? 'Incluído no guia' : 'Oculto no guia'
            }}</span
            ><component :is="draft.visible ? Eye : EyeOff" :size="16"
          /></label>
        </div>
        <div class="editor-meta">
          <span class="patch-badge">Patch {{ catalog?.version ?? '…' }}</span
          ><span>Salvo no tracker local · Vai ao site na próxima publicação</span
          ><button
            type="button"
            class="text-button"
            :disabled="saving || refreshing"
            @click="refresh"
          >
            <RefreshCw :size="13" :class="{ spinning: refreshing }" />{{
              refreshing ? 'Atualizando…' : 'Atualizar catálogo'
            }}
          </button>
        </div>
        <div v-if="!guide && failed" class="load-error">
          <p>Não foi possível carregar o guia.</p>
          <button type="button" @click="load">Tentar novamente</button>
        </div>
        <template v-if="guide && catalog">
          <p v-if="isDefault" class="scope-note">
            Alterações aqui valem para os matchups que usam o padrão. Ajustes próprios de cada
            campeão são mantidos.
          </p>
          <div v-if="resetUndo" class="reset-feedback" role="status">
            <span>O ajuste foi removido deste matchup.</span
            ><button type="button" class="text-button" @click="undoReset">
              <RotateCcw :size="14" />Desfazer
            </button>
          </div>
          <div
            class="editor-tabs"
            role="tablist"
            aria-label="Conteúdo para editar"
            @keydown="onTabKey"
          >
            <button
              v-for="section in sections"
              :id="'tab-' + section.id"
              :key="section.id"
              type="button"
              role="tab"
              :aria-selected="activeSection === section.id"
              :tabindex="activeSection === section.id ? 0 : -1"
              :aria-controls="'editor-' + section.id"
              @click="selectSection(section.id)"
            >
              {{ section.label }}
              <small v-if="!isDefault && section.id === 'build'">{{
                draft.build || draft.lanePlan ? 'Com ajustes' : 'Padrão'
              }}</small>
              <small v-if="!isDefault && section.id === 'runes'">{{
                draft.runes ? 'Próprias' : 'Padrão'
              }}</small>
            </button>
          </div>
          <form class="editor-sections" @submit.prevent="save">
            <div
              v-for="section in sections"
              v-show="activeSection === section.id"
              :id="'editor-' + section.id"
              :key="section.id"
              role="tabpanel"
              :aria-labelledby="'tab-' + section.id"
              tabindex="0"
              class="editor-tab-panel"
            >
              <section
                v-if="!isDefault && section.id === 'duel'"
                id="panel-duel"
                class="editor-panel duel-panel"
                aria-labelledby="heading-duel"
              >
                <div class="section-heading">
                  <div>
                    <h2 id="heading-duel">Dificuldade da matchup</h2>
                    <p>Pela perspectiva da Riven.</p>
                  </div>
                </div>
                <div class="assessment">
                  <div v-for="stage in stages" :key="stage.key" class="assessment-card">
                    <label :for="stage.key">{{ stage.label }}</label
                    ><select
                      :id="stage.key"
                      v-model="draft[stage.key]"
                      :class="draft[stage.key] ?? 'unrated'"
                    >
                      <option :value="null">A avaliar</option>
                      <option value="favorable">Favorável</option>
                      <option value="even">Equilibrado</option>
                      <option value="unfavorable">Desfavorável</option>
                    </select>
                  </div>
                </div>
                <div class="matchup-tips-editor">
                  <div class="tips-heading">
                    <h3>Dicas do matchup</h3>
                    <span>{{ draft.tips.length }} / 30</span>
                  </div>
                  <p class="field-help">
                    Uma orientação por item, na ordem em que deve aparecer no guia.
                  </p>
                  <ol class="tip-editor-list">
                    <li v-for="(_, index) in draft.tips" :key="index" class="tip-editor-row">
                      <span class="tip-index">{{ index + 1 }}</span>
                      <label class="sr-only" :for="`matchup-tip-${index}`"
                        >Dica {{ index + 1 }}</label
                      >
                      <textarea
                        :id="`matchup-tip-${index}`"
                        v-model="draft.tips[index]"
                        rows="3"
                        maxlength="10000"
                        placeholder="Uma dica para este confronto…"
                      />
                      <div class="tip-controls">
                        <button
                          type="button"
                          class="icon-button"
                          :disabled="index === 0"
                          :aria-label="`Mover dica ${index + 1} para cima`"
                          @click="moveTip(index, -1)"
                        >
                          <ChevronUp :size="16" />
                        </button>
                        <button
                          type="button"
                          class="icon-button"
                          :disabled="index === draft.tips.length - 1"
                          :aria-label="`Mover dica ${index + 1} para baixo`"
                          @click="moveTip(index, 1)"
                        >
                          <ChevronDown :size="16" />
                        </button>
                        <button
                          type="button"
                          class="icon-button remove-button"
                          :aria-label="`Remover dica ${index + 1}`"
                          @click="draft.tips.splice(index, 1)"
                        >
                          <X :size="16" />
                        </button>
                      </div>
                    </li>
                  </ol>
                  <p v-if="!draft.tips.length" class="field-help">Nenhuma dica adicionada.</p>
                  <button
                    v-if="draft.tips.length < 30"
                    type="button"
                    class="secondary-button"
                    @click="draft.tips.push('')"
                  >
                    <Plus :size="16" />Adicionar dica
                  </button>
                </div>
              </section>
              <section
                v-if="
                  isDefault &&
                  draft.itemization &&
                  (section.id === 'routes' || section.id === 'boots')
                "
                class="editor-panel"
                :aria-labelledby="'heading-itemization-' + section.id"
              >
                <div class="section-heading">
                  <div>
                    <h2 :id="'heading-itemization-' + section.id">
                      {{ section.id === 'routes' ? 'Builds compartilhadas' : 'Escolha das botas' }}
                    </h2>
                    <p>
                      {{
                        section.id === 'routes'
                          ? 'Sequências e explicações exibidas em todos os matchups. Cada lane pode indicar uma delas.'
                          : 'Regras exibidas em todos os matchups, independente da build escolhida.'
                      }}
                    </p>
                  </div>
                </div>
                <GuideItemizationEditor
                  v-model="itemization"
                  :catalog="catalog"
                  :section="section.id"
                  :usage="routeUsage"
                  @pick="pick"
                />
              </section>
              <section
                v-if="!isDefault && guide.defaults.itemization && section.id === 'build'"
                class="editor-panel"
                aria-labelledby="heading-lane-plan"
              >
                <div class="section-heading">
                  <div>
                    <h2 id="heading-lane-plan">Build indicada para {{ title }}</h2>
                    <p>
                      {{
                        draft.lanePlan
                          ? 'Plano próprio deste matchup. As demais builds continuam disponíveis no guia.'
                          : 'Usa a rota inicial dos padrões do guia.'
                      }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="secondary-button"
                    @click="
                      draft.lanePlan
                        ? requestReset('lanePlan')
                        : (draft.lanePlan = { route: null, reason: '', components: [] })
                    "
                  >
                    {{ draft.lanePlan ? 'Remover plano da lane' : 'Definir plano da lane' }}
                  </button>
                </div>
                <div v-if="draft.lanePlan" class="itemization-editor">
                  <label for="lane-route">Rota indicada para a lane</label
                  ><select id="lane-route" v-model="draft.lanePlan.route">
                    <option :value="null">Rota inicial · {{ defaultRouteTitle }}</option>
                    <option
                      v-for="route in guide.defaults.itemization.routes"
                      :key="route.id"
                      :value="route.id"
                    >
                      {{ route.title }}
                    </option>
                  </select>
                  <label for="lane-reason">Explicação para esta lane</label
                  ><textarea
                    id="lane-reason"
                    v-model="draft.lanePlan.reason"
                    rows="4"
                    maxlength="5000"
                  />
                  <h3>Compras antecipadas</h3>
                  <p class="field-help">
                    O que comprar para aguentar a lane, mesmo sem fechar o item completo.
                  </p>
                  <GuideChoicesEditor
                    v-model="draft.lanePlan.components"
                    :catalog="catalog"
                    prefix="lane-component"
                    label="componente da lane"
                    @pick="pick"
                  />
                </div>
                <p v-else class="field-help">
                  O guia abre em <strong>{{ defaultRouteTitle }}</strong
                  >. Você pode indicar outra build e adicionar compras antecipadas só contra
                  {{ title }}.
                </p>
                <button type="button" class="text-button" @click="openDefaults('routes')">
                  Editar builds compartilhadas <ArrowUpRight :size="14" />
                </button>
              </section>
              <section
                v-if="section.id === 'build'"
                id="panel-build"
                class="editor-panel build-panel"
                aria-labelledby="heading-build"
              >
                <div class="section-heading">
                  <div>
                    <h2 id="heading-build">
                      {{ guide.defaults.itemization ? 'Itens iniciais e situacionais' : 'Itens' }}
                    </h2>
                    <p>
                      {{
                        isDefault
                          ? guide.defaults.itemization
                            ? 'Inventário de saída e alternativas que aparecem abaixo da sequência de itens.'
                            : 'Monte a sequência de compra padrão da Riven.'
                          : draft.build
                            ? 'Itens próprios deste matchup. Mudanças nos itens padrão não substituem esta seleção.'
                            : 'Herdados dos padrões do guia. Novas mudanças no padrão também chegam aqui.'
                      }}
                    </p>
                  </div>
                  <button
                    v-if="!isDefault"
                    type="button"
                    class="secondary-button"
                    @click="draft.build ? requestReset('build') : personalize('build')"
                  >
                    {{ draft.build ? 'Restaurar itens padrão' : 'Personalizar itens' }}
                  </button>
                </div>
                <div v-if="!isDefault" class="source-line">
                  <span class="source-label">{{
                    draft.build ? 'Próprio de ' + title : 'Padrões do guia'
                  }}</span
                  ><button
                    v-if="!draft.build"
                    type="button"
                    class="text-button"
                    @click="openDefaults('build')"
                  >
                    Editar padrão <ArrowUpRight :size="14" />
                  </button>
                </div>
                <GuideBuildEditor
                  v-model="build"
                  :catalog="catalog"
                  :disabled="!draft.build"
                  :structured="!!guide.defaults.itemization"
                  @pick="pick"
                />
              </section>
              <section
                v-if="section.id === 'runes'"
                id="panel-runes"
                class="editor-panel runes-panel"
                aria-labelledby="heading-runes"
              >
                <div class="section-heading">
                  <div>
                    <h2 id="heading-runes">Runas</h2>
                    <p>
                      {{
                        isDefault
                          ? 'Defina a página de runas padrão da Riven.'
                          : draft.runes
                            ? 'Página personalizada para este matchup.'
                            : 'Esta matchup usa as runas padrão.'
                      }}
                    </p>
                  </div>
                  <button
                    v-if="!isDefault"
                    type="button"
                    class="secondary-button"
                    @click="draft.runes ? requestReset('runes') : personalize('runes')"
                  >
                    {{ draft.runes ? 'Restaurar runas padrão' : 'Personalizar runas' }}
                  </button>
                </div>
                <div v-if="!isDefault" class="source-line">
                  <span class="source-label">{{
                    draft.runes ? 'Próprias de ' + title : 'Padrões do guia'
                  }}</span
                  ><button
                    v-if="!draft.runes"
                    type="button"
                    class="text-button"
                    @click="openDefaults('runes')"
                  >
                    Editar padrão <ArrowUpRight :size="14" />
                  </button>
                </div>
                <GuideRuneEditor v-model="runes" :catalog="catalog" :disabled="!draft.runes" />
              </section>
            </div>
          </form>
        </template>
      </div>
    </main>
    <dialog
      ref="resetDialog"
      class="reset-dialog"
      aria-labelledby="reset-title"
      aria-describedby="reset-description"
    >
      <form method="dialog">
        <p class="eyebrow">SÓ NESTE MATCHUP</p>
        <h2 id="reset-title">
          {{ resetGroup === 'lanePlan' ? 'Remover' : 'Restaurar' }} {{ resetLabel }} de {{ title }}?
        </h2>
        <p id="reset-description">
          {{
            resetGroup === 'build'
              ? 'Remove os itens próprios deste confronto e volta a usar os itens padrão atuais, incluindo futuras alterações no padrão.'
              : resetGroup === 'runes'
                ? 'Remove a página de runas própria deste confronto e volta a usar as runas padrão atuais, incluindo futuras alterações no padrão.'
                : 'Remove a build indicada, a explicação e as compras antecipadas deste confronto. O guia volta a abrir na rota inicial.'
          }}
        </p>
        <p class="field-help">
          {{
            resetGroup === 'build'
              ? 'Plano da lane, runas, dicas, dificuldade e visibilidade são mantidos.'
              : resetGroup === 'runes'
                ? 'Itens, plano da lane, dicas, dificuldade e visibilidade são mantidos.'
                : 'Itens iniciais, situacionais, runas, dicas, dificuldade e visibilidade são mantidos.'
          }}
        </p>
        <div class="reset-actions">
          <button class="secondary-button" value="cancel" autofocus>Cancelar</button
          ><button type="button" class="secondary-button reset-confirm" @click="applyReset">
            {{ resetGroup === 'lanePlan' ? 'Remover plano' : 'Restaurar padrão' }}
          </button>
        </div>
      </form>
    </dialog>
    <dialog
      ref="dialog"
      class="item-shop"
      aria-labelledby="picker-title"
      @keydown.esc.prevent="dialog?.close()"
      @click="
        (event) => {
          if (event.target === dialog) dialog?.close()
        }
      "
    >
      <div class="dialog-heading">
        <div>
          <p class="eyebrow">ARSENAL</p>
          <h2 id="picker-title">
            {{ itemCategory === 'boots' ? 'Selecionar botas' : 'Selecionar item' }}
          </h2>
        </div>
        <button
          type="button"
          class="icon-button"
          aria-label="Fechar seleção de item"
          @click="dialog?.close()"
        >
          <X :size="20" />
        </button>
      </div>
      <label class="search-field" for="item-search"
        ><Search :size="18" /><input
          id="item-search"
          ref="itemSearchField"
          v-model="itemSearch"
          type="search"
          aria-label="Buscar item"
          placeholder="Buscar pelo nome do item…"
          autocomplete="off"
      /></label>
      <p class="shop-count">{{ matchingItems.length }} itens disponíveis</p>
      <div class="item-results">
        <template v-for="([id, item], index) in matchingItems" :key="id">
          <h3
            v-if="
              itemCategory === 'boots' &&
              (index === 0 || item.bootTier !== matchingItems[index - 1]?.[1].bootTier)
            "
            class="shop-group-title"
          >
            {{ item.bootTier === 'upgraded' ? 'Aprimoradas' : 'Convencionais' }}
          </h3>
          <button type="button" @click="chooseItem(Number(id))">
            <img :src="item.icon" alt="" loading="lazy" /><span>{{ item.name }}</span
            ><span class="shop-add" aria-hidden="true">+</span>
          </button>
        </template>
        <p v-if="!matchingItems.length" class="empty-state">
          Nenhum item encontrado. Tente outro nome.
        </p>
      </div>
      <div class="shop-footer">
        Selecione um item para adicionar à build.<kbd>Esc para fechar</kbd>
      </div>
    </dialog>
  </div>
</template>
