<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'

/** Success toasts stay 5 s (02 §1.1). */
const TOAST_DURATION_MS = 5_000
</script>

<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
  <Toaster position="bottom-center" :duration="TOAST_DURATION_MS" close-button rich-colors />
  <AppConfirmDialog />
</template>
