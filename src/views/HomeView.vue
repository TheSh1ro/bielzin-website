<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  shallowRef,
  watchEffect,
} from 'vue'
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Code2,
  Gamepad2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'
import { profile, type MusicTrack } from '@/profile'
import YouTubeTrack from '@/components/YouTubeTrack.vue'
import ChessProfile from '@/components/ChessProfile.vue'
import LeagueTracker from '@/components/LeagueTracker.vue'
import OsuProfile from '@/components/OsuProfile.vue'

const loadRiven = () => import('@/components/RivenGuide.vue')
const RivenGuide = defineAsyncComponent(loadRiven)

function preloadRiven() {
  void loadRiven().catch(() => {})
}
const sections = [
  {
    id: 'games',
    panel: 'mural',
    label: 'Jogos',
    detail: 'Favoritos e o que eu jogo',
    icon: Gamepad2,
    arrow: ArrowLeft,
  },
  {
    id: 'development',
    panel: 'projeto',
    label: 'Desenvolvimento',
    detail: 'Projetos, código e trajetória',
    icon: Code2,
    arrow: ArrowRight,
  },
] as const
type Section = (typeof sections)[number]['id']

function sectionFromLocation(): Section {
  return window.history.state?.section === 'development' ? 'development' : 'games'
}

function isRivenLocation() {
  return window.location.pathname.replace(/\/$/, '') === '/riven'
}

const rivenOpen = ref(isRivenLocation())
const rivenShortcut = ref<HTMLAnchorElement>()
const rivenBack = ref<HTMLAnchorElement>()
const activeSection = ref<Section>(sectionFromLocation())
const sectionIndex = computed(() => sections.findIndex(({ id }) => id === activeSection.value))
const entered = ref(rivenOpen.value || Number.isFinite(window.history.state?.rivenReturnScroll))
const profileTitle = document.title
watchEffect(() => {
  document.title = rivenOpen.value ? 'Riven · bielzin' : profileTitle
})
const entering = ref(false)
const startWithSound = ref(true)
const soundVolume = ref(profile.music.volume)
const motionEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
const heading = ref<HTMLHeadingElement>()
const audio = ref<HTMLAudioElement>()
const audioError = ref(false)
const isPlaying = ref(false)
const tracks = [profile.music, ...profile.music.rotation]
const activeTrack = shallowRef<MusicTrack>(profile.music)
const soundActive = computed(() => (entered.value ? isPlaying.value : startWithSound.value))
const soundAction = computed(() => {
  if (entered.value) return soundActive.value ? 'Pausar trilha' : 'Reproduzir trilha'
  return soundActive.value ? 'Entrar sem trilha' : 'Entrar com trilha'
})
const sectionDirection = ref('forward')
const sectionSwitcher = ref<HTMLElement>()
const switcherSlot = ref<HTMLElement>()
const content = ref<HTMLElement>()
const switcherDocked = ref(false)
let dockAnimation: Animation | undefined
let dockTarget = false
let dockRevision = 0
const dockDetails: Animation[] = []
let scrollFrame = 0

