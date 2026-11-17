<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { recordSiteVisit, type PublicScreen } from './lib/visits'
import HomeView from './views/HomeView.vue'

const AdminSession = defineAsyncComponent(() => import('./views/AdminSession.vue'))
const showAdmin = /^\/admin\/?$/.test(window.location.pathname)
const showInvite = /^\/admin\/convite\/?$/.test(window.location.pathname)
const AdminInvite = defineAsyncComponent(() => import('./views/AdminInvite.vue'))
const visitCount = ref<number>()

async function trackPublicScreen(screen: PublicScreen) {
  const count = await recordSiteVisit(screen)
  if (count !== undefined) visitCount.value = Math.max(visitCount.value ?? 0, count)
}

onMounted(() => {
  if (!showAdmin && !showInvite) {
    void trackPublicScreen(/^\/riven\/?$/.test(window.location.pathname) ? 'guide' : 'home')
  }
})
</script>

<template>
  <AdminInvite v-if="showInvite" />
  <AdminSession v-else-if="showAdmin" />
  <HomeView v-else :visit-count="visitCount" @screen-change="trackPublicScreen" />
</template>
