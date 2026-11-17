<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Clipboard, Link, MailPlus, Search, X } from 'lucide-vue-next'
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
const inviteError = ref('')
const invitation = ref<HTMLDialogElement>()
const inviteForm = ref<HTMLFormElement>()
const pendingUser = ref<PanelUser>()
const emailMode = ref(false)
const inviteUrl = ref('')
const linkField = ref<HTMLInputElement>()
const copyStatus = ref('')
let searchTimer: ReturnType<typeof setTimeout>
let request = 0

async function load(append = false) {
  if (append && loading.value) return
  const current = ++request
  if (!append) {
    activeSearch.value = search.value.trim()
    next.value = null
  }
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ search: activeSearch.value, ...next.value })
    const page = await guideRequest<{ items: PanelUser[]; next: Cursor | null }>('/users?' + query)
    if (current !== request) return
    users.value = append ? [...users.value, ...page.items] : page.items
    next.value = page.next
  } catch (cause) {
    if (current === request) error.value = (cause as Error).message
  } finally {
    if (current === request) loading.value = false
  }
}

function openInvitation(user?: PanelUser) {
  pendingUser.value = user
  emailMode.value = false
  email.value = user?.email ?? ''
  role.value = user?.role ?? 'editor'
  inviteError.value = ''
  invitation.value?.showModal()
}

function clearInviteLink() {
  inviteUrl.value = ''
  copyStatus.value = ''
}

async function copyInviteLink() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    copyStatus.value = 'Link copiado.'
  } catch {
    linkField.value?.focus()
    linkField.value?.select()
    copyStatus.value = 'Link selecionado para copiar.'
  }
}

async function invite(delivery: 'link' | 'email' = 'link') {
  if (writing.value || loading.value) return
  const user = pendingUser.value
  const target = email.value.trim()
  const targetRole = role.value
  const signup = delivery === 'link' && !user
  if (
    !user &&
    targetRole === 'admin' &&
    !window.confirm(
      signup ? 'Gerar um convite de administrador?' : 'Convidar ' + target + ' como administrador?',
    )
  )
    return
  writing.value = true
  error.value = ''
  inviteError.value = ''
  status.value = ''
  try {
    const result = await guideRequest<{ inviteUrl?: string }>(
      signup ? '/users/signup-link' : '/users/invite',
      'POST',
      signup ? { role: targetRole } : { email: target, role: targetRole, resend: !!user, delivery },
    )
    if (delivery === 'link') {
      if (!result.inviteUrl) throw new Error('O link do convite não foi retornado.')
      inviteUrl.value = result.inviteUrl
    } else {
      invitation.value?.close()
      status.value = user ? 'Convite reenviado.' : 'Convite enviado.'
    }
    if (!user && !signup) {
      search.value = ''
      await load()
    }
  } catch (cause) {
    const message = (cause as Error).message
    await load()
    inviteError.value = message
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
watch(search, (value) => {
  clearTimeout(searchTimer)
  if (value.trim() !== activeSearch.value) searchTimer = setTimeout(() => void load(), 250)
})
onUnmounted(() => clearTimeout(searchTimer))
</script>

<template>
  <section class="admin-content" aria-labelledby="users-title">
    <header class="management-heading">
      <h1 id="users-title">Usuários</h1>
      <button class="secondary-button" type="button" :disabled="writing" @click="openInvitation()">
        <Link :size="16" aria-hidden="true" /> Convidar usuário
      </button>
    </header>
    <label class="search-field management-search">
      <Search :size="16" aria-hidden="true" />
      <input
        v-model="search"
        type="search"
        aria-label="Buscar usuário"
        placeholder="Buscar por e-mail"
        maxlength="254"
      />
    </label>

    <dialog
      ref="invitation"
      class="reset-dialog"
      aria-labelledby="invitation-title"
      @cancel="writing && $event.preventDefault()"
      @close="clearInviteLink"
    >
      <div class="dialog-heading">
        <h2 id="invitation-title">
          {{ inviteUrl ? 'Link de convite' : pendingUser ? 'Renovar convite' : 'Convidar usuário' }}
        </h2>
        <button
          type="button"
          class="icon-button"
          aria-label="Fechar convite"
          :disabled="writing"
          @click="invitation?.close()"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
      <div v-if="inviteUrl" class="management-invite">
        <label>
          {{ pendingUser ? 'Link para ' + email : 'Link de cadastro' }}
          <input ref="linkField" :value="inviteUrl" readonly @focus="linkField?.select()" />
        </label>
        <small
          >Envie apenas à pessoa convidada. O link é de uso único.{{
            pendingUser ? '' : ' O convite vence em 24 horas.'
          }}</small
        >
        <p v-if="copyStatus" role="status">{{ copyStatus }}</p>
        <div class="reset-actions">
          <button type="button" class="secondary-button reset-confirm" @click="copyInviteLink">
            <Clipboard :size="16" aria-hidden="true" /> Copiar link
          </button>
        </div>
      </div>
      <form
        v-else
        ref="inviteForm"
        class="management-invite"
        @submit.prevent="invite(emailMode ? 'email' : 'link')"
      >
        <label v-if="emailMode || pendingUser"
          >E-mail do convite
          <input v-model="email" type="email" maxlength="254" :readonly="!!pendingUser" required
        /></label>
        <label>
          Cargo do convite
          <select v-model="role" :disabled="!!pendingUser">
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <p v-if="inviteError" class="management-error" role="alert">{{ inviteError }}</p>
        <div class="reset-actions">
          <button
            type="button"
            class="secondary-button"
            :disabled="writing"
            @click="
              pendingUser
                ? inviteForm?.reportValidity() && invite('email')
                : (emailMode = !emailMode)
            "
          >
            <MailPlus v-if="!emailMode" :size="16" aria-hidden="true" />
            {{ emailMode ? 'Voltar ao link' : 'Enviar por e-mail' }}
          </button>
          <button
            type="submit"
            class="secondary-button reset-confirm"
            :disabled="writing || loading"
          >
            {{ writing ? 'Preparando…' : emailMode ? 'Enviar convite' : 'Gerar link' }}
          </button>
        </div>
      </form>
    </dialog>

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
        <span v-if="user.self" class="muted">Administrador</span>
        <select
          v-else
          :aria-label="'Cargo de ' + user.email"
          :value="user.role ?? ''"
          :disabled="writing || loading"
          @change="changeRole(user, $event)"
        >
          <option value="">Sem acesso</option>
          <option value="editor">Editor</option>
          <option value="admin">Administrador</option>
        </select>
        <button
          v-if="user.invited && !user.confirmed && user.role"
          type="button"
          class="text-button"
          :disabled="writing || loading"
          @click="openInvitation(user)"
        >
          Renovar convite
        </button>
      </li>
    </ul>
    <p v-else-if="!loading && !error" class="management-empty muted">Nenhum usuário encontrado.</p>
    <p v-if="loading && !users.length" role="status" class="management-empty muted">
      Carregando usuários…
    </p>
    <button
      v-if="next || error"
      type="button"
      class="secondary-button management-more"
      :disabled="loading || writing"
      @click="load(!!next)"
    >
      {{ error ? 'Tentar novamente' : 'Carregar mais' }}
    </button>
  </section>
</template>
