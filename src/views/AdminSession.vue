<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import AdminView from './AdminView.vue'
import { adminClient } from '@/lib/guide-admin'
import { recordSiteVisit, visitIdentity } from '@/lib/visits'
import '@/assets/admin.css'

const userId = ref<string>()
const email = ref('')
const password = ref('')
const busy = ref(true)
const sessionReady = ref(false)
const message = ref('')
let stopWatchingSession: (() => void) | undefined

watch(
  [sessionReady, userId],
  ([ready, id]) => {
    if (ready && !id) void recordSiteVisit('admin_login')
  },
  { flush: 'post' },
)

onMounted(() => {
  document.title = 'Painel · bielzin'
  if (!adminClient) {
    message.value = 'Painel indisponível.'
    busy.value = false
    return
  }
  const { data } = adminClient.auth.onAuthStateChange((event, session) => {
    userId.value = session?.user.id
    if (event === 'INITIAL_SESSION') {
      sessionReady.value = true
      busy.value = false
    }
  })
  stopWatchingSession = () => data.subscription.unsubscribe()
})
onBeforeUnmount(() => stopWatchingSession?.())

async function signIn() {
  if (!adminClient || busy.value) return
  busy.value = true
  message.value = ''
  try {
    const visit = await visitIdentity().catch(() => ({}))
    const response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...visit, email: email.value.trim(), password: password.value }),
      signal: AbortSignal.timeout(14000),
    })
    const result = await response.json()
    if (!response.ok) {
      message.value = result.message ?? 'Não foi possível entrar. Tente novamente.'
      return
    }
    const { error } = await adminClient.auth.setSession(result)
    if (error) throw error
    password.value = ''
  } catch {
    message.value = 'Não foi possível entrar. Tente novamente.'
  } finally {
    busy.value = false
  }
}

async function signOut() {
  if (!adminClient || busy.value) return
  busy.value = true
  try {
    const { error } = await adminClient.auth.signOut({ scope: 'local' })
    if (error) throw error
    message.value = ''
  } catch {
    message.value = 'Não foi possível sair. Tente novamente.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AdminView
    v-if="userId"
    :key="userId"
    :session-message="message"
    :session-busy="busy"
    @logout="signOut"
  />
  <main v-else class="admin-page admin-session">
    <div class="admin-session-content">
      <h1>Painel</h1>
      <p v-if="busy" class="muted" role="status">Carregando painel…</p>
      <p v-if="message" class="login-error" role="alert">{{ message }}</p>
      <form v-if="adminClient" class="admin-login" @submit.prevent="signIn">
        <label
          >E-mail <input v-model="email" type="email" autocomplete="username" required
        /></label>
        <label>
          Senha
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="secondary-button" :disabled="busy">Entrar</button>
      </form>
      <a class="back-link" href="/"><ArrowLeft :size="16" aria-hidden="true" /> Voltar ao perfil</a>
    </div>
  </main>
</template>
