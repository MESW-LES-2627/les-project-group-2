/**
 * @file tests/pin-comments-utils.test.ts
 * @brief Unit tests for the pin comment helpers.
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_COMMENT_LENGTH,
  formatCommentDate,
  withComment,
  withoutComment,
} from '@/utils/pin-comments'
import type { PinComment } from '@/types/map'

const comment = (id: string): PinComment => ({
  id,
  pinId: 'pin-1',
  userId: 'user-1',
  authorName: 'Ana',
  body: `Comment ${id}`,
  createdAt: '2026-11-20T10:00:00Z',
})

describe('pin comment helpers', () => {
  it('limits comments to 1000 characters', () => {
    expect(MAX_COMMENT_LENGTH).toBe(1000)
  })

  it('formats the date of a comment', () => {
    expect(formatCommentDate('2026-11-20T10:00:00Z')).toBe('20 Nov 2026')
    expect(formatCommentDate('2026-01-05')).toBe('5 Jan 2026')
  })

  it('returns an empty string for a missing or invalid date', () => {
    expect(formatCommentDate('')).toBe('')
    expect(formatCommentDate('not a date')).toBe('')
  })

  it('adds a comment at the end without changing the original pin', () => {
    const pin = { id: 'pin-1', comments: [comment('a')] }

    const updated = withComment(pin, comment('b'))

    expect(updated.comments.map((c) => c.id)).toEqual(['a', 'b'])
    expect(pin.comments).toHaveLength(1)
  })

  it('adds the first comment to a pin without comments', () => {
    const pin: { id: string; comments?: PinComment[] } = { id: 'pin-1' }

    expect(withComment(pin, comment('a')).comments).toEqual([comment('a')])
  })

  it('removes a comment without changing the original pin', () => {
    const pin = { id: 'pin-1', comments: [comment('a'), comment('b')] }

    const updated = withoutComment(pin, 'a')

    expect(updated.comments.map((c) => c.id)).toEqual(['b'])
    expect(pin.comments).toHaveLength(2)
  })

  it('handles removing a comment from a pin without comments', () => {
    const pin: { id: string; comments?: PinComment[] } = { id: 'pin-1' }

    expect(withoutComment(pin, 'x').comments).toEqual([])
  })
})