async function updateSwitcher() {
  if (!switcherSlot.value || !sectionSwitcher.value) return
  const shouldDock =
    window.innerWidth >= 1440 && switcherSlot.value.getBoundingClientRect().top < -48
  if (shouldDock === dockTarget) return
  dockTarget = shouldDock
  const revision = ++dockRevision
  dockAnimation?.cancel()
  dockDetails.splice(0).forEach((animation) => animation.cancel())
  const element = sectionSwitcher.value
  if (motionEnabled) {
    // Close in place before changing layouts. Nothing travels across the content.
    dockAnimation = element.animate(
      shouldDock
        ? [
            { clipPath: 'inset(0%)', transform: 'translateY(0)', opacity: 1 },
            { clipPath: 'inset(46% 8%)', transform: 'translateY(-24px)', opacity: 0 },
          ]
        : [
            { clipPath: 'inset(0%)', transform: 'translateX(0)', opacity: 1 },
            { clipPath: 'inset(46% 0%)', transform: 'translateX(32px)', opacity: 0 },
          ],
      { duration: 120, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
    )
    try {
      await dockAnimation.finished
    } catch {
      return
    }
    if (revision !== dockRevision) return
  }
  switcherDocked.value = shouldDock
  await nextTick()
  if (revision !== dockRevision || !sectionSwitcher.value) return
  dockAnimation?.cancel()
  if (motionEnabled) {
    dockAnimation = element.animate(
      shouldDock
        ? [
            { clipPath: 'inset(49% 0%)', transform: 'translateX(32px)', opacity: 0 },
            { clipPath: 'inset(38% 0%)', transform: 'translateX(0)', opacity: 1, offset: 0.32 },
            { clipPath: 'inset(0%)', transform: 'translateX(0)', opacity: 1 },
          ]
        : [
            { clipPath: 'inset(0% 44%)', transform: 'translateY(-16px)', opacity: 0 },
            { clipPath: 'inset(0%)', transform: 'translateY(0)', opacity: 1 },
          ],
      { duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    )
    element
      .querySelectorAll('.section-tab > span, .section-tab > svg:not(.section-tab-arrow)')
      .forEach((detail, index) => {
        dockDetails.push(
          detail.animate(
            [
              { opacity: 0, transform: `translate${shouldDock ? 'Y' : 'X'}(12px)` },
              { opacity: 1, transform: 'translate(0)' },
            ],
            {
              duration: 220,
              delay: 80 + index * 25,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              fill: 'backwards',
            },
          ),
        )
      })
  }
}

function scheduleSwitcher() {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    void updateSwitcher()
  })
}
onMounted(() => {
  window.addEventListener('scroll', scheduleSwitcher, { passive: true })
  window.addEventListener('resize', scheduleSwitcher)
  window.addEventListener('popstate', syncSection)
  if (!rivenOpen.value && entered.value) void restoreGamesPosition()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleSwitcher)
  window.removeEventListener('resize', scheduleSwitcher)
  window.removeEventListener('popstate', syncSection)
  cancelAnimationFrame(scrollFrame)
  dockAnimation?.cancel()
  dockRevision++
  dockDetails.forEach((animation) => animation.cancel())
})
const sectionTabs = ref<HTMLButtonElement[]>([])

function syncSection() {
  const wasRivenOpen = rivenOpen.value
  rivenOpen.value = isRivenLocation()
  if (rivenOpen.value) {
    entered.value = true
    void nextTick(() => rivenBack.value?.focus({ preventScroll: true }))
  } else {
    activeSection.value = sectionFromLocation()
    if (wasRivenOpen) void restoreGamesPosition()
    scheduleSwitcher()
  }
}

async function restoreGamesPosition() {
  await nextTick()
  const scroll = window.history.state?.rivenReturnScroll
  if (Number.isFinite(scroll)) window.scrollTo({ top: scroll, behavior: 'instant' })
  rivenShortcut.value?.focus({ preventScroll: true })
}

function openRiven() {
  window.history.replaceState(
    { ...window.history.state, section: 'games', rivenReturnScroll: window.scrollY },
    '',
  )
  window.history.pushState({ fromProfile: true }, '', '/riven')
  syncSection()
}

function closeRiven() {
  if (window.history.state?.fromProfile) {
    window.history.back()
    return
  }
  window.history.replaceState({ section: 'games' }, '', '/')
  syncSection()
}

