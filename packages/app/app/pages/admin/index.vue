<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

definePageMeta({ layout: 'admin' })

const { data: health, refresh, status } = await useFetch('/api/health', { ignoreResponseError: true })
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
    <Card>
      <CardHeader>
        <CardTitle>System health</CardTitle>
        <CardDescription>Response of <code>/api/health</code> (request-scoped Awilix container).</CardDescription>
      </CardHeader>
      <CardContent class="flex items-center gap-4">
        <Badge :variant="health?.status === 'ok' ? 'default' : 'destructive'">
          {{ health?.status ?? 'unknown' }}
        </Badge>
        <span class="text-sm text-muted-foreground">database: {{ health?.database ?? 'n/a' }}</span>
        <Button variant="outline" size="sm" :disabled="status === 'pending'" @click="() => refresh()">Refresh</Button>
      </CardContent>
    </Card>
  </div>
</template>
