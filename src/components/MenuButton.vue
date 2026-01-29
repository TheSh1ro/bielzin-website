<!-- src\components\MenuButton.vue -->
<template>
  <button class="menu-item" :style="{ animationDelay: `${delay}s` }" @click="handleClick">
    <component :is="icon" :size="28" class="item-icon" />
    <div class="item-content">
      <h3 class="item-title">{{ title }}</h3>
      <p class="item-subtitle">{{ description }}</p>
    </div>
    <ChevronRight :size="20" class="item-arrow" />
  </button>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Component } from 'vue'

interface Props {
  id: string
  title: string
  description: string
  icon: Component
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  delay: 0,
})

const emit = defineEmits<{
  navigate: [id: string]
}>()

const handleClick = () => {
  emit('navigate', props.id)
}
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(76, 186, 157, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  opacity: 0;
  transform: translateX(30px);
  animation: slideInRight 0.5s ease forwards;
}

@keyframes slideInRight {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--primary);
  transform: translateX(-5px);
  box-shadow: 0 8px 24px rgba(76, 186, 157, 0.15);
}

.item-icon {
  color: var(--primary);
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.menu-item:hover .item-icon {
  transform: scale(1.15);
}

.item-content {
  flex: 1;
  text-align: left;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.2rem;
}

.item-subtitle {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.item-arrow {
  flex-shrink: 0;
  color: var(--primary);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.menu-item:hover .item-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 768px) {
  .menu-item {
    padding: 1.2rem;
  }

  .item-title {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .menu-item {
    gap: 1rem;
    padding: 1rem;
  }

  .item-icon {
    font-size: 1.5rem;
  }

  .item-title {
    font-size: 0.95rem;
  }

  .item-subtitle {
    font-size: 0.8rem;
  }
}
</style>
