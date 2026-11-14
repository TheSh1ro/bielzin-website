<script setup lang="ts">
import RivenItem from './RivenItem.vue'
import type { Itemization } from '@/lib/riven-guide'
import type { Item } from '@/lib/data-dragon'

defineProps<{ content: Itemization; items: Record<string, Item>; version: string }>()
</script>

<template>
  <section class="boots-guide" aria-labelledby="riven-boots-title">
    <header>
      <span class="boots-label">Mobilidade & resistência</span>
      <h2 id="riven-boots-title">Botas</h2>
    </header>
    <p>{{ content.bootsNote }}</p>
    <ul>
      <li v-for="(choice, index) in content.boots" :key="index">
        <RivenItem :id="choice.item" :items="items" :version="version" />
        <p>{{ choice.condition }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.boots-guide {
  border: 1px solid var(--riven-line);
  padding: 24px;
  background: radial-gradient(ellipse at 100% 0, #d3a4df0c, transparent 65%);
  min-width: 0;
}
.boots-label {
  display: block;
  margin-bottom: 8px;
  color: var(--riven-green);
  font: 0.8125rem var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
h2 {
  font: 600 1.375rem var(--display);
  margin-bottom: 12px;
}
p {
  white-space: pre-line;
  color: var(--riven-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}
ul {
  display: grid;
  gap: 0;
  margin-top: 20px;
}
li {
  padding-block: 18px;
}
li + li {
  border-top: 1px solid var(--riven-line);
}
li:last-child {
  padding-bottom: 0;
}
li > p {
  margin-top: 6px;
}
</style>
