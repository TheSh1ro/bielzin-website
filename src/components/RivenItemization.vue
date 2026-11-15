<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import RivenItem from './RivenItem.vue'
import type { BuildRoute, LanePlan } from '@/lib/riven-guide'
import { riotImage, type Item } from '@/lib/data-dragon'
defineProps<{
  routes: BuildRoute[]
  plan?: LanePlan | null
  opponent: string
  items: Record<string, Item>
  version: string
  alternatives?: boolean
}>()
</script>
<template>
  <div class="itemization" :class="{ 'itemization-alternatives': alternatives }">
    <section
      v-if="!alternatives && plan?.components.length"
      class="lane-plan"
      aria-label="Compras antecipadas"
    >
      <h3>Compras antecipadas contra {{ opponent }}</h3>
      <ul class="choices">
        <li v-for="(choice, index) in plan.components" :key="index">
          <RivenItem :id="choice.item" :items="items" :version="version" />
          <p>{{ choice.condition }}</p>
        </li>
      </ul>
    </section>
    <h3 v-if="alternatives" class="alternatives-heading">Outras builds</h3>
    <component
      :is="alternatives ? 'details' : 'div'"
      v-for="route in routes"
      :key="opponent + route.id"
      :class="alternatives ? 'alternative-build' : 'route-content'"
      :aria-label="alternatives ? route.title : undefined"
    >
      <summary v-if="alternatives">
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
      <div :class="{ 'alternative-body': alternatives }">
        <p v-if="alternatives">{{ route.when }}</p>
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
  </div>
</template>
<style scoped>
.itemization {
  font-size: 0.9375rem;
  line-height: 1.7;
}
.itemization-alternatives {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--riven-line);
}
p {
  white-space: pre-line;
  color: var(--riven-muted);
}
h3 {
  color: #f4f8f5;
  font-size: 1.125rem;
  font-weight: 600;
}
.lane-plan {
  margin-bottom: 22px;
}
.lane-plan h3 {
  color: #ded6d9;
  font-size: 1rem;
  font-weight: 600;
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
.route-items {
  display: grid;
  gap: 0;
  margin: 22px 0;
  border-block: 1px solid var(--riven-line);
}
.route-content .route-items {
  margin-top: 0;
}
.route-items li {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  padding: 18px 0;
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
  font-size: 0.9375rem;
}
.alternatives-heading {
  margin-bottom: 12px;
  color: #ded6d9;
}
.alternative-build {
  border-bottom: 1px solid var(--riven-line);
}
.alternative-build > summary {
  padding-inline: 0;
  font-size: 1rem;
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
  width: 40px;
  height: 40px;
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
