<script setup lang="ts">
import { ref } from 'vue'
import { guideRequest, type VisitPage } from '@/lib/guide-admin'

const props = defineProps<{ initial: VisitPage; sessionMessage: string }>()
const emit = defineEmits<{ logout: [] }>()
const visits = ref(props.initial.items)
const next = ref(props.initial.next)
const busy = ref(false)
const error = ref('')
const date = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

async function loadMore() {
  if (!next.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const params = new URLSearchParams(next.value)
    const page = await guideRequest<VisitPage>('/visits?' + params)
    visits.value.push(...page.items)
    next.value = page.next
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="admin-page admin-visits">
    <div class="admin-content">
      <header class="visits-header">
        <a href="/admin" class="secondary-button">Guia de Riven</a>
        <button type="button" class="secondary-button" @click="emit('logout')">Sair</button>
      </header>
      <h1>Visitas</h1>
      <p v-if="!visits.length" class="muted">Nenhuma visita com detalhes registrada ainda.</p>
      <div v-else class="visits-table" tabindex="0" role="region" aria-label="Visitas registradas">
        <table>
          <thead>
            <tr>
              <th scope="col">Data e hora (Brasília)</th>
              <th scope="col">Cidade e estado prováveis</th>
              <th scope="col">User-agent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="visit in visits" :key="visit.id">
              <td>
                <time :datetime="visit.visitedAt">{{
                  date.format(new Date(visit.visitedAt))
                }}</time>
              </td>
              <td>{{ [visit.city, visit.region].filter(Boolean).join(', ') || 'Indisponível' }}</td>
              <td>{{ visit.userAgent || 'Indisponível' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="error || sessionMessage" role="alert">{{ error || sessionMessage }}</p>
      <button
        v-if="next"
        type="button"
        class="secondary-button load-visits"
        :disabled="busy"
        @click="loadMore"
      >
        {{ busy ? 'Carregando…' : 'Carregar mais' }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.admin-visits {
  grid-template-columns: 1fr;
}
.visits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}
.visits-header a {
  text-decoration: none;
}
h1 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}
.visits-table {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  min-width: 36rem;
}
th,
td {
  padding: 12px;
  border-bottom: 1px solid var(--admin-line);
  text-align: left;
  vertical-align: top;
}
th:first-child,
td:first-child {
  white-space: nowrap;
}
td:last-child {
  min-width: 14rem;
  overflow-wrap: anywhere;
  color: var(--admin-muted);
}
.load-visits {
  margin-top: 16px;
}
</style>
