<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import GuideBuildEditor from '@/components/GuideBuildEditor.vue'
import GuideRuneEditor from '@/components/GuideRuneEditor.vue'
import type { GuideBuild, GuideMatchup, GuideRunes } from '@/lib/riven-guide'
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
const draft = ref<GuideMatchup>(empty())
const baseline = ref('')
const saving = ref(false)
const refreshing = ref(false)
const message = ref('Carregando configurações…')
const failed = ref(false)
const search = ref('')
const rosterFilter = ref('all')
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
  isDefault.value ? { build: draft.value.build, runes: draft.value.runes } : draft.value,
)
const dirty = computed(
  () => baseline.value !== '' && !!guide.value && JSON.stringify(payload.value) !== baseline.value,
)
const title = computed(() =>
  isDefault.value
    ? 'Configuração padrão'
    : catalog.value?.champions.find((c) => c.id === selected.value)?.name,
)
const champions = computed(
  () =>
    catalog.value?.champions
      .filter((c) => normalized(c.name + ' ' + c.id).includes(normalized(search.value)))
      .filter((c) => rosterFilter.value === 'all' || !!guide.value?.matchups[c.id]?.visible)
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
    cancelScheduledSave()
    if (dirty.value) {
      if (!saving.value) status('')
      saveTimer = setTimeout(() => void save(), 500)
    }
  },
  { flush: 'sync' },
)
async function navigate(id: string) {
  if (id === selected.value && baseline.value) return
  if (dirty.value || saving.value) await save()
  if (disposed || (dirty.value && !confirm('Não foi possível salvar. Descartar as alterações?')))
    return
  cancelScheduledSave()
  hydrating = true
  selected.value = id
  draft.value = isDefault.value
    ? { ...empty(), ...clone(guide.value!.defaults) }
    : clone(guide.value!.matchups[id] ?? empty())
  baseline.value = JSON.stringify(payload.value)
  hydrating = false
  status('')
}
function moveTip(index: number, offset: number) {
  const tips = draft.value.tips
  ;[tips[index], tips[index + offset]] = [tips[index + offset]!, tips[index]!]
}
function toggle(group: 'build' | 'runes') {
  if (group === 'build')
    draft.value.build = draft.value.build ? null : clone(guide.value!.defaults.build)
  else draft.value.runes = draft.value.runes ? null : clone(guide.value!.defaults.runes)
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
    <aside class="admin-sidebar">
      <a class="admin-brand" href="/"
        ><span class="brand-mark">bz.</span
        ><span>Guia de Riven<small>Editor de matchups</small></span></a
      >
      <button
        type="button"
        class="default-nav"
        :disabled="!guide || saving"
        :aria-current="isDefault ? 'page' : undefined"
        @click="navigate('defaults')"
      >
        <SlidersHorizontal :size="18" /><span
          >Configuração padrão<small>Itens e runas de base</small></span
        >
      </button>
      <div class="roster-heading">
        <span>Matchups</span><span>{{ visibleCount }} no site</span>
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
          No site
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
          ><span
            v-if="guide?.matchups[champion.id]?.visible"
            class="visibility-dot"
            aria-hidden="true"
            title="Visível no site"
          />
        </button>
        <p v-if="catalog && !champions.length" class="empty-state">Nenhum campeão encontrado.</p>
      </nav>
      <a class="back-link" href="/"><ArrowLeft :size="16" /> Voltar ao site</a>
    </aside>
    <main class="admin-main">
      <header class="admin-toolbar">
        <span class="editor-breadcrumb"
          >Guia de Riven <span>/</span> {{ isDefault ? 'Padrão' : title }}</span
        >
        <div class="autosave-state" :class="{ error: failed }">
          <p role="status" aria-live="polite">
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
                    ? 'O ponto de partida para todos os matchups.'
                    : 'Prepare a Riven para este duelo.'
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
              draft.visible ? 'Visível no site' : 'Oculto no site'
            }}</span
            ><component :is="draft.visible ? Eye : EyeOff" :size="16"
          /></label>
        </div>
        <div class="editor-meta">
          <span class="patch-badge">Patch {{ catalog?.version ?? '…' }}</span
          ><span>Publicação junto ao tracker</span
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
          <form class="editor-sections" @submit.prevent="save">
            <section
              v-if="!isDefault"
              id="panel-duel"
              class="editor-panel duel-panel"
              aria-labelledby="heading-duel"
            >
              <div class="section-heading">
                <div>
                  <h2 id="heading-duel">Avaliação do duelo</h2>
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
              id="panel-build"
              class="editor-panel build-panel"
              aria-labelledby="heading-build"
            >
              <div class="section-heading">
                <div>
                  <h2 id="heading-build">Itens</h2>
                  <p>
                    {{
                      isDefault
                        ? 'Monte a sequência de compra padrão da Riven.'
                        : draft.build
                          ? 'Build personalizada para este matchup.'
                          : 'Este matchup herda os itens da configuração padrão.'
                    }}
                  </p>
                </div>
                <button
                  v-if="!isDefault"
                  type="button"
                  class="secondary-button"
                  @click="toggle('build')"
                >
                  {{ draft.build ? 'Usar padrão' : 'Personalizar' }}
                </button>
              </div>
              <GuideBuildEditor
                v-model="build"
                :catalog="catalog"
                :disabled="!draft.build"
                @pick="pick"
              />
            </section>
            <section
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
                          : 'Este matchup herda as runas da configuração padrão.'
                    }}
                  </p>
                </div>
                <button
                  v-if="!isDefault"
                  type="button"
                  class="secondary-button"
                  @click="toggle('runes')"
                >
                  {{ draft.runes ? 'Usar padrão' : 'Personalizar' }}
                </button>
              </div>
              <GuideRuneEditor v-model="runes" :catalog="catalog" :disabled="!draft.runes" />
            </section>
          </form>
        </template>
      </div>
    </main>
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
