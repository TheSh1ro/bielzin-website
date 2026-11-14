<script setup lang="ts">
import RivenItem from './RivenItem.vue'
import type { Itemization } from '@/lib/riven-guide'
import type { Item } from '@/lib/data-dragon'

defineProps<{ content: Itemization; items: Record<string, Item>; version: string }>()
</script>

<template>
  <section class="boots-guide" aria-labelledby="riven-boots-title">
    <h3 id="riven-boots-title">Botas</h3>
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
  margin-top: 24px;
  min-width: 0;
}
h3 {
  color: #ded6d9;
  font: 600 1.125rem/1.3 var(--display);
  margin-bottom: 12px;
}
p {
  white-space: pre-line;
  color: var(--riven-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
}
ul {
  display: grid;
  gap: 22px;
  margin-top: 24px;
}
li > p {
  margin-top: 6px;
  padding-left: 52px;
  color: #b9b2b5;
}
</style>
