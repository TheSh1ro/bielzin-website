<script setup lang="ts">
import { Plus, X, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-vue-next'
import type { GuideBuild } from '@/lib/riven-guide'
import type { GuideCatalog } from '@/lib/guide-admin'

const build = defineModel<GuideBuild>({ required: true })
defineProps<{ catalog: GuideCatalog; disabled: boolean }>()
const emit = defineEmits<{ pick: [action: (id: number) => void, category?: 'boots'] }>()
type Group = 'start' | 'boots' | 'core'
const groups: { key: Group; title: string; limit: number }[] = [
  { key: 'start', title: 'Itens iniciais', limit: 6 },
  { key: 'boots', title: 'Botas', limit: 1 },
  { key: 'core', title: 'Ordem de compra', limit: 6 },
]
function ids(key: Group) {
  return key === 'boots' ? (build.value.boots ? [build.value.boots] : []) : build.value[key]
}
function update(key: Group, values: number[]) {
  if (key === 'boots') build.value.boots = values[0] ?? null
  else build.value[key] = values
}
function move(key: Group, index: number, offset: number) {
  const values = [...ids(key)]
  ;[values[index], values[index + offset]] = [values[index + offset]!, values[index]!]
  update(key, values)
}
</script>

<template>
  <div class="build-workspace" :class="{ inherited: disabled }">
    <div v-for="group in groups" :key="group.key" class="build-group">
      <div class="build-group-heading">
        <h3>{{ group.title }}</h3>
        <span>{{ ids(group.key).length }} / {{ group.limit }}</span>
      </div>
      <p class="field-help">
        {{
          group.key === 'start'
            ? 'O inventário para sair da base.'
            : group.key === 'boots'
              ? 'A bota recomendada para o confronto.'
              : 'Os itens principais, na sequência de compra.'
        }}
      </p>
      <ol class="build-slots">
        <li v-for="(id, index) in ids(group.key)" :key="index" class="build-slot">
          <span v-if="group.key === 'core'" class="slot-number">{{ index + 1 }}</span>
          <button
            type="button"
            class="item-tile"
            :disabled="disabled"
            :aria-label="`Trocar: ${catalog.items[id]?.name ?? id}`"
            :title="catalog.items[id]?.name ?? `Item ${id} indisponível neste patch`"
            @click="
              emit(
                'pick',
                (value) =>
                  update(
                    group.key,
                    ids(group.key).map((old, i) => (i === index ? value : old)),
                  ),
                group.key === 'boots' ? 'boots' : undefined,
              )
            "
          >
            <img v-if="catalog.items[id]" :src="catalog.items[id]!.icon" alt="" /><span
              v-else
              class="missing-item"
              >?</span
            ><span v-if="!disabled" class="tile-edit"><ArrowLeftRight :size="16" /></span>
          </button>
          <span class="slot-name" :class="{ warning: !catalog.items[id] }">{{
            catalog.items[id]?.name ?? `Item ${id} indisponível neste patch`
          }}</span>
          <div v-if="!disabled" class="slot-controls">
            <button
              v-if="ids(group.key).length > 1"
              type="button"
              class="icon-button"
              :aria-label="`Mover para cima: ${group.title} ${index + 1}`"
              :disabled="index === 0"
              @click="move(group.key, index, -1)"
            >
              <ChevronLeft :size="14" /></button
            ><button
              type="button"
              class="icon-button remove-button"
              :aria-label="`Remover: ${group.title} ${index + 1}`"
              @click="
                update(
                  group.key,
                  ids(group.key).filter((_, i) => i !== index),
                )
              "
            >
              <X :size="14" /></button
            ><button
              v-if="ids(group.key).length > 1"
              type="button"
              class="icon-button"
              :aria-label="`Mover para baixo: ${group.title} ${index + 1}`"
              :disabled="index === ids(group.key).length - 1"
              @click="move(group.key, index, 1)"
            >
              <ChevronRight :size="14" />
            </button>
          </div>
        </li>
        <li v-if="!disabled && ids(group.key).length < group.limit" class="add-slot">
          <button
            type="button"
            class="add-tile"
            :aria-label="`Adicionar ${group.title.toLowerCase()}`"
            @click="
              emit(
                'pick',
                (value) => update(group.key, [...ids(group.key), value]),
                group.key === 'boots' ? 'boots' : undefined,
              )
            "
          >
            <Plus :size="24" /></button
          ><span>Adicionar</span>
        </li>
      </ol>
      <p v-if="disabled && !ids(group.key).length" class="field-help">Nenhum item selecionado.</p>
    </div>
    <div class="build-group">
      <div class="build-group-heading">
        <h3>Situacionais</h3>
        <span>{{ build.situational.length }} / 20</span>
      </div>
      <p class="field-help">Alternativas e o momento certo para cada uma.</p>
      <div class="situational-list">
        <div v-for="(choice, index) in build.situational" :key="index" class="situational-card">
          <div class="situational-item">
            <button
              type="button"
              class="item-tile"
              :disabled="disabled"
              :aria-label="`Trocar situacional ${index + 1}`"
              @click="emit('pick', (value) => (choice.item = value))"
            >
              <img
                v-if="catalog.items[choice.item]"
                :src="catalog.items[choice.item]!.icon"
                alt=""
              /><span v-else class="missing-item">?</span></button
            ><strong :class="{ warning: !catalog.items[choice.item] }">{{
              catalog.items[choice.item]?.name ?? `Item ${choice.item} indisponível neste patch`
            }}</strong
            ><button
              v-if="!disabled"
              type="button"
              class="icon-button remove-button"
              :aria-label="`Remover situacional ${index + 1}`"
              @click="build.situational.splice(index, 1)"
            >
              <X :size="16" />
            </button>
          </div>
          <label :for="`condition-${index}`">Quando usar</label
          ><textarea
            :id="`condition-${index}`"
            v-model="choice.condition"
            rows="2"
            maxlength="1000"
            :disabled="disabled"
            placeholder="Ex.: contra composições com muita cura…"
          />
        </div>
      </div>
      <button
        v-if="!disabled && build.situational.length < 20"
        type="button"
        class="secondary-button add-situational"
        @click="emit('pick', (item) => build.situational.push({ item, condition: '' }))"
      >
        <Plus :size="16" />Adicionar situacional
      </button>
    </div>
    <div class="field-block">
      <label for="build-reason">Explicação da build</label>
      <p class="field-help">Por que estes itens funcionam neste duelo?</p>
      <textarea
        id="build-reason"
        v-model="build.reason"
        rows="4"
        maxlength="5000"
        :disabled="disabled"
        placeholder="Explique as escolhas e os ajustes na build…"
      />
    </div>
  </div>
</template>