async function selectSection(section: Section, scroll = false) {
  const targetIndex = sections.findIndex(({ id }) => id === section)
  sectionDirection.value = targetIndex > sectionIndex.value ? 'forward' : 'backward'
  if (section !== activeSection.value) {
    window.history.replaceState({ ...window.history.state, section }, '')
    activeSection.value = section
  }

  await nextTick()
  if (scroll) sectionTabs.value[targetIndex]?.focus({ preventScroll: true })
  if (switcherDocked.value && content.value) {
    window.scrollTo({
      top: window.scrollY + content.value.getBoundingClientRect().top - 24,
      behavior: 'instant',
    })
    return
  }
  if (scroll || (sectionSwitcher.value?.getBoundingClientRect().top ?? 0) <= 12) {
    sectionSwitcher.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
}

function onSectionKeydown(event: KeyboardEvent) {
  const direction = switcherDocked.value ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']
  if (![...direction, 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  let index =
    (sectionIndex.value + (event.key === direction[0] ? -1 : 1) + sections.length) % sections.length
  if (event.key === 'Home') index = 0
  if (event.key === 'End') index = sections.length - 1
  selectSection(sections[index]!.id)
  sectionTabs.value[index]?.focus()
}

const soundtrack = ref<HTMLElement>()
const youtubeRequested = ref(false)
const youtubeId =
  profile.music.embedYouTube && !profile.music.src ? getYouTubeId(profile.music.youtubeUrl) : null
const trackUrl = profile.music.spotifyUrl || profile.music.youtubeUrl
const trackPlatform = profile.music.spotifyUrl ? 'Spotify' : 'YouTube'
const backgroundVideoError = ref(false)
const theme = {
  '--accent': profile.theme.accent,
  '--page': profile.theme.background,
  '--surface': profile.theme.surface,
  '--text': profile.theme.text,
  '--muted': profile.theme.muted,
}

function getYouTubeId(href: string): string | null {
  if (!URL.canParse(href)) return null
  const url = new URL(href)
  if (url.protocol !== 'https:') return null
  const id =
    url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
        ? url.searchParams.get('v')
        : null
  return id && /^[\w-]{11}$/.test(id) ? id : null
}

async function startYouTube() {
  youtubeRequested.value = true
  await nextTick()
  soundtrack.value?.focus({ preventScroll: true })
  soundtrack.value?.scrollIntoView({ block: 'nearest' })
}

function setAudioStart() {
  if (!audio.value) return
  audio.value.volume = soundVolume.value
  const offset = activeTrack.value.startAt ?? 0
  const startAt = Number.isFinite(offset) ? Math.max(0, offset) : 0
  audio.value.currentTime = startAt < audio.value.duration ? startAt : 0
}

function changeVolume(event: Event) {
  soundVolume.value = Number((event.target as HTMLInputElement).value)
  if (audio.value) audio.value.volume = soundVolume.value
}

async function playAudio() {
  const player = audio.value
  if (!player) return
  if (player.ended) setAudioStart()
  player.volume = soundVolume.value
  try {
    await player.play()
    audioError.value = false
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      audioError.value = true
    }
  }
}

function toggleSound() {
  if (!entered.value) {
    startWithSound.value = !startWithSound.value
  } else if (audio.value?.paused) {
    void playAudio()
  } else {
    audio.value?.pause()
  }
}

async function selectTrack(track: MusicTrack) {
  if (track === activeTrack.value) {
    toggleSound()
    return
  }
  activeTrack.value = track
  isPlaying.value = false
  audioError.value = false
  await nextTick()
  if (activeTrack.value === track) void playAudio()
}

async function enter() {
  if (entered.value) return
  entering.value = motionEnabled
  if (startWithSound.value) void playAudio()
  entered.value = true
  if (youtubeId) {
    await startYouTube()
    return
  }
  if (!motionEnabled) {
    await nextTick()
    finishEntrance()
  }
}

function finishEntrance() {
  entering.value = false
  void nextTick(() => heading.value?.focus({ preventScroll: true }))
}
</script>

<template>
  <div class="site" :class="{ 'is-entering': entering, 'site--riven': rivenOpen }" :style="theme">
    <img
      v-if="profile.theme.backgroundStill"
      class="site-backdrop"
      :src="profile.theme.backgroundStill"
      alt=""
      aria-hidden="true"
    />
    <video
      v-if="profile.theme.backgroundVideo && motionEnabled && entered && !backgroundVideoError"
      class="site-backdrop"
      :src="profile.theme.backgroundVideo"
      :poster="profile.theme.backgroundStill || undefined"
      aria-hidden="true"
      autoplay
      muted
      loop
      playsinline
      @error="backgroundVideoError = true"
    />
    <img
      v-else-if="profile.theme.backgroundGif && motionEnabled"
      class="site-backdrop"
      :src="profile.theme.backgroundGif"
      alt=""
      aria-hidden="true"
      draggable="false"
    />

    <Transition name="entry-dismiss">
      <main v-if="!entered" class="entry">
        <h1 class="sr-only">{{ profile.name }}</h1>
        <button class="entry-trigger" type="button" :aria-label="profile.entryLabel" @click="enter">
          <span class="entry-content">
            <img class="entry-avatar" :src="profile.avatar" alt="" width="112" height="112" />
            <span class="entry-handle">{{ profile.handle }}</span>
            <span class="entry-name">{{ profile.name }}</span>
            <span class="entry-role">{{ profile.role }}</span>
            <span class="entry-hint">clique para entrar</span>
          </span>
        </button>
      </main>
    </Transition>

    <template v-if="profile.music.src">
      <audio
        ref="audio"
        :src="activeTrack.src"
        preload="metadata"
        hidden
        @loadedmetadata="setAudioStart"
        @error="audioError = true"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @ended="isPlaying = false"
      />
      <div
        class="sound-controls"
        :class="{ 'sound-controls--profile': entered }"
        :inert="rivenOpen"
        :aria-hidden="rivenOpen || undefined"
        role="group"
        aria-label="Trilha do perfil"
      >
        <button
          class="sound-toggle"
          type="button"
          :aria-label="soundAction"
          :title="soundAction"
          @click="toggleSound"
        >
          <VolumeX v-if="!soundActive || soundVolume === 0" :size="22" aria-hidden="true" />
          <Volume2 v-else :size="22" aria-hidden="true" />
        </button>
        <input
          class="sound-volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="soundVolume"
          :style="{ '--progress': `${soundVolume * 100}%` }"
          :aria-valuetext="`${Math.round(soundVolume * 100)}%`"
          aria-label="Volume da trilha"
          @input="changeVolume"
        />
        <span class="sound-volume-value" aria-hidden="true"
          >{{ Math.round(soundVolume * 100) }}%</span
        >
        <p v-if="audioError" class="sound-error" role="status">Não foi possível tocar a trilha.</p>
      </div>
    </template>

    <Transition name="profile-reveal" @after-enter="finishEntrance">
      <main
        v-show="entered"
        id="perfil"
        class="layout"
        :class="{ 'layout--with-sound': profile.music.src }"
        :inert="rivenOpen || entering"
        :aria-hidden="rivenOpen || undefined"
      >
        <div ref="switcherSlot" class="section-switcher-slot">
          <div
            ref="sectionSwitcher"
            class="section-switcher"
            :class="{ 'is-docked': switcherDocked }"
            role="tablist"
            aria-label="Explorar perfil"
            :aria-orientation="switcherDocked ? 'vertical' : 'horizontal'"
            :style="{ '--section-index': sectionIndex }"
            @keydown="onSectionKeydown"
          >
            <span class="section-switcher-indicator" aria-hidden="true"></span>
            <button
              v-for="(section, index) in sections"
              :id="`${section.id}-tab`"
              :key="section.id"
              :ref="
                (el) => {
                  if (el) sectionTabs[index] = el as HTMLButtonElement
                }
              "
              class="section-tab"
              type="button"
              role="tab"
              :aria-controls="section.panel"
              :aria-selected="activeSection === section.id"
              :tabindex="activeSection === section.id ? 0 : -1"
              @click="selectSection(section.id)"
            >
              <component :is="section.icon" :size="24" aria-hidden="true" />
              <span
                ><strong>{{ section.label }}</strong
                ><small>{{ section.detail }}</small></span
              >
              <component
                :is="section.arrow"
                class="section-tab-arrow"
                :size="20"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
        <div class="sidebar">
          <section class="panel identity" aria-labelledby="profile-name">
            <div class="identity-body">
              <img class="avatar" :src="profile.avatar" alt="" width="96" height="96" />
              <p class="eyebrow">{{ profile.handle }}</p>
              <h1 id="profile-name" ref="heading" tabindex="-1">{{ profile.name }}</h1>
              <p class="identity-role">{{ profile.role }}</p>
              <p class="bio">{{ profile.bio }}</p>
            </div>
          </section>

          <section v-if="profile.music.src" class="panel rotation" aria-label="Playlist">
            <ul>
              <li v-for="track in tracks" :key="track.src" class="rotation-track">
                <button
                  class="rotation-play"
                  type="button"
                  :aria-current="activeTrack === track ? 'true' : undefined"
                  :aria-label="`${activeTrack === track && isPlaying ? 'Pausar' : 'Tocar'} ${track.title}`"
                  @click="selectTrack(track)"
                >
                  <Pause v-if="activeTrack === track && isPlaying" :size="16" aria-hidden="true" />
                  <Play v-else :size="16" aria-hidden="true" />
                  <span>
                    <strong :title="track.title">{{ track.title }}</strong>
                    <small class="rotation-artist">
                      <span
                        v-if="activeTrack === track && isPlaying"
                        class="rotation-equalizer"
                        aria-hidden="true"
                      >
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                      {{ track.artist }}
                    </small>
                  </span>
                </button>
                <a
                  v-if="track.spotifyUrl"
                  class="rotation-spotify"
                  :href="track.spotifyUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`Abrir ${track.title} no Spotify`"
                  title="Abrir no Spotify"
                >
                  <img src="/icons/spotify.svg" alt="" width="16" height="16" />
                </a>
              </li>
            </ul>
          </section>

          <section
            v-if="!profile.music.src && (trackUrl || youtubeId)"
            ref="soundtrack"
            class="panel soundtrack"
            aria-label="Trilha do perfil"
            tabindex="-1"
          >
            <div class="soundtrack-heading">
              <div class="soundtrack-info">
                <div>
                  <a
                    v-if="trackUrl"
                    class="track-title-link"
                    :href="trackUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :aria-label="`${profile.music.title} no ${trackPlatform}`"
                    :title="profile.music.title"
                  >
                    <strong>{{ profile.music.title }}</strong
                    ><ArrowUpRight :size="14" aria-hidden="true" />
                  </a>
                  <strong v-else :title="profile.music.title">{{ profile.music.title }}</strong>
                  <small v-if="profile.music.artist">{{ profile.music.artist }}</small>
                </div>
              </div>
            </div>
            <YouTubeTrack
              v-if="youtubeId && youtubeRequested"
              :video-id="youtubeId"
              :title="profile.music.title || 'Trilha do perfil'"
              :volume="profile.music.volume"
            />
            <button
              v-else-if="youtubeId"
              class="button button--quiet"
              type="button"
              @click="startYouTube"
            >
              Tocar trilha
            </button>
          </section>

          <section class="panel connections" aria-labelledby="connections-title">
            <h2 id="connections-title">Conexões</h2>
            <ul>
              <li v-for="link in profile.links" :key="link.label">
                <a :href="link.href" target="_blank" rel="noopener noreferrer">
                  <span class="connection-icon" aria-hidden="true">
                    <img
                      :src="`/icons/${link.icon === 'link' ? 'linktree' : link.icon}.svg?v=brand-colors-1`"
                      width="19"
                      height="19"
                      alt=""
                    />
                  </span>
                  <strong>{{ link.label }}</strong>
                  <small>{{ link.detail }}</small>
                  <ArrowUpRight class="connection-arrow" :size="15" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div ref="content" class="content" :class="`section-direction-${sectionDirection}`">
          <Transition name="section-slide">
            <section
              v-if="activeSection === 'games'"
              id="mural"
              key="games"
              role="tabpanel"
              aria-labelledby="games-tab"
              tabindex="0"
            >
              <h2 class="sr-only">Jogos</h2>

              <section aria-labelledby="league-title">
                <a
                  ref="rivenShortcut"
                  class="favorite riven-banner panel"
                  href="/riven"
                  aria-labelledby="riven-shortcut-label"
                  @click.left.exact.prevent="openRiven"
                  @mouseenter.once="preloadRiven"
                  @focus.once="preloadRiven"
                >
                  <img
                    class="favorite-cover"
                    :src="profile.favoriteGame.cover"
                    alt=""
                    loading="lazy"
                  />
                  <span class="favorite-edge" aria-hidden="true"></span>
                  <div class="favorite-content">
                    <h3 id="league-title">{{ profile.favoriteGame.name }}</h3>
                    <span class="favorite-guide">
                      <span class="favorite-guide-blade" aria-hidden="true"></span>
                      <span id="riven-shortcut-label">Guia de Riven</span>
                      <span class="favorite-guide-arrow" aria-hidden="true">
                        <ArrowRight :size="16" />
                      </span>
                    </span>
                  </div>
                </a>

                <LeagueTracker />
              </section>

              <OsuProfile />

              <ChessProfile />

              <section class="games" aria-labelledby="games-title">
                <h3 id="games-title">Jogos que eu curto</h3>
                <ul class="game-grid">
                  <li v-for="game in profile.games" :key="game.name" class="game">
                    <div class="game-cover" :style="{ backgroundColor: game.color }">
                      <img
                        v-if="game.cover"
                        :src="game.cover"
                        alt=""
                        width="110"
                        height="146"
                        loading="lazy"
                      />
                      <span v-else class="game-mark" aria-hidden="true">{{ game.mark }}</span>
                    </div>
                    <span>{{ game.name }}</span>
                  </li>
                </ul>
              </section>
              <button
                class="section-next"
                type="button"
                @click="selectSection('development', true)"
              >
                <span
                  ><small>Do outro lado</small
                  ><strong>Meus projetos e um pouco da minha história</strong></span
                >
                <span class="section-next-action"
                  >Desenvolvimento <ArrowRight :size="22" aria-hidden="true"
                /></span>
              </button>
            </section>

            <section
              v-else-if="activeSection === 'development'"
              id="projeto"
              key="development"
              role="tabpanel"
              aria-labelledby="development-tab"
              tabindex="0"
            >
              <div class="section-heading">
                <h2 id="development-section-title">Desenvolvimento</h2>
              </div>
              <div class="dev-intro">
                <p>{{ profile.development.about }}</p>
                <p v-for="paragraph in profile.development.story" :key="paragraph">
                  {{ paragraph }}
                </p>
              </div>
              <section class="dev-background" aria-labelledby="background-title">
                <h3 id="background-title">Formação e conhecimentos</h3>
                <div class="background-group">
                  <h4>Cursos</h4>
                  <ul class="tags">
                    <li v-for="course in profile.development.background.courses" :key="course">
                      {{ course }}
                    </li>
                  </ul>
                </div>
                <div class="background-group">
                  <h4>Base do curso técnico</h4>
                  <ul class="tags">
                    <li v-for="topic in profile.development.background.foundations" :key="topic">
                      {{ topic }}
                    </li>
                  </ul>
                </div>
                <div class="background-group">
                  <h4>Na prática</h4>
                  <ul class="tags">
                    <li v-for="skill in profile.development.background.practice" :key="skill">
                      {{ skill }}
                    </li>
                  </ul>
                  <p>{{ profile.development.background.note }}</p>
                </div>
              </section>
              <section class="connected-projects" aria-labelledby="connected-title">
                <div class="connected-heading">
                  <p class="dev-label">Meus projetos</p>
                  <h3 id="connected-title">Celerity + DayZ Bot</h3>
                  <p>
                    Dois projetos que mantenho, com usuários e licenças pagas. O site cuida do
                    acesso e das renovações; o aplicativo roda no PC.
                  </p>
                </div>
                <div class="connected-grid">
                  <article
                    v-for="project in profile.development.connectedProjects"
                    :key="project.name"
                    class="dev-project connected-project"
                  >
                    <div class="dev-project-meta">
                      <span class="dev-label">{{ project.category }}</span
                      ><span class="module-mark" aria-hidden="true">{{
                        project.name === 'DayZ Bot' ? '02' : '01'
                      }}</span>
                    </div>
                    <h4>
                      <a
                        v-if="project.repo"
                        :href="project.repo"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ project.name }}<ArrowUpRight :size="20" aria-hidden="true"
                      /></a>
                      <span v-else class="private-project-title">{{ project.name }}</span>
                    </h4>
                    <p>{{ project.description }}</p>
                    <ul class="project-features">
                      <li v-for="feature in project.features" :key="feature">{{ feature }}</li>
                    </ul>
                    <ul class="tags" :aria-label="`Tecnologias de ${project.name}`">
                      <li v-for="tech in project.tech" :key="tech">{{ tech }}</li>
                    </ul>
                  </article>
                  <div
                    class="project-connection"
                    aria-label="Celerity distribui o DayZ Bot e gerencia sua licença"
                  >
                    <span>download</span><span aria-hidden="true">+</span><span>licença</span>
                  </div>
                </div>
              </section>
              <p class="dev-label">Outro projeto</p>
              <article class="panel project">
                <img :src="profile.project.cover" alt="Prévia da plataforma" loading="lazy" />
                <div class="project-body">
                  <h3>{{ profile.project.name }}</h3>
                  <p>{{ profile.project.description }}</p>
                  <ul class="tags" aria-label="Tecnologias do projeto">
                    <li v-for="tech in profile.project.tech" :key="tech">{{ tech }}</li>
                  </ul>
                  <a :href="profile.project.href" target="_blank" rel="noopener noreferrer"
                    >Abrir projeto <ArrowUpRight :size="16" aria-hidden="true"
                  /></a>
                </div>
              </article>
              <section class="dev-projects" aria-labelledby="more-projects-title">
                <div class="dev-section-heading">
                  <h3 id="more-projects-title">Mais projetos</h3>
                  <a href="https://github.com/TheSh1ro" target="_blank" rel="noopener noreferrer"
                    >GitHub <ArrowUpRight :size="16" aria-hidden="true"
                  /></a>
                </div>
                <div class="dev-project-grid">
                  <article
                    v-for="(project, index) in profile.development.projects"
                    :key="project.name"
                    class="dev-project panel"
                  >
                    <div class="dev-project-meta">
                      <span class="dev-label">{{ project.category }}</span
                      ><span aria-hidden="true">0{{ index + 1 }}</span>
                    </div>
                    <h4>
                      <a :href="project.repo" target="_blank" rel="noopener noreferrer"
                        >{{ project.name }}<ArrowUpRight :size="20" aria-hidden="true"
                      /></a>
                    </h4>
                    <p>{{ project.description }}</p>
                    <ul class="project-features">
                      <li v-for="feature in project.features" :key="feature">{{ feature }}</li>
                    </ul>
                    <ul class="tags" :aria-label="`Tecnologias de ${project.name}`">
                      <li v-for="tech in project.tech" :key="tech">{{ tech }}</li>
                    </ul>
                  </article>
                </div>
              </section>
              <section class="dev-stack" aria-labelledby="stack-title">
                <h3 id="stack-title">O que eu uso</h3>
                <div v-for="area in profile.development.areas" :key="area.name" class="stack-area">
                  <div>
                    <h4>{{ area.name }}</h4>
                    <p>{{ area.detail }}</p>
                  </div>
                  <ul class="tags" :aria-label="area.name">
                    <li v-for="tech in area.tech" :key="tech">{{ tech }}</li>
                  </ul>
                </div>
              </section>
              <div class="dev-outro">
                <p>Quer trocar uma ideia?</p>
                <a
                  href="https://discord.com/users/650180750871756826"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Me chama no Discord <ArrowUpRight :size="18" aria-hidden="true"
                /></a>
              </div>
              <button class="section-next" type="button" @click="selectSection('games', true)">
                <span class="section-next-action"
                  ><ArrowLeft :size="22" aria-hidden="true" /> Voltar para Jogos</span
                >
              </button>
            </section>
          </Transition>
        </div>
      </main>
    </Transition>
    <Transition name="riven-page">
      <main v-if="rivenOpen" class="riven-page" aria-label="Guia da Riven">
        <div class="riven-page-inner">
          <RivenGuide>
            <template #back>
              <a
                ref="rivenBack"
                class="riven-back"
                href="/"
                aria-label="Voltar ao perfil"
                @click.left.exact.prevent="closeRiven"
              >
                <span class="riven-back-mark" aria-hidden="true">
                  <ArrowLeft :size="16" />
                </span>
                <span class="riven-back-label">Voltar ao perfil</span>
              </a>
            </template>
          </RivenGuide>
        </div>
      </main>
    </Transition>
  </div>
</template>
