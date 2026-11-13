<script setup lang="ts">
import type { GuideCatalog } from '@/lib/guide-admin'
const ids = defineModel<number[]>({ required: true })
defineProps<{ catalog: GuideCatalog; label: string; limit?: number }>()
const emit = defineEmits<{ pick: [action: (id: number) => void, category?: 'boots'] }>()
function move(index: number, offset: number) {
  const values = [...ids.value]
  ;[values[index], values[index + offset]] = [values[index + offset]!, values[index]!]
  ids.value = values
}
</script>
<template>
  <ol class="sequence-editor" :aria-label="label">
    <li v-for="(id, index) in ids" :key="index">
      <button
        type="button"
        class="secondary-button"
        :aria-label="`Trocar ${label} ${index + 1}`"
        @click="emit('pick', (value) => (ids[index] = value))"
      >
        <img
          v-if="catalog.items[id]"
          :src="catalog.items[id]!.icon"
          width="28"
          height="28"
          alt=""
        />{{ catalog.items[id]?.name ?? `Item ${id} indisponível neste patch` }}
      </button>
      <button
        type="button"
        class="icon-button"
        :disabled="index === 0"
        :aria-label="`Mover ${label} ${index + 1} para cima`"
        @click="move(index, -1)"
      >
        ↑
      </button>
      <button
        type="button"
        class="icon-button"
        :disabled="index === ids.length - 1"
        :aria-label="`Mover ${label} ${index + 1} para baixo`"
        @click="move(index, 1)"
      >
        ↓
      </button>
      <button
        type="button"
        class="icon-button remove-button"
        :aria-label="`Remover ${label} ${index + 1}`"
        @click="ids.splice(index, 1)"
      >
        ×
      </button>
    </li>
  </ol>
  <button
    v-if="ids.length < (limit ?? 6)"
    type="button"
    class="secondary-button"
    @click="emit('pick', (value) => ids.push(value))"
  >
    Adicionar {{ label }}
  </button>
</template>
