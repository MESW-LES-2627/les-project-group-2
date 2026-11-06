/**
 * @file tests/availability-actions.test.ts
 * @brief Unit tests for the saveAvailability server action.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAvailability } from '@/app/trips/actions/availability'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('saveAvailability', () => {
  let getUser: ReturnType<typeof vi.fn>
  let membersQuery: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> }
  let windowsQuery: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> }
  let availabilityQuery: {
    upsert: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    membersQuery = {
      select: vi.fn(() => membersQuery),
      eq: vi.fn(() => membersQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
    }
    windowsQuery = {
      select: vi.fn(() => windowsQuery),
      eq: vi.fn().mockResolvedValue({
        data: [{ start_date: '2099-07-01', end_date: '2099-07-10' }],
        error: null,
      }),
    }
    availabilityQuery = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => availabilityQuery),
      eq: vi.fn(() => availabilityQuery),
      in: vi.fn().mockResolvedValue({ error: null }),
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser },
      from: vi.fn((table: string) => {
        if (table === 'trip_members') return membersQuery
        if (table === 'trip_date_windows') return windowsQuery
        return availabilityQuery
      }),
    } as unknown as SupabaseClient)
  })

  it('requires a trip id', async () => {
    expect(await saveAvailability('', [{ day: '2099-07-01', choice: 'available' }])).toEqual({
      error: 'Trip ID is required.',
    })
  })

  it('requires at least one answer', async () => {
    expect(await saveAvailability('trip-1', [])).toEqual({
      error: 'Choose your availability for at least one day.',
    })
  })

  it('rejects malformed days and unknown choices', async () => {
    expect(await saveAvailability('trip-1', [{ day: 'tomorrow', choice: 'available' }])).toEqual({
      error: 'Invalid availability answer.',
    })
    expect(
      await saveAvailability('trip-1', [{ day: '2099-07-01', choice: 'maybe' as never }])
    ).toEqual({ error: 'Invalid availability answer.' })
    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated callers', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

    expect(await saveAvailability('trip-1', [{ day: '2099-07-01', choice: 'available' }])).toEqual({
      error: 'Authentication required.',
    })
  })

  it('rejects callers who are not members of the trip', async () => {
    membersQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    expect(await saveAvailability('trip-1', [{ day: '2099-07-01', choice: 'available' }])).toEqual({
      error: 'Only trip members can submit availability.',
    })
    expect(availabilityQuery.upsert).not.toHaveBeenCalled()
  })

  it('reports a failure to load the windows', async () => {
    windowsQuery.eq.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await saveAvailability('trip-1', [{ day: '2099-07-01', choice: 'available' }])).toEqual({
      error: 'Failed to load the candidate dates.',
    })
    expect(consoleError).toHaveBeenCalled()
  })

  it('rejects days outside every candidate window', async () => {
    expect(await saveAvailability('trip-1', [{ day: '2099-08-01', choice: 'available' }])).toEqual({
      error: 'Availability can only be set for days inside a candidate window.',
    })
    expect(availabilityQuery.upsert).not.toHaveBeenCalled()
  })

  it('saves available and unavailable days and revalidates the page', async () => {
    const result = await saveAvailability('trip-1', [
      { day: '2099-07-01', choice: 'available' },
      { day: '2099-07-02', choice: 'unavailable' },
    ])

    expect(result).toEqual({ success: true })
    expect(availabilityQuery.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          trip_id: 'trip-1',
          user_id: 'user-1',
          day: '2099-07-01',
          status: 'available',
        }),
        expect.objectContaining({ day: '2099-07-02', status: 'unavailable' }),
      ],
      { onConflict: 'trip_id,user_id,day' }
    )
    expect(availabilityQuery.delete).not.toHaveBeenCalled()
    expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
  })

  it('clears days answered with "none"', async () => {
    const result = await saveAvailability('trip-1', [{ day: '2099-07-03', choice: 'none' }])

    expect(result).toEqual({ success: true })
    expect(availabilityQuery.upsert).not.toHaveBeenCalled()
    expect(availabilityQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(availabilityQuery.in).toHaveBeenCalledWith('day', ['2099-07-03'])
  })

  it('reports an upsert failure', async () => {
    availabilityQuery.upsert.mockResolvedValueOnce({ error: { message: 'boom' } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await saveAvailability('trip-1', [{ day: '2099-07-01', choice: 'available' }])).toEqual({
      error: 'Failed to save your availability.',
    })
    expect(consoleError).toHaveBeenCalled()
    expect(cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('reports a delete failure', async () => {
    availabilityQuery.in.mockResolvedValueOnce({ error: { message: 'boom' } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await saveAvailability('trip-1', [{ day: '2099-07-03', choice: 'none' }])).toEqual({
      error: 'Failed to save your availability.',
    })
    expect(consoleError).toHaveBeenCalled()
  })
})
