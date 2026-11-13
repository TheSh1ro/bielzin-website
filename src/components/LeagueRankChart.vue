<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Minus, Plus, RotateCcw } from 'lucide-vue-next'

type Rank = { tier: string; division: string; leaguePoints: number }
type RankRecord = Rank & { recordedAt: string }
type Range = { start: number; end: number }
type Period = 'month' | 'season' | 'all'

const props = defineProps<{
  history: RankRecord[]
  collectedAt: string
  rankLabel: (rank: Rank) => string
}>()

const periods: { id: Period; label: string }[] = [
  { id: 'month', label: 'Últimos 30 dias' },
  { id: 'season', label: 'Temporada atual' },
  { id: 'all', label: 'Tudo' },
]
const period = ref<Period>('month')
const zoom = ref<Range | null>(null)
const cursor = ref<number | null>(null)
const plot = ref<SVGSVGElement | null>(null)
const width = ref(720)
const height = 252
const bottom = 221
const top = 28
const left = 57
const right = computed(() => width.value - 30)
const plotWidth = computed(() => Math.max(1, right.value - left))
const day = 86_400_000
const brazilOffset = 3 * 3_600_000
const timeZone = 'America/Sao_Paulo'
const axisDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone })
const longAxisDate = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone })
const fullDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone })
const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone })
const timestamp = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone,
})
const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', timeZone })
const number = new Intl.NumberFormat('pt-BR')
const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']
const tierAbbreviations = ['Fe', 'Br', 'Pr', 'Ou', 'Pl', 'Es', 'Di']
const divisions = ['IV', 'III', 'II', 'I']
const master = tiers.length * 400

function rankScore(rank: Rank) {
  const tier = tiers.indexOf(rank.tier)
  if (tier < 0) return master + rank.leaguePoints
  const division = Math.max(0, divisions.indexOf(rank.division))
  return tier * 400 + division * 100 + rank.leaguePoints
}

const points = computed(() => {
  const records = props.history
    .map((record) => ({ ...record, time: Date.parse(record.recordedAt), score: rankScore(record) }))
    .sort((a, b) => a.time - b.time)
  const dailyRecords = new Map(records.map((point) => [fullDate.format(point.time), point]))
  return [...dailyRecords.values()]
})
const periodPoints = computed(() => {
  const end = Date.parse(props.collectedAt)
  const seasonStart = Date.UTC(Number(year.format(end)), 0, 1) + brazilOffset
  const startByPeriod = {
    month: end - 30 * day,
    season: seasonStart,
    all: -Infinity,
  }
  return points.value.filter(({ time }) => time >= startByPeriod[period.value] && time <= end)
})
const bounds = computed<Range>(() => {
  const records = periodPoints.value
  const start = records[0]?.time ?? Date.parse(props.collectedAt)
  const end = records[records.length - 1]?.time ?? start
  if (start === end) return { start: start - 60_000, end: end + 60_000 }
  return { start, end }
})
const range = computed(() => zoom.value ?? bounds.value)
const span = computed(() => range.value.end - range.value.start)
const minimumSpan = computed(() =>
  Math.min(15 * 60_000, (bounds.value.end - bounds.value.start) / 4),
)
const canZoom = computed(() => periodPoints.value.length > 1 && span.value > minimumSpan.value)
const peak = computed(() =>
  periodPoints.value.reduce<(typeof points.value)[number] | undefined>(
    (best, point) => (!best || point.score > best.score ? point : best),
    undefined,
  ),
)

// Keep the two neighboring observations so the curve can cross a zoom boundary.
const curve = computed(() => {
  const records = periodPoints.value
  const start = records.findIndex((point) => point.time >= range.value.start)
  const end = records.findIndex((point) => point.time > range.value.end)
  if (start < 0 || end === 0) return []
  return records.slice(Math.max(0, start - 1), end < 0 ? undefined : end + 1)
})
const scoreAxis = computed(() => {
  const scores = curve.value.map((point) => point.score)
  if (!scores.length) return { min: 0, max: 100, ticks: [] }
  const low = Math.min(...scores)
  const high = Math.max(...scores)
  const step = [25, 50, 100, 200, 400, 800, 1600].find((value) => value * 4 >= high - low) ?? 3200
  const min = Math.max(0, Math.floor((low - step / 2) / step) * step)
  const max = Math.max(min + 3 * step, Math.ceil((high + step / 2) / step) * step)
  return {
    min,
    max,
    ticks: Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step),
  }
})
const dateTicks = computed(() => {
  if (!zoom.value && periodPoints.value.length <= 2) {
    return periodPoints.value.map((point) => point.time)
  }
  const count = width.value < 440 ? 3 : 5
  return Array.from({ length: count }, (_, i) => range.value.start + (span.value * i) / (count - 1))
})

