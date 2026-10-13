import type { TypedSchema, TypedSchemaError } from 'vee-validate'
import type { z } from 'zod'
import { issueCode } from '@tripsalesagent/core/shared'
import { fieldErrorMessage } from './messages'

/**
 * Adapter: zod 4 schema → vee-validate TypedSchema (`@vee-validate/zod` only
 * supports zod 3). Lets a form validate with the very schema the server uses,
 * with errors already translated to Polish.
 */
export function toFormSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      const byPath = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        byPath.set(path, [...(byPath.get(path) ?? []), fieldErrorMessage(issueCode(issue))])
      }
      const errors: TypedSchemaError[] = [...byPath].map(([path, messages]) => ({ path, errors: messages }))
      return { errors }
    },
  }
}
