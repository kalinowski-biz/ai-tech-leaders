<script setup lang="ts">
import { CircleAlertIcon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { ApiError } from '~/utils/api-error'
import { apiErrorMessage } from '~/utils/messages'

/**
 * The only error renderer (02 §1.1–1.2): Polish message chosen by code/status,
 * the code itself for support, and the matching recovery action – "Wczytaj
 * aktualną wersję" for a version conflict, otherwise "Spróbuj ponownie".
 */
const { error, retryable = true } = defineProps<{
  error: ApiError
  retryable?: boolean
}>()

defineEmits<{ retry: []; reload: [] }>()
</script>

<template>
  <Alert variant="destructive" role="alert">
    <CircleAlertIcon />
    <AlertTitle>{{ apiErrorMessage(error) }}</AlertTitle>
    <AlertDescription class="flex flex-wrap items-center gap-3">
      <span class="font-mono text-xs">Kod: {{ error.code }}</span>
      <AppActionButton
        v-if="error.isVersionConflict"
        size="sm"
        variant="outline"
        label="Wczytaj aktualną wersję"
        @click="$emit('reload')"
      />
      <AppActionButton
        v-else-if="retryable"
        size="sm"
        variant="outline"
        label="Spróbuj ponownie"
        @click="$emit('retry')"
      />
    </AlertDescription>
  </Alert>
</template>
