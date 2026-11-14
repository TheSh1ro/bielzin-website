<script setup lang="ts">
import modelFiles from '@/data/champion-models.json'
import { computed, defineAsyncComponent } from 'vue'
import type { ChampionSummary } from '@/lib/data-dragon'

const LocalChampionModel = defineAsyncComponent(() => import('./LocalChampionModel.vue'))
const props = defineProps<{ champion: ChampionSummary }>()
const localSource = computed(() => (modelFiles as Record<string, string>)[props.champion.id])
</script>

<template>
  <section class="champion-stage" :aria-label="`Modelo 3D de ${champion.name}`">
    <LocalChampionModel
      v-if="localSource"
      :key="champion.id"
      :source="localSource"
      :champion="champion.name"
    />
  </section>
</template>

<style scoped>
.champion-stage {
  min-width: 0;
  min-height: var(--champion-model-height, 480px);
  overflow: clip;
}
@media (max-width: 740px) {
  .champion-stage {
    min-height: var(--champion-model-height, 380px);
  }
}
</style>
