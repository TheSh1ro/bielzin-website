<script setup lang="ts">
import RivenItem from './RivenItem.vue'
import type { Itemization } from '@/lib/riven-guide'
import type { Item } from '@/lib/data-dragon'

defineProps<{ content: Itemization; items: Record<string, Item>; version: string }>()
</script>

<template>
  <section class="boots-guide" aria-labelledby="riven-boots-title">
    <h2 id="riven-boots-title">Botas</h2>
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
  border-top: 1px solid var(--riven-line);
  padding-top: 24px;
  min-width: 0;
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
  gap: 18px;
  margin-top: 20px;
}
li > p {
  margin-top: 6px;
}
</style>
