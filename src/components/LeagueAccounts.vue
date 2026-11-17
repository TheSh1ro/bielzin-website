<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowUpRight, ChevronDown, Copy, Minus, Plus, Shield } from 'lucide-vue-next'
import { AdminRequestError } from '@/lib/admin-api'
import { leagueProfileUrl, rankLabel, tierNames } from '@/lib/league'
import { vaultRequest, type Credentials, type VaultAccount } from '@/lib/lol-vault'
import LeagueAccountForm from './LeagueAccountForm.vue'

withDefaults(defineProps<{ heading?: 'h1' | 'h2' }>(), { heading: 'h2' })
const emit = defineEmits<{ 'access-denied': [] }>()
const tiers = Object.keys(tierNames)
const divisions = ['IV', 'III', 'II', 'I']
const masterIndex = tiers.indexOf('MASTER')
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})
const numberFormat = new Intl.NumberFormat('pt-BR')

const accounts = ref<VaultAccount[]>([])
const rankedAccounts = computed(() =>
  accounts.value
    .map((account) => ({
      account,
      rank: account.profile?.ranks.find(({ queueType }) => queueType === 'RANKED_SOLO_5x5'),
    }))
    .sort((a, b) => {
      const left = a.rank
      const right = b.rank
      const alphabetical = () => a.account.riotId.localeCompare(b.account.riotId, 'pt-BR')
      if (!left || !right) return Number(!!right) - Number(!!left) || alphabetical()
      const leftTier = tiers.indexOf(left.tier)
      const rightTier = tiers.indexOf(right.tier)
      if (leftTier !== rightTier) return rightTier - leftTier
      const divisionDifference =
        leftTier < masterIndex
          ? divisions.indexOf(right.division) - divisions.indexOf(left.division)
          : 0
      return divisionDifference || right.leaguePoints - left.leaguePoints || alphabetical()
    }),
)
const openId = ref<string>()
const editor = ref<string>()
const loading = ref(false)
const loadError = ref('')
const credentials = ref<Credentials>()
const revealing = ref(false)
const credentialMessage = ref('')
let revealVersion = 0
let hideTimer: number | undefined

function requestMessage(error: unknown) {
  if (error instanceof AdminRequestError && [401, 403].includes(error.status)) {
    revokeAccess()
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'
}

function revokeAccess() {
  hideCredentials()
  accounts.value = []
  openId.value = undefined
  editor.value = undefined
  loadError.value = 'Seu acesso às contas foi encerrado. Entre novamente.'
  emit('access-denied')
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    accounts.value = (await vaultRequest<{ items: VaultAccount[] }>()).items
  } catch (error) {
    loadError.value = requestMessage(error)
  } finally {
    loading.value = false
  }
}

function hideCredentials() {
  revealVersion++
  window.clearTimeout(hideTimer)
  credentials.value = undefined
  revealing.value = false
  credentialMessage.value = ''
}

function hideWhenBackgrounded() {
  if (document.hidden) hideCredentials()
}

async function revealCredentials(id: string) {
  hideCredentials()
  const version = revealVersion
  revealing.value = true
  try {
    const result = await vaultRequest<Credentials>(`/${id}/credentials`)
    if (version !== revealVersion) return
    credentials.value = result
    hideTimer = window.setTimeout(hideCredentials, 30_000)
  } catch (error) {
    if (version === revealVersion) credentialMessage.value = requestMessage(error)
  } finally {
    if (version === revealVersion) revealing.value = false
  }
}

async function copy(field: keyof Credentials) {
  const value = credentials.value?.[field]
  if (!value) return
  const version = revealVersion
  try {
    await navigator.clipboard.writeText(value)
    if (version === revealVersion) {
      credentialMessage.value = field === 'login' ? 'Login copiado.' : 'Senha copiada.'
    }
  } catch {
    if (version === revealVersion) credentialMessage.value = 'Não foi possível copiar.'
  }
}

function toggleAccount(id: string) {
  hideCredentials()
  editor.value = undefined
  openId.value = openId.value === id ? undefined : id
}

function startEdit(id: string) {
  hideCredentials()
  editor.value = id
}

async function accountSaved(id: string) {
  editor.value = undefined
  openId.value = id
  await load()
}

function collectionStatus(account: VaultAccount) {
  if (account.lastError === 404) return 'Riot ID não encontrado no BR'
  if (account.lastError !== null) return 'Aguardando nova tentativa'
  if (!account.profile) return 'Aguardando primeira coleta'
  return ''
}

