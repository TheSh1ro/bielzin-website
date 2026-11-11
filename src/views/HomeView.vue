<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ArrowUpRight, Play, Pause, RotateCcw, Gamepad2, Volume2, VolumeX } from 'lucide-vue-next'
import { profile } from '@/profile'
import YouTubeTrack from '@/components/YouTubeTrack.vue'

const entered = ref(false)
const soundMuted = ref(false)
const soundVolume = ref(profile.music.volume)
const motionEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
const heading = ref<HTMLHeadingElement>()
const audio = ref<HTMLAudioElement>()
const audioError = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}`
}

function onPlaying() {
  audioError.value = false
  isPlaying.value = true
}

function syncProgress() {
  if (!audio.value) return
  currentTime.value = audio.value.currentTime
  duration.value = Number.isFinite(audio.value.duration) ? audio.value.duration : 0
}

async function togglePlayback() {
  if (!audio.value) return
  if (!audio.value.paused) {
    audio.value.pause()
    return
  }
  try {
    await audio.value.play()
  } catch {
    audioError.value = true
  }
}

function seek(event: Event) {
  if (!audio.value) return
  audio.value.currentTime = Number((event.target as HTMLInputElement).value)
  syncProgress()
}

function restartTrack() {
  setAudioStart()
  syncProgress()
}

const soundtrack = ref<HTMLElement>()
const youtubeRequested = ref(false)
const youtubeId =
  profile.music.embedYouTube && !profile.music.src ? getYouTubeId(profile.music.youtubeUrl) : null
const canPlayMusic = Boolean(profile.music.src || youtubeId)
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
  const startAt = Number.isFinite(profile.music.startAt) ? Math.max(0, profile.music.startAt) : 0
  audio.value.currentTime = startAt < audio.value.duration ? startAt : 0
  syncProgress()
}

function changeVolume(event: Event) {
  soundVolume.value = Number((event.target as HTMLInputElement).value)
  if (audio.value) audio.value.volume = soundVolume.value
}

function syncAudioSettings() {
  if (!audio.value) return
  soundMuted.value = audio.value.muted
  soundVolume.value = audio.value.volume
}

async function enter(withMusic: boolean) {
  if (entered.value) return
  if (withMusic && audio.value) {
    audio.value.volume = soundVolume.value
    audio.value.muted = soundMuted.value
    setAudioStart()
    void audio.value.play().catch(() => {
      audioError.value = true
    })
  }
  entered.value = true
  if (withMusic && youtubeId) {
    await startYouTube()
    return
  }
  await nextTick()
  heading.value?.focus()
}
</script>

<template>
  <div class="site" :style="theme">
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
    />

    <main v-if="!entered" class="entry">
      <h1 class="sr-only">{{ profile.name }}</h1>
      <button
        class="entry-trigger"
        type="button"
        aria-label="Entrar no perfil"
        @click="enter(true)"
      >
        <span class="entry-content">
          <span class="entry-handle">{{ profile.handle }}</span>
          <span class="entry-name">{{ profile.name }}</span>
          <span class="entry-role">{{ profile.role }}</span>
          <span class="entry-hint">clique para entrar</span>
        </span>
      </button>
    </main>

    <div v-if="!entered && canPlayMusic && profile.music.src" class="sound-controls">
      <button
        class="sound-toggle"
        type="button"
        :aria-label="soundMuted ? 'Ativar som' : 'Mutar som'"
        :title="soundMuted ? 'Ativar som' : 'Mutar som'"
        :aria-pressed="soundMuted"
        @click="soundMuted = !soundMuted"
      >
        <VolumeX v-if="soundMuted || soundVolume === 0" :size="22" aria-hidden="true" />
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
    </div>

    <header v-if="entered" class="topbar">
      <div class="topbar-inner">
        <a class="wordmark" href="#perfil">
          {{ profile.name }}
        </a>
        <nav class="site-nav" aria-label="Seções do perfil">
          <a href="#mural">Jogos</a>
          <a href="#projeto">Desenvolvimento</a>
        </nav>
      </div>
    </header>

    <main v-show="entered" id="perfil" class="layout">
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

        <section
          v-if="profile.music.src || profile.music.youtubeUrl"
          ref="soundtrack"
          class="panel soundtrack"
          aria-label="Trilha do perfil"
          tabindex="-1"
        >
          <div class="soundtrack-heading">
            <div class="soundtrack-info">
              <div>
                <a
                  v-if="profile.music.youtubeUrl"
                  class="track-title-link"
                  :href="profile.music.youtubeUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`${profile.music.title} no YouTube`"
                >
                  <strong>{{ profile.music.title }}</strong
                  ><ArrowUpRight :size="14" aria-hidden="true" />
                </a>
                <strong v-else>{{ profile.music.title }}</strong>
                <small v-if="profile.music.artist">{{ profile.music.artist }}</small>
              </div>
            </div>
            <button
              v-if="profile.music.src"
              class="play-toggle"
              type="button"
              :aria-label="isPlaying ? 'Pausar trilha' : 'Reproduzir trilha'"
              @click="togglePlayback"
            >
              <Pause v-if="isPlaying" :size="20" aria-hidden="true" />
              <Play v-else :size="20" aria-hidden="true" />
            </button>
          </div>
          <template v-if="profile.music.src">
            <input
              class="track-progress"
              type="range"
              min="0"
              :max="duration || 1"
              step="0.1"
              :value="currentTime"
              :disabled="!duration"
              aria-label="Posição da trilha"
              :aria-valuetext="`${formatTime(currentTime)} de ${formatTime(duration)}`"
              :style="{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` }"
              @input="seek"
            />
            <div class="track-times" aria-hidden="true">
              <span>{{ formatTime(currentTime) }}</span
              ><span>{{ formatTime(duration) }}</span>
            </div>
            <div class="track-footer">
              <button
                class="track-icon"
                type="button"
                aria-label="Reiniciar trilha"
                title="Reiniciar trilha"
                @click="restartTrack"
              >
                <RotateCcw :size="16" aria-hidden="true" />
              </button>
              <div class="track-volume">
                <button
                  class="track-icon"
                  type="button"
                  :aria-label="soundMuted ? 'Ativar som' : 'Mutar som'"
                  :aria-pressed="soundMuted"
                  @click="soundMuted = !soundMuted"
                >
                  <VolumeX v-if="soundMuted || soundVolume === 0" :size="18" aria-hidden="true" />
                  <Volume2 v-else :size="18" aria-hidden="true" />
                </button>
                <input
                  class="sound-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="soundVolume"
                  aria-label="Volume da trilha"
                  :aria-valuetext="`${Math.round(soundVolume * 100)}%`"
                  :style="{ '--progress': `${soundVolume * 100}%` }"
                  @input="changeVolume"
                />
                <span class="sound-volume-value" aria-hidden="true"
                  >{{ Math.round(soundVolume * 100) }}%</span
                >
              </div>
            </div>
          </template>
          <audio
            v-if="profile.music.src"
            ref="audio"
            :src="profile.music.src"
            :muted="soundMuted"
            preload="metadata"
            hidden
            loop
            aria-label="Trilha do perfil"
            @loadedmetadata="setAudioStart"
            @error="audioError = true"
            @playing="onPlaying"
            @pause="isPlaying = false"
            @timeupdate="syncProgress"
            @durationchange="syncProgress"
            @volumechange="syncAudioSettings"
          />
          <p v-if="audioError" class="muted" role="status">Não foi possível iniciar a trilha.</p>
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
              <a :href="link.href">
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

      <div class="content">
        <section id="mural" aria-labelledby="games-section-title">
          <div class="section-heading">
            <h2 id="games-section-title">Jogos</h2>
          </div>
          <div class="favorite panel">
            <img class="favorite-cover" :src="profile.favoriteGame.cover" alt="" loading="lazy" />
            <div class="favorite-content">
              <p class="eyebrow"><Gamepad2 :size="16" aria-hidden="true" /> Jogo favorito</p>
              <h3>{{ profile.favoriteGame.name }}</h3>
              <div class="favorite-actions">
                <a class="button button--primary" :href="profile.favoriteGame.guide">
                  Guia de Riven <ArrowUpRight :size="16" aria-hidden="true" />
                </a>
                <span class="rank">{{ profile.favoriteGame.rank }}</span>
              </div>
            </div>
          </div>

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
        </section>

        <section id="projeto" aria-labelledby="development-section-title">
          <div class="section-heading">
            <h2 id="development-section-title">Desenvolvimento</h2>
          </div>
          <div class="dev-intro">
            <p>{{ profile.development.about }}</p>
            <p v-for="paragraph in profile.development.story" :key="paragraph">{{ paragraph }}</p>
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
              <p class="dev-label">Em destaque · Em operação</p>
              <h3 id="connected-title">Celerity + DayZ Bot</h3>
              <p>
                Dois projetos que mantenho em operação, com usuários e licenças pagas. O site cuida
                do acesso e das renovações; o aplicativo roda no PC.
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
              <a :href="profile.project.href"
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
            <a href="https://discord.com/users/650180750871756826"
              >Me chama no Discord <ArrowUpRight :size="18" aria-hidden="true"
            /></a>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
