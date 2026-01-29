<!-- src\components\IntroSlide.vue -->
<template>
  <div class="slide-content home-slide">
    <div class="content-grid">
      <div class="text-section">
        <h1 class="title">
          <span class="highlight">Desenvolvedor</span>
          <span class="subtitle">Full Stack</span>
        </h1>

        <p class="intro">
          Transformo ideias em experiências digitais por meio de planejamento e código bem
          estruturado, entregando soluções completas
        </p>

        <div class="tech-list">
          <span v-for="tech in techs" :key="tech" class="tech-item">
            {{ tech }}
          </span>
        </div>

        <div class="buttons-group">
          <button class="btn-primary" @click="openInfoModal">
            <span>Explorar Portfólio</span>
            <ArrowRight :size="20" />
          </button>
          <button class="btn-projects" title="Escolher forma de contato" @click="openContactModal">
            Entrar em contato
          </button>
        </div>
      </div>

      <div class="image-section">
        <div class="profile-image">
          <div class="image-border"></div>
          <a href="https://github.com/TheSh1ro" target="_blank" title="Acessar GitHub">
            <img src="https://avatars.githubusercontent.com/u/83150503?v=4" alt="Profile" />
          </a>
          <div class="image-glow"></div>
        </div>
      </div>
    </div>

    <ContactModal
      :isOpen="isContactModalOpen"
      @close="closeContactModal"
      @contact="handleContact"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import ContactModal from './ContactModal.vue'
import { useInfoModal } from '@/composables/useInfoModal'

const { show } = useInfoModal()

const openInfoModal = () => {
  show({
    title: 'Explorar Portfólio',
    description: 'Acho que alguém quebrou esse botão..',
    buttonText: 'Ok',
  })
}

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

const isContactModalOpen = ref(false)

const openContactModal = () => {
  isContactModalOpen.value = true
}

const closeContactModal = () => {
  isContactModalOpen.value = false
}

const handleContact = (id: string) => {
  console.log('Contact method selected:', id)
}
</script>

<style scoped>
.home-slide {
  background: linear-gradient(135deg, var(--darker) 0%, var(--dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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

/* ----------- IMAGEM DO PERFIL ----------- */
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

/* ----------- RESPONSIVE ----------- */
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
}
</style>
