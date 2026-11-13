<script setup lang="ts">
import modelFiles from '@/data/champion-models.json'
import { computed, defineAsyncComponent, ref } from 'vue'
const LocalChampionModel = defineAsyncComponent(() => import('./LocalChampionModel.vue'))
import type { ChampionSummary } from '@/lib/data-dragon'
const props = defineProps<{ champion: ChampionSummary }>()
const localSource = computed(() => (modelFiles as Record<string, string>)[props.champion.id])
const failed = ref(false)
const attempt = ref(0)
const modelId = computed(() =>
  props.champion.key && /^\d+$/.test(props.champion.key)
    ? String(Number(props.champion.key) * 1000)
    : '',
)
const source = computed(
  () =>
    'https://modelviewer.lol/embed?' +
    new URLSearchParams({ id: modelId.value, dark: 'true', background: '101512', lang: 'pt-BR' }),
)
function retry() {
  failed.value = false
  attempt.value++
}
</script>
<template>
  <section class="champion-stage" :aria-label="`Modelo 3D de ${champion.name}`">
    <LocalChampionModel
      v-if="localSource"
      :key="champion.id"
      :source="localSource"
      :champion="champion.name"
    />
    <iframe
      v-else-if="modelId && !failed"
      :key="attempt"
      :src="source"
      :title="`Modelo 3D de ${champion.name}`"
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="fullscreen"
      allowfullscreen
      @error="failed = true"
    />
    <div v-else class="model-fallback">
      <p>O modelo 3D está indisponível.</p>
      <button v-if="modelId" type="button" @click="retry">Tentar novamente</button>
    </div>
    <footer>
      <span>Arraste para girar · role para aproximar</span
      ><a
        v-if="!localSource"
        :href="
          modelId
            ? `https://modelviewer.lol/embed?id=${modelId}`
            : 'https://modelviewer.lol/champions'
        "
        target="_blank"
        rel="noopener noreferrer"
        >Abrir no Khada ↗</a
      >
    </footer>
  </section>
</template>
<style scoped>
.champion-stage {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
iframe {
  display: block;
  width: 100%;
  min-height: 480px;
  flex: 1;
  border: 0;
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 0;
  color: var(--riven-muted);
  font-size: 0.6875rem;
}
footer a,
button {
  color: var(--riven-green);
}
.model-fallback {
  display: grid;
  place-content: center;
  gap: 12px;
  min-height: 480px;
  flex: 1;
  text-align: center;
  font-size: 0.875rem;
  color: var(--riven-muted);
}
@media (max-width: 740px) {
  iframe,
  .model-fallback {
    min-height: 380px;
  }
}
</style>
