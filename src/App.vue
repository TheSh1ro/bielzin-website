<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { recordSiteVisit } from './lib/visits'
import HomeView from './views/HomeView.vue'

const AdminSession = defineAsyncComponent(() => import('./views/AdminSession.vue'))
const showAdmin = /^\/admin\/?$/.test(window.location.pathname)
const visitCount = ref<number>()

onMounted(async () => {
  if (!showAdmin) visitCount.value = await recordSiteVisit()
})
</script>

<template>
  <AdminSession v-if="showAdmin" />
  <HomeView v-else :visit-count="visitCount" />
</template>
