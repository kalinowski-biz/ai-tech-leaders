import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins conditional classes and lets later Tailwind utilities win', () => {
    expect(cn('px-2 text-sm', { hidden: false, 'font-bold': true }, ['px-4'])).toBe('text-sm font-bold px-4')
  })
})
