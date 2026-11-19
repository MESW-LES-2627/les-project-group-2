/**
 * @file tests/pins-actions.test.ts
 * @brief Unit tests for pins Server Actions (createPinAction, toggleCommitPinAction, getPinsAction).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createPinAction,
  toggleCommitPinAction,
  getPinsAction,
} from '@/app/trips/actions/pins'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (resolve: (val: unknown) => unknown) => Promise<unknown>
}

describe('Pins Server Actions', () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let tripMockResult: { data: unknown; error: unknown }
  let pinMockResult: { data: unknown; error: unknown }
  let updateMockResult: { error: unknown }
  let pinsListMockResult: { data: unknown; error: unknown }
  let votesListMockResult: { data: unknown; error: unknown }
  let insertSingleResult: { data: unknown; error: unknown }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-organizer', email: 'organizer@planit.app' } },
      error: null,
    })

    tripMockResult = { data: { organizer_id: 'user-organizer' }, error: null }
    pinMockResult = { data: { commited: false }, error: null }
    updateMockResult = { error: null }
    pinsListMockResult = { data: [], error: null }
    votesListMockResult = { data: [], error: null }
    insertSingleResult = { data: null, error: null }

    const makeQuery = (tableName: string): MockQueryBuilder => {
      const q: MockQueryBuilder = {
        select: vi.fn(() => q),
        insert: vi.fn(() => q),
        update: vi.fn(() => q),
        delete: vi.fn(() => q),
        eq: vi.fn(() => q),
        in: vi.fn(() => q),
        order: vi.fn(() => q),
        single: vi.fn(() => Promise.resolve(insertSingleResult)),
        maybeSingle: vi.fn(() => {
          if (tableName === 'trips') return Promise.resolve(tripMockResult)
          if (tableName === 'pins') return Promise.resolve(pinMockResult)
          return Promise.resolve({ data: null, error: null })
        }),
        then: (resolve: (val: unknown) => unknown) => {
          if (tableName === 'pins') {
            return Promise.resolve(
              resolve(updateMockResult.error ? updateMockResult : pinsListMockResult)
            )
          }
          if (tableName === 'pin_votes') {
            return Promise.resolve(resolve(votesListMockResult))
          }
          return Promise.resolve(resolve({ data: null, error: null }))
        },
      }
      return q
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => makeQuery(table)),
    } as unknown as SupabaseClient)
  })

  describe('createPinAction', () => {
    it('returns error when tripId is missing', async () => {
      const res = await createPinAction('', { name: 'Test', lat: 10, lng: 20 })
      expect(res.error).toBe('Trip ID is required.')
    })

    it('returns error when pin data is invalid', async () => {
      const res1 = await createPinAction('trip-1', { name: '', lat: 10, lng: 20 })
      expect(res1.error).toBe('Pin name, latitude, and longitude are required.')

      const res2 = await createPinAction('trip-1', { name: 'Test', lat: NaN, lng: 20 })
      expect(res2.error).toBe('Pin name, latitude, and longitude are required.')
    })

    it('returns error when user is unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const res = await createPinAction('trip-1', { name: 'Test', lat: 10, lng: 20 })
      expect(res.error).toBe('Authentication required.')
    })

    it('creates a pin successfully', async () => {
      insertSingleResult = {
        data: {
          id: 'pin-123',
          trip_id: 'trip-1',
          name: 'Castelo de S. Jorge',
          category: 'sightseeing',
          lat: 38.7139,
          lng: -9.1334,
          description: 'Historic castle',
          date: '2026-11-20',
          proposed_by: 'organizer@planit.app',
          created_at: '2026-11-19T00:00:00Z',
          commited: false,
        },
        error: null,
      }

      const res = await createPinAction('trip-1', {
        name: 'Castelo de S. Jorge',
        lat: 38.7139,
        lng: -9.1334,
        category: 'sightseeing',
        description: 'Historic castle',
        date: '2026-11-20',
      })

      expect(res.error).toBeUndefined()
      expect(res.pin).toBeDefined()
      expect(res.pin?.id).toBe('pin-123')
      expect(res.pin?.commited).toBe(false)
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/itinerary')
    })

    it('returns error when database insert fails', async () => {
      insertSingleResult = {
        data: null,
        error: { message: 'Database insert error' },
      }

      const res = await createPinAction('trip-1', {
        name: 'Castelo de S. Jorge',
        lat: 38.7139,
        lng: -9.1334,
      })

      expect(res.error).toBe('Could not create pin: Database insert error')
    })
  })

  describe('toggleCommitPinAction', () => {
    it('returns error when parameters are missing', async () => {
      const res1 = await toggleCommitPinAction('', 'pin-1')
      expect(res1.error).toBe('Trip ID and Pin ID are required.')

      const res2 = await toggleCommitPinAction('trip-1', '')
      expect(res2.error).toBe('Trip ID and Pin ID are required.')
    })

    it('returns error when user is unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const res = await toggleCommitPinAction('trip-1', 'pin-1')
      expect(res.error).toBe('Authentication required.')
    })

    it('returns error when caller is not the organizer', async () => {
      tripMockResult = {
        data: { organizer_id: 'different-organizer' },
        error: null,
      }

      const res = await toggleCommitPinAction('trip-1', 'pin-1')
      expect(res.error).toBe('Only the trip organizer can commit pins to the itinerary.')
    })

    it('returns error when checking organizer fails', async () => {
      tripMockResult = {
        data: null,
        error: { message: 'DB query error' },
      }

      const res = await toggleCommitPinAction('trip-1', 'pin-1')
      expect(res.error).toBe('Could not verify trip organizer: DB query error')
    })

    it('returns error when pin is not found', async () => {
      pinMockResult = {
        data: null,
        error: null,
      }

      const res = await toggleCommitPinAction('trip-1', 'pin-nonexistent')
      expect(res.error).toBe('Pin not found.')
    })

    it('successfully commits an uncommitted pin to the itinerary', async () => {
      pinMockResult = {
        data: { commited: false },
        error: null,
      }
      updateMockResult = { error: null }

      const res = await toggleCommitPinAction('trip-1', 'pin-1')
      expect(res.success).toBe(true)
      expect(res.commited).toBe(true)
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/itinerary')
    })

    it('successfully uncommits a previously committed pin', async () => {
      pinMockResult = {
        data: { commited: true },
        error: null,
      }
      updateMockResult = { error: null }

      const res = await toggleCommitPinAction('trip-1', 'pin-1')
      expect(res.success).toBe(true)
      expect(res.commited).toBe(false)
    })

    it('returns error when pin update fails', async () => {
      pinMockResult = {
        data: { commited: false },
        error: null,
      }
      updateMockResult = { error: { message: 'Write permission denied' } }

      const res = await toggleCommitPinAction('trip-1', 'pin-1')
      expect(res.error).toBe('Could not update pin status: Write permission denied')
    })
  })

  describe('getPinsAction', () => {
    it('returns error when tripId is empty', async () => {
      const res = await getPinsAction('')
      expect(res.error).toBe('Trip ID is required.')
    })

    it('returns error when fetching pins fails', async () => {
      pinsListMockResult = {
        data: null,
        error: { message: 'Query failed' },
      }

      const res = await getPinsAction('trip-1')
      expect(res.error).toBe('Could not fetch pins: Query failed')
    })

    it('fetches pins and their votes successfully', async () => {
      pinsListMockResult = {
        data: [
          {
            id: 'pin-1',
            trip_id: 'trip-1',
            name: 'Ponte 25 de Abril',
            category: 'sightseeing',
            lat: 38.689,
            lng: -9.177,
            proposed_by: 'organizer@planit.app',
            created_at: '2026-11-19T00:00:00Z',
            commited: true,
            date: '2026-11-20',
            description: 'Bridge',
          },
        ],
        error: null,
      }

      votesListMockResult = {
        data: [
          {
            id: 'vote-1',
            pin_id: 'pin-1',
            user_id: 'u-1',
            user_email: 'member@planit.app',
            trip_date: '2026-11-20',
            created_at: '2026-11-19T01:00:00Z',
          },
        ],
        error: null,
      }

      const res = await getPinsAction('trip-1')
      expect(res.error).toBeUndefined()
      expect(res.pins).toBeDefined()
      expect(res.pins?.length).toBe(1)
      expect(res.pins?.[0].id).toBe('pin-1')
      expect(res.pins?.[0].commited).toBe(true)
      expect(res.pins?.[0].votes?.length).toBe(1)
      expect(res.pins?.[0].votes?.[0].userEmail).toBe('member@planit.app')
    })
  })
})
