/**
 * @file tests/get-trip-pins.test.ts
 * @brief Unit tests for the getTripPins server action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTripPins } from '@/app/trips/actions/get-trip-pins'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('getTripPins', () => {
  let query: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    query = {
      select: vi.fn(() => query),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      from: vi.fn(() => query),
    } as unknown as SupabaseClient)
  })

  it('returns an empty array when no trip ID is provided', async () => {
    await expect(getTripPins('')).resolves.toEqual([])
    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('maps persisted pins and votes', async () => {
    query.eq.mockResolvedValue({
      data: [
        {
          id: 'pin-1',
          trip_id: 'trip-1',
          name: 'Torre de Belém',
          description: null,
          date: '2026-11-15',
          category: 'visit',
          lat: 38.69,
          lng: -9.21,
          proposed_by: 'organizer@planit.app',
          created_at: '2026-11-01T00:00:00Z',
          is_confirmed: true,
          pin_votes: [
            {
              id: 'vote-1',
              pin_id: 'pin-1',
              user_id: 'user-1',
              user_email: 'member@planit.app',
              trip_date: '2026-11-15',
              created_at: '2026-11-02T00:00:00Z',
            },
          ],
        },
      ],
      error: null,
    })

    const pins = await getTripPins('trip-1')

    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({
      id: 'pin-1',
      tripId: 'trip-1',
      isConfirmed: true,
      votes: [{ userEmail: 'member@planit.app' }],
    })
  })

  it('returns an empty array when the query fails', async () => {
    query.eq.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(getTripPins('trip-1')).resolves.toEqual([])
  })

  it('returns an empty array when the client throws', async () => {
    vi.mocked(supabaseServer.createClient).mockRejectedValue(new Error('no auth'))
    await expect(getTripPins('trip-1')).resolves.toEqual([])
  })

  it('returns an empty array when data is not a list', async () => {
    query.eq.mockResolvedValue({ data: { id: 'pin-1' }, error: null })
    await expect(getTripPins('trip-1')).resolves.toEqual([])
  })
})
