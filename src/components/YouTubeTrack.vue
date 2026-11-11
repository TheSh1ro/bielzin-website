<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

type Player = {
  playVideo: () => void
  setVolume: (volume: number) => void
  destroy: () => void
}

type PlayerEvents = {
  onReady: (event: { target: Player }) => void
  onError: (event: { data: number }) => void
  onAutoplayBlocked: () => void
  onStateChange: (event: { data: number }) => void
}

const props = defineProps<{ videoId: string; title: string; volume: number }>()
const frame = ref<HTMLIFrameElement>()
const error = ref('')
const autoplayBlocked = ref(false)
const params = new URLSearchParams({
  enablejsapi: '1',
  origin: window.location.origin,
  playsinline: '1',
  loop: '1',
  playlist: props.videoId,
})

const youtube = window as Window & {
  YT?: { Player?: new (frame: HTMLIFrameElement, options: { events: PlayerEvents }) => Player }
  onYouTubeIframeAPIReady?: () => void
}

let player: Player | undefined
let observer: IntersectionObserver | undefined

function setupPlayer() {
  if (!frame.value || !youtube.YT?.Player) return
  const element = frame.value
  player = new youtube.YT.Player(element, {
    events: {
      onReady({ target }) {
        target.setVolume(props.volume * 100)
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry && entry.intersectionRatio > 0.5) {
              observer?.disconnect()
              target.playVideo()
            }
          },
          { threshold: 0.51 },
        )
        observer.observe(element)
      },
      onError({ data }) {
        observer?.disconnect()
        error.value =
          data === 101 || data === 150
            ? 'O YouTube não permite tocar esta faixa no perfil.'
            : 'Não foi possível carregar a trilha no YouTube.'
      },
      onAutoplayBlocked() {
        autoplayBlocked.value = true
      },
      onStateChange({ data }) {
        if (data === 1) autoplayBlocked.value = false
      },
    },
  })
}

onMounted(() => {
  if (youtube.YT?.Player) {
    setupPlayer()
    return
  }
  const script = document.createElement('script')
  youtube.onYouTubeIframeAPIReady = setupPlayer
  script.src = 'https://www.youtube.com/iframe_api'
  script.async = true
  script.onerror = () => {
    error.value = 'Não foi possível carregar o player do YouTube.'
    script.remove()
  }
  document.head.append(script)
})

onUnmounted(() => {
  if (youtube.onYouTubeIframeAPIReady === setupPlayer) delete youtube.onYouTubeIframeAPIReady
  observer?.disconnect()
  player?.destroy()
})
</script>

<template>
  <iframe
    v-show="!error"
    ref="frame"
    class="soundtrack-frame"
    :src="`https://www.youtube-nocookie.com/embed/${videoId}?${params}`"
    :title="`${title} · YouTube`"
    allow="autoplay; encrypted-media; picture-in-picture"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
  <p v-if="error || autoplayBlocked" class="muted" role="status">
    {{ error || 'Aperte play no player para ouvir a trilha.' }}
  </p>
</template>

<style scoped>
.soundtrack-frame {
  display: block;
  width: 100%;
  min-width: 200px;
  height: 200px;
  border: 0;
}
</style>
