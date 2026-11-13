<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import HomeView from './views/HomeView.vue'
const AdminView = import.meta.env.DEV
  ? defineAsyncComponent(() => import('./views/AdminView.vue'))
  : null
const showAdmin = import.meta.env.DEV && /^\/admin\/?$/.test(window.location.pathname)
</script>

<template>
  <AdminView v-if="showAdmin && AdminView" />
  <HomeView v-else />
</template>
