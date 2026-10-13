import { toast } from 'vue-sonner'
import { toApiError, type ApiError } from '../utils/api-error'

/** `useAsyncData` key of the menu counters; refreshed after every mutation (02 §1.5). */
export const COUNTERS_QUERY_KEY = 'me-counters'
export const LOGIN_PATH = '/logowanie'

export interface MutationOptions<R> {
  /** Toast text in the perfective form of the button verb, e.g. "Opublikowano". */
  success?: string
  /** `useApiQuery` keys to refresh after success (the counters are always refreshed). */
  refresh?: string[]
  onSuccess?: (result: R) => void | Promise<void>
}

/**
 * Runs a state-changing API call with the shared UX contract (02 §1.3):
 * ignores repeated clicks while pending, toasts on success, refreshes data and
 * counters, redirects to login on 401 and exposes any other failure as `error`.
 */
export function useMutation<A extends unknown[], R>(
  action: (...args: A) => Promise<R>,
  options: MutationOptions<R> = {},
) {
  const route = useRoute()
  const pending = ref(false)
  const error = shallowRef<ApiError | null>(null)

  async function run(...args: A): Promise<R | undefined> {
    if (pending.value) return undefined
    pending.value = true
    error.value = null
    try {
      const result = await action(...args)
      if (options.success) toast.success(options.success)
      await refreshNuxtData([COUNTERS_QUERY_KEY, ...(options.refresh ?? [])])
      await options.onSuccess?.(result)
      return result
    } catch (thrown) {
      const apiError = toApiError(thrown)
      if (apiError.status === 401) {
        await navigateTo({ path: LOGIN_PATH, query: { redirect: route.fullPath } })
        return undefined
      }
      error.value = apiError
      return undefined
    } finally {
      pending.value = false
    }
  }

  return { run, pending: readonly(pending), error: readonly(error) }
}
