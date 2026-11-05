/**
 * @file tests/join-trip-action.test.ts
 * @brief Unit tests for joinTripByCode and joinTripFormAction server actions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { joinTripByCode, joinTripFormAction } from '@/app/trips/actions/join-trip'
import * as navigation from 'next/navigation'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

type MockQuery = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

describe('joinTripByCode Server Action', () => {
  let mockTripsQuery: MockQuery
  let mockMembersQuery: MockQuery
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTripsQuery = {
      select: vi.fn(() => mockTripsQuery),
      insert: vi.fn(() => mockTripsQuery),
      eq: vi.fn(() => mockTripsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'trip-100', name: 'Algarve Holiday', organizer_id: 'user-organizer' },
        error: null,
      }),
    }

    mockMembersQuery = {
      select: vi.fn(() => mockMembersQuery),
      insert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn(() => mockMembersQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-guest' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === 'trips') return mockTripsQuery
        if (table === 'trip_members') return mockMembersQuery
        return mockTripsQuery
      }),
    } as unknown as SupabaseClient)

    vi.mocked(navigation.redirect).mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
  })

  it('returns error when code is empty or whitespace', async () => {
    const res = await joinTripByCode('   ')
    expect(res).toEqual({ error: 'Please enter an invite code.' })
    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated user to entry page with redirectTo param', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    await expect(joinTripByCode('TRIP1234')).rejects.toThrow(
      'NEXT_REDIRECT:/entry?redirectTo=%2Ftrips%2Fjoin%3Fcode%3DTRIP1234'
    )
  })

  it('returns error when invite code does not match any trip', async () => {
    mockTripsQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const res = await joinTripByCode('REVOKED1')
    expect(res).toEqual({ error: 'Invalid or revoked invite code.' })
  })

  it('returns error when database query encounters an error', async () => {
    mockTripsQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database failure' },
    })

    const res = await joinTripByCode('ERROR123')
    expect(res).toEqual({ error: 'Invalid or revoked invite code.' })
  })

  it('adds user to trip_members and redirects when code is valid and user is new member', async () => {
    await expect(joinTripByCode('TRIP1234')).rejects.toThrow('NEXT_REDIRECT:/trips/trip-100')

    expect(mockTripsQuery.eq).toHaveBeenCalledWith('invite_code', 'TRIP1234')
    expect(mockMembersQuery.insert).toHaveBeenCalledWith({
      trip_id: 'trip-100',
      user_id: 'user-guest',
      role: 'member',
    })
    expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-100')
    expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-100')
  })

  it('handles revalidatePath failure gracefully during render passes and still redirects', async () => {
    vi.mocked(cache.revalidatePath).mockImplementationOnce(() => {
      throw new Error("can't be called during render")
    })

    await expect(joinTripByCode('TRIP1234')).rejects.toThrow('NEXT_REDIRECT:/trips/trip-100')
    expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-100')
  })

  it('assigns role organizer if the joining user is the trip organizer', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-organizer' } },
      error: null,
    })

    await expect(joinTripByCode('TRIP1234')).rejects.toThrow('NEXT_REDIRECT:/trips/trip-100')

    expect(mockMembersQuery.insert).toHaveBeenCalledWith({
      trip_id: 'trip-100',
      user_id: 'user-organizer',
      role: 'organizer',
    })
  })

  it('redirects without re-inserting if user is already a member', async () => {
    mockMembersQuery.maybeSingle.mockResolvedValueOnce({
      data: { id: 'member-existing' },
      error: null,
    })

    await expect(joinTripByCode('TRIP1234')).rejects.toThrow('NEXT_REDIRECT:/trips/trip-100')

    expect(mockMembersQuery.insert).not.toHaveBeenCalled()
    expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-100')
  })

  it('returns error if membership insertion fails', async () => {
    mockMembersQuery.insert.mockResolvedValueOnce({
      error: { message: 'Insert constraint failed' },
    })

    const res = await joinTripByCode('TRIP1234')
    expect(res).toEqual({ error: 'Failed to join trip. Please try again.' })
  })

  describe('joinTripFormAction', () => {
    it('extracts code from FormData and invokes joinTripByCode', async () => {
      const formData = new FormData()
      formData.set('code', 'FORM1234')

      await expect(joinTripFormAction(null, formData)).rejects.toThrow(
        'NEXT_REDIRECT:/trips/trip-100'
      )
      expect(mockTripsQuery.eq).toHaveBeenCalledWith('invite_code', 'FORM1234')
    })
  })
})
