<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowUpRight, ChevronDown } from 'lucide-vue-next'
import snapshot from '@/data/lol-tracker.json'
import LeagueRankChart from './LeagueRankChart.vue'

const matchPageSize = 6
const accountIndex = ref(0)
const queue = ref(420)
const visibleCount = ref(matchPageSize)
const moreButton = ref<HTMLButtonElement | null>(null)
const lessButton = ref<HTMLButtonElement | null>(null)
const account = computed(() => snapshot.accounts[accountIndex.value])
const queueType = computed(() => (queue.value === 420 ? 'RANKED_SOLO_5x5' : 'RANKED_FLEX_SR'))
const matches = computed(
  () => account.value?.matches.filter((match) => match.queueId === queue.value) ?? [],
)
const completed = computed(() => matches.value.filter((match) => !match.remake))
const championDays = computed(() => {
  if (!account.value || !completed.value.length) return null

  const oldestMatch = Math.min(...completed.value.map((match) => Date.parse(match.startedAt)))
  const elapsed = Date.parse(account.value.collectedAt) - oldestMatch
  return Math.max(1, Math.ceil(elapsed / 86_400_000))
})
const wins = computed(() => completed.value.filter((match) => match.win).length)
const winRate = computed(() =>
  completed.value.length ? Math.round((wins.value / completed.value.length) * 100) : null,
)
const totals = computed(() =>
  completed.value.reduce(
    (sum, match) => ({
      kills: sum.kills + match.kills,
      deaths: sum.deaths + match.deaths,
      assists: sum.assists + match.assists,
    }),
    { kills: 0, deaths: 0, assists: 0 },
  ),
)
const kda = computed(() =>
  completed.value.length
    ? ((totals.value.kills + totals.value.assists) / Math.max(1, totals.value.deaths)).toFixed(2)
    : '—',
)
const champions = computed(() => {
  const groups = new Map<
    string,
    {
      name: string
      icon: string
      games: number
      wins: number
      kills: number
      deaths: number
      assists: number
    }
  >()
  for (const match of completed.value) {
    const group = groups.get(match.championName) || {
      name: match.championName,
      icon: match.championIcon,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    }
    group.games++
    group.wins += Number(match.win)
    group.kills += match.kills
    group.deaths += match.deaths
    group.assists += match.assists
    groups.set(group.name, group)
  }
  return [...groups.values()].sort((a, b) => b.games - a.games).slice(0, 5)
})
const history = computed(
  () => account.value?.rankHistory.filter((point) => point.queueType === queueType.value) ?? [],
)
const tierNames: Record<string, string> = {
  IRON: 'Ferro',
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Mestre',
  GRANDMASTER: 'Grão-Mestre',
  CHALLENGER: 'Desafiante',
}
function rankLabel(rank: { tier: string; division: string }) {
  return `${tierNames[rank.tier] || rank.tier}${['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier) ? '' : ` ${rank.division}`}`
}
function dateLabel(value: string, time = false) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: time ? 'numeric' : undefined,
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}
function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
const profileUrl = computed(
  () =>
    account.value &&
    `https://www.leagueofgraphs.com/pt/summoner/br/${encodeURIComponent(account.value.gameName)}-${encodeURIComponent(account.value.tagLine)}`,
)
watch([accountIndex, queue], () => {
  visibleCount.value = matchPageSize
})
async function showMoreMatches() {
  visibleCount.value += matchPageSize
  if (visibleCount.value < matches.value.length) return
  await nextTick()
  lessButton.value?.focus()
}
async function collapseMatches() {
  visibleCount.value = matchPageSize
  await nextTick()
  moreButton.value?.focus({ preventScroll: true })
  moreButton.value?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <section v-if="account" class="tracker" aria-labelledby="tracker-title">
    <header class="tracker-heading">
      <h4 id="tracker-title">Meu perfil</h4>
      <time class="snapshot-label" :datetime="account.collectedAt">
        {{ dateLabel(account.collectedAt, true) }}
      </time>
    </header>

    <div class="account-heading">
      <img
        :src="`/media/lol/profile-${account.profileIconId}.png`"
        alt=""
        width="52"
        height="52"
        loading="lazy"
      />
      <div class="account-name">
        <h5>
          {{ account.gameName }}<span>#{{ account.tagLine }}</span>
        </h5>
        <p>{{ account.region }} <span aria-hidden="true">·</span> Nível {{ account.level }}</p>
      </div>
      <label v-if="snapshot.accounts.length > 1" class="account-picker"
        >Conta
        <select v-model="accountIndex">
          <option v-for="(entry, index) in snapshot.accounts" :key="entry.puuid" :value="index">
            {{ entry.gameName }}#{{ entry.tagLine }}
          </option>
        </select>
      </label>
      <a class="profile-link" :href="profileUrl" target="_blank" rel="noopener noreferrer"
        >Ver perfil <ArrowUpRight :size="15" aria-hidden="true"
      /></a>
    </div>

    <div class="rank-grid" role="group" aria-label="Filtrar por fila">
      <button
        v-for="filter in [
          { id: 420, type: 'RANKED_SOLO_5x5', label: 'Solo / Duo' },
          { id: 440, type: 'RANKED_FLEX_SR', label: 'Flex' },
        ]"
        :key="filter.id"
        type="button"
        class="rank-card"
        :class="{ selected: queue === filter.id }"
        :aria-pressed="queue === filter.id"
        @click="queue = filter.id"
      >
        <span class="rank-queue">{{ filter.label }}</span>
        <template
          v-for="rank in account.ranks.filter((entry) => entry.queueType === filter.type)"
          :key="rank.queueType"
        >
          <span class="rank-line">
            <img
              v-if="Object.keys(tierNames).includes(rank.tier)"
              class="rank-emblem"
              :src="`/media/lol/ranks/${rank.tier.toLowerCase()}.png`"
              alt=""
              width="48"
              height="48"
            />
            <span class="rank-value">
              {{ rankLabel(rank) }}
              <small>{{ rank.leaguePoints.toLocaleString('pt-BR') }} <span>LP</span></small>
            </span>
          </span>
          <span class="rank-record"
            >{{ rank.wins }}V <span> / </span>{{ rank.losses }}D
            <b
              >{{ Math.round((rank.wins / Math.max(1, rank.wins + rank.losses)) * 100) }}% de
              vitórias</b
            ></span
          >
        </template>
        <span
          v-if="!account.ranks.some((entry) => entry.queueType === filter.type)"
          class="rank-value"
          >Sem classificação</span
        >
      </button>
    </div>

    <LeagueRankChart
      :key="`${accountIndex}-${queue}`"
      :history="history"
      :collected-at="account.collectedAt"
      :rank-label="rankLabel"
    />

    <div class="recent-heading">
      <h5>Desempenho recente</h5>
      <span>{{ matches.length }} partidas de {{ queue === 420 ? 'Solo / Duo' : 'Flex' }}</span>
    </div>
    <div class="recent-summary">
      <div>
        <strong>{{ winRate === null ? '—' : `${winRate}%` }}</strong
        ><span>de vitórias</span>
      </div>
      <div>
        <strong>{{ kda }}<small v-if="completed.length"> KDA</small></strong
        ><span>{{ wins }} vitórias · {{ completed.length - wins }} derrotas</span>
      </div>
      <div class="results-strip" aria-label="Resultados recentes, do mais antigo para o mais novo">
        <span
          v-for="match in matches.slice(0, 15).reverse()"
          :key="match.id"
          :class="{ won: match.win && !match.remake, remake: match.remake }"
          :title="`${match.championName}: ${match.remake ? 'Remake' : match.win ? 'Vitória' : 'Derrota'} · ${dateLabel(match.startedAt)}`"
          >{{ match.remake ? 'R' : match.win ? 'V' : 'D' }}</span
        >
      </div>
    </div>

    <div class="tracker-details">
      <section class="champion-section" aria-labelledby="champion-title">
        <h5 id="champion-title">
          Campeões mais jogados
          <span v-if="championDays">
            {{ championDays === 1 ? 'No último dia' : `Nos últimos ${championDays} dias` }}
          </span>
        </h5>
        <ol class="champion-list">
          <li v-for="champion in champions" :key="champion.name">
            <img
              :src="`/media/lol/${champion.icon}`"
              alt=""
              width="36"
              height="36"
              loading="lazy"
            />
            <div class="champion-name">
              <strong>{{ champion.name }}</strong
              ><span
                >{{
                  ((champion.kills + champion.assists) / Math.max(1, champion.deaths)).toFixed(2)
                }}
                KDA</span
              >
            </div>
            <div class="champion-record">
              <strong>{{ Math.round((champion.wins / champion.games) * 100) }}%</strong
              ><span>{{ champion.games }} {{ champion.games === 1 ? 'jogo' : 'jogos' }}</span>
            </div>
            <div class="champion-bar" aria-hidden="true">
              <span :style="{ width: `${(champion.wins / champion.games) * 100}%` }" />
            </div>
          </li>
        </ol>
        <p v-if="!champions.length" class="empty">Nenhuma partida nesse período.</p>
      </section>

      <section class="match-section" aria-labelledby="match-title">
        <h5 id="match-title">
          Últimas partidas <span>{{ queue === 420 ? 'Solo / Duo' : 'Flex' }}</span>
        </h5>
        <ol id="tracker-matches" class="match-list">
          <li
            v-for="match in matches.slice(0, visibleCount)"
            :key="match.id"
            :class="{ victory: match.win && !match.remake, remake: match.remake }"
          >
            <span class="match-result"
              >{{ match.remake ? 'Remake' : match.win ? 'Vitória' : 'Derrota'
              }}<time :datetime="match.startedAt">{{ dateLabel(match.startedAt) }}</time></span
            >
            <img
              :src="`/media/lol/${match.championIcon}`"
              :alt="match.championName"
              :title="match.championName"
              width="32"
              height="32"
              loading="lazy"
            />
            <div class="match-score">
              <strong
                >{{ match.kills }} <span>/ {{ match.deaths }} /</span> {{ match.assists }}</strong
              ><small>{{ match.championName }}</small>
            </div>
            <span class="match-duration"
              >{{ duration(match.durationSeconds)
              }}<small
                >{{ (match.cs / (match.durationSeconds / 60)).toFixed(1) }} CS/min</small
              ></span
            >
          </li>
        </ol>
        <p v-if="!matches.length" class="empty">Nenhuma partida nesse período.</p>
        <div v-if="matches.length > matchPageSize" class="match-controls">
          <button
            v-if="visibleCount < matches.length"
            ref="moreButton"
            type="button"
            class="more-matches"
            aria-controls="tracker-matches"
            @click="showMoreMatches"
          >
            Mais partidas <ChevronDown :size="15" aria-hidden="true" />
          </button>
          <button
            v-if="visibleCount > matchPageSize"
            ref="lessButton"
            type="button"
            class="more-matches"
            aria-controls="tracker-matches"
            @click="collapseMatches"
          >
            Mostrar menos <ChevronDown :size="15" class="rotated" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  </section>
  <section v-else class="tracker" aria-labelledby="tracker-title">
    <header class="tracker-heading">
      <h4 id="tracker-title">Meu perfil</h4>
    </header>
    <p class="empty">Nenhuma conta no tracker.</p>
  </section>