function x(time: number) {
  return left + ((time - range.value.start) / span.value) * plotWidth.value
}
function y(score: number) {
  const { min, max } = scoreAxis.value
  return bottom - ((score - min) / (max - min)) * (bottom - top)
}
function scoreLabel(score: number) {
  if (score >= master) return `${number.format(score - master)} LP`
  const division = divisions[Math.floor((score % 400) / 100)]
  const lp = score % 100
  return `${tierAbbreviations[Math.floor(score / 400)]} ${division}${lp ? ` +${lp}` : ''}`
}
function dateTick(time: number) {
  if (span.value < day) return clock.format(time)
  return (span.value >= 180 * day ? longAxisDate : axisDate).format(time)
}

const line = computed(() => {
  const coordinates = curve.value.map((point) => ({ x: x(point.time), y: y(point.score) }))
  return coordinates
    .map((point, index) => {
      const previous = coordinates[index - 1]
      if (!previous) return `M${point.x},${point.y}`
      // Keep the curve between the two recorded values.
      const bend = (point.x - previous.x) * 0.4
      return `C${previous.x + bend},${previous.y} ${point.x - bend},${point.y} ${point.x},${point.y}`
    })
    .join(' ')
})
const area = computed(() => {
  const records = curve.value
  if (records.length < 2) return ''
  return `${line.value} L${x(records[records.length - 1]!.time)},${bottom} H${x(records[0]!.time)} Z`
})
const visiblePoints = computed(() =>
  curve.value.filter((point) => point.time >= range.value.start && point.time <= range.value.end),
)
const selectedPoint = computed(() => {
  if (cursor.value === null) return undefined
  const position = x(cursor.value)
  let closest: (typeof points.value)[number] | undefined
  let distance = 28
  for (const point of visiblePoints.value) {
    const offset = Math.abs(x(point.time) - position)
    if (offset > distance) continue
    closest = point
    distance = offset
  }
  return closest
})
const tooltipX = computed(() => (selectedPoint.value ? x(selectedPoint.value.time) : left))
const tooltipStyle = computed(() => ({
  left: tooltipX.value > width.value / 2 ? undefined : `${tooltipX.value}px`,
  right: tooltipX.value > width.value / 2 ? `${width.value - tooltipX.value}px` : undefined,
}))

watch(plot, (element, _, onCleanup) => {
  if (!element) return
  const observer = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) width.value = entry.contentRect.width
  })
  observer.observe(element)
  onCleanup(() => observer.disconnect())
})

function selectPeriod(value: Period) {
  period.value = value
  reset()
}
function reset() {
  zoom.value = null
  cursor.value = null
}
function setRange(start: number, size: number) {
  const limit = bounds.value
  const boundedStart = Math.max(limit.start, Math.min(start, limit.end - size))
  zoom.value =
    size >= limit.end - limit.start ? null : { start: boundedStart, end: boundedStart + size }
  cursor.value = null
}
function changeZoom(factor: number, anchor = 1) {
  const total = bounds.value.end - bounds.value.start
  const size = Math.min(total, Math.max(minimumSpan.value, span.value * factor))
  setRange(range.value.start + (span.value - size) * anchor, size)
}
function pointerFraction(clientX: number) {
  const offset = clientX - (plot.value?.getBoundingClientRect().left ?? 0)
  return Math.min(1, Math.max(0, (offset - left) / plotWidth.value))
}
function onWheel(event: WheelEvent) {
  if (!event.deltaY || (event.deltaY > 0 ? !zoom.value : !canZoom.value)) return
  event.preventDefault()
  changeZoom(event.deltaY > 0 ? 1.35 : 1 / 1.35, pointerFraction(event.clientX))
}

let drag: { id: number; x: number; start: number } | null = null

