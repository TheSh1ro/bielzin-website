<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminView from './AdminView.vue'
import { adminClient } from '@/lib/guide-admin'
import '@/assets/admin.css'

const signedIn = ref(false)
const email = ref('')
const password = ref('')
const busy = ref(true)
const message = ref('')

onMounted(async () => {
  document.title = 'Painel · bielzin'
  if (!adminClient) {
    message.value = 'Painel indisponível.'
    busy.value = false
    return
  }
  signedIn.value = !!(await adminClient.auth.getSession()).data.session
  busy.value = false
})

async function signIn() {
  if (!adminClient || busy.value) return
  busy.value = true
  message.value = ''
  try {
    const { error } = await adminClient.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    if (error) {
      message.value =
        error.code === 'invalid_credentials'
          ? 'E-mail ou senha inválidos.'
          : 'Não foi possível entrar. Tente novamente.'
      return
    }
    signedIn.value = true
    password.value = ''
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
    signedIn.value = false
    message.value = ''
  } catch {
    message.value = 'Não foi possível sair. Tente novamente.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AdminView v-if="signedIn" :session-message="message" :session-busy="busy" @logout="signOut" />
  <main v-else class="admin-page admin-session">
    <div class="admin-session-content">
      <a class="admin-brand" href="/">
        <span class="brand-mark">bz</span>
        <h1>Painel</h1>
      </a>
      <p v-if="busy" role="status">Carregando painel…</p>
      <p v-if="message" role="alert">{{ message }}</p>
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
    </div>
  </main>
</template>
