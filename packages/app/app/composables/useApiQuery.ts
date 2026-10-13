import type { MaybeRefOrGetter } from 'vue'
import { toApiError } from '../utils/api-error'

export interface ApiQueryOptions {
  query?: MaybeRefOrGetter<Record<string, unknown> | undefined>
}

/**
 * Reads an `/api/v1` resource through `useAsyncData` (SSR-safe, deduplicated by
 * `key`, refetched when `path`/`query` change). Exposes the `version` for
 * `If-Match` and the error as an `ApiError`.
 */
export function useApiQuery<T>(
  key: MaybeRefOrGetter<string>,
  path: MaybeRefOrGetter<string>,
  options: ApiQueryOptions = {},
) {
  const api = useApi()
  const result = useAsyncData(
    key,
    () => api.requestVersioned<T>(toValue(path), { query: toValue(options.query) }),
    { watch: [() => toValue(path), () => toValue(options.query)] },
  )

  return {
    data: computed(() => result.data.value?.data),
    version: computed(() => result.data.value?.version ?? null),
    error: computed(() => (result.error.value ? toApiError(result.error.value) : null)),
    status: result.status,
    pending: computed(() => result.status.value === 'pending'),
    refresh: result.refresh,
  }
}
