/**
 * @file tests/manage-pins-action.test.ts
 * @brief Unit tests for updatePinAction and deletePinAction server actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updatePinAction, deletePinAction } from '@/app/trips/actions/manage-pins'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Pin Management Server Actions', () => {
  let mockTripsQuery: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  }
  let mockPinsQuery: {
    select: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: (resolve: (val: { error: unknown }) => unknown) => Promise<unknown>
  }
  let mockVotesQuery: {
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    then: (resolve: (val: { error: unknown }) => unknown) => Promise<unknown>
  }
  let mockGetUser: ReturnType<typeof vi.fn>
  let operationError: unknown

  beforeEach(() => {
    vi.clearAllMocks()
    operationError = null

    mockTripsQuery = {
      select: vi.fn(() => mockTripsQuery),
      eq: vi.fn(() => mockTripsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'trip-1', organizer_id: 'org-id' },
        error: null,
      }),
    }

    mockPinsQuery = {
      select: vi.fn(() => mockPinsQuery),
      update: vi.fn(() => mockPinsQuery),
      delete: vi.fn(() => mockPinsQuery),
      eq: vi.fn(() => mockPinsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'pin-1',
          trip_id: 'trip-1',
          proposed_by: 'creator@planit.app',
          is_confirmed: false,
        },
        error: null,
      }),
      then: (resolve) => Promise.resolve(resolve({ error: operationError })),
    }

    mockVotesQuery = {
      delete: vi.fn(() => mockVotesQuery),
      eq: vi.fn(() => mockVotesQuery),
      then: (resolve) => Promise.resolve(resolve({ error: operationError })),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'creator-id', email: 'creator@planit.app' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => {
        if (table === 'trips') return mockTripsQuery
        if (table === 'pin_votes') return mockVotesQuery
        return mockPinsQuery
      }),
    } as unknown as SupabaseClient)
  })

  describe('updatePinAction', () => {
    it('returns error when tripId or pinId is empty', async () => {
      const res = await updatePinAction('', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'Trip ID and Pin ID are required.' })
    })

    it('returns error when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const res = await updatePinAction('trip-1', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'Authentication required.' })
    })

    it('returns error when trip not found', async () => {
      mockTripsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      const res = await updatePinAction('trip-1', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'Trip not found.' })
    })

    it('returns error when pin not found', async () => {
      mockPinsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      const res = await updatePinAction('trip-1', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'Pin not found.' })
    })

    it('denies edit when user is not the creator or organizer', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'stranger-id', email: 'stranger@planit.app' } },
        error: null,
      })

      const res = await updatePinAction('trip-1', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'You do not have permission to edit this pin.' })
    })

    it('denies non-organizer from editing confirmed pin', async () => {
      mockPinsQuery.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'pin-1',
          trip_id: 'trip-1',
          proposed_by: 'creator@planit.app',
          is_confirmed: true,
        },
        error: null,
      })

      const res = await updatePinAction('trip-1', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'Only the trip organizer can edit a confirmed pin.' })
    })

    it('allows organizer to edit confirmed pin', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'org-id', email: 'org@planit.app' } },
        error: null,
      })
      mockPinsQuery.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'pin-1',
          trip_id: 'trip-1',
          proposed_by: 'creator@planit.app',
          is_confirmed: true,
        },
        error: null,
      })

      const res = await updatePinAction('trip-1', 'pin-1', { name: 'Updated by Org' })
      expect(res).toEqual({ success: true })
      expect(mockPinsQuery.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated by Org' }))
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
    })

    it('rejects invalid coordinates', async () => {
      const res = await updatePinAction('trip-1', 'pin-1', { lat: 100, lng: 200 })
      expect(res).toEqual({ error: 'Invalid geographical coordinates.' })
    })

    it('rejects empty name', async () => {
      const res = await updatePinAction('trip-1', 'pin-1', { name: '   ' })
      expect(res).toEqual({ error: 'Pin name cannot be empty.' })
    })

    it('rejects an unsupported category', async () => {
      const result = await updatePinAction('trip-1', 'pin-1', { category: 'lodging' as never })

      expect(result).toEqual({ error: 'Choose a valid category for the pin.' })
      expect(mockPinsQuery.update).not.toHaveBeenCalled()
    })

    it('allows changing only the category', async () => {
      const result = await updatePinAction('trip-1', 'pin-1', { category: 'meeting_point' })

      expect(result.success).toBe(true)
      expect(mockPinsQuery.update).toHaveBeenCalledWith({ category: 'meeting_point' })
    })

    it('allows creator to update proposed pin', async () => {
      const res = await updatePinAction('trip-1', 'pin-1', {
        name: 'New Name',
        description: 'New Description',
        category: 'food',
        lat: 38.7,
        lng: -9.1,
      })
      expect(res).toEqual({ success: true })
      expect(mockPinsQuery.update).toHaveBeenCalledWith({
        name: 'New Name',
        description: 'New Description',
        category: 'food',
        lat: 38.7,
        lng: -9.1,
      })
    })

    it('returns error when database update fails', async () => {
      operationError = { message: 'Database failed' }
      const res = await updatePinAction('trip-1', 'pin-1', { name: 'New' })
      expect(res).toEqual({ error: 'Failed to update pin.' })
    })
  })

  describe('deletePinAction', () => {
    it('returns error when tripId or pinId is empty', async () => {
      const res = await deletePinAction('', 'pin-1')
      expect(res).toEqual({ error: 'Trip ID and Pin ID are required.' })
    })

    it('denies delete when user is not the creator or organizer', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'stranger-id', email: 'stranger@planit.app' } },
        error: null,
      })

      const res = await deletePinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'You do not have permission to delete this pin.' })
    })

    it('denies non-organizer from deleting confirmed pin', async () => {
      mockPinsQuery.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'pin-1',
          trip_id: 'trip-1',
          proposed_by: 'creator@planit.app',
          is_confirmed: true,
        },
        error: null,
      })

      const res = await deletePinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Only the trip organizer can delete a confirmed pin.' })
    })

    it('allows creator to delete their own proposed pin and deletes votes first', async () => {
      const res = await deletePinAction('trip-1', 'pin-1')
      expect(res).toEqual({ success: true })
      expect(mockVotesQuery.delete).toHaveBeenCalled()
      expect(mockPinsQuery.delete).toHaveBeenCalled()
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
    })

    it('allows organizer to delete a confirmed pin', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'org-id', email: 'org@planit.app' } },
        error: null,
      })
      mockPinsQuery.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'pin-1',
          trip_id: 'trip-1',
          proposed_by: 'creator@planit.app',
          is_confirmed: true,
        },
        error: null,
      })

      const res = await deletePinAction('trip-1', 'pin-1')
      expect(res).toEqual({ success: true })
    })

    it('returns error when deleting pin votes fails', async () => {
      mockVotesQuery.then = (resolve) =>
        Promise.resolve(resolve({ error: { message: 'Failed votes' } }))
      const res = await deletePinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Failed to delete pin votes.' })
    })

    it('returns error when deleting pin record fails', async () => {
      mockPinsQuery.then = (resolve) =>
        Promise.resolve(resolve({ error: { message: 'Failed pin deletion' } }))
      const res = await deletePinAction('trip-1', 'pin-1')
      expect(res).toEqual({ error: 'Failed to delete pin.' })
    })
  })
})
