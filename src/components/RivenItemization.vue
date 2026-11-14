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
        v-for="(option, index) in content.routes"
        :key="option.id"
        type="button"
        :aria-pressed="route?.id === option.id"
        @click="routeId = option.id"
      >
        <span class="route-number" aria-hidden="true">0{{ index + 1 }}</span>
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
      <header class="route-intro">
        <span class="route-caption">Sequência de itens</span>
        <h4>{{ route.title }}</h4>
        <p class="route-when">{{ route.when }}</p>
      </header>
      <ol class="route-items" aria-label="Sequência da rota">
        <li v-for="(id, index) in route.items" :key="index">
          <span class="step"
            ><span>{{ index + 1 }}</span></span
          ><RivenItem :id="id" :items="items" :version="version" />
        </li>
      </ol>
      <details class="explanation">
        <summary>
          <span>Explicação da build</span><ChevronDown :size="18" aria-hidden="true" />
        </summary>
        <div class="explanation-body">
          <p>{{ route.reason }}</p>
          <ul v-if="route.components.length" class="choices">
            <li v-for="(choice, index) in route.components" :key="index">
              <RivenItem :id="choice.item" :items="items" :version="version" />
              <p>{{ choice.condition }}</p>
            </li>
          </ul>
          <p class="explanation-followup">{{ route.followup }}</p>
        </div>
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
  gap: 8px;
}
.route-picker button {
  display: flex;
  gap: 8px;
  align-items: center;
  position: relative;
  padding: 22px 28px 16px 12px;
  min-height: 76px;
  text-align: left;
  border: 1px solid var(--riven-line);
  color: var(--riven-muted);
  background: linear-gradient(135deg, #d3aad208, #100d1240);
  font-size: 0.8125rem;
}
.route-picker button[aria-pressed='true'] {
  color: #f5def7;
  border-color: #d7a7de80;
  background: linear-gradient(120deg, #d3a1df20, #d3a1df04);
  box-shadow: inset 0 -2px var(--riven-green);
}
.route-picker button:hover {
  background: var(--riven-hover);
}
.route-picker img {
  flex: none;
}
small {
  display: block;
  font-size: 0.8125rem;
  color: var(--riven-muted);
}
.route-number {
  position: absolute;
  right: 8px;
  top: 8px;
  font: 0.8125rem var(--mono);
  color: #d5b6df65;
}
.route-content {
  margin-top: 22px;
  padding: 22px 0 0;
  border-top: 1px solid var(--riven-line);
}
.route-caption {
  color: var(--riven-green);
  font: 0.8125rem var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.route-intro h4 {
  margin: 8px 0;
  color: #f3e6f5;
  font: 600 1.375rem var(--display);
  letter-spacing: -0.035em;
}
.route-items {
  display: grid;
  gap: 0;
  margin: 22px 0;
  border-block: 1px solid var(--riven-line);
}
.route-items li {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  padding: 14px 0;
}
.route-items li + li {
  border-top: 1px solid var(--riven-line);
}
.step {
  display: grid;
  place-items: center;
  flex: none;
  font: 0.75rem var(--mono);
  color: var(--riven-green);
  width: 28px;
  height: 28px;
  border: 1px solid #d4a6dc45;
  background: #d4a6dc0a;
  transform: rotate(45deg);
}
.step > span {
  transform: rotate(-45deg);
}
.explanation {
  border: 1px solid #d7a7de35;
  background: linear-gradient(120deg, #d3a1df0c, #100d1260);
}
.explanation[open] {
  border-color: #d7a7de60;
}
summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  padding: 16px 20px;
  cursor: pointer;
  font: 500 1rem/1.4 var(--display);
  color: var(--riven-green);
  list-style: none;
}
summary:hover {
  background: var(--riven-hover);
}
summary > svg {
  flex: none;
  padding: 6px;
  box-sizing: content-box;
  border: 1px solid #d7a7de35;
  border-radius: 50%;
  transition: transform 180ms ease;
}
.explanation[open] > summary {
  border-bottom: 1px solid var(--riven-line);
}
.explanation-body {
  padding: 20px;
  line-height: 1.75;
}
.explanation-body .choices {
  gap: 18px;
  margin-block: 20px;
  padding-left: 16px;
  border-left: 2px solid #d7a7de35;
}
.explanation-followup {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--riven-line);
}
@media (prefers-reduced-motion: reduce) {
  summary > svg {
    transition: none;
  }
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
    grid-template-columns: 1fr 1fr;
  }
}
</style>
