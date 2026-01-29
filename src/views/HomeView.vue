<!-- src\views\HomeView.vue -->
<template>
  <div class="portfolio">
    <div class="swiper" ref="swiperContainer">
      <div class="swiper-wrapper">
        <div class="swiper-slide">
          <IntroSlide />
        </div>

        <div class="swiper-slide">
          <ExploreSlide />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Swiper from 'swiper'
import { Mousewheel, Keyboard } from 'swiper/modules'
import IntroSlide from '@/components/IntroSlide.vue'
import ExploreSlide from '@/components/ExploreSlide.vue'
import 'swiper/css'

const swiperContainer = ref<HTMLElement | null>(null)
let swiper: Swiper | null = null

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
</style>