function onPointerDown(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return
  cursor.value = range.value.start + pointerFraction(event.clientX) * span.value
  if (zoom.value) {
    drag = { id: event.pointerId, x: event.clientX, start: range.value.start }
    plot.value?.setPointerCapture(event.pointerId)
  }
}
function onPointerMove(event: PointerEvent) {
  if (drag?.id === event.pointerId && Math.abs(event.clientX - drag.x) > 3) {
    setRange(drag.start - ((event.clientX - drag.x) / plotWidth.value) * span.value, span.value)
    return
  }
  if (event.pointerType !== 'touch') {
    cursor.value = range.value.start + pointerFraction(event.clientX) * span.value
  }
}
function stopDrag() {
  drag = null
}
function onPointerLeave(event: PointerEvent) {
  if (event.pointerType !== 'touch') cursor.value = null
}
function moveBetweenPoints(direction: number) {
  const ordered = visiblePoints.value
  const current = selectedPoint.value
  const index = current
    ? ordered.indexOf(current) + direction
    : direction > 0
      ? 0
      : ordered.length - 1
  cursor.value = ordered[Math.min(ordered.length - 1, Math.max(0, index))]?.time ?? null
}
</script>

<template>
  <section class="rank-chart" aria-labelledby="rank-chart-title">
    <div class="chart-heading">
      <h5 id="rank-chart-title">Evolução de LP</h5>
      <div class="periods" role="group" aria-label="Período do gráfico">
        <button
          v-for="option in periods"
          :key="option.id"
          type="button"
          :aria-pressed="period === option.id"
          @click="selectPeriod(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="periodPoints.length" class="chart-panel">
      <div class="plot">
        <svg
          ref="plot"
          class="chart"
          :class="{ pannable: zoom }"
          :viewBox="`0 0 ${width} ${height}`"
          tabindex="0"
          role="group"
          aria-label="Gráfico de evolução de LP"
          aria-describedby="rank-chart-help"
          @wheel="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="stopDrag"
          @pointercancel="stopDrag"
          @lostpointercapture="stopDrag"
          @pointerleave="onPointerLeave"
          @blur="cursor = null"
          @keydown.left.prevent="moveBetweenPoints(-1)"
          @keydown.right.prevent="moveBetweenPoints(1)"
          @keydown.esc="cursor = null"
        >
          <defs>
            <clipPath id="rank-chart-clip">
              <rect :x="left - 5" :y="top - 5" :width="plotWidth + 10" :height="bottom - top + 5" />
            </clipPath>
            <linearGradient id="rank-chart-fill" x2="0" y2="1">
              <stop offset="0%" stop-color="currentColor" stop-opacity=".24" />
              <stop offset="100%" stop-color="currentColor" stop-opacity=".01" />
            </linearGradient>
          </defs>
          <g aria-hidden="true">
            <g v-for="tick in dateTicks" :key="tick">
              <line :x1="x(tick)" :x2="x(tick)" :y1="top" :y2="bottom" class="date-grid" />
              <text :x="x(tick)" :y="bottom + 20" text-anchor="middle">{{ dateTick(tick) }}</text>
            </g>
            <g v-for="tick in scoreAxis.ticks" :key="tick">
              <line :x1="left" :x2="right" :y1="y(tick)" :y2="y(tick)" />
              <text :x="left - 8" :y="y(tick)" dy=".34em" text-anchor="end">
                {{ scoreLabel(tick) }}
              </text>
            </g>
            <line :x1="left" :x2="right" :y1="bottom" :y2="bottom" />
            <g clip-path="url(#rank-chart-clip)">
              <path :d="area" fill="url(#rank-chart-fill)" />
              <path v-if="curve.length > 1" :d="line" class="lp-line" fill="none" />
              <circle
                v-for="point in visiblePoints.length <= 12 ? visiblePoints : []"
                :key="point.recordedAt"
                :cx="x(point.time)"
                :cy="y(point.score)"
                :r="periodPoints.length <= 2 ? 5 : 3"
              />
              <line
                v-if="selectedPoint"
                class="crosshair"
                :x1="tooltipX"
                :x2="tooltipX"
                :y1="top"
                :y2="bottom"
              />
              <circle
                v-if="selectedPoint"
                :cx="x(selectedPoint.time)"
                :cy="y(selectedPoint.score)"
                r="6"
              />
            </g>
            <text
              v-for="point in !zoom && periodPoints.length <= 2 ? visiblePoints : []"
              :key="point.recordedAt"
              class="point-label"
              :x="x(point.time)"
              :y="y(point.score) - 14"
              text-anchor="middle"
            >
              {{ number.format(point.leaguePoints) }} LP
            </text>
          </g>
        </svg>

        <div v-if="selectedPoint" class="chart-tooltip" :style="tooltipStyle" role="status">
          <img
            :src="`/media/lol/ranks/${selectedPoint.tier.toLowerCase()}.png`"
            alt=""
            width="32"
            height="32"
          />
          <div class="chart-tooltip-details">
            <strong>{{ rankLabel(selectedPoint) }}</strong>
            <time :datetime="selectedPoint.recordedAt">{{
              timestamp.format(selectedPoint.time)
            }}</time>
            <span>{{ number.format(selectedPoint.leaguePoints) }} LP</span>
          </div>
        </div>
      </div>

      <div class="chart-footer">
        <span v-if="peak" class="chart-peak">
          <span>{{ periodPoints.length === 1 ? 'Único registro' : 'Máximo do período' }}</span>
          <strong>
            <img
              :src="`/media/lol/ranks/${peak.tier.toLowerCase()}.png`"
              alt=""
              width="20"
              height="20"
            />
            {{ rankLabel(peak) }} · {{ number.format(peak.leaguePoints) }} LP
          </strong>
          <time :datetime="peak.recordedAt">{{ fullDate.format(peak.time) }}</time>
        </span>
        <div
          v-if="periodPoints.length > 1"
          class="zoom-controls"
          role="group"
          aria-label="Zoom do gráfico"
        >
          <button
            type="button"
            aria-label="Reduzir zoom"
            :disabled="!zoom"
            @click="changeZoom(1.6)"
          >
            <Minus :size="15" />
          </button>
          <button
            type="button"
            aria-label="Ampliar gráfico"
            :disabled="!canZoom"
            @click="changeZoom(1 / 1.6)"
          >
            <Plus :size="15" />
          </button>
          <button type="button" aria-label="Reiniciar zoom" :disabled="!zoom" @click="reset">
            <RotateCcw :size="14" />
          </button>
        </div>
      </div>
      <span id="rank-chart-help" class="sr-only"
        >Use as setas para consultar os registros de LP.</span
      >
    </div>
    <p v-else class="empty-chart">Sem registros de LP no período.</p>
  </section>
