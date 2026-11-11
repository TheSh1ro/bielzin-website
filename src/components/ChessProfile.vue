<script setup lang="ts">
import { ArrowUpRight, ChessKnight, ChessPawn } from 'lucide-vue-next'
import chess from '@/data/chess.json'

const number = new Intl.NumberFormat('pt-BR')
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' })
const formatDate = (value: string) => date.format(new Date(value))

const profiles = [
  {
    platform: 'Lichess',
    href: 'https://lichess.org/@/Gabriel_TKChess',
    piece: ChessKnight,
    theme: 'lichess',
  },
  {
    platform: 'Chess.com',
    href: 'https://www.chess.com/member/gabrieltkchess',
    piece: ChessPawn,
    theme: 'chesscom',
  },
]

const stats = [
  { label: 'Partidas registradas', value: number.format(chess.games) },
  { label: 'Vitórias', value: number.format(chess.wins) },
  { label: 'Taxa de vitórias', value: percent.format(chess.wins / chess.games) },
  {
    label: 'Tempo de jogo registrado',
    value: `${number.format(Math.floor(chess.playTime / 3600))} h ${Math.floor((chess.playTime % 3600) / 60)} min`,
  },
]

const ratingModes = [
  { key: 'rapid', label: 'Maior rating em partidas rápidas' },
  { key: 'blitz', label: 'Maior rating em Blitz' },
] as const
const ratingPlatforms = [
  { label: 'Lichess', ratings: chess.peakRatings.lichess },
  { label: 'Chess.com', ratings: chess.peakRatings.chessCom },
]

const simuls = [
  {
    id: 'C1ir3txm',
    opponent: 'FM Danirod',
    result: 'Vitória',
    date: '2020-09-28',
    opening: 'Defesa Siciliana, variante Najdorf',
    time: '10+3',
  },
  {
    id: '6qgKASZD',
    opponent: 'CM MasterHinds',
    result: 'Empate',
    date: '2020-10-07',
    opening: 'Peão da Dama, variante simétrica',
    time: '5+60',
  },
]
</script>

<template>
  <section class="chess" aria-labelledby="chess-title">
    <header class="favorite chess-banner">
      <img
        class="favorite-cover"
        src="/media/chess/banner.webp"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div class="favorite-content">
        <h3 id="chess-title">Xadrez</h3>
        <div class="chess-links">
          <a
            v-for="profile in profiles"
            :key="profile.platform"
            class="button chess-profile-link"
            :class="`chess-profile-link--${profile.theme}`"
            :href="profile.href"
            :aria-label="`Ver perfil no ${profile.platform}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="chess-link-piece" aria-hidden="true">
              <component :is="profile.piece" :size="18" />
            </span>
            <span>{{ profile.platform }}</span>
            <ArrowUpRight class="chess-link-arrow" :size="14" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>

    <dl class="chess-stats">
      <div v-for="stat in stats" :key="stat.label">
        <dt>{{ stat.label }}</dt>
        <dd>{{ stat.value }}</dd>
      </div>
      <div v-for="mode in ratingModes" :key="mode.key" class="chess-rating">
        <dt>{{ mode.label }}</dt>
        <dd>
          <span v-for="platform in ratingPlatforms" :key="platform.label">
            {{ platform.ratings[mode.key] ? number.format(platform.ratings[mode.key]) : '—' }}
            <small>{{ platform.label }}</small>
          </span>
        </dd>
      </div>
    </dl>

    <section class="chess-simuls" aria-labelledby="chess-simuls-title">
      <h4 id="chess-simuls-title">Simultâneas no Lichess</h4>
      <ul>
        <li v-for="game in simuls" :key="game.id">
          <a
            :href="`https://lichess.org/${game.id}/black`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="chess-game">
              <strong>{{ game.opponent }}</strong>
              <span>{{ game.opening }} · {{ game.time }}</span>
            </div>
            <div class="chess-result">
              <strong>{{ game.result }}</strong>
              <time :datetime="game.date">{{ formatDate(game.date) }}</time>
            </div>
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>

    <p class="chess-updated">
      Dados de <time :datetime="chess.collectedAt">{{ formatDate(chess.collectedAt) }}</time>
    </p>
  </section>
