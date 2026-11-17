<script setup lang="ts">
import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'
import { authStorageKey, backendUrl, publishableKey } from '@/lib/supabase'
import '@/assets/admin.css'

const fragment = new URLSearchParams(window.location.hash.slice(1))
const token = fragment.get('token_hash')
const accessToken = fragment.get('access_token')
const refreshToken = fragment.get('refresh_token')
const invitedSession =
  fragment.get('type') === 'invite' && accessToken && refreshToken
    ? { access_token: accessToken, refresh_token: refreshToken }
    : null
window.history.replaceState({}, '', window.location.pathname)
document.title = 'Definir senha · bielzin'

const client =
  backendUrl && publishableKey
    ? createClient(backendUrl, publishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: authStorageKey + '-invite',
        },
      })
    : null
const password = ref('')
const confirmation = ref('')
const busy = ref(false)
const complete = ref(false)
const error = ref('')
let verified = false
const unavailable = ref(!client || (!token && !invitedSession))

async function setPassword() {
  if (!client || busy.value || unavailable.value) return
  error.value = ''
  if (password.value !== confirmation.value) {
    error.value = 'As senhas precisam ser iguais.'
    return
  }
  busy.value = true
  try {
    if (!verified) {
      const result = token
        ? await client.auth.verifyOtp({ token_hash: token, type: 'invite' })
        : invitedSession && (await client.auth.setSession(invitedSession))
      const inviteError = result && result.error
      if (inviteError) {
        if (inviteError.code === 'otp_expired') unavailable.value = true
        error.value = unavailable.value
          ? 'Convite inválido ou vencido. Peça um novo convite.'
          : 'Não foi possível confirmar o convite. Tente novamente.'
        return
      }
      verified = true
    }
    const { error: passwordError } = await client.auth.updateUser({ password: password.value })
    if (passwordError) {
      error.value =
        passwordError.code === 'weak_password'
          ? 'Escolha uma senha mais forte.'
          : 'Não foi possível salvar a senha. Tente novamente.'
      return
    }
    password.value = ''
    confirmation.value = ''
    complete.value = true
    await client.auth.signOut({ scope: 'local' })
  } catch {
    if (!complete.value) error.value = 'Não foi possível concluir. Tente novamente.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="admin-page admin-session">
    <div class="admin-session-content">
      <h1>Definir senha</h1>
      <p v-if="complete" role="status">Senha definida. Entre no painel com seu e-mail e senha.</p>
      <p v-else-if="error || unavailable" class="login-error" role="alert">
        {{ error || 'Convite inválido ou vencido. Peça um novo convite.' }}
      </p>
      <form v-if="!complete && !unavailable" class="admin-login" @submit.prevent="setPassword">
        <label>
          Nova senha
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </label>
        <label>
          Confirmar senha
          <input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </label>
        <button class="secondary-button" type="submit" :disabled="busy">
          {{ busy ? 'Salvando…' : 'Salvar senha' }}
        </button>
      </form>
      <a class="back-link" href="/admin">Ir para o login</a>
    </div>
  </main>
</template>
