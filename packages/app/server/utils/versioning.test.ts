import { describe, expect, it } from 'vitest'
import { getResponseHeader } from 'h3'
import { fakeEvent } from '../../test/helpers/h3-event'
import { requireIfMatch, setVersionTag } from './versioning'

describe('setVersionTag', () => {
  it('sends the version as a strong ETag', () => {
    const event = fakeEvent()
    setVersionTag(event, 7)
    expect(getResponseHeader(event, 'etag')).toBe('"7"')
  })
})

describe('requireIfMatch', () => {
  it('reads the version from If-Match', () => {
    expect(requireIfMatch(fakeEvent({ headers: { 'if-match': ' "12" ' } }))).toBe(12)
  })

  it.each([undefined, '12', 'W/"12"', '"abc"'])('answers 428 for If-Match %o', (ifMatch) => {
    const event = fakeEvent({ headers: ifMatch === undefined ? {} : { 'if-match': ifMatch } })
    expect(() => requireIfMatch(event)).toThrow(
      expect.objectContaining({
        statusCode: 428,
        data: expect.objectContaining({ code: 'PRECONDITION_REQUIRED' }),
      }),
    )
  })
})
