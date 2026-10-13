import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { emailSchema, nipSchema } from '@tripsalesagent/core/shared'
import { toFormSchema } from './form-schema'

describe('toFormSchema', () => {
  const schema = toFormSchema(z.object({ nip: nipSchema, email: emailSchema, name: z.string().min(1) }))

  it('returns parsed values when valid', async () => {
    await expect(schema.parse({ nip: '526-025-02-74', email: 'A@B.PL', name: 'Jan' })).resolves.toEqual({
      value: { nip: '5260250274', email: 'a@b.pl', name: 'Jan' },
      errors: [],
    })
  })

  it('returns Polish messages per field path', async () => {
    const { errors } = await schema.parse({ nip: '1234567890', email: 'x', name: '' })
    expect(errors).toEqual([
      { path: 'nip', errors: ['NIP musi mieć 10 cyfr i poprawną sumę kontrolną.'] },
      { path: 'email', errors: ['Podaj poprawny adres e-mail.'] },
      { path: 'name', errors: ['Wartość jest za mała lub za krótka.'] },
    ])
  })
})
