/**
 * @file tests/pin-vote-action.test.ts
 * @brief Unit tests for togglePinVoteAction server action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { togglePinVoteAction } from '@/app/trips/actions/vote-pin'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

type MockQuery = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (onfulfilled: (value: { data: unknown; error: unknown }) => unknown) => Promise<unknown>
}

describe('togglePinVoteAction Server Action', () => {
  let mockVotesQuery: MockQuery
  let mockGetUser: ReturnType<typeof vi.fn>
  let queryResultData: unknown

  beforeEach(() => {
    vi.clearAllMocks()
    queryResultData = []

    mockVotesQuery = {
      select: vi.fn(() => mockVotesQuery),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => mockVotesQuery),
      eq: vi.fn(() => mockVotesQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve) => Promise.resolve(resolve({ data: queryResultData, error: null })),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-voter-1', email: 'voter1@planit.app' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => mockVotesQuery),
    } as unknown as SupabaseClient)
  })

  it('returns error when tripId or pinId is empty', async () => {
    const res1 = await togglePinVoteAction('', 'pin-1')
    expect(res1).toEqual({ error: 'Trip ID and Pin ID are required.' })

    const res2 = await togglePinVoteAction('trip-1', '')
    expect(res2).toEqual({ error: 'Trip ID and Pin ID are required.' })
  })

  it('returns error when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const res = await togglePinVoteAction('trip-1', 'pin-1')
    expect(res).toEqual({ error: 'Authentication required.' })
  })

  it('returns error when querying vote fails', async () => {
    mockVotesQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB connection dropped' },
    })

    const res = await togglePinVoteAction('trip-1', 'pin-1')
    expect(res).toEqual({ error: 'Failed to query vote status.' })
  })

  it('casts a vote when user has not voted previously', async () => {
    queryResultData = [{ user_email: 'voter1@planit.app' }]

    const res = await togglePinVoteAction('trip-1', 'pin-1', '2026-11-15')
    expect(res.success).toBe(true)
    expect(res.voted).toBe(true)
    expect(res.voteCount).toBe(1)
    expect(res.voters).toEqual(['voter1@planit.app'])
    expect(mockVotesQuery.insert).toHaveBeenCalledWith({
      pin_id: 'pin-1',
      user_id: 'user-voter-1',
      user_email: 'voter1@planit.app',
      trip_date: '2026-11-15',
    })
    expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
  })

  it('removes vote when user already voted', async () => {
    mockVotesQuery.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-vote-1' },
      error: null,
    })
    queryResultData = []

    const res = await togglePinVoteAction('trip-1', 'pin-1')
    expect(res.success).toBe(true)
    expect(res.voted).toBe(false)
    expect(res.voteCount).toBe(0)
    expect(mockVotesQuery.delete).toHaveBeenCalled()
  })

  it('returns error when vote insertion fails', async () => {
    mockVotesQuery.insert.mockResolvedValueOnce({
      error: { message: 'Insert failed' },
    })

    const res = await togglePinVoteAction('trip-1', 'pin-1')
    expect(res).toEqual({ error: 'Failed to cast vote.' })
  })

  it('returns error when vote removal fails', async () => {
    mockVotesQuery.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-vote-1' },
      error: null,
    })
    // Mock delete failing
    mockVotesQuery.delete.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({ error: { message: 'Delete failed' } }),
    } as never)

    const res = await togglePinVoteAction('trip-1', 'pin-1')
    expect(res).toEqual({ error: 'Failed to remove vote.' })
  })
})
