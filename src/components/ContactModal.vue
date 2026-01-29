<!-- src\components\ContactModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleClose">
        <div class="modal-container" @click.stop>
          <button class="modal-close" @click="handleClose" aria-label="Fechar">
            <X :size="24" />
          </button>

          <div class="modal-content">
            <div class="modal-header">
              <div class="header-icon">
                <MessageCircle :size="32" />
              </div>
              <h2 class="modal-title">Entrar em Contato</h2>
              <p class="modal-subtitle">Escolha a melhor forma de entrar em contato comigo</p>
            </div>

            <div class="contact-options">
              <a
                v-for="contact in contacts"
                :key="contact.id"
                :href="contact.url"
                :target="contact.external ? '_blank' : '_self'"
                :rel="contact.external ? 'noopener noreferrer' : ''"
                class="contact-option"
                @click="handleContactClick(contact)"
              >
                <div class="option-icon">
                  <component :is="contact.icon" :size="24" />
                </div>
                <div class="option-content">
                  <h3 class="option-title">{{ contact.name }}</h3>
                  <p class="option-description">{{ contact.description }}</p>
                </div>
                <div class="option-arrow">
                  <ArrowUpRight :size="20" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X, MessageCircle, Mail, Github, MessageSquareText, ArrowUpRight } from 'lucide-vue-next'
import type { Component } from 'vue'

interface Contact {
  id: string
  name: string
  description: string
  icon: Component
  url: string
  external: boolean
}

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  contact: [id: string]
}>()

const contacts: Contact[] = [
  {
    id: 'email',
    name: 'E-mail',
    description: 'Envie uma mensagem para meu e-mail',
    icon: Mail,
    url: 'mailto:gabrielmonteiro1111@gmail.com',
    external: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Veja meus projetos e contribuições',
    icon: Github,
    url: 'https://github.com/TheSh1ro',
    external: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Conecte-se comigo digitalmente',
    icon: MessageSquareText,
    url: 'discord://-/users/650180750871756826',
    external: false,
  },
]

const handleClose = () => {
  emit('close')
}

const handleContactClick = (contact: Contact) => {
  emit('contact', contact.id)
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
}

.modal-container {
  background: var(--dark);
  border: 1px solid rgba(76, 186, 157, 0.3);
  border-radius: 24px;
  max-width: 520px;
  width: 100%;
  position: relative;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 90vh;
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
  z-index: 1;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: var(--primary);
  transform: rotate(90deg);
}

.modal-content {
  padding: 2.5rem;
}

.modal-header {
  text-align: center;
  margin-bottom: 2rem;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dark);
  position: absolute;
  left: 1.2rem;
  top: 1.2rem;
}

.modal-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
}

.modal-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.6);
}

.contact-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(76, 186, 157, 0.2);
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.contact-option::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.contact-option:hover::before {
  opacity: 0.08;
}

.contact-option:hover {
  border-color: var(--primary);
  transform: translateX(5px);
  box-shadow: 0 8px 24px rgba(76, 186, 157, 0.15);
}

.option-icon {
  width: 48px;
  height: 48px;
  background: rgba(76, 186, 157, 0.15);
  border: 1px solid rgba(76, 186, 157, 0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  flex-shrink: 0;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.contact-option:hover .option-icon {
  background: rgba(76, 186, 157, 0.25);
  transform: scale(1.1);
}

.option-content {
  flex: 1;
  text-align: left;
  position: relative;
  z-index: 1;
}

.option-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.15rem;
}

.option-description {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.option-arrow {
  flex-shrink: 0;
  color: var(--primary);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.contact-option:hover .option-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* TRANSITIONS */
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

/* RESPONSIVIDADE */
@media (max-width: 480px) {
  .modal-container {
    border-radius: 20px;
  }

  .modal-content {
    padding: 2rem 1.5rem;
  }

  .modal-title {
    font-size: 1.5rem;
  }

  .contact-option {
    padding: 1rem;
    gap: 0.875rem;
  }

  .option-icon {
    width: 44px;
    height: 44px;
  }

  .option-title {
    font-size: 0.95rem;
  }

  .option-description {
    font-size: 0.8rem;
  }
}
</style>
