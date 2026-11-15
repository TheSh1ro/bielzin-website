<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { guideRunePage } from '@/lib/riven-guide'
const colors: Record<number, string> = {
  8000: '#d9bd76',
  8100: '#e45b60',
  8200: '#a89be7',
  8400: '#a4d790',
  8300: '#83cdd6',
}
const props = defineProps<{ champion: string }>()
const root = ref<HTMLElement>()
const availableHeight = ref(442)
let layoutObserver: ResizeObserver | undefined
onMounted(() => {
  const element = root.value
  const step = element?.closest<HTMLElement>('.riven-step')
  const footer = step?.querySelector<HTMLElement>('.riven-footer')
  if (!element || !step || !footer) return
  layoutObserver = new ResizeObserver(() => {
    if (!element.getClientRects().length) return
    const style = getComputedStyle(element)
    const top =
      element.getBoundingClientRect().top - step.getBoundingClientRect().top + step.scrollTop
    const reserved =
      footer.offsetHeight +
      (parseFloat(getComputedStyle(step).rowGap) || 0) +
      parseFloat(getComputedStyle(step).paddingBottom) +
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth)
    availableHeight.value = Math.max(442, Math.floor(step.clientHeight - top - reserved - 2))
  })
  layoutObserver.observe(step)
  layoutObserver.observe(element)
  layoutObserver.observe(footer)
})
onBeforeUnmount(() => layoutObserver?.disconnect())
const page = computed(() => guideRunePage(props.champion))
const paths = computed(() => [
  {
    label: 'Primária',
    style: page.value?.primary,
    slots: page.value?.primary?.slots ?? [],
    selected: page.value?.selection.primary ?? [],
  },
  {
    label: 'Secundária',
    style: page.value?.secondary,
    slots: page.value?.secondary?.slots.slice(1) ?? [],
    selected: page.value?.selection.secondary ?? [],
  },
])
</script>
<template>
  <div
    v-if="page"
    ref="root"
    class="rune-page"
    :style="{ '--rune-available': `${availableHeight}px` }"
  >
    <section
      v-for="path in paths"
      :key="path.label"
      class="rune-tree"
      :class="{
        'primary-tree': path.label === 'Primária',
        'secondary-tree': path.label === 'Secundária',
      }"
      :style="{ '--tree-color': colors[path.style?.id ?? 8000] }"
      :aria-label="`Árvore ${path.label.toLowerCase()}`"
    >
      <header>
        <span class="tree-emblem" :title="path.style?.name"
          ><img
            v-if="path.style"
            :src="path.style.icon"
            :alt="path.style.name"
            width="32"
            height="32"
        /></span>
        <div class="tree-heading">
          <small>{{ path.label }}</small>
          <h3>{{ path.style?.name ?? 'Árvore indisponível' }}</h3>
        </div>
      </header>
      <div
        v-for="(slot, index) in path.slots"
        :key="index"
        class="rune-row"
        :class="{ keystone: path.label === 'Primária' && index === 0 }"
      >
        <div class="rune-options">
          <span
            v-for="rune in slot"
            :key="rune.id"
            class="rune-choice"
            :class="{ chosen: path.selected.includes(rune.id) }"
            :title="rune.name"
          >
            <img
              :src="rune.icon"
              :alt="path.selected.includes(rune.id) ? rune.name : ''"
              width="36"
              height="36"
              loading="lazy"
            />
          </span>
        </div>
      </div>
    </section>
    <section class="shards" aria-label="Fragmentos">
      <h3>Fragmentos</h3>
      <div v-for="(row, index) in page.shards" :key="index" class="shard-row">
        <div class="rune-options">
          <span
            v-for="rune in row"
            :key="rune.id"
            class="rune-choice"
            :class="{ chosen: page.selection.shards[index] === rune.id }"
            :title="rune.name"
            ><img
              :src="rune.icon"
              :alt="page.selection.shards[index] === rune.id ? rune.name : ''"
              width="26"
              height="26"
              loading="lazy"
          /></span>
        </div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.rune-page {
  --rune-height: 442px;
  display: grid;
  width: 100%;
  max-width: 760px;
  grid-template-columns: minmax(0, 1.16fr) minmax(0, 1fr);
  grid-template-rows: calc(var(--rune-height) * 0.683) calc(var(--rune-height) * 0.317);
  align-items: start;
  gap: 0 18px;
  margin-top: 22px;
  padding: 16px 10px 10px;
  border-block: 1px solid var(--riven-line);
  background: radial-gradient(ellipse at 20% 20%, #d9bd7609, transparent 65%);
  container-type: inline-size;
}
.rune-tree {
  min-width: 0;
  position: relative;
  padding-left: 34px;
}
.primary-tree {
  grid-column: 1;
  grid-row: 1 / 3;
  display: grid;
  height: 100%;
  grid-template-rows: 58px 1.17fr repeat(3, 1fr);
}
.secondary-tree {
  grid-column: 2;
  display: grid;
  height: 100%;
  grid-template-rows: 50px repeat(3, 1fr);
}
.rune-tree::before {
  content: '';
  position: absolute;
  top: 36px;
  bottom: 30px;
  left: 21px;
  width: 2px;
  background: linear-gradient(
    var(--tree-color),
    color-mix(in srgb, var(--tree-color) 20%, transparent)
  );
  box-shadow: 0 0 7px color-mix(in srgb, var(--tree-color) 25%, transparent);
}
header {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  margin-left: -34px;
  margin-bottom: 0;
  align-self: start;
}
.tree-emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border: 1px solid var(--tree-color);
  border-radius: 50%;
  background: #151715;
  box-shadow: 0 0 0 4px #ffffff05;
}
.tree-heading {
  min-width: 0;
}
.tree-heading small {
  display: block;
  color: var(--riven-muted);
  font-size: 0.8125rem;
}
.tree-heading h3 {
  color: var(--tree-color);
  font-size: 0.9375rem;
  font-weight: 600;
}
.rune-row {
  position: relative;
  min-height: 68px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--tree-color) 18%, transparent);
}
.primary-tree .rune-row {
  min-height: 0;
}
.secondary-tree .rune-row {
  min-height: 0;
}
.rune-row:last-child {
  border: 0;
}
.rune-row::before {
  content: '';
  position: absolute;
  left: -16px;
  top: calc(50% - 4px);
  width: 8px;
  height: 8px;
  border: 1px solid var(--tree-color);
  border-radius: 50%;
  background: #202822;
  box-shadow: 0 0 0 3px #111a15;
}
.rune-options {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: 3px;
  width: 100%;
}
.rune-choice {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #ffffff16;
  border-radius: 50%;
  flex: none;
  background: #080c0b55;
}
.rune-choice img {
  filter: grayscale(1);
  opacity: 0.32;
  max-width: 100%;
  height: auto;
}
.rune-choice.chosen {
  border-color: var(--tree-color, #d9bd76);
  box-shadow: 0 0 12px color-mix(in srgb, var(--tree-color, #d9bd76) 20%, transparent);
}
.rune-choice.chosen img {
  filter: none;
  opacity: 1;
}
.keystone {
  min-height: 0;
}
.keystone .rune-choice {
  width: 38px;
  height: 38px;
}
.shards {
  --tree-color: #d9bd76;
  grid-column: 2;
  align-self: start;
  padding: 0 0 0 34px;
  position: relative;
  height: 100%;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
}
.shards::before {
  content: '';
  position: absolute;
  left: 21px;
  top: 14px;
  bottom: 28px;
  width: 2px;
  background: #d9bd7660;
}
.shards h3 {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.shard-row {
  position: relative;
  min-height: 42px;
}
.shard-row::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 10px;
  width: 8px;
  height: 8px;
  border: 1px solid #d9bd76;
  border-radius: 50%;
  background: #202822;
}
.shard-row .rune-choice {
  width: 27px;
  height: 27px;
}
@media (min-width: 1200px) {
  .rune-page {
    --rune-height: var(--rune-available, 442px);
    gap: 0 32px;
    padding-inline: 12px;
  }
  .rune-choice {
    width: 42px;
    height: 42px;
  }
  .keystone .rune-choice {
    width: 48px;
    height: 48px;
  }
  .shard-row .rune-choice {
    width: 30px;
    height: 30px;
  }
}
@container (max-width: 370px) {
  .rune-tree {
    padding-left: 27px;
  }
  header {
    margin-left: -27px;
    gap: 6px;
  }
  .tree-emblem {
    width: 34px;
    height: 34px;
  }
  .tree-emblem img {
    width: 26px;
    height: 26px;
  }
  .rune-tree::before,
  .shards::before {
    left: 16px;
  }
  .rune-row::before,
  .shard-row::before {
    left: -14px;
  }
  .rune-choice {
    width: 27px;
    height: 27px;
  }
  .keystone .rune-choice {
    width: min(28px, 8cqw);
    height: min(28px, 8cqw);
  }
  .shards {
    padding-left: 27px;
  }
}
</style>
