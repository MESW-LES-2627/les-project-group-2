/**
 * @file tests/pin-comments-action.test.ts
 * @brief Unit tests for the addPinCommentAction and deletePinCommentAction server actions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addPinCommentAction, deletePinCommentAction } from '@/app/trips/actions/pin-comments'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const savedRow = {
  id: 'comment-1',
  pin_id: 'pin-1',
  user_id: 'user-1',
  author_name: 'Ana',
  body: 'Looks great',
  created_at: '2026-11-20T10:00:00Z',
}

describe('pin comment server actions', () => {
  let getUser: ReturnType<typeof vi.fn>
  let profileQuery: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
  }
  let commentQuery: {
    insert: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    then: (resolve: (value: { error: unknown }) => unknown) => Promise<unknown>
  }
  let deleteError: unknown

  beforeEach(() => {
    vi.clearAllMocks()
    deleteError = null

    getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'ana@planit.app' } },
      error: null,
    })

    profileQuery = {
      select: vi.fn(() => profileQuery),
      eq: vi.fn(() => profileQuery),
      single: vi.fn().mockResolvedValue({ data: { username: 'Ana' }, error: null }),
    }

    commentQuery = {
      insert: vi.fn(() => commentQuery),
      select: vi.fn(() => commentQuery),
      single: vi.fn().mockResolvedValue({ data: savedRow, error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: 'comment-1', user_id: 'user-1' }, error: null }),
      delete: vi.fn(() => commentQuery),
      eq: vi.fn(() => commentQuery),
      then: (resolve) => Promise.resolve({ error: deleteError }).then(resolve),
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser },
      from: vi.fn((table: string) => (table === 'profiles' ? profileQuery : commentQuery)),
    } as unknown as SupabaseClient)
  })

  describe('addPinCommentAction', () => {
    it('requires a trip and a pin', async () => {
      await expect(addPinCommentAction('', 'pin-1', 'Hi')).resolves.toEqual({
        error: 'Trip ID and Pin ID are required.',
      })
      await expect(addPinCommentAction('trip-1', '', 'Hi')).resolves.toEqual({
        error: 'Trip ID and Pin ID are required.',
      })
    })

    it('rejects an empty comment', async () => {
      await expect(addPinCommentAction('trip-1', 'pin-1', '   ')).resolves.toEqual({
        error: 'Write a comment before sending it.',
      })
      expect(commentQuery.insert).not.toHaveBeenCalled()
    })

    it('rejects a comment longer than 1000 characters', async () => {
      await expect(addPinCommentAction('trip-1', 'pin-1', 'a'.repeat(1001))).resolves.toEqual({
        error: 'Comments can have at most 1000 characters.',
      })
      expect(commentQuery.insert).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(addPinCommentAction('trip-1', 'pin-1', 'Hi')).resolves.toEqual({
        error: 'Authentication required.',
      })
    })

    it('saves the trimmed comment with the author name and returns it', async () => {
      const result = await addPinCommentAction('trip-1', 'pin-1', '  Looks great  ')

      expect(commentQuery.insert).toHaveBeenCalledWith({
        pin_id: 'pin-1',
        user_id: 'user-1',
        author_name: 'Ana',
        body: 'Looks great',
      })
      expect(result).toEqual({
        success: true,
        comment: {
          id: 'comment-1',
          pinId: 'pin-1',
          userId: 'user-1',
          authorName: 'Ana',
          body: 'Looks great',
          createdAt: '2026-11-20T10:00:00Z',
        },
      })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
    })

    it('uses the start of the email when the profile has no username', async () => {
      profileQuery.single.mockResolvedValue({ data: { username: '  ' }, error: null })

      await addPinCommentAction('trip-1', 'pin-1', 'Hi')

      expect(commentQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ author_name: 'ana' })
      )
    })

    it('falls back to a generic name without a profile or an email', async () => {
      profileQuery.single.mockResolvedValue({ data: null, error: null })
      getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: null } }, error: null })

      await addPinCommentAction('trip-1', 'pin-1', 'Hi')

      expect(commentQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ author_name: 'Traveler' })
      )
    })

    it('returns an error when the insert fails, for example for a non-member', async () => {
      commentQuery.single.mockResolvedValue({ data: null, error: { code: '42501' } })

      await expect(addPinCommentAction('trip-1', 'pin-1', 'Hi')).resolves.toEqual({
        error: 'Failed to add the comment.',
      })
      expect(cache.revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('deletePinCommentAction', () => {
    it('requires a trip and a comment', async () => {
      await expect(deletePinCommentAction('', 'comment-1')).resolves.toEqual({
        error: 'Trip ID and comment ID are required.',
      })
      await expect(deletePinCommentAction('trip-1', '')).resolves.toEqual({
        error: 'Trip ID and comment ID are required.',
      })
    })

    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(deletePinCommentAction('trip-1', 'comment-1')).resolves.toEqual({
        error: 'Authentication required.',
      })
    })

    it('reports a comment that does not exist', async () => {
      commentQuery.maybeSingle.mockResolvedValue({ data: null, error: null })

      await expect(deletePinCommentAction('trip-1', 'comment-1')).resolves.toEqual({
        error: 'Comment not found.',
      })
    })

    it('only lets the author delete a comment', async () => {
      commentQuery.maybeSingle.mockResolvedValue({
        data: { id: 'comment-1', user_id: 'someone-else' },
        error: null,
      })

      await expect(deletePinCommentAction('trip-1', 'comment-1')).resolves.toEqual({
        error: 'You can only delete your own comments.',
      })
      expect(commentQuery.delete).not.toHaveBeenCalled()
    })

    it('returns an error when the comment cannot be loaded', async () => {
      commentQuery.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })

      await expect(deletePinCommentAction('trip-1', 'comment-1')).resolves.toEqual({
        error: 'Failed to delete the comment.',
      })
    })

    it('deletes the comment of the author', async () => {
      const result = await deletePinCommentAction('trip-1', 'comment-1')

      expect(commentQuery.delete).toHaveBeenCalled()
      expect(commentQuery.eq).toHaveBeenCalledWith('id', 'comment-1')
      expect(commentQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(result).toEqual({ success: true })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
    })

    it('returns an error when the delete fails', async () => {
      deleteError = { message: 'boom' }

      await expect(deletePinCommentAction('trip-1', 'comment-1')).resolves.toEqual({
        error: 'Failed to delete the comment.',
      })
    })
  })
})
