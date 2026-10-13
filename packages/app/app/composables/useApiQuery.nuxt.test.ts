import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, setResponseHeader, type H3Event } from 'h3'
import { withSetup } from '../../test/helpers/harness'
import { ApiError } from '../utils/api-error'
import { useApiQuery } from './useApiQuery'

const unregister: (() => void)[] = []

afterEach(() => {
  unregister.splice(0).forEach((off) => off())
})

describe('useApiQuery', () => {
  it('loads the resource with its version', async () => {
    unregister.push(
      registerEndpoint('/api/v1/offers/o-1', (event: H3Event) => {
        setResponseHeader(event, 'ETag', '"3"')
        return { id: 'o-1' }
      }),
    )
    const { result } = await withSetup(() => useApiQuery<{ id: string }>('offer-o-1', '/offers/o-1'))
    await flushPromises()
    expect(result.data.value).toEqual({ id: 'o-1' })
    expect(result.version.value).toBe(3)
    expect(result.status.value).toBe('success')
    expect(result.pending.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('exposes failures as ApiError', async () => {
    unregister.push(
      registerEndpoint('/api/v1/health', () => {
        throw createError({ statusCode: 503, data: { code: 'DATABASE_UNAVAILABLE', message: 'Down.' } })
      }),
    )
    const { result } = await withSetup(() => useApiQuery('health-down', '/health'))
    await flushPromises()
    expect(result.error.value).toBeInstanceOf(ApiError)
    expect(result.error.value).toMatchObject({ status: 503, code: 'DATABASE_UNAVAILABLE' })
    expect(result.data.value).toBeUndefined()
    expect(result.version.value).toBeNull()
  })

  it('refetches when the query changes and on refresh()', async () => {
    let calls = 0
    unregister.push(
      registerEndpoint('/api/v1/clients', (event: H3Event) => {
        calls += 1
        return { search: getQuery(event).search ?? null, calls }
      }),
    )
    const query = ref<Record<string, unknown> | undefined>({ search: 'Nowak' })
    const { result } = await withSetup(() => useApiQuery('clients-list', '/clients', { query }))
    await flushPromises()
    expect(result.data.value).toEqual({ search: 'Nowak', calls: 1 })

    query.value = undefined
    await vi.waitFor(() => expect(result.data.value).toEqual({ search: null, calls: 2 }))

    await result.refresh()
    expect(result.data.value).toEqual({ search: null, calls: 3 })
  })
})
