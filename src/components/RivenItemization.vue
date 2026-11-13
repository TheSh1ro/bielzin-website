<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import RivenItem from './RivenItem.vue'
import type { Itemization, LanePlan } from '@/lib/riven-guide'
import type { Item } from '@/lib/data-dragon'
const props = defineProps<{
  content: Itemization
  plan?: LanePlan | null
  opponent: string
  items: Record<string, Item>
  version: string
}>()
const routeId = ref('')
watch(
  () => [props.opponent, props.plan?.route, props.content.defaultRoute],
  () => {
    routeId.value = props.plan?.route ?? props.content.defaultRoute
  },
  { immediate: true },
)
const route = computed(
  () => props.content.routes.find((r) => r.id === routeId.value) ?? props.content.routes[0],
)
</script>
<template>
  <div class="itemization">
    <p class="intro">{{ content.intro }}</p>
    <section
      v-if="plan?.reason || plan?.components.length"
      class="lane-plan"
      aria-label="Plano para a lane"
    >
      <h3>Na lane contra {{ opponent }}</h3>
      <p v-if="plan.reason">{{ plan.reason }}</p>
      <ul v-if="plan.components.length" class="choices">
        <li v-for="(choice, index) in plan.components" :key="index">
          <RivenItem :id="choice.item" :items="items" :version="version" />
          <p>{{ choice.condition }}</p>
        </li>
      </ul>
    </section>
    <h3 class="route-heading">Qual build fazer neste jogo?</h3>
    <div class="route-picker" role="group" aria-label="Rotas de build">
      <button
        v-for="option in content.routes"
        :key="option.id"
        type="button"
        :aria-pressed="route?.id === option.id"
        @click="routeId = option.id"
      >
        <img
          v-if="items[option.items[0]!]"
          :src="
            'https://ddragon.leagueoflegends.com/cdn/' +
            version +
            '/img/item/' +
            items[option.items[0]!]!.image.full
          "
          width="28"
          height="28"
          alt=""
        />
        <span
          >{{ option.title
          }}<small v-if="plan?.route === option.id">Indicada para esta lane</small></span
        >
      </button>
    </div>
    <section
      v-if="route"
      :key="route.id"
      class="route-content"
      aria-label="Rota selecionada"
      aria-live="polite"
    >
      <p class="route-when">{{ route.when }}</p>
      <ol class="route-items" aria-label="Sequência da rota">
        <li v-for="(id, index) in route.items" :key="index">
          <span class="step">{{ index + 1 }}</span
          ><RivenItem :id="id" :items="items" :version="version" />
        </li>
      </ol>
      <details class="explanation" open>
        <summary>Por que fazer e o que buildar depois <ChevronDown :size="16" /></summary>
        <p>{{ route.reason }}</p>
        <ul v-if="route.components.length" class="choices">
          <li v-for="(choice, index) in route.components" :key="index">
            <RivenItem :id="choice.item" :items="items" :version="version" />
            <p>{{ choice.condition }}</p>
          </li>
        </ul>
        <p>{{ route.followup }}</p>
      </details>
    </section>
  </div>
</template>
<style scoped>
.itemization {
  font-size: 0.875rem;
  line-height: 1.55;
}
p {
  white-space: pre-line;
  color: var(--riven-muted);
}
h3 {
  color: #f4f8f5;
  font-size: 0.875rem;
  font-weight: 600;
}
.intro {
  margin: 0 0 16px;
}
.lane-plan {
  border-left: 2px solid var(--riven-green);
  padding: 0 0 0 12px;
  margin-bottom: 18px;
}
.lane-plan > p {
  margin-top: 5px;
}
.route-heading {
  margin-bottom: 8px;
}
.route-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.route-picker button {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px;
  min-height: 48px;
  text-align: left;
  border: 1px solid var(--riven-line);
  color: var(--riven-muted);
  background: #0002;
  font-size: 0.8125rem;
}
.route-picker button[aria-pressed='true'] {
  color: var(--riven-green);
  border-color: #b4eed080;
  background: var(--riven-hover);
}
.route-picker button:hover {
  background: var(--riven-hover);
}
.route-picker img {
  flex: none;
}
small {
  display: block;
  font-size: 0.6875rem;
  color: var(--riven-muted);
}
.route-content {
  margin-top: 12px;
}
.route-items {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}
.route-items li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step {
  font: 0.75rem var(--mono);
  color: var(--riven-green);
  width: 12px;
}
summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  color: var(--riven-green);
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
details[open] > summary > svg {
  transform: rotate(180deg);
}
.explanation p + p {
  margin-top: 8px;
}
.choices {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}
.choices p {
  margin-top: 4px;
  font-size: 0.8125rem;
}
@media (max-width: 420px) {
  .route-picker {
    grid-template-columns: 1fr;
  }
}
</style>
