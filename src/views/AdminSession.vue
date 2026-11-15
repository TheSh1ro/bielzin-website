<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import AdminView from './AdminView.vue'
import { adminClient, guideRequest, type AdminGuide } from '@/lib/guide-admin'
import '@/assets/admin.css'

const guide = shallowRef<AdminGuide>()
const signedIn = ref(false)
const email = ref('')
const password = ref('')
const busy = ref(true)
const message = ref('')

async function load() {
  busy.value = true
  message.value = ''
  try {
    guide.value = await guideRequest<AdminGuide>('')
  } catch (error) {
    message.value = (error as Error).message
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  document.title = 'Painel · bielzin'
  if (!adminClient) {
    message.value = 'Painel indisponível.'
    busy.value = false
    return
  }
  signedIn.value = !!(await adminClient.auth.getSession()).data.session
  if (signedIn.value) await load()
  else busy.value = false
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
    await load()
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
    guide.value = undefined
    message.value = ''
  } catch {
    message.value = 'Não foi possível sair. Tente novamente.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AdminView v-if="guide" :initial="guide" :session-message="message" @logout="signOut" />
  <main v-else class="admin-page admin-session">
    <div class="admin-session-content">
      <a class="admin-brand" href="/">
        <span class="brand-mark">bz.</span>
        <h1>Guia de Riven</h1>
      </a>
      <p v-if="busy" role="status">Carregando painel…</p>
      <p v-if="message" role="alert">{{ message }}</p>
      <form v-if="adminClient && !signedIn" class="admin-login" @submit.prevent="signIn">
        <label
          >E-mail <input v-model="email" type="email" autocomplete="username" required
        /></label>
        <label>
          Senha
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="secondary-button" :disabled="busy">Entrar</button>
      </form>
      <div v-else-if="signedIn && !busy" class="admin-session-actions">
        <button type="button" class="secondary-button" @click="load">Tentar novamente</button>
        <button type="button" class="secondary-button" @click="signOut">Sair</button>
      </div>
    </div>
  </main>
</template>
