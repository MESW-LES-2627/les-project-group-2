import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTrip } from '@/app/trips/actions/create-trip'
import { deleteTrip } from '@/app/trips/actions/delete-trip'
import { getTrips } from '@/app/trips/actions/get-trips'
import { updateTrip } from '@/app/trips/actions/update-trip'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

type MockQuery = {
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

describe('Trip actions', () => {
  let mockQuery: MockQuery
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockQuery = {
      insert: vi.fn(() => mockQuery),
      update: vi.fn(() => mockQuery),
      delete: vi.fn(() => mockQuery),
      select: vi.fn(() => mockQuery),
      eq: vi.fn(() => mockQuery),
      single: vi.fn().mockResolvedValue({ data: { id: 'trip-1' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'trip-1' }, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => mockQuery),
    } as unknown as SupabaseClient)

    vi.mocked(navigation.redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
  })

  it('creates a trip with trimmed fields and redirects to its page', async () => {
    const formData = new FormData()
    formData.set('name', '  Weekend away  ')
    formData.set('destination', '  Porto  ')
    formData.set('description', '  A short break  ')

    await expect(createTrip(formData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockQuery.insert).toHaveBeenCalledWith({
      name: 'Weekend away',
      destination: 'Porto',
      description: 'A short break',
      organizer_id: 'user-1',
    })
    expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-1')
  })

  it('requires a trip name before contacting Supabase', async () => {
    const formData = new FormData()
    formData.set('name', '   ')

    await expect(createTrip(formData)).rejects.toThrow('Trip name is required.')

    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated users to entry before creating a trip', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const formData = new FormData()
    formData.set('name', 'Weekend away')

    await expect(createTrip(formData)).rejects.toThrow('NEXT_REDIRECT')

    expect(navigation.redirect).toHaveBeenCalledWith('/entry')
    expect(mockQuery.insert).not.toHaveBeenCalled()
  })

  it('updates a trip for its organizer and redirects to the trip page', async () => {
    const formData = new FormData()
    formData.set('id', ' trip-1 ')
    formData.set('name', '  New name  ')
    formData.set('destination', '  Lisbon  ')
    formData.set('description', '  Updated details  ')

    await expect(updateTrip(formData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockQuery.update).toHaveBeenCalledWith({
      name: 'New name',
      destination: 'Lisbon',
      description: 'Updated details',
    })
    expect(mockQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'trip-1')
    expect(mockQuery.eq).toHaveBeenNthCalledWith(2, 'organizer_id', 'user-1')
    expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-1')
  })

  it('requires an ID and name before updating a trip', async () => {
    const formData = new FormData()
    formData.set('id', 'trip-1')
    formData.set('name', ' ')

    await expect(updateTrip(formData)).rejects.toThrow(
      'Trip ID and name are required.'
    )

    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('reports when an update matches no trip', async () => {
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const formData = new FormData()
    formData.set('id', 'missing-trip')
    formData.set('name', 'New name')

    await expect(updateTrip(formData)).rejects.toThrow(
      'Trip not found or you do not have permission to update it.'
    )
  })

  it('deletes a trip for its organizer and redirects to the dashboard', async () => {
    const formData = new FormData()
    formData.set('id', ' trip-1 ')

    await expect(deleteTrip(formData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'trip-1')
    expect(mockQuery.eq).toHaveBeenNthCalledWith(2, 'organizer_id', 'user-1')
    expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('requires an ID before deleting a trip', async () => {
    await expect(deleteTrip(new FormData())).rejects.toThrow(
      'Trip ID is required.'
    )

    expect(supabaseServer.createClient).not.toHaveBeenCalled()
  })

  it('returns trips ordered by creation date descending', async () => {
    const trips = [{ id: 'trip-1', name: 'Weekend away' }]
    mockQuery.order.mockResolvedValueOnce({ data: trips, error: null })

    await expect(getTrips()).resolves.toEqual(trips)

    expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
  })

  it('redirects unauthenticated users before listing trips', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    await expect(getTrips()).rejects.toThrow('NEXT_REDIRECT')

    expect(navigation.redirect).toHaveBeenCalledWith('/entry')
    expect(mockQuery.select).not.toHaveBeenCalled()
  })
})
