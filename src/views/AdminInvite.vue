<script setup lang="ts">
import { createClient } from '@supabase/supabase-js'
import { ref } from 'vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { apiHeaders, authStorageKey, backendUrl, publishableKey } from '@/lib/supabase'
import '@/assets/admin.css'

const fragment = new URLSearchParams(window.location.hash.slice(1))
const token = fragment.get('token_hash')
const signupToken = fragment.get('signup_token')
const accessToken = fragment.get('access_token')
const refreshToken = fragment.get('refresh_token')
const invitedSession =
  fragment.get('type') === 'invite' && accessToken && refreshToken
    ? { access_token: accessToken, refresh_token: refreshToken }
    : null
window.history.replaceState({}, '', window.location.pathname)
document.title = (signupToken ? 'Criar conta' : 'Definir senha') + ' · bielzin'

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
const email = ref('')
const confirmation = ref('')
const busy = ref(false)
const complete = ref(false)
const error = ref('')
let verified = false
const unavailable = ref(!client || (!signupToken && !token && !invitedSession))

async function createAccount(token: string) {
  const headers = apiHeaders()
  headers.set('Content-Type', 'application/json')
  const response = await fetch(backendUrl + '/functions/v1/panel-signup', {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, email: email.value.trim(), password: password.value }),
    signal: AbortSignal.timeout(18000),
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    unavailable.value = response.status === 410
    error.value = result.message ?? 'Não foi possível criar a conta. Tente novamente.'
    return
  }
  password.value = ''
  confirmation.value = ''
  complete.value = true
}

async function setPassword() {
  if (!client || busy.value || unavailable.value) return
  error.value = ''
  if (password.value !== confirmation.value) {
    error.value = 'As senhas precisam ser iguais.'
    return
  }
  busy.value = true
  try {
    if (signupToken) {
      await createAccount(signupToken)
      return
    }
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
      <h1>
        {{
          signupToken
            ? complete
              ? 'Conta criada'
              : 'Criar conta'
            : complete
              ? 'Senha definida'
              : 'Definir senha'
        }}
      </h1>
      <p v-if="complete" class="muted" role="status">Entre com seu e-mail e a nova senha.</p>
      <p v-else-if="error || unavailable" class="login-error" role="alert">
        {{ error || 'Convite inválido ou vencido. Peça um novo convite.' }}
      </p>
      <form v-if="!complete && !unavailable" class="admin-login" @submit.prevent="setPassword">
        <label v-if="signupToken">
          E-mail
          <input v-model="email" type="email" autocomplete="email" maxlength="254" required />
        </label>
        <label>
          Nova senha
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            aria-describedby="invite-password-hint"
            required
          />
          <small id="invite-password-hint">Use pelo menos 8 caracteres.</small>
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
          {{ busy ? 'Salvando…' : signupToken ? 'Criar conta' : 'Salvar senha' }}
        </button>
      </form>
      <a v-if="complete" class="secondary-button reset-confirm" href="/admin"
        >Entrar no painel <ArrowRight :size="16" aria-hidden="true"
      /></a>
      <a v-else class="back-link" href="/admin"
        ><ArrowLeft :size="16" aria-hidden="true" /> Voltar ao login</a
      >
    </div>
  </main>
</template>