onMounted(() => {
  void load()
  document.addEventListener('visibilitychange', hideWhenBackgrounded)
})
onBeforeUnmount(() => {
  hideCredentials()
  document.removeEventListener('visibilitychange', hideWhenBackgrounded)
})
</script>

<template>
  <div class="league-vault">
    <header class="section-heading vault-heading">
      <component :is="heading">Minhas contas</component>
      <button
        v-if="editor !== 'new' && !loading && !loadError"
        type="button"
        class="vault-add"
        @click="startEdit('new')"
      >
        <Plus :size="16" aria-hidden="true" /> Adicionar conta
      </button>
    </header>

    <LeagueAccountForm
      v-if="editor === 'new'"
      class="vault-new"
      @saved="accountSaved"
      @cancel="editor = undefined"
      @access-denied="revokeAccess"
    />

    <p v-if="loadError" class="vault-message" role="alert">
      {{ loadError }} <button type="button" @click="load">Tentar novamente</button>
    </p>
    <p v-else-if="loading && !accounts.length" class="vault-message" role="status">
      Carregando contas…
    </p>
    <p v-else-if="!accounts.length && !editor" class="vault-empty vault-message">
      Adicione uma conta com o Riot ID para acompanhar o elo.
    </p>

    <ul v-if="accounts.length" class="vault-list" aria-label="Contas de League of Legends">
      <li v-for="{ account, rank } in rankedAccounts" :key="account.id" class="vault-account">
        <h3>
          <button
            type="button"
            class="vault-summary"
            :aria-expanded="openId === account.id"
            :aria-controls="`details-${account.id}`"
            @click="toggleAccount(account.id)"
          >
            <img
              v-if="account.profile"
              :src="`https://ddragon.leagueoflegends.com/cdn/${account.profile.dataDragonVersion}/img/profileicon/${account.profile.profileIconId}.png`"
              alt=""
              width="38"
              height="38"
              loading="lazy"
            />
            <span v-else class="vault-placeholder" aria-hidden="true"><Shield :size="19" /></span>
            <span class="vault-identity">
              <strong v-if="account.profile"
                >{{ account.profile.gameName }}<small>#{{ account.profile.tagLine }}</small></strong
              >
              <strong v-else>{{ account.riotId }}</strong>
              <span v-if="account.profile"
                >{{ account.profile.region }} · Nível {{ account.profile.level }}</span
              >
              <span v-else>{{ collectionStatus(account) }}</span>
            </span>
            <span class="vault-solo">
              <img
                v-if="rank && tierNames[rank.tier]"
                :src="`/media/lol/ranks/${rank.tier.toLowerCase()}.png`"
                alt=""
                width="30"
                height="30"
              />
              <Minus v-else :size="18" aria-hidden="true" />
              <span class="vault-solo-label">
                {{
                  rank
                    ? `${rankLabel(rank)} · ${numberFormat.format(rank.leaguePoints)} LP`
                    : 'Sem ranking'
                }}
              </span>
            </span>
            <span class="vault-ownership" :class="{ 'is-owner': account.ownership === 'owner' }">
              {{ account.ownership === 'owner' ? 'Dono' : 'Outros' }}
            </span>
            <ChevronDown class="vault-chevron" :size="18" aria-hidden="true" />
          </button>
        </h3>

        <div :id="`details-${account.id}`" :hidden="openId !== account.id">
          <div v-if="openId === account.id" class="vault-details">
            <div v-if="account.profile" class="vault-rank">
              <h4>Solo / Duo</h4>
              <p v-if="rank" class="vault-score vault-rank-mobile">
                {{ rankLabel(rank) }} · {{ numberFormat.format(rank.leaguePoints) }} LP
              </p>
              <p v-if="rank" class="vault-score">
                <span>{{ rank.wins }}V / {{ rank.losses }}D</span>
                <span
                  >{{ Math.round((rank.wins / Math.max(1, rank.wins + rank.losses)) * 100) }}%</span
                >
              </p>
              <p v-else class="vault-score">Sem ranking</p>
            </div>
            <div v-if="account.profile" class="vault-profile-links">
              <time :datetime="account.profile.collectedAt">{{
                dateFormat.format(new Date(account.profile.collectedAt))
              }}</time>
              <a
                :href="leagueProfileUrl(account.profile.gameName, account.profile.tagLine)"
                target="_blank"
                rel="noopener noreferrer"
                >Ver perfil <ArrowUpRight :size="14" aria-hidden="true"
              /></a>
            </div>
            <p v-if="account.profile && collectionStatus(account)" class="vault-message">
              {{ collectionStatus(account) }}
            </p>

            <LeagueAccountForm
              v-if="editor === account.id"
              :account="account"
              @saved="accountSaved"
              @cancel="editor = undefined"
              @access-denied="revokeAccess"
            />
            <template v-else>
              <div class="vault-actions">
                <button v-if="credentials" type="button" @click="hideCredentials">
                  Ocultar login e senha
                </button>
                <button
                  v-else
                  type="button"
                  :disabled="revealing"
                  @click="revealCredentials(account.id)"
                >
                  {{ revealing ? 'Carregando…' : 'Revelar login e senha' }}
                </button>
                <button type="button" @click="startEdit(account.id)">Editar</button>
              </div>
              <dl v-if="credentials" class="vault-credentials">
                <div v-for="field in ['login', 'password'] as const" :key="field">
                  <dt>{{ field === 'login' ? 'Login' : 'Senha' }}</dt>
                  <dd>
                    <code>{{ credentials[field] }}</code>
                  </dd>
                  <button
                    type="button"
                    :aria-label="field === 'login' ? 'Copiar login' : 'Copiar senha'"
                    @click="copy(field)"
                  >
                    <Copy :size="15" aria-hidden="true" />
                  </button>
                </div>
              </dl>
              <p v-if="credentialMessage" class="vault-message" role="status">
                {{ credentialMessage }}
              </p>
            </template>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.league-vault {
  --vault-border: color-mix(in srgb, var(--text) 18%, transparent);
}
.vault-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
}
.vault-heading :is(h1, h2) {
  font-size: clamp(1.375rem, 4vw, 1.75rem);
}
.vault-empty {
  padding: 16px;
  border: 1px solid var(--vault-border);
  background: var(--surface);
}
.vault-list {
  display: grid;
  gap: 8px;
  list-style: none;
}
.vault-account,
.vault-new {
  border: 1px solid var(--vault-border);
  background: var(--surface);
}
.vault-new {
  margin-bottom: 12px;
  padding: 16px;
}
.vault-summary {
  width: 100%;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto 48px 18px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}
