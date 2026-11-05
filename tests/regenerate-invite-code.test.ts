/**
 * @file tests/regenerate-invite-code.test.ts
 * @brief Unit tests for regenerateInviteCode server action.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { regenerateInviteCode } from '@/app/trips/actions/regenerate-invite-code'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import * as inviteUtils from '@/utils/invite-code'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/utils/invite-code', async () => {
  const actual = await vi.importActual<typeof inviteUtils>('@/utils/invite-code')
  return {
    ...actual,
    generateInviteCode: vi.fn().mockReturnValue('NEWCODE8'),
  }
})

type MockQuery = {
  select: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

describe('regenerateInviteCode Server Action', () => {
  let mockTripsQuery: MockQuery
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTripsQuery = {
      select: vi.fn(() => mockTripsQuery),
      update: vi.fn(() => mockTripsQuery),
      eq: vi.fn(() => mockTripsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'trip-1', organizer_id: 'user-organizer' },
        error: null,
      }),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-organizer' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => mockTripsQuery),
    } as unknown as SupabaseClient)
  })

  it('returns error if tripId is empty', async () => {
    const res = await regenerateInviteCode('')
    expect(res).toEqual({ error: 'Trip ID is required.' })
    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('returns error if user is unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const res = await regenerateInviteCode('trip-1')
    expect(res).toEqual({ error: 'Authentication required.' })
  })

  it('returns error if trip does not exist', async () => {
    mockTripsQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const res = await regenerateInviteCode('non-existent-trip')
    expect(res).toEqual({ error: 'Trip not found.' })
  })

  it('rejects regeneration if the user is not the organizer of the trip', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'impostor-user' } },
      error: null,
    })

    const res = await regenerateInviteCode('trip-1')
    expect(res).toEqual({ error: 'Only the organizer can regenerate the invite code.' })
    expect(mockTripsQuery.update).not.toHaveBeenCalled()
  })

  it('successfully regenerates code, updates table, and revalidates path', async () => {
    mockTripsQuery.update.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({ error: null }),
    } as never)

    const res = await regenerateInviteCode('trip-1')
    expect(res).toEqual({ success: true, newCode: 'NEWCODE8' })
    expect(mockTripsQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        invite_code: 'NEWCODE8',
      })
    )
    expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
  })

  it('returns error if updating invite code fails in database', async () => {
    mockTripsQuery.update.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({ error: { message: 'Database failure' } }),
    } as never)

    const res = await regenerateInviteCode('trip-1')
    expect(res).toEqual({ error: 'Failed to update invite code.' })
  })
})
