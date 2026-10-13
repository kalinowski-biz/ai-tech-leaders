<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { HealthReport } from '@tripsalesagent/core'

definePageMeta({ layout: 'admin' })

const { data: health, error, status, refresh } = useApiQuery<HealthReport>('health', '/health')
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
    <Card>
      <CardHeader>
        <CardTitle>System health</CardTitle>
        <CardDescription
          >Response of <code>/api/v1/health</code> (request-scoped Awilix container).</CardDescription
        >
      </CardHeader>
      <CardContent class="space-y-4">
        <AppErrorBanner v-if="error" :error="error" @retry="refresh()" />
        <AppLoadingSkeleton v-else-if="status === 'pending'" variant="form" :rows="1" />
        <div v-else-if="health" class="flex items-center gap-4">
          <Badge>{{ health.status }}</Badge>
          <span class="text-sm text-muted-foreground">database: {{ health.database }}</span>
        </div>
        <AppActionButton
          variant="outline"
          size="sm"
          label="Refresh"
          pending-label="Refreshing…"
          :pending="status === 'pending'"
          @click="refresh()"
        />
      </CardContent>
    </Card>
  </div>
</template>
