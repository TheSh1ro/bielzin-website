// src/composables/useInfoModal.ts
import { ref } from 'vue'
import type { Component } from 'vue'

interface InfoModalOptions {
  title?: string
  description?: string
  buttonText?: string
  icon?: Component
}

const isOpen = ref(false)
const modalOptions = ref<InfoModalOptions>({})

export function useInfoModal() {
  const show = (options: InfoModalOptions = {}) => {
    modalOptions.value = options
    isOpen.value = true
  }

  const hide = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    modalOptions,
    show,
    hide,
  }
}
