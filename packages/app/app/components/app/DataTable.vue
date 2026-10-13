<script setup lang="ts" generic="TRow">
import {
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/vue-table'
import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue'
import type { AsyncDataRequestStatus } from '#app'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ApiError } from '~/utils/api-error'

/**
 * Every list screen renders through this component: column config in, with the
 * shared loading / error / empty / filtered-empty states and client-side
 * sorting. Rows are clickable when a `rowClick` listener is attached.
 */
const props = defineProps<{
  // TanStack column value types differ per column; `any` is its documented idiom here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TRow, any>[]
  rows: TRow[] | undefined
  status: AsyncDataRequestStatus
  error: ApiError | null
  emptyTitle: string
  emptyDescription?: string
  /** Filters are active: an empty result offers "Wyczyść filtry". */
  filtered?: boolean
  /** Visually emphasized rows, e.g. inquiries with unread events. */
  isHighlighted?: (row: TRow) => boolean
}>()

const emit = defineEmits<{ retry: []; clearFilters: []; rowClick: [row: TRow] }>()
const attrs = useAttrs()
const clickable = computed(() => 'onRowClick' in attrs)

const sorting = ref<SortingState>([])
const table = useVueTable({
  get data() {
    return props.rows ?? []
  },
  get columns() {
    return props.columns
  },
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})

const hasRows = computed(() => (props.rows?.length ?? 0) > 0)
const refreshing = computed(() => props.status === 'pending' && hasRows.value)
</script>

<template>
  <div class="relative">
    <div
      v-if="refreshing"
      class="absolute inset-x-0 -top-1 h-0.5 animate-pulse bg-primary"
      aria-hidden="true"
    />
    <AppErrorBanner v-if="error" :error="error" @retry="emit('retry')" @reload="emit('retry')" />
    <AppLoadingSkeleton v-else-if="status === 'pending' && !hasRows" variant="table" />
    <AppEmptyState
      v-else-if="!hasRows"
      :title="emptyTitle"
      :description="emptyDescription"
      :filtered="filtered"
      @clear-filters="emit('clearFilters')"
    >
      <template #action><slot name="empty-action" /></template>
    </AppEmptyState>
    <Table v-else>
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
            :aria-sort="
              header.column.getIsSorted() === 'asc'
                ? 'ascending'
                : header.column.getIsSorted() === 'desc'
                  ? 'descending'
                  : undefined
            "
          >
            <button
              v-if="!header.isPlaceholder && header.column.getCanSort()"
              type="button"
              class="inline-flex items-center gap-1"
              @click="header.column.toggleSorting()"
            >
              <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              <ArrowUpIcon v-if="header.column.getIsSorted() === 'asc'" class="size-3.5" />
              <ArrowDownIcon v-else-if="header.column.getIsSorted() === 'desc'" class="size-3.5" />
            </button>
            <FlexRender
              v-else-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          :class="[clickable && 'cursor-pointer', isHighlighted?.(row.original) && 'font-semibold']"
          @click="emit('rowClick', row.original)"
        >
          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
            <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
