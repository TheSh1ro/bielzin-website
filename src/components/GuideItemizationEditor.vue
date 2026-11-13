<script setup lang="ts">
import type { Itemization } from '@/lib/riven-guide'
import type { GuideCatalog } from '@/lib/guide-admin'
import GuideItemSequence from './GuideItemSequence.vue'
import GuideChoicesEditor from './GuideChoicesEditor.vue'
const content = defineModel<Itemization>({ required: true })
defineProps<{ catalog: GuideCatalog }>()
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
</script>
<template>
  <div class="itemization-editor">
    <label for="itemization-intro">Introdução da itemização</label
    ><textarea id="itemization-intro" v-model="content.intro" rows="3" maxlength="3000" />
    <label for="default-route">Rota inicial do guia</label
    ><select id="default-route" v-model="content.defaultRoute">
      <option v-for="route in content.routes" :key="route.id" :value="route.id">
        {{ route.title }}
      </option>
    </select>
    <details v-for="(route, index) in content.routes" :key="route.id" class="route-editor">
      <summary>{{ index + 1 }} · {{ route.title }}</summary>
      <div class="route-editor-fields">
        <label :for="`route-title-${route.id}`">Nome da rota</label
        ><input :id="`route-title-${route.id}`" v-model="route.title" maxlength="120" required />
        <label :for="`route-when-${route.id}`">Quando escolher</label
        ><textarea :id="`route-when-${route.id}`" v-model="route.when" rows="2" maxlength="2000" />
        <h3>Sequência de itens</h3>
        <GuideItemSequence
          v-model="route.items"
          :catalog="catalog"
          :label="`item da rota ${index + 1}`"
          @pick="(action, category) => emit('pick', action, category)"
        />
        <label :for="`route-reason-${route.id}`">Por que funciona</label
        ><textarea
          :id="`route-reason-${route.id}`"
          v-model="route.reason"
          rows="5"
          maxlength="5000"
        />
        <h3>Componentes no caminho</h3>
        <GuideChoicesEditor
          v-model="route.components"
          :catalog="catalog"
          :prefix="route.id"
          :label="`componente da rota ${index + 1}`"
          @pick="(action, category) => emit('pick', action, category)"
        />
        <label :for="`route-followup-${route.id}`">Como continuar e adaptar</label
        ><textarea
          :id="`route-followup-${route.id}`"
          v-model="route.followup"
          rows="3"
          maxlength="3000"
        />
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
            v-if="content.routes.length > 1 && route.id !== content.defaultRoute"
            type="button"
            class="secondary-button"
            @click="content.routes.splice(index, 1)"
          >
            Remover rota
          </button>
        </div>
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
    <h3>Escolha das botas</h3>
    <label for="boots-note">Critérios gerais das botas</label
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
  </div>
</template>
