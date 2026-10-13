<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/** Renders the request from `useConfirm()`; mounted once in `app.vue`. */
const { current, settle } = useConfirmDialogState()

function onOpenChange(open: boolean): void {
  if (!open) settle(false)
}
</script>

<template>
  <AlertDialog :open="current !== null" @update:open="onOpenChange">
    <AlertDialogContent v-if="current">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ current.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="current.description">{{ current.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="settle(false)">{{ current.cancelLabel ?? 'Anuluj' }}</AlertDialogCancel>
        <AlertDialogAction :variant="current.destructive ? 'destructive' : 'default'" @click="settle(true)">
          {{ current.confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
