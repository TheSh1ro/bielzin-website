<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import HomeView from './views/HomeView.vue'
const AdminSession = defineAsyncComponent(() => import('./views/AdminSession.vue'))
const showAdmin = /^\/admin\/?$/.test(window.location.pathname)
</script>

<template>
  <AdminSession v-if="showAdmin" />
  <HomeView v-else />
</template>
