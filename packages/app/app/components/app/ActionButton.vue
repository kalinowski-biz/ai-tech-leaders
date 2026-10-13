<script setup lang="ts">
import { Button, type ButtonVariants } from '@/components/ui/button'

/**
 * Button for mutations (02 §1.3): while `pending` it is disabled and shows the
 * progressive label ("Publikowanie…"), so a second click never sends a request.
 */
const {
  label,
  pendingLabel,
  pending = false,
  type = 'button',
} = defineProps<{
  label: string
  pendingLabel?: string
  pending?: boolean
  type?: 'button' | 'submit'
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
}>()
</script>

<template>
  <Button :type="type" :variant="variant" :size="size" :disabled="pending" :aria-busy="pending">
    {{ pending ? (pendingLabel ?? label) : label }}
  </Button>
</template>
