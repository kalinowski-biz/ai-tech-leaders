<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

/**
 * Renders the request from `useConfirm()`; mounted once in `app.vue`.
 * Any way of closing (Cancel, Escape) answers `false`. The confirm button is a
 * plain `Button`, not `AlertDialogAction`: the latter closes the dialog before
 * its `@click` runs, which would answer `false` first.
 */
const { current, settle } = useConfirmDialogState()
</script>

<template>
  <!-- No trigger: the only open-state change the dialog can request is closing. -->
  <AlertDialog :open="current !== null" @update:open="settle(false)">
    <AlertDialogContent v-if="current">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ current.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="current.description">{{ current.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ current.cancelLabel ?? 'Anuluj' }}</AlertDialogCancel>
        <Button :variant="current.destructive ? 'destructive' : 'default'" @click="settle(true)">
          {{ current.confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
