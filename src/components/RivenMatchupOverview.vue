<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ChevronRight, Search } from 'lucide-vue-next'
import { riotImage, type ChampionSummary, type Item } from '@/lib/data-dragon'
import {
  filterChampionText,
  guideBuild,
  guideMatchup,
  guideOutlookLabel,
  guideRecommendedRoute,
  guideRunePage,
} from '@/lib/riven-guide'

const props = defineProps<{
  champions: ChampionSummary[]
  selectedId: string
  version: string
  items: Record<string, Item>
}>()
const emit = defineEmits<{ select: [id: string] }>()
const dialog = ref<HTMLDialogElement>()
const list = ref<HTMLElement>()
const isOpen = ref(false)
const query = ref('')

function open() {
  if (!dialog.value || dialog.value.open) return
  query.value = ''
  list.value?.scrollTo(0, 0)
  dialog.value.showModal()
  isOpen.value = true
}

function select(id: string) {
  emit('select', id)
  dialog.value?.close()
}

defineExpose({ open })

const rows = computed(() => {
  if (!isOpen.value) return []
  const term = filterChampionText(query.value)
  return props.champions
    .filter(
      ({ id, name }) =>
        filterChampionText(name).includes(term) || filterChampionText(id).includes(term),
    )
    .map((champion) => {
      const matchup = guideMatchup(champion.id)
      const build = guideBuild(champion.id)
      const route = guideRecommendedRoute(champion.id)
      const page = guideRunePage(champion.id)
      const itemIcons = (route?.items ?? build?.core ?? []).flatMap((id) => {
        const item = props.items[id]
        return item && id !== build?.boots && !item.tags?.includes('Boots') ? [item] : []
      })
      return {
        champion,
        outlooks: [
          { label: 'Early', value: matchup?.early },
          { label: 'Late', value: matchup?.late },
        ],
        itemIcons,
        runeGroups: page
          ? [
              {
                label: 'Primárias',
                icons: page.primary?.slots
                  .flat()
                  .filter(({ id }) => page.selection.primary.includes(id)),
              },
              {
                label: 'Secundárias',
                icons: page.secondary?.slots
                  .flat()
                  .filter(({ id }) => page.selection.secondary.includes(id)),
              },
              {
                label: 'Fragmentos',
                icons: page.shards.flatMap((slot, index) =>
                  slot.filter(({ id }) => id === page.selection.shards[index]),
                ),
              },
            ].filter(({ icons }) => icons?.length)
          : [],
      }
    })
})
</script>

<template>
  <dialog
    ref="dialog"
    class="matchups-overview"
    aria-labelledby="matchups-overview-title"
    @close="isOpen = false"
    @keydown.esc.prevent="dialog?.close()"
    @wheel.stop
  >
    <div class="overview-page">
      <header class="overview-header overview-width">
        <button class="overview-back" type="button" autofocus @click="dialog?.close()">
          <ArrowLeft :size="16" aria-hidden="true" /> Voltar ao guia
        </button>
        <h2 id="matchups-overview-title">Todas as matchups</h2>
        <label class="overview-search">
          <Search :size="17" aria-hidden="true" />
          <span class="sr-only">Filtrar matchups por campeão</span>
          <input
            v-model="query"
            type="search"
            placeholder="Buscar campeão"
            autocomplete="off"
            @input="list?.scrollTo(0, 0)"
          />
        </label>
      </header>
      <div ref="list" class="overview-scroll overview-width">
        <div v-if="rows.length">
          <div class="overview-grid overview-columns" aria-hidden="true">
            <span>Oponente</span><span>Dificuldade</span><span>Build</span><span>Runas</span>
          </div>
          <ul class="overview-rows" aria-label="Matchups">
            <li v-for="row in rows" :key="row.champion.id" class="overview-grid overview-row">
              <button
                type="button"
                class="overview-champion"
                :aria-current="row.champion.id === selectedId ? 'true' : undefined"
                @click="select(row.champion.id)"
              >
                <img
                  :src="riotImage(version, 'champion', row.champion.image.full)"
                  alt=""
                  width="42"
                  height="42"
                  loading="lazy"
                />
                <span>{{ row.champion.name }}</span>
                <ChevronRight :size="15" aria-hidden="true" />
              </button>
              <dl class="overview-outlooks" aria-label="Dificuldade">
                <div v-for="outlook in row.outlooks" :key="outlook.label">
                  <dt>{{ outlook.label }}</dt>
                  <dd :data-outlook="outlook.value">
                    {{ guideOutlookLabel(outlook.value, row.champion.id) }}
                  </dd>
                </div>
              </dl>
              <div class="overview-build">
                <span class="overview-mobile-label" aria-hidden="true">Build</span>
                <ul v-if="row.itemIcons.length" class="overview-icons" aria-label="Itens da build">
                  <li v-for="(item, index) in row.itemIcons" :key="index">
                    <img
                      :src="riotImage(version, 'item', item.image.full)"
                      :alt="item.name"
                      :title="item.name"
                      width="32"
                      height="32"
                      loading="lazy"
                    />
                  </li>
                </ul>
                <span v-else class="overview-unavailable">Itens indisponíveis</span>
              </div>
              <div class="overview-runes">
                <span class="overview-mobile-label" aria-hidden="true">Runas</span>
                <div
                  v-if="row.runeGroups.length"
                  class="overview-rune-groups"
                  role="group"
                  aria-label="Runas"
                >
                  <ul
                    v-for="group in row.runeGroups"
                    :key="group.label"
                    class="overview-icons"
                    :aria-label="group.label"
                  >
                    <li v-for="(rune, index) in group.icons" :key="index">
                      <img
                        :src="rune.icon"
                        :alt="rune.name"
                        :title="rune.name"
                        width="24"
                        height="24"
                        loading="lazy"
                      />
                    </li>
                  </ul>
                </div>
                <span v-else class="overview-unavailable">Runas indisponíveis</span>
              </div>
            </li>
          </ul>
        </div>
        <p v-else class="overview-empty" role="status">Nenhum campeão encontrado.</p>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.matchups-overview {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: #080808;
  color: inherit;
}

