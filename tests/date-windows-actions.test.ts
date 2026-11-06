/**
 * @file tests/date-windows-actions.test.ts
 * @brief Unit tests for the date window server actions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDateWindow,
  deleteDateWindow,
  updateDateWindow,
} from '@/app/trips/actions/date-windows'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

type Query = {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

const FUTURE_START = '2099-07-01'
const FUTURE_END = '2099-07-10'

describe('date window server actions', () => {
  let tripsQuery: Query
  let windowsQuery: Query
  let getUser: ReturnType<typeof vi.fn>

  function makeQuery(): Query {
    const query = {} as Query
    query.select = vi.fn(() => query)
    query.insert = vi.fn(() => query)
    query.update = vi.fn(() => query)
    query.delete = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.maybeSingle = vi.fn()
    return query
  }

  beforeEach(() => {
    vi.clearAllMocks()

    tripsQuery = makeQuery()
    tripsQuery.maybeSingle.mockResolvedValue({
      data: { id: 'trip-1', organizer_id: 'user-organizer' },
      error: null,
    })
    windowsQuery = makeQuery()
    windowsQuery.maybeSingle.mockResolvedValue({ data: { id: 'window-1' }, error: null })

    getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-organizer' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser },
      from: vi.fn((table: string) => (table === 'trips' ? tripsQuery : windowsQuery)),
    } as unknown as SupabaseClient)
  })

  describe('shared authorization', () => {
    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      expect(await addDateWindow('trip-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Authentication required.',
      })
    })

    it('rejects unknown trips', async () => {
      tripsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      expect(await addDateWindow('trip-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Trip not found.',
      })
    })

    it('rejects callers who are not the organizer', async () => {
      getUser.mockResolvedValueOnce({ data: { user: { id: 'someone-else' } }, error: null })

      expect(await addDateWindow('trip-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Only the organizer can manage date windows.',
      })
      expect(windowsQuery.insert).not.toHaveBeenCalled()
    })
  })

  describe('addDateWindow', () => {
    it('requires a trip id', async () => {
      expect(await addDateWindow('', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Trip ID is required.',
      })
      expect(supabaseServer.createClient).not.toHaveBeenCalled()
    })

    it('returns a validation error when the end date is before the start date', async () => {
      expect(await addDateWindow('trip-1', FUTURE_END, FUTURE_START)).toEqual({
        error: 'The end date cannot be before the start date.',
      })
      expect(supabaseServer.createClient).not.toHaveBeenCalled()
    })

    it('returns a validation error when the start date is in the past', async () => {
      expect(await addDateWindow('trip-1', '2000-01-01', FUTURE_END)).toEqual({
        error: 'The start date cannot be in the past.',
      })
    })

    it('inserts the window and revalidates the trip page', async () => {
      windowsQuery.insert.mockResolvedValueOnce({ error: null })

      expect(await addDateWindow('trip-1', FUTURE_START, FUTURE_END)).toEqual({ success: true })
      expect(windowsQuery.insert).toHaveBeenCalledWith({
        trip_id: 'trip-1',
        start_date: FUTURE_START,
        end_date: FUTURE_END,
        created_by: 'user-organizer',
      })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('reports database failures', async () => {
      windowsQuery.insert.mockResolvedValueOnce({ error: { message: 'boom' } })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await addDateWindow('trip-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Failed to add the date window.',
      })
      expect(consoleError).toHaveBeenCalled()
      expect(cache.revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('updateDateWindow', () => {
    it('requires trip and window ids', async () => {
      expect(await updateDateWindow('trip-1', '', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Trip ID and window ID are required.',
      })
    })

    it('validates the new dates', async () => {
      expect(await updateDateWindow('trip-1', 'window-1', FUTURE_END, FUTURE_START)).toEqual({
        error: 'The end date cannot be before the start date.',
      })
    })

    it('updates the window and revalidates the trip page', async () => {
      expect(await updateDateWindow('trip-1', 'window-1', FUTURE_START, FUTURE_END)).toEqual({
        success: true,
      })
      expect(windowsQuery.update).toHaveBeenCalledWith(
        { start_date: FUTURE_START, end_date: FUTURE_END }
      )
      expect(windowsQuery.eq).toHaveBeenCalledWith('id', 'window-1')
      expect(windowsQuery.eq).toHaveBeenCalledWith('trip_id', 'trip-1')
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('rejects non-organizers', async () => {
      getUser.mockResolvedValueOnce({ data: { user: { id: 'someone-else' } }, error: null })

      expect(await updateDateWindow('trip-1', 'window-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Only the organizer can manage date windows.',
      })
      expect(windowsQuery.update).not.toHaveBeenCalled()
    })

    it('reports database failures', async () => {
      windowsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await updateDateWindow('trip-1', 'window-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Failed to update the date window.',
      })
      expect(consoleError).toHaveBeenCalled()
    })

    it('reports a missing window', async () => {
      windowsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      expect(await updateDateWindow('trip-1', 'window-1', FUTURE_START, FUTURE_END)).toEqual({
        error: 'Date window not found.',
      })
      expect(cache.revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('deleteDateWindow', () => {
    it('requires trip and window ids', async () => {
      expect(await deleteDateWindow('', 'window-1')).toEqual({
        error: 'Trip ID and window ID are required.',
      })
    })

    it('deletes the window and revalidates the trip page', async () => {
      expect(await deleteDateWindow('trip-1', 'window-1')).toEqual({ success: true })
      expect(windowsQuery.delete).toHaveBeenCalled()
      expect(windowsQuery.eq).toHaveBeenCalledWith('id', 'window-1')
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('rejects non-organizers', async () => {
      getUser.mockResolvedValueOnce({ data: { user: { id: 'someone-else' } }, error: null })

      expect(await deleteDateWindow('trip-1', 'window-1')).toEqual({
        error: 'Only the organizer can manage date windows.',
      })
      expect(windowsQuery.delete).not.toHaveBeenCalled()
    })

    it('reports database failures', async () => {
      windowsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await deleteDateWindow('trip-1', 'window-1')).toEqual({
        error: 'Failed to delete the date window.',
      })
      expect(consoleError).toHaveBeenCalled()
    })

    it('reports a missing window', async () => {
      windowsQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      expect(await deleteDateWindow('trip-1', 'window-1')).toEqual({
        error: 'Date window not found.',
      })
    })
  })
})
