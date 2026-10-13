import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { z } from 'zod'
import { emailSchema } from '@tripsalesagent/core/shared'
import { withSetup } from '../../test/helpers/harness'
import { ApiError } from '../utils/api-error'
import { useApiForm } from './useApiForm'

const schema = z.object({ email: emailSchema, name: z.string().min(1) })
const valid = { email: ' Jan@Example.PL ', name: 'Jan' }

type Action = (values: z.output<typeof schema>) => Promise<unknown>

/** Mounts a form whose `email` input reflects its error state, as `FormControl` does. */
async function mountForm(action: Action, initialValues: Partial<z.input<typeof schema>> = valid) {
  const { result } = await withSetup(
    () => useApiForm(schema, action, { initialValues }),
    ({ form }) => h('input', { id: 'email', 'aria-invalid': form.errors.value.email ? 'true' : 'false' }),
  )
  return result
}

async function settle() {
  await nextTick()
  await nextTick()
}

describe('useApiForm', () => {
  it('submits the values parsed by the shared schema', async () => {
    const action = vi.fn<Action>().mockResolvedValue({ id: 'c-1' })
    const { submit, bannerError, pending } = await mountForm(action)
    await submit()
    expect(action).toHaveBeenCalledWith({ email: 'jan@example.pl', name: 'Jan' })
    expect(bannerError.value).toBeNull()
    expect(pending.value).toBe(false)
  })

  it('does not call the server when client-side validation fails, and focuses the first invalid field', async () => {
    const action = vi.fn<Action>()
    const { submit, form } = await mountForm(action, { email: 'nope', name: 'Jan' })
    await submit()
    await settle()
    expect(action).not.toHaveBeenCalled()
    expect(form.errors.value.email).toBe('Podaj poprawny adres e-mail.')
    expect(document.activeElement?.id).toBe('email')
  })

  it('puts server field errors (422) on the fields, in Polish, without a banner', async () => {
    const action = vi
      .fn<Action>()
      .mockRejectedValue(
        new ApiError(422, 'VALIDATION_FAILED', 'Invalid.', [{ field: 'email', code: 'invalid_email' }]),
      )
    const { submit, form, bannerError } = await mountForm(action)
    ;(document.activeElement as HTMLElement | null)?.blur()
    await submit()
    await settle()
    expect(form.errors.value.email).toBe('Podaj poprawny adres e-mail.')
    expect(bannerError.value).toBeNull()
    expect(document.activeElement?.id).toBe('email')
  })

  it('shows a banner for a 422 without field errors', async () => {
    const action = vi.fn<Action>().mockRejectedValue(new ApiError(422, 'VALIDATION_FAILED', 'Invalid.'))
    const { submit, bannerError } = await mountForm(action)
    await submit()
    expect(bannerError.value).toMatchObject({ status: 422 })
  })

  it('shows a banner for any other failure and keeps the values', async () => {
    const action = vi.fn<Action>().mockRejectedValue(new ApiError(503, 'DATABASE_UNAVAILABLE', 'Down.'))
    const { submit, bannerError, form } = await mountForm(action)
    await submit()
    expect(bannerError.value).toMatchObject({ code: 'DATABASE_UNAVAILABLE' })
    expect(form.values).toMatchObject(valid)
  })

  it('works without initial values', async () => {
    const { result } = await withSetup(() => useApiForm(schema, vi.fn<Action>()))
    expect(result.form.values).toEqual({})
  })
})
