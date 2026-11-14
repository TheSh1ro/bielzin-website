<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight, Heart, Play, Star } from 'lucide-vue-next'
import osu from '@/data/osu.json'

const site = new URL(osu.profileUrl).origin
const number = new Intl.NumberFormat('pt-BR')
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const timeZone = 'America/Sao_Paulo'
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone })

function rank(value: number | null | undefined) {
  return value == null || value <= 0 ? '—' : `#${number.format(value)}`
}

const { stats, rankHistory } = osu
const time = `${number.format(Math.floor(stats.playTime / 3600))} h ${Math.floor((stats.playTime % 3600) / 60)} min`
const statistics = [
  { label: 'Ranking mundial', value: rank(stats.globalRank) },
  { label: `Ranking nacional · ${osu.country}`, value: rank(stats.countryRank) },
  { label: 'Performance', value: `${decimal.format(stats.pp)} pp` },
  { label: 'Precisão', value: `${percent.format(stats.accuracy)}%` },
  { label: 'Tempo de jogo', value: time },
  { label: 'Play count', value: number.format(stats.plays) },
  { label: 'Combo máximo', value: `${number.format(stats.maxCombo)}×` },
  { label: 'Nível', value: number.format(stats.level) },
]

const last = rankHistory.length - 1
const selected = ref(last)
const dayMs = 86_400_000
const collectedAt = Date.parse(osu.collectedAt)
const historyDate = (index: number) => collectedAt - (last - index) * dayMs
const availableRanks = rankHistory.filter((value) => value > 0)
const best = Math.min(...availableRanks)
const worst = Math.max(...availableRanks)
const x = (index: number) => 4 + (index / Math.max(1, last)) * 592
const y = (value: number) => 8 + ((value - best) / Math.max(1, worst - best)) * 104
const line = rankHistory
  .map((value, index) => {
    if (value <= 0) return ''
    const command = (rankHistory[index - 1] ?? 0) > 0 ? 'L' : 'M'
    return `${command}${x(index)},${y(value)}`
  })
  .join(' ')
const selectedRank = computed(() => rankHistory[selected.value] ?? 0)

const mapPlays = osu.maps.reduce((total, map) => total + map.plays, 0)
const medalGroups = osu.medals.filter((group) => group.highlights.length)

function scoreGrade(value: string) {
  if (value === 'X' || value === 'XH') return 'SS'
  if (value === 'SH') return 'S'
  return value
}
</script>

