/**
 * @file tests/pin-confirmation-action.test.ts
 * @brief Unit tests for confirmPinAction and revertPinAction server actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmPinAction, revertPinAction } from '@/app/trips/actions/pin-confirmation'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Pin Confirmation Server Actions', () => {
  let mockTripsQuery: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  }
  let mockPinsQuery: {
    update: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    then: (resolve: (val: { data: unknown; error: unknown }) => unknown) => Promise<unknown>
  }
  let mockGetUser: ReturnType<typeof vi.fn>
  let updateError: unknown
  let updatedRows: Array<{ id: string }>

  beforeEach(() => {
    vi.clearAllMocks()
    updateError = null
    updatedRows = [{ id: 'pin-1' }]

    mockTripsQuery = {
      select: vi.fn(() => mockTripsQuery),
      eq: vi.fn(() => mockTripsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'trip-1', organizer_id: 'org-user-1' },
        error: null,
      }),
    }

    mockPinsQuery = {
      update: vi.fn(() => mockPinsQuery),
      eq: vi.fn(() => mockPinsQuery),
      select: vi.fn(() => mockPinsQuery),
      then: (resolve) =>
        Promise.resolve(resolve({ data: updatedRows, error: updateError })),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'org-user-1', email: 'organizer@planit.app' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === 'trips') return mockTripsQuery
        return mockPinsQuery
      }),
    } as unknown as SupabaseClient)
  })

  describe('confirmPinAction', () => {
    it('returns error when tripId or pinId is empty', async () => {
      const res1 = await confirmPinAction('', 'pin-1')
      expect(res1).toEqual({ error: 'Trip ID and Pin ID are required.' })

      const res2 = await confirmPinAction('trip-1', '')
      expect(res2).toEqual({ error: 'Trip ID and Pin ID are required.' })
    })

    it('returns error when user is unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const res = await confirmPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Authentication required.' })
    })

    it('returns error when trip is not found', async () => {
      mockTripsQuery.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const res = await confirmPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Trip not found.' })
    })

    it('returns error when caller is not the organizer', async () => {
      mockTripsQuery.maybeSingle.mockResolvedValueOnce({
        data: { id: 'trip-1', organizer_id: 'other-user' },
        error: null,
      })

      const res = await confirmPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Only the trip organizer can confirm or revert pins.' })
    })

    it('confirms the pin when caller is organizer', async () => {
      const res = await confirmPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ success: true })
      expect(mockPinsQuery.update).toHaveBeenCalledWith({ is_confirmed: true })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
    })

    it('returns error when database update fails', async () => {
      updateError = { message: 'DB update error' }

      const res = await confirmPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Failed to confirm pin.' })
    })

    it('returns error when RLS updates no rows', async () => {
      updatedRows = []

      const res = await confirmPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Failed to confirm pin.' })
    })
  })

  describe('revertPinAction', () => {
    it('returns error when tripId or pinId is empty', async () => {
      const res = await revertPinAction('', 'pin-1')
      expect(res).toEqual({ error: 'Trip ID and Pin ID are required.' })
    })

    it('reverts the pin when caller is organizer', async () => {
      const res = await revertPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ success: true })
      expect(mockPinsQuery.update).toHaveBeenCalledWith({ is_confirmed: false })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
    })

    it('returns error when database update fails', async () => {
      updateError = { message: 'DB update error' }

      const res = await revertPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Failed to revert pin.' })
    })

    it('returns error when RLS updates no rows', async () => {
      updatedRows = []

      const res = await revertPinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Failed to revert pin.' })
    })
  })
})