</template>

<style scoped>
.rank-chart {
  --lp: #efb977;
  margin-top: 24px;
}
.chart-heading,
.chart-footer,
.periods,
.zoom-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.chart-heading,
.chart-footer {
  justify-content: space-between;
  gap: 8px 16px;
}
.chart-heading {
  margin-bottom: 12px;
}
.chart-heading h5 {
  font-size: 0.875rem;
}
.periods,
.zoom-controls {
  gap: 4px;
}
.periods button,
.zoom-controls button {
  min-height: 32px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  font-size: 0.6875rem;
  cursor: pointer;
}
.periods button {
  padding: 4px 8px;
}
.periods button:hover,
.zoom-controls button:enabled:hover,
.periods button[aria-pressed='true'] {
  border-color: var(--line);
  color: var(--text);
  background: var(--surface);
}
.chart-panel {
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  padding: 12px;
}
.plot {
  position: relative;
}
.chart {
  display: block;
  width: 100%;
  height: 252px;
  color: var(--lp);
  touch-action: pan-y;
  cursor: crosshair;
}
.chart.pannable {
  cursor: grab;
}
.chart.pannable:active {
  cursor: grabbing;
}
.chart text {
  fill: var(--muted);
  font:
    10px system-ui,
    sans-serif;
}
.chart line {
  stroke: var(--line);
}
.chart .date-grid {
  stroke-dasharray: 3 4;
}
.chart .point-label {
  fill: var(--lp);
  font-size: 12px;
  font-weight: 650;
}
.chart .lp-line {
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.chart circle {
  fill: currentColor;
  stroke: var(--surface);
  stroke-width: 1.5;
}
.chart .crosshair {
  stroke: var(--muted);
  stroke-dasharray: 3 3;
}
.chart-tooltip {
  position: absolute;
  top: 6px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 85%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: 0 4px 16px #0003;
  pointer-events: none;
  font-size: 0.6875rem;
  color: var(--muted);
}
.chart-tooltip img {
  flex-shrink: 0;
  object-fit: contain;
}
.chart-tooltip-details {
  display: grid;
  gap: 2px;
}
.chart-tooltip strong,
.chart-peak strong {
  color: var(--text);
  font-weight: 600;
}
.chart-footer {
  min-height: 42px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.6875rem;
}
.zoom-controls button {
  display: grid;
  place-items: center;
  width: 32px;
}
.zoom-controls button:disabled {
  opacity: 0.35;
  cursor: default;
}
.chart-peak {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.chart-peak strong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.chart-peak img {
  object-fit: contain;
}
.chart-peak time {
  white-space: nowrap;
}
.empty-chart {
  color: var(--muted);
  font-size: 0.75rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 460px) {
  .chart-panel {
    padding: 8px;
  }
  .chart-footer {
    row-gap: 4px;
  }
}
</style>
