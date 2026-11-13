<script setup lang="ts">
import type { ItemChoice } from '@/lib/riven-guide'
import type { GuideCatalog } from '@/lib/guide-admin'
const choices = defineModel<ItemChoice[]>({ required: true })
defineProps<{
  catalog: GuideCatalog
  label: string
  prefix: string
  boots?: boolean
  limit?: number
}>()
const emit = defineEmits<{ pick: [action: (id: number) => void, category?: 'boots'] }>()
function move(index: number, offset: number) {
  const values = [...choices.value]
  ;[values[index], values[index + offset]] = [values[index + offset]!, values[index]!]
  choices.value = values
}
</script>
<template>
  <div class="choices-editor">
    <div v-for="(choice, index) in choices" :key="index" class="choice-editor">
      <div class="choice-editor-heading">
        <button
          type="button"
          class="secondary-button"
          :aria-label="`Trocar ${label} ${index + 1}`"
          @click="emit('pick', (value) => (choice.item = value), boots ? 'boots' : undefined)"
        >
          <img
            v-if="catalog.items[choice.item]"
            :src="catalog.items[choice.item]!.icon"
            width="28"
            height="28"
            alt=""
          />{{ catalog.items[choice.item]?.name ?? `Item ${choice.item} indisponível neste patch` }}
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
          :disabled="index === choices.length - 1"
          :aria-label="`Mover ${label} ${index + 1} para baixo`"
          @click="move(index, 1)"
        >
          ↓
        </button>
        <button
          type="button"
          class="icon-button remove-button"
          :aria-label="`Remover ${label} ${index + 1}`"
          @click="choices.splice(index, 1)"
        >
          ×
        </button>
      </div>
      <label :for="`${prefix}-${index}`">{{ label }} {{ index + 1 }} · Quando e por quê</label>
      <textarea :id="`${prefix}-${index}`" v-model="choice.condition" rows="3" maxlength="1000" />
    </div>
    <button
      v-if="choices.length < (limit ?? 20)"
      type="button"
      class="secondary-button"
      @click="
        emit('pick', (item) => choices.push({ item, condition: '' }), boots ? 'boots' : undefined)
      "
    >
      Adicionar {{ label }}
    </button>
  </div>
</template>