.overview-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.overview-width {
  width: min(90%, 1440px);
  margin-inline: auto;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}

.overview-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
  align-items: end;
  gap: 12px 24px;
  padding-block: 12px 24px;
  overflow: hidden;
}

.overview-back {
  grid-column: 1 / -1;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: var(--riven-muted);
  font-size: 0.875rem;
}

.overview-header h2 {
  font: 500 clamp(1.625rem, 3vw, 2.375rem)/1.1 var(--display);
  letter-spacing: -0.045em;
}

.overview-search {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding-inline: 12px;
  border: 1px solid var(--riven-line);
  background: #ffffff05;
  color: var(--riven-muted);
}

.overview-search:focus-within {
  border-color: var(--riven-green);
}

.overview-search svg {
  flex: none;
}

.overview-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  background: none;
  color: #eeecec;
}

.overview-search input:focus-visible {
  outline: none;
  box-shadow: none;
}

.overview-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-color: #75676f transparent;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(150px, 0.85fr) minmax(188px, 1fr) minmax(188px, 1fr) minmax(
      248px,
      1.35fr
    );
  align-items: center;
  column-gap: clamp(12px, 2vw, 32px);
}

.overview-columns,
.overview-mobile-label,
.overview-outlooks dt {
  color: var(--riven-muted);
  font: 400 0.6875rem/1.25 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.overview-columns {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 13px 12px;
  border-block: 1px solid var(--riven-line);
  background: #080808;
}

.overview-rows,
.overview-icons {
  margin: 0;
  padding: 0;
  list-style: none;
}

.overview-row {
  min-height: 72px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--riven-line);
}

.overview-row:focus-within {
  background: var(--riven-hover);
}

.overview-champion {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-inline: -4px;
  padding: 4px;
  color: inherit;
  text-align: left;
  font: 600 0.9375rem/1.2 var(--display);
}

.overview-champion img,
.overview-champion svg {
  flex: none;
}

.overview-champion img {
  background: #181418;
}

.overview-champion svg {
  margin-left: auto;
  color: var(--riven-muted);
}

.overview-champion:hover,
.overview-champion[aria-current='true'],
.overview-back:hover {
  color: var(--riven-green);
}

.overview-outlooks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.overview-outlooks dd {
  margin: 3px 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
}

.overview-outlooks [data-outlook='unfavorable'] {
  color: var(--riven-warm);
}

.overview-outlooks [data-outlook='favorable'] {
  color: #b3cbba;
}

.overview-icons,
.overview-rune-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.overview-icons img {
  display: block;
  object-fit: contain;
}

.overview-build img {
  border-radius: 3px;
  background: #181418;
}

.overview-rune-groups > ul + ul {
  margin-left: 3px;
  padding-left: 7px;
  border-left: 1px solid var(--riven-line);
}

.overview-unavailable,
.overview-empty {
  color: var(--riven-muted);
  font-size: 0.875rem;
}

.overview-empty {
  padding-block: 20px;
}

.overview-mobile-label {
  display: none;
}

@media (max-width: 1000px) {
  .overview-columns {
    display: none;
  }

  .overview-row {
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: 12px;
    padding: 14px 0;
  }

  .overview-row:first-child {
    border-top: 1px solid var(--riven-line);
  }

  .overview-build,
  .overview-runes {
    align-self: start;
  }

  .overview-mobile-label {
    display: block;
    margin-bottom: 6px;
  }
}

@media (max-width: 540px) {
  .overview-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding-bottom: 16px;
  }

  .overview-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
}
</style>
