<script setup lang="ts">
import type { PanelNavItem } from '~/components/app/PanelShell.vue'

/** Office zone (01 §3.2), desktop first; pages opt in with `definePageMeta({ layout: 'office' })`. */
const items: PanelNavItem[] = [
  { label: 'Kolejka', to: '/biuro/kolejka' },
  { label: 'Do rozliczenia', to: '/biuro/do-rozliczenia' },
  { label: 'Oferty', to: '/biuro/oferty' },
  { label: 'Agenci', to: '/biuro/agenci' },
  { label: 'Prowizje', to: '/biuro/prowizje' },
  { label: 'Raport agentów', to: '/biuro/raport' },
]
</script>

<template>
  <AppPanelShell title="Menu biura" :items="items">
    <slot />
  </AppPanelShell>
</template>