</template>

<style scoped>
.tracker {
  --line: color-mix(in srgb, var(--text) 12%, transparent);
  --win: #86d9b0;
  --loss: #e7a1a9;
  margin-top: 32px;
  padding-block: 28px;
  border-block: 1px solid var(--line);
}
.tracker-heading,
.account-heading,
.rank-queue,
.rank-record,
.recent-heading,
.recent-summary,
.profile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tracker-heading {
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.tracker-heading h4 {
  font-family: var(--display);
  font-size: 1.75rem;
  line-height: 1.12;
  letter-spacing: -0.05em;
  margin-top: 6px;
}
.snapshot-label,
.account-name p,
.recent-heading > span,
.tracker h5 > span,
.empty {
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.6;
}
.snapshot-label {
  display: flex;
  flex-direction: column;
  text-align: right;
}
.account-heading {
  justify-content: start;
  margin-bottom: 20px;
}
.account-heading > img {
  border: 1px solid var(--line);
}
.account-name {
  min-width: 0;
}
.account-name h5 {
  overflow-wrap: anywhere;
  font-size: 1.125rem;
  font-weight: 650;
}
.account-name h5 span {
  font-weight: 400;
  color: var(--muted);
}
.account-name p {
  margin-top: 4px;
}
.account-picker {
  font-size: 0.75rem;
}
.account-picker select {
  display: block;
  background: var(--surface);
  color: var(--text);
  max-width: 160px;
  padding: 6px;
}
.profile-link {
  margin-left: auto;
  font-size: 0.75rem;
  white-space: nowrap;
}
.profile-link:hover {
  text-decoration: underline;
}
.rank-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.rank-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  padding: 18px;
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--line);
  cursor: pointer;
}
.rank-card:hover {
  border-color: var(--muted);
}
.rank-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}
.rank-queue {
  width: 100%;
  color: var(--muted);
  font-size: 0.75rem;
}
.rank-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rank-emblem {
  flex: none;
  width: clamp(32px, 6vw, 48px);
  height: auto;
  aspect-ratio: 1;
  object-fit: contain;
}
.rank-value {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  font-size: clamp(1.125rem, 2.4vw, 1.5rem);
  font-family: var(--display);
  letter-spacing: -0.04em;
}
.rank-value small {
  font-family: inherit;
  font-size: 1rem;
  letter-spacing: -0.025em;
}
.rank-value small span {
  font-size: 0.7rem;
  color: var(--muted);
}
.rank-record {
  width: 100%;
  gap: 4px;
  justify-content: start;
  flex-wrap: wrap;
  font-size: 0.7rem;
  color: var(--muted);
}
.rank-record b {
  margin-left: auto;
  font-weight: 400;
}
.recent-heading {
  margin-top: 24px;
  flex-wrap: wrap;
}
.tracker h5 {
  font-size: 0.875rem;
}
.recent-summary {
  justify-content: start;
  gap: 28px;
  padding-block: 16px 24px;
  flex-wrap: wrap;
}
.recent-summary > div:not(.results-strip) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.recent-summary strong {
  font-size: 1.5rem;
  letter-spacing: -0.04em;
  font-weight: 600;
}
.recent-summary strong small {
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 400;
  letter-spacing: 0;
}
.recent-summary > div > span {
  color: var(--muted);
  font-size: 0.7rem;
}
.results-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-left: auto;
}
.results-strip > span {
  display: grid;
  place-items: center;
  width: 20px;
  height: 25px;
  background: color-mix(in srgb, var(--loss) 14%, transparent);
  color: var(--loss) !important;
  font-size: 0.625rem !important;
}
.results-strip > span.won {
  background: color-mix(in srgb, var(--win) 14%, transparent);
  color: var(--win) !important;
}
.results-strip > span.remake {
  background: var(--surface);
  color: var(--muted) !important;
}
.tracker-details {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 28px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
}
.tracker-details h5 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 8px;
  margin-bottom: 16px;
}
.tracker h5 > span {
  font-size: 0.6875rem;
  font-weight: 400;
}
.champion-list,
.match-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.champion-list li {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  column-gap: 10px;
  padding-block: 10px;
  border-bottom: 1px solid var(--line);
  align-items: center;
}
.champion-name,
.champion-record {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.champion-name strong,
.champion-record strong {
  font-size: 0.8125rem;
  font-weight: 500;
}
.champion-name span,
.champion-record span {
  font-size: 0.6875rem;
  color: var(--muted);
}
.champion-record {
  text-align: right;
}
.champion-bar {
  grid-column: 2 / -1;
  height: 2px;
  background: var(--line);
  margin-top: 8px;
}
.champion-bar span {
  display: block;
  height: 100%;
  background: var(--win);
}
.match-list li {
  display: grid;
  grid-template-columns: 56px 32px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 0 12px 10px;
  border-bottom: 1px solid var(--line);
  border-left: 2px solid var(--loss);
}
.match-list li.victory {
  border-left-color: var(--win);
}
.match-list li.remake {
  border-left-color: var(--muted);
}
.match-result {
  font-size: 0.6875rem;
  color: var(--loss);
}
.victory .match-result {
  color: var(--win);
}
.remake .match-result {
  color: var(--muted);
}
.match-result time,
.match-score small,
.match-duration small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.625rem;
}
.match-score strong {
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
}
.match-score strong span {
  color: var(--muted);
}
.match-duration {
  font-size: 0.6875rem;
  text-align: right;
}
.match-controls {
  display: flex;
  flex-wrap: wrap;
}
.more-matches {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex: 1;
  padding: 14px;
  font-size: 0.75rem;
  color: var(--muted);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.more-matches:hover {
  color: var(--text);
  background: var(--surface);
}
.more-matches .rotated {
  transform: rotate(180deg);
}
.empty {
  padding-block: 12px;
}
@media (max-width: 760px) {
  .tracker-details {
    grid-template-columns: 1fr;
  }
  .results-strip {
    margin-left: 0;
  }
  .rank-card {
    padding: 14px;
  }
  .rank-record b {
    margin-left: 0;
    flex-basis: 100%;
    margin-top: 4px;
  }
}
@media (max-width: 420px) {
  .tracker-heading {
    align-items: start;
  }
  .snapshot-label {
    text-align: left;
  }
  .account-heading {
    gap: 8px;
    flex-wrap: wrap;
  }
  .account-name h5 {
    font-size: 1rem;
  }
  .rank-grid {
    gap: 8px;
  }
  .rank-value {
    gap: 6px;
  }
  .rank-value small {
    font-size: 0.875rem;
  }
  .recent-summary {
    gap: 20px;
  }
}
</style>
