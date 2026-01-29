<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleClose">
        <div class="modal-container" @click.stop>
          <button class="modal-close" @click="handleClose" aria-label="Fechar">
            <X :size="24" />
          </button>

          <div class="modal-content">
            <div class="modal-icon">
              <component :is="currentIcon" :size="48" />
            </div>

            <h2 class="modal-title">{{ currentTitle }}</h2>
            <p class="modal-description">{{ currentDescription }}</p>

            <button class="modal-button" @click="handleClose">
              {{ currentButtonText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X, Info } from 'lucide-vue-next'
import { useInfoModal } from '@/composables/useInfoModal'

const { isOpen, modalOptions, hide } = useInfoModal()

const currentTitle = computed(() => modalOptions.value.title || 'Em Construção')
const currentDescription = computed(
  () =>
    modalOptions.value.description ||
    'Esta funcionalidade ainda está sendo desenvolvida. Em breve estará disponível!',
)
const currentButtonText = computed(() => modalOptions.value.buttonText || 'Entendi')
const currentIcon = computed(() => modalOptions.value.icon || Info)

const handleClose = () => {
  hide()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: var(--dark);
  border: 1px solid rgba(76, 186, 157, 0.3);
  border-radius: 24px;
  max-width: 480px;
  width: 100%;
  position: relative;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: var(--primary);
  transform: rotate(90deg);
}

.modal-content {
  padding: 3rem 2.5rem;
  text-align: center;
}

.modal-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dark);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 186, 157, 0.5);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(76, 186, 157, 0);
  }
}

.modal-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
}

.modal-description {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
}

.modal-button {
  padding: 0.875rem 2.5rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  border-radius: 12px;
  color: var(--dark);
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 200px;
}

.modal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(76, 186, 157, 0.4);
}

/* ============ TRANSITIONS ============ */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: translateY(30px) scale(0.95);
}

/* ============ RESPONSIVE ============ */
@media (max-width: 480px) {
  .modal-container {
    border-radius: 20px;
  }

  .modal-content {
    padding: 2.5rem 1.5rem;
  }

  .modal-title {
    font-size: 1.5rem;
  }

  .modal-description {
    font-size: 0.95rem;
  }

  .modal-icon {
    width: 70px;
    height: 70px;
  }
}
</style>
