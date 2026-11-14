<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import RivenItem from './RivenItem.vue'
import type { Itemization, LanePlan } from '@/lib/riven-guide'
import { riotImage, type Item } from '@/lib/data-dragon'
const props = defineProps<{
  content: Itemization
  plan?: LanePlan | null
  opponent: string
  items: Record<string, Item>
  version: string
}>()
const recommended = computed(
  () =>
    props.content.routes.find((r) => r.id === (props.plan?.route ?? props.content.defaultRoute)) ??
    props.content.routes[0],
)
const routes = computed(() =>
  recommended.value
    ? [recommended.value, ...props.content.routes.filter((r) => r.id !== recommended.value?.id)]
    : [],
)
</script>
<template>
  <div class="itemization">
    <section v-if="plan?.components.length" class="lane-plan" aria-label="Compras antecipadas">
      <h3>Compras antecipadas contra {{ opponent }}</h3>
      <ul v-if="plan.components.length" class="choices">
        <li v-for="(choice, index) in plan.components" :key="index">
          <RivenItem :id="choice.item" :items="items" :version="version" />
          <p>{{ choice.condition }}</p>
        </li>
      </ul>
    </section>
    <h3 class="route-heading">O que buildar contra {{ opponent }}</h3>
    <template v-for="(route, routeIndex) in routes" :key="opponent + route.id">
      <h3 v-if="routeIndex === 1" class="alternatives-heading">Outras builds</h3>
      <component
        :is="routeIndex === 0 ? 'section' : 'details'"
        :class="routeIndex === 0 ? 'route-content' : 'alternative-build'"
        :aria-label="routeIndex === 0 ? 'Build indicada' : route.title"
      >
        <summary v-if="routeIndex > 0">
          <span class="alternative-title">
            <img
              v-if="route.items[0] && items[route.items[0]]"
              :src="riotImage(version, 'item', items[route.items[0]]!.image.full)"
              alt=""
              width="32"
              height="32"
              loading="lazy"
            />
            <span>{{ route.title }}</span> </span
          ><ChevronDown :size="18" aria-hidden="true" />
        </summary>
        <div :class="{ 'alternative-body': routeIndex > 0 }">
          <header class="route-intro">
            <span v-if="routeIndex === 0" class="route-caption">{{
              plan?.route ? 'Indicada para esta lane' : 'Build padrão'
            }}</span>
            <h4 v-if="routeIndex === 0">{{ route.title }}</h4>
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
        </div>
      </component>
    </template>
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
  margin-block: 28px 32px;
}
.lane-plan h3 {
  color: var(--riven-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}
.lane-plan .choices {
  margin-top: 12px;
  gap: 20px;
}
.lane-plan .choices li {
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 58ch);
  align-items: start;
  gap: 12px 24px;
}
.lane-plan .choices p {
  margin: 0;
  line-height: 1.7;
}
.route-heading {
  margin-bottom: 16px;
}
.route-content {
  margin-top: 12px;
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
  position: relative;
  flex: none;
  font: 0.75rem var(--mono);
  color: var(--riven-green);
  width: 40px;
  height: 40px;
}
.step::before {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  border: 1px solid #d4a6dc45;
  background: #d4a6dc0a;
  transform: rotate(45deg);
}
.step > span {
  position: relative;
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
.alternatives-heading {
  margin: 32px 0 12px;
  color: var(--riven-muted);
}
.alternative-build {
  border-bottom: 1px solid var(--riven-line);
}
.alternative-build > summary {
  padding-inline: 0;
  font-size: 0.875rem;
  color: inherit;
}
.alternative-body {
  padding-block: 8px 24px;
}
.alternative-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.alternative-title img {
  flex: none;
  border: 1px solid var(--riven-line);
}
@media (max-width: 640px) {
  .lane-plan .choices li {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