.vault-summary:hover,
.vault-summary[aria-expanded='true'] {
  background: color-mix(in srgb, var(--text) 5%, transparent);
}
.vault-summary[aria-expanded='true'] .vault-chevron {
  transform: rotate(180deg);
}
.vault-placeholder {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--vault-border);
  color: var(--muted);
}
.vault-identity {
  display: grid;
  gap: 2px;
  overflow-wrap: anywhere;
  font-size: 0.9375rem;
}
.vault-identity small,
.vault-identity > span,
.vault-ownership,
.vault-solo,
.vault-score,
.vault-message,
.vault-profile-links,
.vault-credentials dt {
  font-size: 0.8125rem;
  color: var(--muted);
}
.vault-ownership.is-owner {
  color: var(--text);
}
.vault-details {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--vault-border);
}
.vault-rank {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--vault-border);
}
.vault-rank h4 {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted);
}
.vault-solo,
.vault-score,
.vault-profile-links,
.vault-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.vault-score,
.vault-profile-links {
  justify-content: space-between;
}
.vault-solo img {
  flex: none;
}
.vault-rank .vault-rank-mobile {
  display: none;
}
.vault-profile-links a,
.league-vault :deep(button:not(.vault-summary)) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.league-vault :deep(button:not(.vault-summary)) {
  min-height: 36px;
  padding: 5px 9px;
  border: 1px solid var(--vault-border);
  font-size: 0.8125rem;
  cursor: pointer;
}
.league-vault :deep(button:not(.vault-summary):hover) {
  border-color: var(--text);
}
.league-vault button:disabled {
  opacity: 0.65;
  cursor: wait;
}
.vault-credentials > div {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  overflow-wrap: anywhere;
}
.vault-credentials code {
  white-space: pre-wrap;
}
@media (max-width: 420px) {
  .vault-summary {
    grid-template-columns: 38px minmax(0, 1fr) 26px auto 18px;
    gap: 8px;
  }
  .vault-solo-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .vault-solo img {
    width: 26px;
    height: 26px;
  }
  .vault-rank {
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .vault-rank .vault-rank-mobile {
    display: block;
  }
}
</style>
