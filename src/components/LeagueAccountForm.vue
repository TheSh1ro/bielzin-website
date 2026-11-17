<script setup lang="ts">
import { ref } from 'vue'
import { AdminRequestError } from '@/lib/admin-api'
import { vaultRequest, type VaultAccount } from '@/lib/lol-vault'

const { account = undefined } = defineProps<{ account?: VaultAccount }>()
const emit = defineEmits<{ cancel: []; saved: [string]; 'access-denied': [] }>()

const riotId = ref(account?.riotId ?? '')
const ownership = ref<VaultAccount['ownership']>(account?.ownership ?? 'owner')
const login = ref('')
const password = ref('')
const saving = ref(false)
const error = ref('')

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const { id } = await vaultRequest<{ id: string }>(
      account ? `/${account.id}` : '',
      account ? 'PUT' : 'POST',
      {
        riotId: riotId.value,
        ownership: ownership.value,
        login: login.value || undefined,
        password: password.value || undefined,
      },
    )
    login.value = ''
    password.value = ''
    emit('saved', id)
  } catch (failure) {
    if (failure instanceof AdminRequestError && [401, 403].includes(failure.status)) {
      emit('access-denied')
    } else {
      error.value = failure instanceof Error ? failure.message : 'Não foi possível salvar a conta.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="vault-form" autocomplete="off" @submit.prevent="save">
    <label>
      Riot ID
      <input v-model="riotId" placeholder="Nome#TAG" maxlength="97" required />
    </label>
    <label>
      Vínculo
      <select v-model="ownership">
        <option value="owner">Dono</option>
        <option value="others">Outros</option>
      </select>
    </label>
    <label>
      {{ account ? 'Novo login' : 'Login' }}
      <input
        v-model="login"
        maxlength="128"
        :required="!account"
        autocapitalize="off"
        spellcheck="false"
      />
    </label>
    <label>
      {{ account ? 'Nova senha' : 'Senha' }}
      <input
        v-model="password"
        type="password"
        autocomplete="new-password"
        maxlength="512"
        :required="!account"
      />
    </label>
    <p v-if="error" class="vault-form-note" role="alert">{{ error }}</p>
    <div class="vault-form-actions">
      <button type="submit" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar' }}</button>
      <button type="button" :disabled="saving" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.vault-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.vault-form label {
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: 0.8125rem;
}
.vault-form :is(input, select) {
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--vault-border);
  background: var(--page);
  color: var(--text);
}
.vault-form-note,
.vault-form-actions {
  grid-column: 1 / -1;
}
.vault-form-actions {
  display: flex;
  gap: 8px;
}
</style>
