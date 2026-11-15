<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { guideRequest, type VisitPage } from '@/lib/guide-admin'

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
    <header class="editor-heading">
      <div class="editor-identity">
        <div>
          <h1 id="visits-title">Visitas</h1>
          <p class="muted">Histórico de acessos ao perfil.</p>
        </div>
      </div>
    </header>

    <div class="visits-panel">
      <p v-if="busy && !loaded" class="visits-notice muted" role="status">Carregando visitas…</p>
      <p v-else-if="loaded && !visits.length" class="visits-notice muted">
        Nenhuma visita com detalhes registrada.
      </p>
      <div v-if="visits.length" class="visits-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Data e hora <span>(Brasília)</span></th>
              <th scope="col">Localização <span>(aproximada)</span></th>
              <th scope="col">User-agent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="visit in visits" :key="visit.id">
              <td>
                <time :datetime="visit.visitedAt">
                  <span>{{ date.format(new Date(visit.visitedAt)) }}</span>
                  <span class="visit-time">{{ time.format(new Date(visit.visitedAt)) }}</span>
                </time>
              </td>
              <td>{{ [visit.city, visit.region].filter(Boolean).join(', ') || 'Indisponível' }}</td>
              <td>{{ visit.userAgent || 'Indisponível' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="visits.length || error" class="visits-footer">
        <p v-if="error" class="visits-error" role="alert">{{ error }}</p>
        <p v-else-if="visits.length" class="muted" role="status">
          {{ visits.length }} {{ visits.length === 1 ? 'registro exibido' : 'registros exibidos' }}
        </p>
        <button
          v-if="next || error"
          type="button"
          class="secondary-button"
          :disabled="busy"
          @click="loadPage"
        >
          {{ busy ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar mais' }}
        </button>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.visits-panel {
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: var(--admin-surface);
}
.visits-table {
  overflow-x: auto;
  border-radius: 7px 7px 0 0;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  padding: 16px 20px;
  text-align: left;
  vertical-align: top;
}
th {
  background: var(--admin-raised);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
th span {
  color: var(--admin-muted);
  font-weight: 400;
}
td {
  border-top: 1px solid var(--admin-line);
}
td:first-child,
td:nth-child(2) {
  width: 1%;
  min-width: 11rem;
}
time {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-variant-numeric: tabular-nums;
}
.visit-time,
td:last-child {
  color: var(--admin-muted);
}
td:last-child {
  font: 12px/1.65 var(--mono);
  overflow-wrap: anywhere;
}
.visits-notice {
  padding: 24px;
}
.visits-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  font-size: 13px;
}
.visits-table + .visits-footer {
  border-top: 1px solid var(--admin-line);
}
.visits-footer button {
  margin-left: auto;
}
.visits-error {
  color: var(--admin-danger);
}
@media (max-width: 760px) {
  table {
    table-layout: fixed;
  }
  th,
  td,
  .visits-footer {
    padding-inline: 10px;
  }
  th {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  th span {
    display: block;
  }
  th:first-child {
    width: 6rem;
  }
  th:nth-child(2) {
    width: 30%;
  }
  td:first-child,
  td:nth-child(2) {
    width: auto;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  time {
    display: grid;
    gap: 2px;
    white-space: nowrap;
  }
}
</style>