<template>
  <section class="osu" aria-labelledby="osu-title">
    <header class="favorite osu-banner">
      <img
        class="favorite-cover"
        src="/media/osu/banner-senkoru.jpg"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div class="favorite-content">
        <div class="osu-banner-profile">
          <img
            src="/media/osu/avatar.jpg"
            alt=""
            width="56"
            height="56"
            loading="lazy"
            decoding="async"
          />
          <div>
            <h3 id="osu-title">osu!</h3>
            <p>{{ osu.username }}</p>
          </div>
        </div>
        <a
          class="button banner-link osu-profile-link"
          :href="osu.profileUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="osu-profile-hit-circle" aria-hidden="true"></span>
          <span>Ver perfil no osu!</span>
          <span class="banner-link-arrow" aria-hidden="true">
            <ArrowUpRight :size="16" />
          </span>
        </a>
      </div>
    </header>

    <section class="osu-block" aria-labelledby="osu-maps-title">
      <div class="osu-heading">
        <h4 id="osu-maps-title">Mapas que criei</h4>
        <span>{{ number.format(mapPlays) }} jogadas nesses mapas</span>
      </div>
      <ul class="osu-maps">
        <li v-for="map in osu.maps" :key="map.mapId">
          <a
            class="osu-map"
            :href="`${site}/beatmapsets/${map.setId}#osu/${map.mapId}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="osu-map-cover">
              <img
                :src="`/media/osu/map-${map.setId}.jpg`"
                alt=""
                width="900"
                height="250"
                loading="lazy"
                decoding="async"
              />
              <ArrowUpRight :size="18" aria-hidden="true" />
            </div>
            <div class="osu-map-body">
              <strong>{{ map.title }}</strong>
              <span class="osu-muted">{{ map.artist }} · {{ map.version }}</span>
              <div class="osu-map-stats">
                <span>
                  <Star :size="13" aria-hidden="true" />
                  <span class="sr-only">Dificuldade em estrelas</span>
                  {{ decimal.format(map.stars) }}
                </span>
                <span>
                  <Play :size="13" aria-hidden="true" />
                  <span class="sr-only">Jogadas</span>
                  {{ number.format(map.plays) }}
                </span>
                <span>
                  <Heart :size="13" aria-hidden="true" />
                  <span class="sr-only">Favoritos</span>
                  {{ number.format(map.favorites) }}
                </span>
              </div>
            </div>
          </a>
        </li>
      </ul>
    </section>

    <section class="osu-block" aria-labelledby="osu-stats-title">
      <div class="osu-heading">
        <h4 id="osu-stats-title">Estatísticas</h4>
        <span>Dados de {{ date.format(collectedAt) }}</span>
      </div>
      <dl class="osu-stats">
        <div v-for="stat in statistics" :key="stat.label">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.value }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="availableRanks.length > 1" class="osu-block" aria-labelledby="osu-rank-title">
      <div class="osu-heading">
        <h4 id="osu-rank-title">Histórico do ranking mundial</h4>
        <span>Melhor posição geral {{ rank(stats.peakRank) }}</span>
      </div>
      <div class="osu-chart">
        <div class="osu-chart-readout">
          <span>{{ date.format(historyDate(selected)) }}</span>
          <strong>{{ rank(selectedRank) }}</strong>
        </div>
        <div class="osu-chart-plot">
          <div class="osu-chart-axis" aria-hidden="true">
            <span>{{ rank(best) }}</span>
            <span>{{ rank(worst) }}</span>
          </div>
          <svg viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
            <path class="osu-chart-grid" d="M4 8H596 M4 60H596 M4 112H596" />
            <path class="osu-chart-line" :d="line" />
            <line class="osu-chart-cursor" :x1="x(selected)" :x2="x(selected)" y1="8" y2="112" />
            <path
              v-if="selectedRank > 0"
              class="osu-chart-point"
              :d="`M${x(selected)},${y(selectedRank)}h0.01`"
            />
          </svg>
        </div>
        <input
          v-model.number="selected"
          type="range"
          min="0"
          :max="last"
          aria-label="Dia do histórico do ranking mundial"
          :aria-valuetext="`${date.format(historyDate(selected))}, posição ${rank(selectedRank)}`"
        />
        <div class="osu-chart-dates">
          <span>{{ shortDate.format(historyDate(0)) }}</span>
          <span>{{ shortDate.format(historyDate(last)) }}</span>
        </div>
      </div>
    </section>

    <section v-if="osu.best.length" class="osu-block" aria-labelledby="osu-best-title">
      <div class="osu-heading">
        <h4 id="osu-best-title">Top plays</h4>
      </div>
      <ol class="osu-scores">
        <li v-for="score in osu.best" :key="score.id">
          <a :href="`${site}/scores/${score.id}`" target="_blank" rel="noopener noreferrer">
            <img :src="score.cover" alt="" width="48" height="48" loading="lazy" decoding="async" />
            <div class="osu-score-map">
              <strong>{{ score.title }}</strong>
              <span>{{ score.artist }} · {{ score.version }}</span>
              <span>
                {{ percent.format(score.accuracy) }}% · {{ number.format(score.maxCombo) }}×
                <template v-if="score.mods.length"> · {{ score.mods.join(' ') }}</template>
              </span>
            </div>
            <span class="osu-grade" :aria-label="`Nota ${scoreGrade(score.grade)}`">
              {{ scoreGrade(score.grade) }}
            </span>
            <strong class="osu-score-pp">{{ decimal.format(score.pp) }} pp</strong>
          </a>
        </li>
      </ol>
    </section>

    <section v-if="medalGroups.length" class="osu-block" aria-labelledby="osu-medals-title">
      <div class="osu-heading">
        <h4 id="osu-medals-title">Medalhas</h4>
      </div>
      <section
        v-for="group in medalGroups"
        :key="group.key"
        class="osu-medal-group"
        :aria-labelledby="`osu-medals-${group.key}`"
      >
        <h5 :id="`osu-medals-${group.key}`">{{ group.label }}</h5>
        <ul class="osu-medals">
          <li v-for="medal in group.highlights" :key="medal.id">
            <img :src="medal.icon" alt="" width="52" height="52" loading="lazy" decoding="async" />
            <strong>{{ medal.name }}</strong>
            <time :datetime="medal.earnedAt">{{ date.format(Date.parse(medal.earnedAt)) }}</time>
          </li>
        </ul>
      </section>
    </section>
  </section>
</template>

