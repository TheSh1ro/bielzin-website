<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { guideRequest } from '@/lib/guide-admin'

const actions: Record<string, string> = {
  panel_entered: 'Entrou no painel',
  user_invited: 'Enviou convite',
  role_changed: 'Alterou cargo',
  matchup_saved: 'Editou matchup',
  defaults_saved: 'Editou padrões do guia',
  catalog_updated: 'Atualizou catálogo',
  vault_created: 'Adicionou conta ao cofre',
  vault_updated: 'Editou conta do cofre',
  vault_revealed: 'Revelou credenciais do cofre',
}
const fields: Record<string, string> = {
  role: 'Cargo',
  visible: 'Incluído no guia',
  early: 'Early game',
  late: 'Late game',
  tips: 'Dicas',
  build: 'Itens',
  runes: 'Runas',
  lanePlan: 'Plano da lane',
  itemization: 'Builds e botas',
}
type AuditEvent = {
  id: string
  at: string
  actorId: string
  actorEmail: string | null
  action: string
  target: string | null
  changes: Record<string, { before: unknown; after: unknown }> | null
}
const events = ref<AuditEvent[]>([])
const actor = ref('')
const action = ref('')
const start = ref('')
const end = ref('')
const next = ref<string | null>(null)
const activeQuery = ref('')
const loading = ref(false)
const error = ref('')
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'America/Sao_Paulo',
})

function displayValue(field: string, value: unknown) {
  if (field === 'role')
    return value === 'admin' ? 'Administrador' : value === 'editor' ? 'Editor' : 'Sem acesso'
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (value === 'favorable') return 'Favorável'
  if (value === 'even') return 'Equilibrado'
  if (value === 'unfavorable') return 'Desfavorável'
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
    return value.join('\n') || '—'
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

async function load(append = false) {
  if (loading.value) return
  if (!append) {
    const query = new URLSearchParams()
    if (actor.value.trim()) query.set('actor', actor.value.trim())
    if (action.value) query.set('action', action.value)
    if (start.value) query.set('start', start.value)
    if (end.value) query.set('end', end.value)
    activeQuery.value = query.toString()
    next.value = null
    events.value = []
  }
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams(activeQuery.value)
    if (next.value) query.set('before', next.value)
    const page = await guideRequest<{ items: AuditEvent[]; next: string | null }>('/audit?' + query)
    events.value = append ? [...events.value, ...page.items] : page.items
    next.value = page.next
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="admin-content" aria-labelledby="audit-title">
    <h1 id="audit-title">Auditoria</h1>
    <form class="management-form" @submit.prevent="load()">
      <label>E-mail ou UUID <input v-model="actor" type="search" maxlength="254" /></label>
      <label>
        Ação
        <select v-model="action">
          <option value="">Todas</option>
          <option v-for="(label, kind) in actions" :key="kind" :value="kind">{{ label }}</option>
        </select>
      </label>
      <label>De <input v-model="start" type="date" /></label>
      <label>Até <input v-model="end" type="date" :min="start || undefined" /></label>
      <button type="submit" class="secondary-button" :disabled="loading">Filtrar</button>
    </form>
    <p v-if="error" class="management-error" role="alert">{{ error }}</p>
    <ol v-if="events.length" class="management-list" aria-label="Eventos de auditoria">
      <li v-for="event in events" :key="event.id" class="audit-row">
        <strong>{{ actions[event.action] ?? event.action }}</strong>
        <span v-if="event.target">
          · {{ event.action === 'defaults_saved' ? 'Padrões do guia' : event.target }}</span
        >
        <p class="muted">
          {{ event.actorEmail ?? event.actorId }} ·
          <time :datetime="event.at">{{ dateTime.format(new Date(event.at)) }}</time>
        </p>
        <details v-if="event.changes">
          <summary>Ver alterações</summary>
          <section v-for="(change, field) in event.changes" :key="field" class="audit-field">
            <h3>{{ fields[field] ?? field }}</h3>
            <div class="audit-values">
              <div>
                <small>Antes</small>
                <pre>{{ displayValue(field, change.before) }}</pre>
              </div>
              <div>
                <small>Depois</small>
                <pre>{{ displayValue(field, change.after) }}</pre>
              </div>
            </div>
          </section>
        </details>
      </li>
    </ol>
    <p v-else-if="!loading && !error" class="muted">Nenhuma ação registrada para este filtro.</p>
    <p v-if="loading" role="status" class="muted">Carregando auditoria…</p>
    <button
      v-if="next"
      type="button"
      class="secondary-button management-more"
      :disabled="loading"
      @click="load(true)"
    >
      {{ error ? 'Tentar novamente' : 'Carregar mais' }}
    </button>
  </section>
</template>

<style scoped>
.audit-row {
  padding: 16px;
  overflow-wrap: anywhere;
}
.audit-row .muted {
  font-size: 13px;
}
details {
  margin-top: 8px;
}
summary {
  cursor: pointer;
  color: var(--admin-accent);
}
.audit-field {
  margin-block: 12px;
}
.audit-values {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 12px;
  margin-top: 6px;
}
.audit-values > div {
  min-width: 0;
  border: 1px solid var(--admin-line);
  padding: 8px 10px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
