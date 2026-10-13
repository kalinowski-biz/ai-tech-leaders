<script setup lang="ts">
import { Separator } from '@/components/ui/separator'
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <header class="flex h-14 items-center gap-4 border-b bg-background px-6">
      <NuxtLink to="/admin" class="font-semibold">TripSalesAgent · Admin</NuxtLink>
      <Separator orientation="vertical" class="h-5" />
      <NuxtLink to="/" class="text-sm text-muted-foreground hover:text-foreground">View site</NuxtLink>
    </header>
    <main class="mx-auto max-w-5xl p-6">
      <slot />
    </main>
  </div>
</template>
