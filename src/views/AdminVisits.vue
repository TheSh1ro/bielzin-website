<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import {
  guideRequest,
  type VisitActivity,
  type VisitDetails,
  type VisitPage,
} from '@/lib/guide-admin'

const visits = ref<VisitPage['items']>([])
const next = ref<VisitPage['next']>(null)
const loaded = ref(false)
const busy = ref(true)
const error = ref('')
const date = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})
const time = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})
const eventTime = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})
const screens: Record<VisitActivity, string> = {
  home: 'Home',
  guide: 'Guia da Riven',
  admin_login: 'Login do admin',
  admin_login_failed: 'Credenciais recusadas',
  admin_denied: 'Conta sem acesso ao painel',
  admin_panel: 'Painel autorizado',
}

function visitSummary(visit: VisitDetails) {
  const kinds = [...new Set(visit.activity?.map(({ kind }) => kind))]
  const access = kinds.filter(
    (kind) => kind === 'admin_login_failed' || kind === 'admin_denied' || kind === 'admin_panel',
  )
  return {
    pages: kinds
      .filter((kind) => kind === 'home' || kind === 'guide')
      .map((kind) => screens[kind])
      .join(' · '),
    access: access.length
      ? access.map((kind) => screens[kind])
      : kinds.includes('admin_login')
        ? ['Só abriu o login']
        : [],
  }
}
const visitRows = computed(() =>
  visits.value.map((visit) => ({ visit, summary: visitSummary(visit) })),
)

async function loadPage() {
  busy.value = true
  error.value = ''
  try {
    const query = next.value ? '?' + new URLSearchParams(next.value) : ''
    const page = await guideRequest<VisitPage>('/visits' + query)
    visits.value.push(...page.items)
    next.value = page.next
    loaded.value = true
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    busy.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <section class="admin-content" aria-labelledby="visits-title">
    <header class="management-heading">
      <div>
        <h1 id="visits-title">Visitas</h1>
        <p class="muted">Por navegador e dia, no horário de Brasília.</p>
      </div>
    </header>

    <p v-if="error" class="management-error" role="alert">{{ error }}</p>
    <p v-if="busy && !loaded" class="management-empty muted" role="status">Carregando visitas…</p>
    <p v-else-if="loaded && !visits.length" class="management-empty muted">
      Nenhuma visita registrada.
    </p>
    <ol v-if="visits.length" class="management-list" aria-label="Histórico de visitas">
      <li v-for="{ visit, summary } in visitRows" :key="visit.id">
        <details class="visit-entry">
          <summary class="visit-summary">
            <time :datetime="visit.visitedAt">
              {{ date.format(new Date(visit.visitedAt)) }}
              <span>{{ time.format(new Date(visit.visitedAt)) }}</span>
            </time>
            <div class="visit-overview">
              <div v-if="summary.access.length" class="visit-access">
                <span v-for="access in summary.access" :key="access">{{ access }}</span>
              </div>
              <span v-if="summary.pages">{{ summary.pages }}</span>
              <span v-else-if="!summary.access.length">Sem histórico de telas</span>
              <small>{{
                [visit.city, visit.region].filter(Boolean).join(', ') || 'Localização indisponível'
              }}</small>
            </div>
            <ChevronDown :size="16" aria-hidden="true" />
          </summary>
          <div class="visit-details">
            <ol
              v-if="visit.activity?.length"
              class="visit-activity"
              aria-label="Sequência de telas"
            >
              <li v-for="event in visit.activity" :key="event.id">
                <time :datetime="event.at">{{ eventTime.format(new Date(event.at)) }}</time>
                {{ screens[event.kind] }}
              </li>
            </ol>
            <small>Navegador</small>
            <p class="muted">{{ visit.userAgent || 'Indisponível' }}</p>
          </div>
        </details>
      </li>
    </ol>

    <button
      v-if="next || error"
      type="button"
      class="secondary-button management-more"
      :disabled="busy"
      @click="loadPage"
    >
      {{ busy ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar mais' }}
    </button>
  </section>
</template>

<style scoped>
.visit-summary {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr) 16px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  list-style: none;
  cursor: pointer;
}
.visit-summary::-webkit-details-marker {
  display: none;
}
.visit-summary:hover {
  background: var(--admin-hover);
}
.visit-summary:focus-visible {
  outline: 2px solid var(--admin-accent);
  outline-offset: -2px;
}
.visit-summary time {
  font-variant-numeric: tabular-nums;
}
.visit-summary time span {
  margin-left: 4px;
  color: var(--admin-muted);
}
.visit-access {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-weight: 600;
}
.visit-access + span {
  font-size: 13px;
  color: var(--admin-muted);
}
.visit-entry[open] .visit-summary > svg {
  transform: rotate(180deg);
}
.visit-details {
  padding: 0 16px 16px calc(8rem + 28px);
  overflow-wrap: anywhere;
}
.visit-details p {
  font-size: 12px;
}
.visit-activity {
  margin-bottom: 12px;
}
.visit-activity li {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 8px;
  padding-block: 6px;
}
.visit-activity time {
  color: var(--admin-muted);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 760px) {
  .visit-summary {
    grid-template-columns: minmax(0, 1fr) 16px;
    gap: 4px 12px;
  }
  .visit-summary time {
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--admin-muted);
  }
  .visit-details {
    padding-left: 16px;
  }
}
</style>
