import { API_CLIENT_HEADER, API_CLIENT_HEADER_VALUE } from '#shared/types/api'
import { toApiError } from '../utils/api-error'

export const API_BASE_URL = '/api/v1'

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: Record<string, unknown> | FormData
  query?: Record<string, unknown>
  /** Version from the last read (`ETag`), sent as `If-Match` on mutations of versioned resources. */
  version?: number | null
}

export interface Versioned<T> {
  data: T
  /** From the `ETag` header; `null` for resources that are not versioned. */
  version: number | null
}

interface FetchOptions extends Omit<ApiRequestOptions, 'version'> {
  baseURL: string
  headers: Record<string, string>
}

/**
 * Nitro's route-typed `$fetch` overloads hit "excessive stack depth" with a
 * dynamic `path`; the API layer types responses itself, so it uses `$fetch`
 * through this untyped view.
 */
interface UntypedFetch {
  (path: string, options: FetchOptions): Promise<unknown>
  raw(path: string, options: FetchOptions): Promise<{ _data?: unknown; headers: Headers }>
}

function parseVersionTag(etag: string | null): number | null {
  const match = etag && /^"(\d+)"$/.exec(etag)
  return match ? Number(match[1]) : null
}

/**
 * The only sanctioned way to call `/api/v1` from the client. Adds the base URL,
 * the CSRF header and `If-Match`, forwards the session cookie during SSR and
 * turns every failure into an `ApiError`. Must be called in a setup context.
 *
 * Uses the global `$fetch` (not `useRequestFetch()`): on the server the latter
 * is Nitro's `event.$fetch`, which has no `.raw` for reading the `ETag`.
 */
export function useApi() {
  // During SSR forwards the browser's session cookie; on the client it is `{}`.
  const forwardedHeaders = useRequestHeaders(['cookie'])
  const fetchApi = $fetch as unknown as UntypedFetch

  function toFetchOptions({ method = 'GET', body, query, version }: ApiRequestOptions): FetchOptions {
    const headers: Record<string, string> = {
      ...forwardedHeaders,
      [API_CLIENT_HEADER]: API_CLIENT_HEADER_VALUE,
    }
    if (version !== undefined && version !== null) headers['if-match'] = `"${version}"`
    return { baseURL: API_BASE_URL, method, body, query, headers }
  }

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    try {
      return (await fetchApi(path, toFetchOptions(options))) as T
    } catch (error) {
      throw toApiError(error)
    }
  }

  async function requestVersioned<T>(path: string, options: ApiRequestOptions = {}): Promise<Versioned<T>> {
    try {
      const response = await fetchApi.raw(path, toFetchOptions(options))
      return { data: response._data as T, version: parseVersionTag(response.headers.get('etag')) }
    } catch (error) {
      throw toApiError(error)
    }
  }

  return { request, requestVersioned }
}
