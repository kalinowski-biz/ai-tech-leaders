import { useForm } from 'vee-validate'
import type { z } from 'zod'
import { toFormSchema } from '../utils/form-schema'
import { fieldErrorMessage } from '../utils/messages'
import type { MutationOptions } from './useMutation'

/** Forms edit objects; vee-validate needs object-shaped input and output. */
type FormSchema = z.ZodType<Record<string, unknown>, Record<string, unknown>>

export interface ApiFormOptions<S extends FormSchema, R> extends MutationOptions<R> {
  initialValues?: Partial<z.input<S>>
}

function focusFirstInvalidField(): void {
  void nextTick(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

/**
 * A form bound to the same zod schema the server validates with. Client-side
 * errors and server 422 field errors land on the same fields; any other
 * failure is exposed as `bannerError` for an `AppErrorBanner` above the form.
 * The form keeps its values on failure.
 */
export function useApiForm<S extends FormSchema, R>(
  schema: S,
  action: (values: z.output<S>) => Promise<R>,
  options: ApiFormOptions<S, R> = {},
) {
  const form = useForm<z.input<S>, z.output<S>>({
    validationSchema: toFormSchema(schema),
    initialValues: options.initialValues as never,
  })
  const mutation = useMutation(action, options)

  const submit = form.handleSubmit(async (values) => {
    await mutation.run(values)
    const fields = mutation.error.value?.status === 422 ? mutation.error.value.fields : []
    if (fields.length === 0) return
    const errors = Object.fromEntries(fields.map(({ field, code }) => [field, fieldErrorMessage(code)]))
    form.setErrors(errors as Parameters<typeof form.setErrors>[0])
    focusFirstInvalidField()
  }, focusFirstInvalidField)

  const bannerError = computed(() => {
    const error = mutation.error.value
    return error && !(error.status === 422 && error.fields.length > 0) ? error : null
  })

  return { form, submit, pending: mutation.pending, bannerError }
}
