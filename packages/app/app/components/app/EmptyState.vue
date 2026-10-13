<script setup lang="ts">
/**
 * Empty list (02 §1.1): one sentence about what will be here and the main
 * action in the `action` slot. For "no results for these filters" pass
 * `filtered` – it offers "Wyczyść filtry" instead.
 */
const {
  title,
  description,
  filtered = false,
} = defineProps<{
  title: string
  description?: string
  filtered?: boolean
}>()

defineEmits<{ clearFilters: [] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
    <p class="font-medium">{{ filtered ? 'Brak wyników dla wybranych filtrów.' : title }}</p>
    <p v-if="description && !filtered" class="max-w-md text-sm text-muted-foreground">{{ description }}</p>
    <AppActionButton
      v-if="filtered"
      variant="outline"
      label="Wyczyść filtry"
      @click="$emit('clearFilters')"
    />
    <slot v-else name="action" />
  </div>
</template>
