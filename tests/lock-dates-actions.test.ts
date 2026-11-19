/**
 * @file tests/lock-dates-actions.test.ts
 * @brief Unit tests for the lock and unlock trip dates server actions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lockTripDates, unlockTripDates } from '@/app/trips/actions/lock-dates'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('trip date lock server actions', () => {
  let getUser: ReturnType<typeof vi.fn>
  let rpc: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    rpc = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser },
      rpc,
    } as unknown as SupabaseClient)
  })

  describe('lockTripDates', () => {
    it('requires a trip id', async () => {
      expect(await lockTripDates('', '2099-07-02', '2099-07-05')).toEqual({
        error: 'Trip ID is required.',
      })
      expect(supabaseServer.createClient).not.toHaveBeenCalled()
    })

    it('rejects invalid calendar dates', async () => {
      expect(await lockTripDates('trip-1', '2099-02-30', '2099-07-05')).toEqual({
        error: 'Dates must be valid calendar dates.',
      })
    })

    it('rejects an end date before the start date', async () => {
      expect(await lockTripDates('trip-1', '2099-07-05', '2099-07-02')).toEqual({
        error: 'The end date cannot be before the start date.',
      })
      expect(rpc).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      expect(await lockTripDates('trip-1', '2099-07-02', '2099-07-05')).toEqual({
        error: 'Authentication required.',
      })
      expect(rpc).not.toHaveBeenCalled()
    })

    it('locks the dates and revalidates the trip page', async () => {
      expect(await lockTripDates('trip-1', '2099-07-02', '2099-07-05')).toEqual({ success: true })
      expect(rpc).toHaveBeenCalledWith('lock_trip_dates', {
        p_trip_id: 'trip-1',
        p_start: '2099-07-02',
        p_end: '2099-07-05',
      })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('shows the message of rules enforced by the database', async () => {
      rpc.mockResolvedValueOnce({
        error: { code: 'P0001', message: 'Only the organizer can lock the trip dates.' },
      })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await lockTripDates('trip-1', '2099-07-02', '2099-07-05')).toEqual({
        error: 'Only the organizer can lock the trip dates.',
      })
      expect(consoleError).toHaveBeenCalled()
      expect(cache.revalidatePath).not.toHaveBeenCalled()
    })

    it('hides unexpected database errors', async () => {
      rpc.mockResolvedValueOnce({ error: { code: '58000', message: 'internal details' } })
      vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await lockTripDates('trip-1', '2099-07-02', '2099-07-05')).toEqual({
        error: 'Failed to lock the trip dates.',
      })
    })
  })

  describe('unlockTripDates', () => {
    it('requires a trip id', async () => {
      expect(await unlockTripDates('')).toEqual({ error: 'Trip ID is required.' })
    })

    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      expect(await unlockTripDates('trip-1')).toEqual({ error: 'Authentication required.' })
      expect(rpc).not.toHaveBeenCalled()
    })

    it('unlocks the dates and revalidates the trip page', async () => {
      expect(await unlockTripDates('trip-1')).toEqual({ success: true })
      expect(rpc).toHaveBeenCalledWith('unlock_trip_dates', { p_trip_id: 'trip-1' })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('shows the message of rules enforced by the database', async () => {
      rpc.mockResolvedValueOnce({
        error: { code: 'P0001', message: 'Only the organizer can unlock the trip dates.' },
      })
      vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await unlockTripDates('trip-1')).toEqual({
        error: 'Only the organizer can unlock the trip dates.',
      })
    })

    it('hides unexpected database errors', async () => {
      rpc.mockResolvedValueOnce({ error: { code: '58000', message: 'internal details' } })
      vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await unlockTripDates('trip-1')).toEqual({
        error: 'Failed to unlock the trip dates.',
      })
    })
  })
})
