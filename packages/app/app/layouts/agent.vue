<script setup lang="ts">
import type { PanelNavItem } from '~/components/app/PanelShell.vue'

/** Agent zone (01 §3.1); pages opt in with `definePageMeta({ layout: 'agent' })`. */
const items: PanelNavItem[] = [
  { label: 'Panel', to: '/agent/panel' },
  { label: 'Oferty', to: '/agent/oferty' },
  { label: 'Zapytania', to: '/agent/zapytania' },
  { label: 'Klienci', to: '/agent/klienci' },
  { label: 'Prowizje', to: '/agent/prowizje' },
]
</script>

<template>
  <AppPanelShell title="Menu agenta" :items="items" mobile-tabs>
    <slot />
  </AppPanelShell>
</template>
