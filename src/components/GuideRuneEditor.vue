<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import type { GuideRunes } from '@/lib/riven-guide'
import type { GuideCatalog } from '@/lib/guide-admin'

const runes = defineModel<GuideRunes>({ required: true })
const props = defineProps<{ catalog: GuideCatalog; disabled: boolean }>()
const style = (id: number) => props.catalog.styles.find((value) => value.id === id)
const primary = computed(() => style(runes.value.primaryStyle))
const secondary = computed(() => style(runes.value.secondaryStyle))
const colors: Record<number, string> = {
  8000: '#d9bd76',
  8100: '#e0767b',
  8200: '#a89be7',
  8400: '#a4d790',
  8300: '#83cdd6',
}
function selectPrimary(id: number) {
  if (id === runes.value.primaryStyle) return
  runes.value.primaryStyle = id
  runes.value.primary = primary.value!.slots.map((slot) => slot[0]!.id)
  if (runes.value.secondaryStyle === id) {
    selectSecondary(props.catalog.styles.find((s) => s.id !== id)!.id)
  }
}
function selectSecondary(id: number) {
  runes.value.secondaryStyle = id
  runes.value.secondary = secondary.value!.slots.slice(1, 3).map((slot) => slot[0]!.id)
}
function selectSecondaryRune(id: number, row: number) {
  if (runes.value.secondary.includes(id)) return
  const sameRow = runes.value.secondary.findIndex((value) =>
    secondary.value!.slots[row]!.some((r) => r.id === value),
  )
  if (sameRow >= 0) runes.value.secondary[sameRow] = id
  else runes.value.secondary = [runes.value.secondary[1]!, id]
}
</script>

<template>
  <div class="rune-workspace" :class="{ inherited: disabled }">
    <div class="rune-path primary-path" :style="{ '--path-color': colors[runes.primaryStyle] }">
      <p class="path-label">Árvore primária <span>4 runas</span></p>
      <div class="path-options" role="group" aria-label="Árvore primária">
        <button
          v-for="s in catalog.styles"
          :key="s.id"
          type="button"
          :disabled="disabled"
          :aria-label="s.name"
          :title="s.name"
          :aria-pressed="s.id === runes.primaryStyle"
          @click="selectPrimary(s.id)"
        >
          <img :src="s.icon" alt="" />
        </button>
      </div>
      <div class="path-title">
        <img v-if="primary" :src="primary.icon" alt="" />
        <h3>{{ primary?.name }}</h3>
      </div>
      <div
        v-for="(slot, index) in primary?.slots"
        :key="index"
        class="rune-tier"
        :class="{ keystone: index === 0 }"
        role="group"
        :aria-label="`Runa primária ${index + 1}`"
      >
        <div class="rune-choices">
          <button
            v-for="rune in slot"
            :key="rune.id"
            type="button"
            class="rune-orb"
            :disabled="disabled"
            :aria-label="rune.name"
            :title="rune.name"
            :aria-pressed="runes.primary[index] === rune.id"
            @click="runes.primary[index] = rune.id"
          >
            <img :src="rune.icon" alt="" /><Check
              v-if="runes.primary[index] === rune.id"
              class="rune-check"
              :size="12"
            /><span class="rune-tooltip">{{ rune.name }}</span>
          </button>
        </div>
        <p class="selected-rune-name">
          {{ slot.find((r) => r.id === runes.primary[index])?.name }}
        </p>
      </div>
    </div>
    <div class="rune-path secondary-path" :style="{ '--path-color': colors[runes.secondaryStyle] }">
      <p class="path-label">Árvore secundária <span>2 runas</span></p>
      <div class="path-options" role="group" aria-label="Árvore secundária">
        <button
          v-for="s in catalog.styles.filter((s) => s.id !== runes.primaryStyle)"
          :key="s.id"
          type="button"
          :disabled="disabled"
          :aria-label="s.name"
          :title="s.name"
          :aria-pressed="s.id === runes.secondaryStyle"
          @click="selectSecondary(s.id)"
        >
          <img :src="s.icon" alt="" />
        </button>
      </div>
      <div class="path-title">
        <img v-if="secondary" :src="secondary.icon" alt="" />
        <h3>{{ secondary?.name }}</h3>
      </div>
      <div
        v-for="(slot, index) in secondary?.slots.slice(1)"
        :key="index"
        class="rune-tier"
        role="group"
        :aria-label="`Linha secundária ${index + 1}`"
      >
        <div class="rune-choices">
          <button
            v-for="rune in slot"
            :key="rune.id"
            type="button"
            class="rune-orb"
            :disabled="disabled"
            :aria-label="rune.name"
            :title="rune.name"
            :aria-pressed="runes.secondary.includes(rune.id)"
            @click="selectSecondaryRune(rune.id, index + 1)"
          >
            <img :src="rune.icon" alt="" /><Check
              v-if="runes.secondary.includes(rune.id)"
              class="rune-check"
              :size="12"
            /><span class="rune-tooltip">{{ rune.name }}</span>
          </button>
        </div>
        <p class="selected-rune-name">
          {{ slot.find((r) => runes.secondary.includes(r.id))?.name ?? '—' }}
        </p>
      </div>
      <p class="rune-hint">Escolha duas runas de linhas diferentes.</p>
      <div class="shard-section">
        <h3>Fragmentos</h3>
        <div
          v-for="(slot, index) in catalog.shardSlots"
          :key="index"
          class="shard-row"
          role="group"
          :aria-label="`Fragmento ${index + 1}`"
        >
          <div class="rune-choices">
            <button
              v-for="id in slot"
              :key="id"
              type="button"
              class="rune-orb shard-orb"
              :disabled="disabled"
              :aria-label="catalog.shards[id]!.name"
              :title="catalog.shards[id]!.name"
              :aria-pressed="runes.shards[index] === id"
              @click="runes.shards[index] = id"
            >
              <img :src="catalog.shards[id]!.icon" alt="" /><span class="rune-tooltip">{{
                catalog.shards[id]!.name
              }}</span>
            </button>
          </div>
          <span>{{ catalog.shards[runes.shards[index]!]?.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
