<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

/** Placeholder shaped like the target layout (02 §1.1); appears only after 150 ms so fast responses don't flash. */
const SKELETON_DELAY_MS = 150

const { variant = 'table', rows = 5 } = defineProps<{
  variant?: 'table' | 'cards' | 'form'
  rows?: number
}>()

const visible = useTimeout(SKELETON_DELAY_MS)
</script>

<template>
  <div v-if="visible" role="status" aria-live="polite" aria-label="Wczytywanie">
    <div v-if="variant === 'table'" class="space-y-2">
      <Skeleton class="h-9 w-full" />
      <Skeleton v-for="row in rows" :key="row" class="h-12 w-full" />
    </div>
    <div v-else-if="variant === 'cards'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="row in rows" :key="row" class="h-40 w-full" />
    </div>
    <div v-else class="space-y-5">
      <div v-for="row in rows" :key="row" class="space-y-2">
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-9 w-full" />
      </div>
    </div>
  </div>
</template>
