<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ChevronDown, SlidersHorizontal } from 'lucide-vue-next'
import { guideRequest } from '@/lib/guide-admin'

const actions: Record<string, string> = {
  panel_entered: 'Entrou no painel',
  user_invited: 'Preparou convite',
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
  core: 'Itens principais',
  start: 'Itens iniciais',
  boots: 'Botas',
  situational: 'Situacionais',
  components: 'Compras antecipadas',
  route: 'Rota',
  reason: 'Explicação',
  condition: 'Quando e por quê',
  title: 'Título',
  item: 'Item',
  routes: 'Rotas',
  defaultRoute: 'Rota padrão',
  items: 'Sequência de itens',
  when: 'Quando usar',
  followup: 'Continuação',
  bootsNote: 'Orientação de botas',
  primaryStyle: 'Árvore primária',
  secondaryStyle: 'Árvore secundária',
  primary: 'Runas primárias',
  secondary: 'Runas secundárias',
  shards: 'Fragmentos',
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
const showFilters = ref(false)
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
  if (Array.isArray(value)) return value.join('\n') || '—'
  return String(value)
}

type FieldChange = { label: string; before: string; after: string }

function describeChanges(changes: NonNullable<AuditEvent['changes']>) {
  const result: FieldChange[] = []
  function compare(field: string, label: string, before: unknown, after: unknown) {
    if (JSON.stringify(before) === JSON.stringify(after)) return
    if (
      [before, after].some(
        (value) =>
          value !== null &&
          typeof value === 'object' &&
          (!Array.isArray(value) || value.some((entry) => entry && typeof entry === 'object')),
      )
    ) {
      const previous = (before ?? {}) as Record<string, unknown>
      const current = (after ?? {}) as Record<string, unknown>
      for (const key of new Set([...Object.keys(previous), ...Object.keys(current)])) {
        const name = /^\d+$/.test(key) ? String(Number(key) + 1) : (fields[key] ?? key)
        compare(key, label + ' › ' + name, previous[key], current[key])
      }
    } else {
      result.push({ label, before: displayValue(field, before), after: displayValue(field, after) })
    }
  }
  for (const [field, change] of Object.entries(changes)) {
    compare(field, fields[field] ?? field, change.before, change.after)
  }
  return result
}

function clearFilters() {
  actor.value = action.value = start.value = end.value = ''
  void load()
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
    <header class="management-heading"><h1 id="audit-title">Auditoria</h1></header>
    <div class="audit-tools">
      <select v-model="action" aria-label="Tipo de ação" :disabled="loading" @change="load()">
        <option value="">Todas as ações</option>
        <option v-for="(label, kind) in actions" :key="kind" :value="kind">{{ label }}</option>
      </select>
      <button
        class="secondary-button"
        type="button"
        aria-controls="audit-filters"
        :aria-expanded="showFilters"
        @click="showFilters = !showFilters"
      >
        <SlidersHorizontal :size="14" aria-hidden="true" /> Autor e período
      </button>
      <form
        id="audit-filters"
        v-show="showFilters"
        class="management-form audit-filters"
        @submit.prevent="load()"
      >
        <label>E-mail ou UUID <input v-model="actor" type="search" maxlength="254" /></label>
        <label>De <input v-model="start" type="date" /></label>
        <label>Até <input v-model="end" type="date" :min="start || undefined" /></label>
        <button type="submit" class="secondary-button" :disabled="loading">Filtrar</button>
      </form>
      <button
        v-if="activeQuery"
        type="button"
        class="text-button audit-clear"
        :disabled="loading"
        @click="clearFilters"
      >
        Limpar filtros
      </button>
    </div>
    <p v-if="error" class="management-error" role="alert">{{ error }}</p>
    <ol v-if="events.length" class="management-list" aria-label="Eventos de auditoria">
      <li v-for="event in events" :key="event.id" class="audit-row">
        <div class="audit-event">
          <div>
            <strong>{{ actions[event.action] ?? event.action }}</strong>
            <span v-if="event.target && event.action !== 'defaults_saved'" class="muted">
              · {{ event.target }}</span
            >
            <small>{{ event.actorEmail ?? event.actorId }}</small>
          </div>
          <time class="muted" :datetime="event.at">{{ dateTime.format(new Date(event.at)) }}</time>
        </div>
        <details v-if="event.changes">
          <summary class="management-disclosure">
            <ChevronDown :size="14" aria-hidden="true" /> Ver alterações
          </summary>
          <section
            v-for="change in describeChanges(event.changes)"
            :key="change.label"
            class="audit-field"
          >
            <h3>{{ change.label }}</h3>
            <div class="audit-values">
              <div>
                <small>Antes</small>
                <p>{{ change.before }}</p>
              </div>
              <div>
                <small>Depois</small>
                <p>{{ change.after }}</p>
              </div>
            </div>
          </section>
        </details>
      </li>
    </ol>
    <p v-else-if="!loading && !error" class="management-empty muted">
      {{ activeQuery ? 'Nenhuma ação corresponde aos filtros.' : 'Nenhuma ação registrada.' }}
    </p>
    <p v-if="loading && !events.length" role="status" class="management-empty muted">
      Carregando auditoria…
    </p>
    <button
      v-if="next || error"
      type="button"
      class="secondary-button management-more"
      :disabled="loading"
      @click="load(!!next)"
    >
      {{ error ? 'Tentar novamente' : 'Carregar mais' }}
    </button>
  </section>
</template>

<style scoped>
.audit-tools {
  display: grid;
  grid-template-columns: minmax(0, 15rem) auto 1fr;
  align-items: start;
  gap: 8px 12px;
  margin-bottom: 16px;
}
.audit-tools > select {
  min-height: 38px;
  font-size: 13px;
}
.audit-filters {
  grid-column: 1 / -1;
  padding-block: 8px;
}
.audit-clear {
  grid-column: 3;
  grid-row: 1;
  min-height: 38px;
  justify-self: end;
}
.audit-row {
  padding: 16px;
  overflow-wrap: anywhere;
}
.audit-event {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
}
.audit-event time {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.audit-row details {
  margin-top: 8px;
}
summary {
  cursor: pointer;
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
  border-radius: 4px;
  background: var(--admin-bg);
  padding: 8px 10px;
}
.audit-values p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 760px) {
  .audit-tools {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .audit-clear {
    grid-column: 1 / -1;
    grid-row: auto;
    justify-self: start;
  }
  .audit-tools .audit-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .audit-filters > :first-child {
    grid-column: 1 / -1;
  }
  .audit-filters > button {
    grid-column: 2;
    justify-self: end;
  }
}
</style>
