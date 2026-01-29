<!-- src\components\ExploreSlide.vue -->
<template>
  <div class="slide-content profile-slide">
    <div class="two-column-layout">
      <div class="preview-section">
        <div class="preview-container">
          <div class="preview-header">
            <span class="preview-tag">Recent Project</span>
            <h3 class="preview-title">Plataforma de EloJob</h3>
          </div>
          <div class="preview-image">
            <a
              href="https://newelo.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              title="Navegar para o projeto"
            >
              <img src="https://i.imgur.com/CSkVYf4.png" alt="Project" />
            </a>
            <div class="preview-overlay">
              <div class="tech-stack">
                <span>Vue</span>
                <span>Django</span>
                <span>PostgreSQL</span>
              </div>
            </div>
          </div>
          <p class="preview-description">
            Plataforma completa de venda de serviços online, integração com app mobile para sistema
            de tickets onde os colaboradores pegam as demandas para si.
          </p>
        </div>
      </div>

      <div class="menu-section">
        <h2 class="menu-title">Descubra sobre mim</h2>
        <div class="menu-items">
          <MenuButton
            v-for="(option, index) in options"
            :key="option.id"
            :id="option.id"
            :title="option.title"
            :description="option.description"
            :icon="option.icon"
            :delay="index * 0.08"
            @navigate="handleNavigate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MenuButton from './MenuButton.vue'
import { Code2, Music, Gamepad2, GraduationCap, Film } from 'lucide-vue-next'
import type { Component } from 'vue'

import { useInfoModal } from '@/composables/useInfoModal'

const { show } = useInfoModal()

interface Option {
  id: string
  title: string
  description: string
  icon: Component
}

const options: Option[] = [
  {
    id: 'dev',
    title: 'Desenvolvedor',
    description: 'Projetos e conhecimentos',
    icon: Code2,
  },
  {
    id: 'music',
    title: 'Música',
    description: 'Estilo musical e playlist',
    icon: Music,
  },
  {
    id: 'game',
    title: 'Hobbies e jogos',
    description: 'Curiosidades e estatísticas',
    icon: Gamepad2,
  },
  {
    id: 'academic',
    title: 'Acadêmico',
    description: 'Formação e certificações',
    icon: GraduationCap,
  },
  {
    id: 'entertainment',
    title: 'Entretenimento',
    description: 'Filmes e séries',
    icon: Film,
  },
]

const handleNavigate = (id: string) => {
  console.log('Navigate to:', id)

  show({
    title: options.find((option) => option.id === id)?.title,
    description: 'Acho que alguém quebrou esse botão..',
    buttonText: 'Ok',
  })
}
</script>

<style scoped>
.profile-slide {
  background: var(--dark);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  width: 100%;
  height: 100%;
}

.two-column-layout {
  max-width: 1400px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

/* ===== ESQUERDA: PREVIEW DO PROJETO ===== */
.preview-section {
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
}

.preview-container {
  width: 100%;
}

.preview-header {
  margin-bottom: 1rem;
}

.preview-tag {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  background: rgba(76, 186, 157, 0.15);
  border: 1px solid var(--primary);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.preview-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0;
}

.preview-image {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.preview-image:hover img {
  transform: scale(1.02);
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  transform: translateY(100%);
  transition: transform 0.4s ease;
}

.preview-image:hover .preview-overlay {
  transform: translateY(0);
}

.tech-stack {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.tech-stack span {
  padding: 0.35rem 0.85rem;
  background: rgba(76, 186, 157, 0.2);
  border: 1px solid var(--primary);
  border-radius: 20px;
  font-size: 0.8rem;
  color: #fff;
  font-weight: 500;
}

.preview-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

/* ===== DIREITA: MENU ===== */
.menu-section {
  display: flex;
  flex-direction: column;
  padding: 0 1.5rem;
}

.menu-title {
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1.25rem;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ============ RESPONSIVIDADE ============ */
@media (max-width: 1200px) {
  .two-column-layout {
    grid-template-columns: 1fr;
    gap: 3rem;
    height: auto;
  }

  .preview-section {
    height: auto;
    position: static;
  }

  .menu-section {
    height: auto;
  }
}

@media (max-width: 768px) {
  .profile-slide {
    padding: 2rem 1.5rem;
  }

  .two-column-layout {
    gap: 2rem;
  }

  .preview-title {
    font-size: 2rem;
  }

  .menu-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .preview-title {
    font-size: 1.5rem;
  }

  .preview-description {
    font-size: 0.95rem;
  }

  .menu-title {
    font-size: 1.3rem;
  }
}
</style>