</template>

<style scoped>
.chess {
  --chess-accent: #f2ce99;
  --chess-line: #ffffff1f;
  margin-block: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--chess-line);
}
.chess-banner {
  background: #191411;
}
.chess-banner .favorite-cover {
  right: 0;
  left: auto;
  width: 64%;
  object-position: right center;
  mask-image: linear-gradient(90deg, transparent, #000 30%);
}
.chess-banner::before {
  background: linear-gradient(90deg, #191411 0%, #191411df 26%, #19141125 75%);
}
.chess-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.chess-simuls a > svg {
  color: var(--chess-accent);
}
.chess-profile-link {
  gap: 7px;
  padding: 6px 7px 6px 6px;
  border: 1px solid var(--button-edge);
  border-radius: 5px;
  color: #fff4e5;
  background: linear-gradient(var(--button-top), var(--button-bottom));
  box-shadow:
    inset 0 1px #ffffff1f,
    0 2px 0 #0c0906;
  font-size: 0.8125rem;
}
.chess-profile-link--lichess {
  --piece-ink: #fae3b9;
  --tile-light: #55402b;
  --tile-dark: #3b2b20;
  --button-top: #34271e;
  --button-bottom: #201913;
  --button-edge: #ae8957;
}
.chess-profile-link--chesscom {
  --piece-ink: #d6edac;
  --tile-light: #455836;
  --tile-dark: #303e26;
  --button-top: #2b3824;
  --button-bottom: #1c2418;
  --button-edge: #7b915e;
}
.chess-link-piece {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 3px;
  color: var(--piece-ink);
  background: conic-gradient(
    var(--tile-light) 25%,
    var(--tile-dark) 0 50%,
    var(--tile-light) 0 75%,
    var(--tile-dark) 0
  );
  box-shadow: inset 0 0 0 1px #ffffff20;
}
.chess-link-piece svg {
  filter: drop-shadow(0 1px 1px #000);
}
.chess-link-arrow {
  color: var(--piece-ink);
}
.chess-profile-link:is(:hover, :focus-visible) {
  border-color: var(--piece-ink);
  background: linear-gradient(var(--tile-dark), var(--button-top));
}
@media (prefers-reduced-motion: no-preference) {
  .chess-link-arrow {
    transition: transform 160ms ease;
  }
  .chess-profile-link:is(:hover, :focus-visible) .chess-link-arrow {
    transform: translate(2px, -2px);
  }
}
.chess-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 24px 0;
  border-block: 1px solid var(--chess-line);
}
.chess-stats div {
  padding: 12px;
}
.chess-stats dt,
.chess-game span,
.chess-result time,
.chess-updated {
  color: var(--muted);
  font-size: 0.75rem;
}
.chess-stats dd {
  margin: 4px 0 0;
  color: var(--chess-accent);
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.chess-rating {
  grid-column: span 2;
  border-top: 1px solid var(--chess-line);
}
.chess-rating dd {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
}
.chess-rating small {
  display: block;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 400;
}
.chess-simuls h4 {
  margin: 0 0 10px;
}
.chess-simuls ul {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--chess-line);
}
.chess-simuls a {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--chess-line);
  color: inherit;
  text-decoration: none;
}
.chess-simuls a:hover .chess-game strong {
  color: var(--chess-accent);
}
.chess-game,
.chess-result {
  display: grid;
  gap: 3px;
}
.chess-result {
  text-align: right;
}
.chess-result strong {
  font-size: 0.875rem;
}
.chess-updated {
  margin: 10px 0 0;
  text-align: right;
}
.chess a:focus-visible {
  outline: 2px solid var(--chess-accent);
  outline-offset: 2px;
}

@media (max-width: 540px) {
  .chess-banner .favorite-cover {
    width: 100%;
  }
  .chess-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .chess-stats div:nth-child(n + 3) {
    border-top: 1px solid var(--chess-line);
  }
  .chess-rating {
    grid-column: span 1;
  }
}
@media (max-width: 360px) {
  .chess-profile-link {
    gap: 5px;
    padding-inline: 5px;
  }
  .chess-link-piece {
    width: 24px;
    height: 24px;
  }
}
</style>
