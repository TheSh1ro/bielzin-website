<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { guideRequest } from '@/lib/guide-admin'

type Role = 'admin' | 'editor'
type PanelUser = {
  id: string
  email: string
  role: Role | null
  confirmed: boolean
  invited: boolean
  self: boolean
}
type Cursor = { email: string; id: string }
const users = ref<PanelUser[]>([])
const next = ref<Cursor | null>(null)
const search = ref('')
const activeSearch = ref('')
const email = ref('')
const role = ref<Role>('editor')
const loading = ref(false)
const writing = ref(false)
const error = ref('')
const status = ref('')

async function load(append = false) {
  if (loading.value) return
  if (!append) {
    activeSearch.value = search.value.trim()
    next.value = null
    users.value = []
  }
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ search: activeSearch.value, ...next.value })
    const page = await guideRequest<{ items: PanelUser[]; next: Cursor | null }>('/users?' + query)
    users.value = append ? [...users.value, ...page.items] : page.items
    next.value = page.next
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loading.value = false
  }
}

async function invite(user?: PanelUser) {
  if (writing.value || loading.value) return
  const target = user?.email ?? email.value.trim()
  const targetRole = user?.role ?? role.value
  if (
    !user &&
    targetRole === 'admin' &&
    !window.confirm('Convidar ' + target + ' como administrador?')
  )
    return
  writing.value = true
  error.value = ''
  status.value = ''
  try {
    await guideRequest('/users/invite', 'POST', { email: target, role: targetRole, resend: !!user })
    if (!user) {
      email.value = ''
      role.value = 'editor'
      search.value = target
      await load()
    }
    status.value = user ? 'Convite reenviado.' : 'Convite enviado.'
  } catch (cause) {
    const message = (cause as Error).message
    search.value = target
    await load()
    error.value = message
  } finally {
    writing.value = false
  }
}

async function changeRole(user: PanelUser, event: Event) {
  const select = event.target as HTMLSelectElement
  const requested = select.value as Role | ''
  select.value = user.role ?? ''
  if (writing.value || loading.value || user.self || (user.role ?? '') === requested) return
  if (
    requested === 'admin' &&
    !window.confirm('Conceder acesso de administrador a ' + user.email + '?')
  )
    return
  if (!requested && !window.confirm('Revogar o acesso ao painel de ' + user.email + '?')) return
  writing.value = true
  error.value = ''
  status.value = ''
  try {
    await guideRequest('/users/' + user.id + '/role', 'PUT', { role: requested || null })
    user.role = requested || null
    status.value = 'Cargo atualizado.'
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    writing.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="admin-content" aria-labelledby="users-title">
    <h1 id="users-title">Usuários</h1>
    <form class="management-form" @submit.prevent="invite()">
      <label
        >E-mail do convite <input v-model="email" type="email" maxlength="254" required
      /></label>
      <label>
        Cargo do convite
        <select v-model="role">
          <option value="editor">Editor</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <button type="submit" class="secondary-button" :disabled="writing || loading">
        Enviar convite
      </button>
    </form>

    <form class="management-form" @submit.prevent="load()">
      <label>Buscar usuário <input v-model="search" type="search" maxlength="254" /></label>
      <button type="submit" class="secondary-button" :disabled="loading || writing">Buscar</button>
    </form>

    <p v-if="error" class="management-error" role="alert">{{ error }}</p>
    <p v-if="status" class="management-status" role="status">{{ status }}</p>
    <ul v-if="users.length" class="management-list" aria-label="Usuários do painel">
      <li v-for="user in users" :key="user.id" class="management-row">
        <div>
          <strong>{{ user.email }}</strong>
          <small v-if="user.self">Sua conta</small>
          <small v-else-if="!user.confirmed">{{
            user.invited ? 'Convite pendente' : 'E-mail sem confirmação'
          }}</small>
        </div>
        <select
          :aria-label="'Cargo de ' + user.email"
          :value="user.role ?? ''"
          :disabled="user.self || writing || loading"
          @change="changeRole(user, $event)"
        >
          <option value="">Sem acesso</option>
          <option value="editor">Editor</option>
          <option value="admin">Administrador</option>
        </select>
        <button
          v-if="user.invited && !user.confirmed && user.role"
          type="button"
          class="secondary-button"
          :disabled="writing || loading"
          @click="invite(user)"
        >
          Reenviar convite
        </button>
      </li>
    </ul>
    <p v-else-if="!loading && !error" class="muted">Nenhum usuário encontrado.</p>
    <p v-if="loading" role="status" class="muted">Carregando usuários…</p>
    <button
      v-if="next"
      type="button"
      class="secondary-button management-more"
      :disabled="loading || writing"
      @click="load(true)"
    >
      {{ error ? 'Tentar novamente' : 'Carregar mais' }}
    </button>
  </section>
</template>
