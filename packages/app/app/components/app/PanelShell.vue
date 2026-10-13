<script setup lang="ts">
import { LogOutIcon } from '@lucide/vue'

export interface PanelNavItem {
  label: string
  to: string
}

/**
 * Shell of the authenticated zones (01 §3): ink side rail on desktop; with
 * `mobileTabs` (agent zone, phone-first) the same items become a bottom tab bar
 * on small screens. Counters are added with `/me/counters`.
 */
const {
  title,
  items,
  mobileTabs = false,
} = defineProps<{
  title: string
  items: PanelNavItem[]
  mobileTabs?: boolean
}>()
</script>

<template>
  <div class="min-h-screen bg-paper-grid md:grid md:grid-cols-[232px_1fr]">
    <nav
      :aria-label="title"
      class="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col"
      :class="mobileTabs ? 'hidden md:flex' : 'flex flex-col'"
    >
      <NuxtLink to="/" class="px-5 py-5 font-heading text-lg font-bold tracking-tight"
        >TripSalesAgent</NuxtLink
      >
      <ul class="flex flex-col gap-1 px-3">
        <li v-for="item in items" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="block rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
            active-class="bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary"
          >
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
      <div class="mt-auto border-t border-sidebar-border px-5 py-4">
        <slot name="user" />
        <NuxtLink
          to="/logowanie"
          class="mt-2 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
        >
          <LogOutIcon class="size-4" /> Wyloguj
        </NuxtLink>
      </div>
    </nav>

    <main class="mx-auto w-full max-w-6xl px-4 py-6 md:px-10" :class="mobileTabs && 'pb-24 md:pb-6'">
      <slot />
    </main>

    <nav
      v-if="mobileTabs"
      :aria-label="`${title} (telefon)`"
      class="fixed inset-x-0 bottom-0 z-10 border-t bg-card md:hidden"
    >
      <ul class="grid" :style="{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }">
        <li v-for="item in items" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="block py-3 text-center text-xs text-muted-foreground"
            active-class="font-semibold text-ink"
          >
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
