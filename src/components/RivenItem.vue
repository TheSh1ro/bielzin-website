<script setup lang="ts">
import { riotImage, type Item } from '@/lib/data-dragon'
defineProps<{ id: number; items: Record<string, Item>; version: string }>()
</script>
<template>
  <span class="item-label">
    <template v-if="items[id]">
      <img
        :src="riotImage(version, 'item', items[id]!.image.full)"
        alt=""
        width="40"
        height="40"
        loading="lazy"
      />
      <span>{{ items[id]!.name }}</span>
    </template>
    <span v-else>Item {{ id }} indisponível neste patch</span>
  </span>
</template>
<style scoped>
.item-label {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.4;
}
.item-label > span {
  overflow-wrap: anywhere;
}
img {
  flex: none;
  border: 1px solid var(--riven-line);
}
</style>
