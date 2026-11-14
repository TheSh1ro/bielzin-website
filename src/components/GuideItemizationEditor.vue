<script setup lang="ts">
import type { Itemization } from '@/lib/riven-guide'
import type { GuideCatalog } from '@/lib/guide-admin'
import GuideItemSequence from './GuideItemSequence.vue'
import GuideChoicesEditor from './GuideChoicesEditor.vue'
const content = defineModel<Itemization>({ required: true })
const props = defineProps<{
  catalog: GuideCatalog
  section: 'routes' | 'boots'
  usage: Record<string, string[]>
}>()
const emit = defineEmits<{ pick: [action: (id: number) => void, category?: 'boots'] }>()
function addRoute() {
  const id = 'rota-' + Date.now().toString(36)
  content.value.routes.push({
    id,
    title: 'Nova rota',
    when: '',
    reason: '',
    items: [6696],
    components: [],
    followup: '',
  })
}
function move(index: number, offset: number) {
  const values = [...content.value.routes]
  ;[values[index], values[index + offset]] = [values[index + offset]!, values[index]!]
  content.value.routes = values
}
function removeRoute(index: number) {
  const route = content.value.routes[index]!
  if (route.id === content.value.defaultRoute || props.usage[route.id]?.length) return
  if (
    confirm(
      `Remover a build “${route.title}”? Sua sequência e explicações serão excluídas da biblioteca compartilhada.`,
    )
  )
    content.value.routes.splice(index, 1)
}
</script>
<template>
  <div class="itemization-editor">
    <template v-if="section === 'routes'">
      <label for="default-route">Rota inicial do guia</label
      ><select id="default-route" v-model="content.defaultRoute">
        <option v-for="route in content.routes" :key="route.id" :value="route.id">
          {{ route.title }}
        </option>
      </select>
      <p class="field-help">
        Abre primeiro nos matchups sem uma build indicada. Trocar esta opção não apaga nenhuma
        build.
      </p>
      <details
        v-for="(route, index) in content.routes"
        :key="route.id"
        class="route-editor"
        name="build-routes"
      >
        <summary>
          <span class="route-summary-title"
            ><span class="route-order">0{{ index + 1 }}</span
            ><strong>{{ route.title }}</strong></span
          ><span class="route-summary-meta"
            ><span v-if="route.id === content.defaultRoute" class="source-label">Inicial</span
            ><span
              >{{ usage[route.id]?.length ?? 0 }}
              {{ usage[route.id]?.length === 1 ? 'indicação' : 'indicações' }}</span
            ><span class="route-summary-icons" aria-hidden="true"
              ><img
                v-for="(id, position) in route.items.slice(0, 3)"
                :key="position"
                :src="catalog.items[id]?.icon"
                alt=""
                width="28"
                height="28" /></span
          ></span>
        </summary>
        <div class="route-editor-fields">
          <p class="scope-note">
            Compartilhada com todos os matchups.
            {{
              usage[route.id]?.length
                ? 'Indicada contra ' + usage[route.id]!.join(', ') + '.'
                : 'Nenhum matchup indica esta build diretamente.'
            }}
          </p>
          <div class="route-form-columns">
            <div class="route-field-group">
              <label :for="`route-title-${route.id}`">Nome da rota</label
              ><input
                :id="`route-title-${route.id}`"
                v-model="route.title"
                maxlength="120"
                required
              />
              <label :for="`route-when-${route.id}`">Quando escolher</label
              ><textarea
                :id="`route-when-${route.id}`"
                v-model="route.when"
                rows="2"
                maxlength="2000"
              />
              <h3>Sequência de itens</h3>
              <GuideItemSequence
                v-model="route.items"
                :catalog="catalog"
                :label="`item da rota ${index + 1}`"
                @pick="(action, category) => emit('pick', action, category)"
              />
            </div>
            <div class="route-field-group">
              <label :for="`route-reason-${route.id}`">Explicação da build</label
              ><textarea
                :id="`route-reason-${route.id}`"
                v-model="route.reason"
                rows="5"
                maxlength="5000"
              />
              <label :for="`route-followup-${route.id}`">O que fazer depois</label
              ><textarea
                :id="`route-followup-${route.id}`"
                v-model="route.followup"
                rows="3"
                maxlength="3000"
              />
            </div>
          </div>
          <div class="route-components">
            <h3>Componentes no caminho</h3>
            <GuideChoicesEditor
              v-model="route.components"
              :catalog="catalog"
              :prefix="route.id"
              :label="`componente da rota ${index + 1}`"
              @pick="(action, category) => emit('pick', action, category)"
            />
          </div>
          <div class="choice-editor-heading">
            <button
              type="button"
              class="secondary-button"
              :disabled="index === 0"
              @click="move(index, -1)"
            >
              Mover rota para cima</button
            ><button
              type="button"
              class="secondary-button"
              :disabled="index === content.routes.length - 1"
              @click="move(index, 1)"
            >
              Mover rota para baixo</button
            ><button
              v-if="content.routes.length > 1"
              type="button"
              class="secondary-button"
              :disabled="route.id === content.defaultRoute || !!usage[route.id]?.length"
              @click="removeRoute(index)"
            >
              Remover rota
            </button>
          </div>
          <p v-if="route.id === content.defaultRoute || usage[route.id]?.length" class="field-help">
            Para remover esta build,
            {{
              route.id === content.defaultRoute
                ? 'escolha outra rota inicial'
                : 'troque as indicações nos matchups acima'
            }}{{
              route.id === content.defaultRoute && usage[route.id]?.length
                ? ' e troque as indicações nos matchups acima'
                : ''
            }}.
          </p>
        </div>
      </details>
      <button
        v-if="content.routes.length < 12"
        type="button"
        class="secondary-button"
        @click="addRoute"
      >
        Adicionar rota
      </button>
    </template>
    <template v-else>
      <label for="boots-note">Quando fazer cada bota</label
      ><textarea id="boots-note" v-model="content.bootsNote" rows="4" maxlength="3000" />
      <GuideChoicesEditor
        v-model="content.boots"
        :catalog="catalog"
        prefix="boot-rule"
        label="regra de botas"
        boots
        :limit="10"
        @pick="(action, category) => emit('pick', action, category)"
      />
    </template>
  </div>
</template>