<style scoped>
.osu {
  --osu-accent: #ffa2cf;
  --focus-color: var(--osu-accent);
  --osu-line: #ffffff1f;
  margin-block: 32px;
}
.osu-banner::before {
  background: linear-gradient(90deg, #170d18 0%, #170d18d9 35%, #170d1826 72%, transparent 100%);
}
.osu-banner .favorite-cover {
  object-position: right center;
}
.osu-banner-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}
.osu-banner-profile img {
  flex: none;
  border-radius: 8px;
  border: 1px solid #ffffff30;
  object-fit: cover;
}
.osu-banner-profile h3 {
  color: #f4dce9;
  font-size: 0.8125rem;
  letter-spacing: normal;
}
.osu-banner-profile p {
  font-size: clamp(1.25rem, 3vw, 1.625rem);
  font-weight: 750;
  line-height: 1.15;
}
.osu-profile-link {
  --banner-link-accent: var(--osu-accent);
  margin-top: 2px;
}
.osu-profile-hit-circle {
  position: relative;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: none;
  color: var(--osu-accent);
}
.osu-profile-hit-circle::before,
.osu-profile-hit-circle::after {
  content: '';
  border: 1px solid currentColor;
  border-radius: 50%;
}
.osu-profile-hit-circle::before {
  position: absolute;
  inset: 0;
  opacity: 0.6;
}
.osu-profile-hit-circle::after {
  width: 12px;
  height: 12px;
  background: color-mix(in srgb, var(--osu-accent) 28%, transparent);
}
.osu-profile-link:is(:hover, :focus-visible) .osu-profile-hit-circle::before {
  transform: scale(0.7);
  opacity: 1;
}
@media (prefers-reduced-motion: no-preference) {
  .osu-profile-hit-circle::before {
    transition:
      transform 180ms ease-out,
      opacity 180ms ease-out;
  }
}
.osu-block {
  margin-top: 24px;
}
.osu-banner + .osu-block {
  padding-top: 24px;
  border-top: 1px solid var(--osu-line);
}
.osu-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  margin-bottom: 12px;
}
.osu-heading h4 {
  font-size: 1rem;
}
.osu-heading span,
.osu-muted {
  color: var(--muted);
  font-size: 0.8125rem;
}
.osu-maps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.osu-map {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--osu-line);
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
}
.osu-map:hover {
  border-color: var(--osu-accent);
}
.osu-map-cover {
  position: relative;
  background: #241824;
}
.osu-map-cover img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 1;
  object-fit: cover;
}
.osu-map-cover > svg {
  position: absolute;
  top: 8px;
  right: 8px;
  box-sizing: content-box;
  padding: 4px;
  background: #170d18e8;
}
.osu-map-body {
  display: grid;
  align-content: start;
  grid-template-rows: auto 1fr auto;
  flex: 1;
  gap: 4px;
  padding: 10px;
  overflow-wrap: anywhere;
}
.osu-map-body strong {
  font-size: 0.875rem;
  line-height: 1.35;
}
.osu-map-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.75rem;
}
.osu-map-stats span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.osu-map-stats svg {
  color: var(--osu-accent);
}
.osu-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--osu-line);
  border: 1px solid var(--osu-line);
  margin: 0;
}
.osu-stats div {
  padding: 10px 12px;
  background: var(--surface);
}
.osu-stats dt {
  color: var(--muted);
  font-size: 0.75rem;
}
.osu-stats dd {
  margin: 2px 0 0;
  font-size: 1rem;
  font-weight: 750;
}
.osu-chart {
  --osu-axis-width: 4.25rem;
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--osu-line);
  background: var(--surface);
}
.osu-chart-readout,
.osu-chart-dates {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  color: var(--muted);
  font-size: 0.75rem;
}
.osu-chart-readout strong {
  color: var(--osu-accent);
  font-size: 0.875rem;
}
.osu-chart-plot {
  display: grid;
  grid-template-columns: var(--osu-axis-width) minmax(0, 1fr);
}
.osu-chart-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-block: 3px;
  color: var(--muted);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}
.osu-chart svg {
  width: 100%;
  height: clamp(88px, 16vw, 128px);
  fill: none;
}
.osu-chart svg > * {
  vector-effect: non-scaling-stroke;
}
.osu-chart-grid,
.osu-chart-cursor {
  stroke: var(--osu-line);
}
.osu-chart-line,
.osu-chart-point {
  stroke: var(--osu-accent);
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.osu-chart-point {
  stroke-width: 7px;
}
.osu-chart input {
  width: calc(100% - var(--osu-axis-width));
  height: 24px;
  margin: 0 0 0 var(--osu-axis-width);
  accent-color: var(--osu-accent);
  cursor: pointer;
}
.osu-chart-dates {
  padding-left: var(--osu-axis-width);
}
.osu-scores a {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 2rem auto;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--osu-line);
  color: var(--text);
  text-decoration: none;
}
.osu-scores a:hover .osu-score-map strong {
  color: var(--osu-accent);
}
.osu-scores img {
  object-fit: cover;
  background: var(--surface);
}
.osu-score-map {
  display: grid;
  overflow-wrap: anywhere;
  font-size: 0.875rem;
}
.osu-score-map span,
.osu-medals time {
  color: var(--muted);
  font-size: 0.75rem;
}
.osu-grade {
  color: #f3d58a;
  font-weight: 750;
  text-align: center;
}
.osu-score-pp {
  color: var(--osu-accent);
  font-size: 0.875rem;
  white-space: nowrap;
}
.osu-medal-group {
  border-top: 1px solid var(--osu-line);
  padding-top: 12px;
}
.osu-medal-group + .osu-medal-group {
  margin-top: 16px;
}
.osu-medal-group h5 {
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.osu-medals {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.osu-medals li {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 4px;
  text-align: center;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
@media (max-width: 640px) {
  .osu-banner .favorite-cover {
    object-position: 85% center;
  }
  .osu-maps,
  .osu-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .osu-scores a {
    grid-template-columns: 36px minmax(0, 1fr) 1.5rem auto;
    gap: 6px;
  }
  .osu-scores img {
    width: 36px;
    height: 36px;
  }
}
</style>
