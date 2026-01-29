<template>
  <div class="portfolio">
    <div class="swiper" ref="swiperContainer">
      <div class="swiper-wrapper">
        <div class="swiper-slide">
          <div class="slide-content home-slide">
            <div class="content-grid">
              <div class="text-section">
                <h1 class="title">
                  <span class="highlight">Desenvolvedor</span>
                  <span class="subtitle">Full Stack</span>
                </h1>

                <p class="intro">
                  Transformando ideias em experiências digitais extraordinárias através de código
                  elegante e design inovador.
                </p>

                <div class="tech-list">
                  <span v-for="tech in techs" :key="tech" class="tech-item">
                    {{ tech }}
                  </span>
                </div>

                <div class="buttons-group">
                  <button class="btn-primary">
                    <span>Explorar Portfólio</span>
                    <ArrowRight :size="20" />
                  </button>
                  <button class="btn-projects">Entrar em contato</button>
                </div>
              </div>

              <div class="image-section">
                <div class="profile-image">
                  <div class="image-border"></div>
                  <img src="https://avatars.githubusercontent.com/u/83150503?v=4" alt="Profile" />
                  <div class="image-glow"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="swiper-slide">
          <div class="slide-content profile-slide">
            <div class="two-column-layout">
              <div class="preview-section">
                <div class="preview-container">
                  <div class="preview-header">
                    <span class="preview-tag">Featured Project</span>
                    <h3 class="preview-title">Plataforma de EloJob</h3>
                  </div>
                  <div class="preview-image">
                    <a href="https://newelo.vercel.app/" target="_blank" rel="noopener noreferrer">
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
                    Plataforma completa de venda de serviços online, integração com app mobile para
                    sistema de tickets onde os colaboradores pegam as demandas para si.
                  </p>
                </div>
              </div>

              <div class="menu-section">
                <h2 class="menu-title">Explorar Áreas</h2>
                <div class="menu-items">
                  <button
                    v-for="(option, index) in options"
                    :key="option.id"
                    class="menu-item"
                    :style="{ animationDelay: `${index * 0.08}s` }"
                    @click="navigate(option.id)"
                  >
                    <component :is="option.icon" :size="28" class="item-icon" />
                    <div class="item-content">
                      <h3 class="item-title">{{ option.title }}</h3>
                      <p class="item-subtitle">{{ option.description }}</p>
                    </div>
                    <ChevronRight :size="20" class="item-arrow" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Swiper from 'swiper'
import { Mousewheel, Keyboard } from 'swiper/modules'
import type { Component } from 'vue'

import {
  Code2,
  Music,
  Gamepad2,
  GraduationCap,
  Film,
  ArrowRight,
  ChevronRight,
} from 'lucide-vue-next'
import 'swiper/css'

interface Option {
  id: string
  title: string
  description: string
  icon: Component
}

const swiperContainer = ref<HTMLElement | null>(null)
let swiper: Swiper | null = null

const techs = [
  'TypeScript',
  'Python',
  '★ Vue.js',
  'React',
  'Electron',
  '★ Django',
  '★ PostgreSQL',
  'Mongo',
  '+',
]

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

const navigate = (id: string) => {
  console.log('Navigate to:', id)
}

onMounted(() => {
  if (swiperContainer.value) {
    swiper = new Swiper(swiperContainer.value, {
      direction: 'vertical',
      modules: [Mousewheel, Keyboard],
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: false,
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      speed: 800,
      slidesPerView: 1,
      spaceBetween: 0,
      allowTouchMove: true,
      resistance: true,
      resistanceRatio: 0,
    })
  }
})

onUnmounted(() => {
  if (swiper) {
    swiper.destroy()
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.portfolio {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--darker);
  color: #fff;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.swiper {
  width: 100%;
  height: 100%;
}

.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-content {
  width: 100%;
  height: 100%;
  position: relative;
}

/* ============ HOME SLIDE ============ */
.home-slide {
  background: linear-gradient(135deg, var(--darker) 0%, var(--dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-grid {
  max-width: 1400px;
  width: 100%;
  padding: 0 4rem;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 6rem;
  align-items: center;
}

.text-section {
  max-width: 650px;
}

.title {
  font-size: clamp(3rem, 6vw, 5.5rem);
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.highlight {
  display: block;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  display: block;
  color: #fff;
}

.intro {
  font-size: 1.2rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 3rem;
}

.tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 3rem;
}

.tech-item {
  padding: 0.6rem 1.5rem;
  background: rgba(76, 186, 157, 0.08);
  border: 1px solid rgba(76, 186, 157, 0.3);
  border-radius: 30px;
  font-size: 0.95rem;
  color: var(--secondary);
  font-weight: 500;
  transition: all 0.3s ease;
}

.tech-item:hover {
  background: rgba(76, 186, 157, 0.15);
  border-color: var(--primary);
  transform: translateY(-2px);
}

.buttons-group {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  border-radius: 12px;
  color: var(--dark);
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.btn-primary:hover::before {
  opacity: 1;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(255, 0, 110, 0.4);
}

.btn-primary span,
.btn-primary svg {
  position: relative;
  z-index: 1;
}

.btn-projects {
  padding: 1rem 2.5rem;
  background: transparent;
  border: 2px solid var(--primary);
  border-radius: 12px;
  color: var(--primary);
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.4s ease;
}

.btn-projects:hover {
  background: rgba(76, 186, 157, 0.1);
  transform: translateY(-3px);
}

/* ============ IMAGEM DO PERFIL ============ */
.image-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.profile-image {
  width: 400px;
  height: 400px;
  border-radius: 50%;
  position: relative;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.image-border {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50%;
  animation: rotate 8s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.profile-image img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  position: relative;
  z-index: 1;
}

.image-glow {
  position: absolute;
  inset: -30px;
  background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
  opacity: 0.4;
  animation: pulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.15);
  }
}

/* ============ SEGUNDO CONTAINER ============ */
.profile-slide {
  background: var(--dark);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
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
  transition: transform 0.6s ease;
}

.preview-container:hover .preview-image img {
  transform: scale(1.05);
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

.preview-container:hover .preview-overlay {
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

/* ============ RESPONSIVIDADE ============ */
@media (max-width: 1200px) {
  .two-column-layout {
    grid-template-columns: 1fr;
    gap: 3rem;
    height: auto;
  }

  .preview-section {
    height: auto;
  }

  .menu-section {
    height: auto;
  }
}

/* ============ RESPONSIVE ============ */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .image-section {
    order: -1;
  }

  .profile-image {
    width: 320px;
    height: 320px;
  }

  .two-column-layout {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .preview-section {
    position: static;
  }
}

@media (max-width: 768px) {
  .content-grid {
    padding: 0 2rem;
  }

  .title {
    font-size: 2.5rem;
  }

  .intro {
    font-size: 1rem;
  }

  .buttons-group {
    flex-direction: column;
  }

  .btn-primary,
  .btn-projects {
    width: 100%;
    justify-content: center;
  }

  .profile-image {
    width: 260px;
    height: 260px;
  }

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

  .menu-item {
    padding: 1.2rem;
  }

  .item-title {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 2rem;
  }

  .tech-item {
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
  }

  .profile-image {
    width: 200px;
    height: 200px;
  }

  .preview-title {
    font-size: 1.5rem;
  }

  .preview-description {
    font-size: 0.95rem;
  }

  .menu-title {
    font-size: 1.3rem;
  }

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
